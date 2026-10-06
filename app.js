const form = document.querySelector('#form');
const result = document.querySelector('#result');
const list = document.querySelector('#list');
const storageKey = 'postpilot-packs';
const supabaseClient = window.POSTPILOT_SUPABASE?.client || null;

const accountDialog = document.querySelector('#account-dialog');
const accountOpenButton = document.querySelector('#account-open');
const accountCloseButton = document.querySelector('#account-close');
const accountForm = document.querySelector('#auth-form');
const accountProfile = document.querySelector('#account-profile');
const accountMessage = document.querySelector('#account-message');
const syncStatus = document.querySelector('#sync-status');
const localImportBanner = document.querySelector('#local-import-banner');
const localImportButton = document.querySelector('#local-import');
const projectStatusFilter = document.querySelector('#project-status-filter');
const projectSearch = document.querySelector('#project-search');
const productionSummary = document.querySelector('#production-summary');
const composerMode = document.querySelector('#composer-mode');
const composerModeTitle = document.querySelector('#composer-mode-title');
const composerCancelButton = document.querySelector('#composer-cancel');
const composerSubmitButton = document.querySelector('#composer-submit');
const calendarGrid = document.querySelector('#calendar-grid');
const calendarRange = document.querySelector('#calendar-range');
const calendarPrevButton = document.querySelector('#calendar-prev');
const calendarTodayButton = document.querySelector('#calendar-today');
const calendarNextButton = document.querySelector('#calendar-next');
const localBackupControls = document.querySelector('#local-backup-controls');
const exportBackupButton = document.querySelector('#export-backup');
const importBackupButton = document.querySelector('#import-backup');
const importBackupFile = document.querySelector('#import-backup-file');

let currentUser = null;
let cloudPacks = [];
let cloudLoading = false;
let openedPackId = null;
let editingPackId = null;
let calendarWeekOffset = 0;

function currentLocale() {
  return window.AppI18n?.locale?.() || 'pt-BR';
}

function uiText(value) {
  return window.AppI18n?.t?.(value) || value;
}

function normalizeTone(value) {
  const raw = String(value || '').trim().toLocaleLowerCase('pt-BR');
  if (['didatico', 'didático', 'educational'].includes(raw)) return 'didatico';
  if (['humor', 'bem-humorado', 'humorous'].includes(raw)) return 'humor';
  return 'natural';
}

function toneLabel(value) {
  const code = normalizeTone(value);
  return uiText(({ natural: 'Natural e direto', didatico: 'Didático', humor: 'Bem-humorado' })[code]);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function makeUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

function readPacks() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function visiblePacks() {
  return currentUser ? cloudPacks : readPacks();
}

function safeBackupText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sanitizeImportedPack(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const allowedPlatforms = ['Instagram', 'TikTok', 'YouTube Shorts'];
  const platforms = (Array.isArray(raw.platforms) ? raw.platforms : [raw.channel])
    .filter(value => allowedPlatforms.includes(value))
    .slice(0, 3);
  if (!platforms.length) platforms.push('Instagram');

  const topic = safeBackupText(raw.topic, 140);
  const transcript = safeBackupText(raw.transcript, 12000);
  if (!topic || !transcript) return null;

  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(raw.id || ''))
    ? String(raw.id)
    : makeUuid();
  const status = ['draft', 'ready', 'published'].includes(raw.status) ? raw.status : 'draft';
  const goal = ['conversa', 'alcance', 'oferta'].includes(raw.goal) ? raw.goal : 'conversa';
  const publishAt = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.publishAt || '')) ? String(raw.publishAt) : '';
  const time = Number.isFinite(Number(raw.time)) ? Number(raw.time) : Date.now();
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : time;

  const pack = {
    id,
    topic,
    transcript,
    platforms,
    channel: platforms[0],
    tone: normalizeTone(raw.tone),
    goal,
    audience: safeBackupText(raw.audience, 120),
    publishAt,
    status,
    createdAt,
    time,
    publishChecklist: raw.publishChecklist && typeof raw.publishChecklist === 'object' ? raw.publishChecklist : {}
  };
  pack.publishChecklist = normalizePublishChecklist(pack);
  return pack;
}

function exportLocalBackup() {
  if (currentUser) return;
  const payload = {
    format: 'postpilot-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    packs: readPacks().slice(-20)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'postpilot-backup-' + localDateKey(new Date()) + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Backup exportado.');
}

async function restoreLocalBackup(file) {
  if (currentUser || !file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('O arquivo de backup é muito grande.');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    showToast('Arquivo de backup inválido.');
    return;
  }

  if (!parsed || parsed.format !== 'postpilot-backup' || parsed.version !== 1 || !Array.isArray(parsed.packs)) {
    showToast('Arquivo de backup inválido.');
    return;
  }

  if (!window.confirm(uiText('Restaurar este backup substituirá os pacotes locais atuais. Continuar?'))) return;

  const packs = parsed.packs.slice(-20).map(sanitizeImportedPack).filter(Boolean);
  localStorage.setItem(storageKey, JSON.stringify(packs));
  openedPackId = null;
  result.classList.remove('show');
  result.innerHTML = '';
  cancelComposerEdit({ reset: true });
  renderList();
  showToast('Backup restaurado.');
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('on');
  window.setTimeout(() => toast.classList.remove('on'), 1800);
}

function splitIntoIdeas(transcript) {
  const sentences = String(transcript || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20);

  if (sentences.length) return sentences.slice(0, 3);
  const clean = String(transcript || '').trim();
  return clean ? [clean.slice(0, 220)] : [];
}

function callToAction(goal) {
  const english = currentLocale() === 'en';
  const messages = english ? {
    conversa: 'Ask a simple question to invite people to comment.',
    alcance: 'Invite someone who needs this idea to share the content.',
    oferta: 'Explain how your service helps and invite the viewer to contact you.'
  } : {
    conversa: 'Faça uma pergunta simples para convidar as pessoas a comentar.',
    alcance: 'Convide alguém que precisa dessa ideia a compartilhar o conteúdo.',
    oferta: 'Explique como seu serviço ajuda e convide a pessoa a falar com você.'
  };
  return messages[goal] || messages.conversa;
}

function topicHashtags(topic) {
  const words = String(topic || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .match(/[a-z0-9]+/g) || [];
  return [...new Set(words.filter(word => word.length > 3).slice(0, 3).concat(['criadores', 'conteudo']))]
    .map(word => '#' + word).join(' ');
}

const goalField = document.createElement('label');
goalField.className = 'field';
goalField.innerHTML = '<span>Objetivo do conteúdo</span><select name="goal"><option value="conversa">Gerar conversa</option><option value="alcance">Alcançar novas pessoas</option><option value="oferta">Apresentar um serviço</option></select>';
form.querySelector('button[type="submit"]').before(goalField);

function packPlatforms(pack) {
  if (Array.isArray(pack.platforms) && pack.platforms.length) return pack.platforms;
  return [pack.channel || 'Instagram'];
}

function normalizePublishChecklist(pack) {
  const source = pack?.publishChecklist && typeof pack.publishChecklist === 'object'
    ? pack.publishChecklist
    : {};
  const normalized = {};
  packPlatforms(pack || {}).forEach(platform => {
    const item = source[platform] && typeof source[platform] === 'object' ? source[platform] : {};
    normalized[platform] = {
      reviewed: Boolean(item.reviewed),
      mediaReady: Boolean(item.mediaReady),
      published: Boolean(item.published)
    };
  });
  return normalized;
}

function checklistProgress(pack) {
  const checklist = normalizePublishChecklist(pack);
  const values = Object.values(checklist);
  const total = values.length * 3;
  const done = values.reduce((sum, item) => sum
    + Number(item.reviewed)
    + Number(item.mediaReady)
    + Number(item.published), 0);
  return { done, total };
}

async function persistPublishChecklist(pack, nextChecklist) {
  const normalized = normalizePublishChecklist({ ...pack, publishChecklist: nextChecklist });
  const updated = { ...pack, publishChecklist: normalized, time: Date.now() };

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({ publish_checklist: normalized, updated_at: new Date().toISOString() })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item)
      .sort((a, b) => b.time - a.time);
    return saved;
  }

  const local = readPacks().map(item => item.id === pack.id ? updated : item);
  localStorage.setItem(storageKey, JSON.stringify(local));
  return updated;
}

function platformDeliverable(pack, platform) {
  const ideas = splitIntoIdeas(pack.transcript);
  const lead = ideas[0] || pack.topic;
  const english = currentLocale() === 'en';
  const audiencePrefix = pack.audience
    ? (english ? `For ${pack.audience}: ` : `Para ${pack.audience}: `)
    : '';
  const hook = english
    ? `${audiencePrefix}${pack.topic} — one idea you can apply today.`
    : `${audiencePrefix}${pack.topic} — uma ideia para você aplicar hoje.`;
  const cta = callToAction(pack.goal);
  const hashtags = topicHashtags(pack.topic);

  if (platform === 'TikTok') {
    return {
      title: 'TikTok',
      lines: [
        [uiText('Gancho de 2 segundos'), hook],
        [uiText('Texto na tela'), lead.slice(0, 110)],
        [uiText('Legenda curta'), `${lead} ${cta}`],
        [uiText('Hashtags'), hashtags]
      ]
    };
  }

  if (platform === 'YouTube Shorts') {
    return {
      title: 'YouTube Shorts',
      lines: [
        [uiText('Título'), pack.topic.slice(0, 90)],
        [uiText('Abertura'), hook],
        [uiText('Descrição'), `${lead}\n\n${cta}`],
        [uiText('Hashtags'), hashtags]
      ]
    };
  }

  return {
    title: 'Instagram',
    lines: [
      [uiText('Gancho para Reels'), hook],
      [uiText('Legenda'), `${lead}\n\n${cta}`],
      [uiText('Carrossel / apoio'), ideas.slice(0, 3).map((idea, index) => `${index + 1}. ${idea}`).join('\n')],
      [uiText('Hashtags'), hashtags]
    ]
  };
}

function platformText(pack, platform) {
  const deliverable = platformDeliverable(pack, platform);
  const english = currentLocale() === 'en';
  return [
    `${english ? 'PLATFORM' : 'PLATAFORMA'}: ${deliverable.title}`,
    `${english ? 'TOPIC' : 'TEMA'}: ${pack.topic}`,
    `${english ? 'TONE' : 'TOM'}: ${toneLabel(pack.tone)}`,
    ...(pack.audience ? [`${english ? 'AUDIENCE' : 'PÚBLICO'}: ${pack.audience}`] : []),
    ...deliverable.lines.map(([label, value]) => `${label.toUpperCase()}: ${value}`)
  ].join('\n\n');
}

function packageText(pack) {
  const english = currentLocale() === 'en';
  return [
    `${english ? 'TOPIC' : 'TEMA'}: ${pack.topic}`,
    `${english ? 'GOAL' : 'OBJETIVO'}: ${pack.goal}`,
    `${english ? 'TONE' : 'TOM'}: ${toneLabel(pack.tone)}`,
    ...(pack.audience ? [`${english ? 'AUDIENCE' : 'PÚBLICO'}: ${pack.audience}`] : []),
    ...(pack.publishAt ? [`${english ? 'PLANNED DATE' : 'DATA PLANEJADA'}: ${pack.publishAt}`] : []),
    ...packPlatforms(pack).map(platform => platformText(pack, platform))
  ].join('\n\n---\n\n');
}

function exportPackage(pack) {
  const blob = new Blob([packageText(pack)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `postpilot-${pack.topic.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'pacote'}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Pacote exportado em .txt.');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Pacote copiado.');
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    showToast(copied ? 'Pacote copiado.' : 'Não foi possível copiar neste navegador.');
  }
}

function mapCloudPack(row) {
  const platforms = Array.isArray(row.platforms) && row.platforms.length ? row.platforms : ['Instagram'];
  return {
    id: row.id,
    topic: row.title,
    transcript: row.source_text,
    platforms,
    channel: platforms[0],
    tone: normalizeTone(row.tone),
    goal: row.goal || 'conversa',
    audience: row.audience || '',
    publishAt: row.publish_at || '',
    publishChecklist: row.publish_checklist && typeof row.publish_checklist === 'object' ? row.publish_checklist : {},
    status: row.status || 'draft',
    createdAt: Date.parse(row.created_at),
    time: Date.parse(row.updated_at || row.created_at)
  };
}

async function saveCloudPack(pack) {
  if (!supabaseClient || !currentUser) throw new Error('Sessão não encontrada.');
  const now = new Date().toISOString();
  const row = {
    id: pack.id,
    user_id: currentUser.id,
    title: pack.topic,
    source_type: 'transcript',
    source_text: pack.transcript,
    platforms: packPlatforms(pack),
    tone: normalizeTone(pack.tone),
    goal: pack.goal,
    audience: String(pack.audience || '').slice(0, 120),
    publish_at: pack.publishAt || null,
    publish_checklist: normalizePublishChecklist(pack),
    status: pack.status || 'draft',
    created_at: new Date(pack.createdAt || pack.time || Date.now()).toISOString(),
    updated_at: now
  };

  const { data, error } = await supabaseClient
    .from('postpilot_projects')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;

  const outputRows = packPlatforms(pack).map(platform => ({
    project_id: data.id,
    user_id: currentUser.id,
    kind: 'platform-package',
    title: 'Pacote para ' + platform,
    body: platformText(pack, platform),
    metadata: { platform, tone: normalizeTone(pack.tone), goal: pack.goal, audience: pack.audience || '', publishAt: pack.publishAt || '' }
  }));
  const { error: outputError } = await supabaseClient.from('postpilot_outputs').insert(outputRows);
  if (outputError) console.warn('PostPilot outputs não foram salvos:', outputError.message);

  return mapCloudPack(data);
}

async function loadCloudPacks() {
  if (!supabaseClient || !currentUser) return;
  cloudLoading = true;
  updateAccountUi();
  const ownerId = currentUser.id;
  const { data, error } = await supabaseClient
    .from('postpilot_projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(20);
  cloudLoading = false;
  if (currentUser?.id !== ownerId) return;

  if (error) {
    showAccountMessage('Não foi possível carregar seus projetos.');
    updateAccountUi();
    return;
  }

  cloudPacks = (data || []).map(mapCloudPack);
  renderList();
  updateAccountUi();
}

function statusLabel(status) {
  const label = ({ draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' })[status] || 'Rascunho';
  return uiText(label);
}

function formatPlannedDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
  return new Date(value + 'T12:00:00').toLocaleDateString(currentLocale());
}

function localDateKey(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function startOfCalendarWeek(offset = calendarWeekOffset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const weekday = date.getDay();
  const mondayDelta = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayDelta + offset * 7);
  return date;
}

function renderEditorialCalendar(source = visiblePacks()) {
  if (!calendarGrid || !calendarRange) return;
  const start = startOfCalendarWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  calendarRange.textContent = start.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' })
    + ' – '
    + end.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' });

  const today = localDateKey(new Date());
  calendarGrid.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    const dayPacks = source
      .filter(pack => pack.publishAt === key)
      .sort((a, b) => String(a.topic).localeCompare(String(b.topic), currentLocale()));

    return '<article class="calendar-day' + (key === today ? ' is-today' : '') + '">' +
      '<header><span>' + escapeHtml(date.toLocaleDateString(currentLocale(), { weekday: 'short' })) + '</span>' +
      '<strong>' + escapeHtml(String(date.getDate()).padStart(2, '0')) + '</strong></header>' +
      '<div class="calendar-day-items">' +
      (dayPacks.length
        ? dayPacks.map(pack =>
          '<button type="button" class="calendar-pack status-' + escapeHtml(pack.status || 'draft') + '" data-calendar-pack="' + escapeHtml(pack.id) + '">' +
            '<strong>' + escapeHtml(pack.topic) + '</strong>' +
            '<small>' + escapeHtml(statusLabel(pack.status || 'draft')) + ' · ' + escapeHtml(packPlatforms(pack).join(' + ')) + '</small>' +
          '</button>'
        ).join('')
        : '<span class="calendar-empty">' + uiText('Livre') + '</span>') +
      '</div></article>';
  }).join('');
}

function setComposerMode(pack = null, asTemplate = false) {
  editingPackId = pack && !asTemplate ? pack.id : null;
  if (composerMode) composerMode.hidden = !pack;
  if (composerModeTitle) {
    composerModeTitle.textContent = pack
      ? (asTemplate ? uiText('Usando pacote como modelo') : uiText('Editando pacote'))
      : '';
  }
  if (composerSubmitButton) {
    composerSubmitButton.textContent = editingPackId ? uiText('Salvar alterações') : uiText('Montar pacote');
  }
}

function fillComposerFromPack(pack, { asTemplate = false } = {}) {
  if (!pack) return;
  form.elements.f0.value = pack.topic || '';
  form.elements.f1.value = pack.transcript || '';
  form.elements.audience.value = pack.audience || '';
  form.elements.publishAt.value = asTemplate ? '' : (pack.publishAt || '');
  form.elements.f3.value = normalizeTone(pack.tone);
  form.elements.goal.value = pack.goal || 'conversa';

  const selected = new Set(packPlatforms(pack));
  form.querySelectorAll('[name="platforms"]').forEach(input => {
    input.checked = selected.has(input.value);
  });

  setComposerMode(pack, asTemplate);
  form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  form.elements.f0.focus();
  showToast(asTemplate ? 'Modelo carregado. Ajuste e gere um novo pacote.' : 'Pacote aberto para edição.');
}

function cancelComposerEdit({ reset = false } = {}) {
  editingPackId = null;
  if (composerMode) composerMode.hidden = true;
  if (composerSubmitButton) composerSubmitButton.textContent = uiText('Montar pacote');
  if (reset) form.reset();
}


function renderProductionSummary(source) {
  if (!productionSummary) return;
  const total = source.length;
  const ready = source.filter(pack => (pack.status || 'draft') === 'ready').length;
  const published = source.filter(pack => (pack.status || 'draft') === 'published').length;
  const today = new Date().toISOString().slice(0, 10);
  const scheduled = source.filter(pack => pack.publishAt && pack.publishAt >= today && (pack.status || 'draft') !== 'published').length;
  const rate = total ? Math.round((published / total) * 100) : 0;
  productionSummary.innerHTML =
    '<article><span>' + uiText('Total') + '</span><strong>' + total + '</strong></article>' +
    '<article><span>' + uiText('Prontos') + '</span><strong>' + ready + '</strong></article>' +
    '<article><span>' + uiText('Agendados') + '</span><strong>' + scheduled + '</strong></article>' +
    '<article><span>' + uiText('Taxa publicada') + '</span><strong>' + rate + '%</strong></article>';
}

function renderList() {
  const filter = projectStatusFilter?.value || 'all';
  const searchTerm = String(projectSearch?.value || '').trim().toLocaleLowerCase(currentLocale());
  const source = currentUser ? visiblePacks() : visiblePacks().slice().reverse();
  renderProductionSummary(source);
  renderEditorialCalendar(source);
  const normalized = source
    .filter(pack => filter === 'all' || (pack.status || 'draft') === filter)
    .filter(pack => {
      if (!searchTerm) return true;
      return [pack.topic, pack.audience, ...packPlatforms(pack)]
        .some(value => String(value || '').toLocaleLowerCase(currentLocale()).includes(searchTerm));
    })
    .slice(0, 10);

  list.innerHTML = normalized.length
    ? normalized.map(pack => {
      const platforms = packPlatforms(pack);
      const status = pack.status || 'draft';
      return `
      <div class="item">
        <div class="item-summary">
          <div class="item-title-line"><strong>${escapeHtml(pack.topic)}</strong><span class="project-status status-${escapeHtml(status)}">${statusLabel(status)}</span></div>
          <small>${platforms.map(escapeHtml).join(' · ')} · ${new Date(pack.time).toLocaleString(currentLocale())}</small>
          ${pack.audience ? '<small class="planning-meta">' + escapeHtml(uiText('Público')) + ': ' + escapeHtml(pack.audience) + '</small>' : ''}
          ${pack.publishAt ? '<small class="planning-meta">' + escapeHtml(uiText('Planejado para')) + ' ' + escapeHtml(formatPlannedDate(pack.publishAt)) + '</small>' : ''}
        </div>
        <div class="item-actions">
          <select class="project-status-select" data-status-id="${escapeHtml(pack.id)}" aria-label="Status do projeto">
            <option value="draft"${status === 'draft' ? ' selected' : ''}>Rascunho</option>
            <option value="ready"${status === 'ready' ? ' selected' : ''}>Pronto</option>
            <option value="published"${status === 'published' ? ' selected' : ''}>Publicado</option>
          </select>
          <button class="secondary" type="button" data-pack="${escapeHtml(pack.id)}">Abrir</button>
          <button class="secondary" type="button" data-edit-pack="${escapeHtml(pack.id)}">${uiText('Editar')}</button>
          <button class="secondary" type="button" data-template-pack="${escapeHtml(pack.id)}">${uiText('Usar como modelo')}</button>
          <button class="secondary" type="button" data-delete="${escapeHtml(pack.id)}" aria-label="${uiText('Excluir pacote')}">${uiText('Excluir')}</button>
        </div>
      </div>`;
    }).join('')
    : '<div class="empty">' + uiText('Nenhum pacote encontrado neste filtro.') + '</div>';
}

function renderPack(pack) {
  openedPackId = pack.id;
  const checklist = normalizePublishChecklist(pack);
  const cards = packPlatforms(pack).map(platform => {
    const deliverable = platformDeliverable(pack, platform);
    const state = checklist[platform];
    const platformProgress = Number(state.reviewed) + Number(state.mediaReady) + Number(state.published);
    return `
      <article class="platform-card">
        <div class="platform-card-head"><div><h4>${escapeHtml(deliverable.title)}</h4><small class="platform-progress">${platformProgress}/3 ${uiText('concluídos')}</small></div><button class="copy-platform" type="button" data-copy-platform="${escapeHtml(platform)}">${uiText('Copiar')}</button></div>
        ${deliverable.lines.map(([label, value]) => `<div class="deliverable"><span>${escapeHtml(label)}</span><p>${escapeHtml(value).replace(/\n/g, '<br>')}</p></div>`).join('')}
        <fieldset class="publish-checklist">
          <legend>${uiText('Checklist de publicação')}</legend>
          <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="reviewed"${state.reviewed ? ' checked' : ''}><span>${uiText('Texto revisado')}</span></label>
          <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="mediaReady"${state.mediaReady ? ' checked' : ''}><span>${uiText('Mídia pronta')}</span></label>
          <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="published"${state.published ? ' checked' : ''}><span>${uiText('Publicado na plataforma')}</span></label>
        </fieldset>
      </article>`;
  }).join('');

  const checklistStats = checklistProgress(pack);
  result.innerHTML = `
    <div class="result-heading">
      <div><h3>${escapeHtml(pack.topic)}</h3><p>${packPlatforms(pack).length} ${packPlatforms(pack).length > 1 ? uiText('plataformas') : uiText('plataforma')} · ${escapeHtml(toneLabel(pack.tone))}${pack.audience ? ' · ' + escapeHtml(uiText('Público')) + ': ' + escapeHtml(pack.audience) : ''}${pack.publishAt ? ' · ' + escapeHtml(uiText('Planejado para')) + ' ' + escapeHtml(formatPlannedDate(pack.publishAt)) : ''}</p><small class="pack-checklist-progress">${uiText('Checklist')}: ${checklistStats.done}/${checklistStats.total}</small></div>
      <span class="project-status status-${escapeHtml(pack.status || 'draft')}">${statusLabel(pack.status || 'draft')}</span>
    </div>
    <div class="platform-grid">${cards}</div>
    <p class="generator-note"><small>${currentUser ? 'Projeto sincronizado na sua conta.' : 'Projeto salvo neste dispositivo.'} O gerador atual usa regras locais, sem IA externa.</small></p>
    <div class="result-actions"><button class="secondary" id="edit-pack" type="button">${uiText('Editar')}</button><button class="secondary" id="template-pack" type="button">${uiText('Usar como modelo')}</button><button class="secondary" id="copy" type="button">${uiText('Copiar pacote completo')}</button><button class="secondary" id="export" type="button">${uiText('Exportar .txt')}</button></div>`;
  result.classList.add('show');
  document.querySelector('#edit-pack').addEventListener('click', () => fillComposerFromPack(pack));
  document.querySelector('#template-pack').addEventListener('click', () => fillComposerFromPack(pack, { asTemplate: true }));
  document.querySelector('#copy').addEventListener('click', () => copyText(packageText(pack)));
  document.querySelector('#export').addEventListener('click', () => exportPackage(pack));
  result.querySelectorAll('[data-copy-platform]').forEach(button => {
    button.addEventListener('click', () => copyText(platformText(pack, button.dataset.copyPlatform)));
  });
  result.querySelectorAll('[data-check-platform]').forEach(input => {
    input.addEventListener('change', async () => {
      input.disabled = true;
      const platform = input.dataset.checkPlatform;
      const step = input.dataset.checkStep;
      const current = normalizePublishChecklist(pack);
      current[platform][step] = input.checked;
      try {
        const saved = await persistPublishChecklist(pack, current);
        renderPack(saved);
        renderList();
        const progress = checklistProgress(saved);
        showToast(progress.total > 0 && progress.done === progress.total
          ? 'Checklist completo. Você pode marcar o pacote como publicado.'
          : 'Checklist atualizado.');
      } catch (error) {
        console.error(error);
        input.disabled = false;
        input.checked = !input.checked;
        showToast('Não foi possível atualizar o checklist.');
      }
    });
  });
}

function showAccountMessage(message) {
  accountMessage.textContent = message;
}

function updateAccountUi() {
  const localCount = readPacks().length;
  accountOpenButton.disabled = !supabaseClient;
  accountOpenButton.textContent = currentUser ? 'Minha conta' : 'Entrar / sincronizar';
  syncStatus.textContent = currentUser
    ? (cloudLoading ? 'Sincronizando…' : 'Nuvem · ' + (currentUser.email || 'conta conectada'))
    : (supabaseClient ? 'Salvo neste dispositivo' : 'Modo local');

  accountForm.hidden = !supabaseClient || Boolean(currentUser);
  accountProfile.hidden = !currentUser;
  if (localBackupControls) localBackupControls.hidden = Boolean(currentUser);
  if (currentUser) {
    document.querySelector('#account-email').textContent = currentUser.email || 'Conta conectada';
    localImportBanner.hidden = localCount === 0;
    document.querySelector('#local-import-count').textContent = String(localCount);
  } else {
    localImportBanner.hidden = true;
  }
}

function authErrorText(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (message.includes('already registered')) return 'Este e-mail já possui conta.';
  if (message.includes('password should be at least')) return 'Use uma senha com pelo menos 8 caracteres.';
  return 'Não foi possível concluir. Confira os dados e tente novamente.';
}

async function importLocalPacks() {
  if (!currentUser) return;
  const local = readPacks();
  if (!local.length) return;
  localImportButton.disabled = true;
  showAccountMessage('Importando pacotes deste dispositivo…');

  try {
    const normalized = local.map(pack => ({
      ...pack,
      id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pack.id)
        ? pack.id : makeUuid()
    }));

    for (const pack of normalized) {
      const saved = await saveCloudPack(pack);
      cloudPacks = [saved, ...cloudPacks.filter(item => item.id !== saved.id)]
        .sort((a, b) => b.time - a.time)
        .slice(0, 20);
    }
    localStorage.removeItem(storageKey);
    renderList();
    updateAccountUi();
    showAccountMessage('Importação concluída.');
  } catch (error) {
    console.error(error);
    showAccountMessage('Não foi possível concluir a importação. Os dados locais foram preservados.');
  } finally {
    localImportButton.disabled = false;
  }
}

function initAccount() {
  accountOpenButton.addEventListener('click', () => accountDialog.showModal());
  accountCloseButton.addEventListener('click', () => accountDialog.close());
  accountDialog.addEventListener('click', event => {
    if (event.target === accountDialog) accountDialog.close();
  });

  accountForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const button = accountForm.querySelector('[type="submit"]');
    button.disabled = true;
    showAccountMessage('Entrando…');
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: accountForm.elements.email.value.trim(),
        password: accountForm.elements.password.value
      });
      if (error) throw error;
      showAccountMessage('Conta conectada.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#sign-up').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const email = accountForm.elements.email.value.trim();
    const password = accountForm.elements.password.value;
    if (!email || password.length < 8) {
      showAccountMessage('Informe um e-mail e uma senha com pelo menos 8 caracteres.');
      return;
    }
    const button = document.querySelector('#sign-up');
    button.disabled = true;
    showAccountMessage('Criando conta…');
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showAccountMessage(data.session
        ? 'Conta criada e conectada.'
        : 'Conta criada. Confirme o e-mail e depois entre.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#reset-password').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const email = accountForm.elements.email.value.trim();
    if (!email) {
      showAccountMessage('Informe seu e-mail primeiro.');
      return;
    }
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href.split('#')[0]
      });
      if (error) throw error;
      showAccountMessage('Se o e-mail estiver cadastrado, enviaremos um link de recuperação.');
    } catch (error) {
      showAccountMessage(authErrorText(error));
    }
  });

  document.querySelector('#sign-out').addEventListener('click', async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    showAccountMessage(error ? 'Não foi possível sair.' : 'Você saiu da conta.');
  });

  localImportButton.addEventListener('click', importLocalPacks);

  if (!supabaseClient) {
    showAccountMessage('Sincronização indisponível. O modo local continua funcionando.');
    updateAccountUi();
    return;
  }

  let activeUserId = null;
  const setSession = session => {
    const user = session?.user || null;
    if (user?.id === activeUserId) return;
    activeUserId = user?.id || null;
    currentUser = user;
    cloudPacks = [];
    updateAccountUi();
    if (user) window.setTimeout(loadCloudPacks, 0);
    else renderList();
  };

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => setSession(session), 0);
  });

  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showAccountMessage('Não foi possível verificar a sessão. O modo local continua disponível.');
    else setSession(data.session);
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const platforms = Array.from(form.querySelectorAll('[name="platforms"]:checked')).map(input => input.value);
  if (!platforms.length) {
    showToast('Escolha pelo menos uma plataforma.');
    return;
  }
  const existing = editingPackId ? visiblePacks().find(item => item.id === editingPackId) : null;
  const pack = {
    id: existing?.id || makeUuid(),
    topic: values.f0.trim(),
    transcript: values.f1.trim(),
    platforms,
    channel: platforms[0],
    tone: normalizeTone(values.f3),
    goal: values.goal,
    audience: String(values.audience || '').trim(),
    publishAt: String(values.publishAt || ''),
    publishChecklist: existing ? normalizePublishChecklist(existing) : {},
    status: existing?.status || 'draft',
    createdAt: existing?.createdAt || existing?.time || Date.now(),
    time: Date.now()
  };

  if (currentUser) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const saved = await saveCloudPack(pack);
      cloudPacks = [saved, ...cloudPacks.filter(item => item.id !== saved.id)].slice(0, 20);
      renderPack(saved);
      renderList();
      cancelComposerEdit();
      showToast(existing ? 'Alterações salvas na sua conta.' : 'Pacote salvo na sua conta.');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível sincronizar. Tente novamente.');
    } finally {
      submit.disabled = false;
    }
    return;
  }

  const packs = existing
    ? readPacks().map(item => item.id === pack.id ? pack : item)
    : [...readPacks(), pack];
  localStorage.setItem(storageKey, JSON.stringify(packs.slice(-20)));
  renderPack(pack);
  renderList();
  cancelComposerEdit();
  showToast(existing ? 'Alterações salvas neste dispositivo.' : 'Pacote salvo neste dispositivo.');
});

projectStatusFilter?.addEventListener('change', renderList);
projectSearch?.addEventListener('input', renderList);
exportBackupButton?.addEventListener('click', exportLocalBackup);
importBackupButton?.addEventListener('click', () => importBackupFile?.click());
importBackupFile?.addEventListener('change', async () => {
  const file = importBackupFile.files?.[0];
  try {
    await restoreLocalBackup(file);
  } finally {
    importBackupFile.value = '';
  }
});
composerCancelButton?.addEventListener('click', () => {
  cancelComposerEdit({ reset: true });
  showToast('Edição cancelada.');
});
calendarPrevButton?.addEventListener('click', () => {
  calendarWeekOffset -= 1;
  renderEditorialCalendar();
});
calendarTodayButton?.addEventListener('click', () => {
  calendarWeekOffset = 0;
  renderEditorialCalendar();
});
calendarNextButton?.addEventListener('click', () => {
  calendarWeekOffset += 1;
  renderEditorialCalendar();
});
calendarGrid?.addEventListener('click', event => {
  const button = event.target.closest('[data-calendar-pack]');
  if (!button) return;
  const pack = visiblePacks().find(item => item.id === button.dataset.calendarPack);
  if (pack) renderPack(pack);
});
window.addEventListener('app-language-change', () => {
  renderList();
  const pack = visiblePacks().find(item => item.id === openedPackId);
  if (pack) renderPack(pack);
});

list.addEventListener('change', async event => {
  const select = event.target.closest('[data-status-id]');
  if (!select) return;
  const pack = visiblePacks().find(item => item.id === select.dataset.statusId);
  if (!pack) return;
  const nextStatus = select.value;
  if (!['draft', 'ready', 'published'].includes(nextStatus)) return;

  const updated = { ...pack, status: nextStatus, time: Date.now() };
  select.disabled = true;
  try {
    if (currentUser) {
      const { data, error } = await supabaseClient
        .from('postpilot_projects')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', pack.id)
        .select('*')
        .single();
      if (error) throw error;
      const saved = mapCloudPack(data);
      cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item)
        .sort((a, b) => b.time - a.time);
    } else {
      const local = readPacks().map(item => item.id === updated.id ? updated : item);
      localStorage.setItem(storageKey, JSON.stringify(local));
    }
    renderList();
    showToast('Projeto marcado como ' + statusLabel(nextStatus).toLowerCase() + '.');
  } catch (error) {
    console.error(error);
    select.disabled = false;
    showToast('Não foi possível atualizar o status.');
  }
});

list.addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-pack]');
  if (editButton) {
    const pack = visiblePacks().find(item => item.id === editButton.dataset.editPack);
    if (pack) fillComposerFromPack(pack);
    return;
  }

  const templateButton = event.target.closest('[data-template-pack]');
  if (templateButton) {
    const pack = visiblePacks().find(item => item.id === templateButton.dataset.templatePack);
    if (pack) fillComposerFromPack(pack, { asTemplate: true });
    return;
  }

  const removeButton = event.target.closest('[data-delete]');
  if (removeButton) {
    if (!window.confirm(currentUser ? 'Excluir este pacote da sua conta?' : 'Excluir este pacote deste dispositivo?')) return;
    const id = removeButton.dataset.delete;

    if (currentUser) {
      const { error } = await supabaseClient.from('postpilot_projects').delete().eq('id', id);
      if (error) {
        showToast('Não foi possível excluir o pacote.');
        return;
      }
      cloudPacks = cloudPacks.filter(item => item.id !== id);
      showToast('Pacote removido da sua conta.');
    } else {
      localStorage.setItem(storageKey, JSON.stringify(readPacks().filter(item => item.id !== id)));
      showToast('Pacote removido deste dispositivo.');
    }
    renderList();
    return;
  }

  const button = event.target.closest('[data-pack]');
  if (!button) return;
  const pack = visiblePacks().find(item => item.id === button.dataset.pack);
  if (pack) renderPack(pack);
});

renderList();
initAccount();
