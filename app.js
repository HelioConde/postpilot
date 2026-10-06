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

let currentUser = null;
let cloudPacks = [];
let cloudLoading = false;
let openedPackId = null;

function currentLocale() {
  return window.AppI18n?.locale?.() || 'pt-BR';
}

function uiText(value) {
  return window.AppI18n?.t?.(value) || value;
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
    `${english ? 'TONE' : 'TOM'}: ${pack.tone}`,
    ...(pack.audience ? [`${english ? 'AUDIENCE' : 'PÚBLICO'}: ${pack.audience}`] : []),
    ...deliverable.lines.map(([label, value]) => `${label.toUpperCase()}: ${value}`)
  ].join('\n\n');
}

function packageText(pack) {
  const english = currentLocale() === 'en';
  return [
    `${english ? 'TOPIC' : 'TEMA'}: ${pack.topic}`,
    `${english ? 'GOAL' : 'OBJETIVO'}: ${pack.goal}`,
    `${english ? 'TONE' : 'TOM'}: ${pack.tone}`,
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
    tone: row.tone || 'Natural e direto',
    goal: row.goal || 'conversa',
    audience: row.audience || '',
    publishAt: row.publish_at || '',
    status: row.status || 'draft',
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
    tone: pack.tone,
    goal: pack.goal,
    audience: String(pack.audience || '').slice(0, 120),
    publish_at: pack.publishAt || null,
    status: pack.status || 'draft',
    created_at: new Date(pack.time || Date.now()).toISOString(),
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
    metadata: { platform, tone: pack.tone, goal: pack.goal, audience: pack.audience || '', publishAt: pack.publishAt || '' }
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
          <button class="secondary" type="button" data-delete="${escapeHtml(pack.id)}" aria-label="Excluir pacote">Excluir</button>
        </div>
      </div>`;
    }).join('')
    : '<div class="empty">' + uiText('Nenhum pacote encontrado neste filtro.') + '</div>';
}

function renderPack(pack) {
  openedPackId = pack.id;
  const cards = packPlatforms(pack).map(platform => {
    const deliverable = platformDeliverable(pack, platform);
    return `
      <article class="platform-card">
        <div class="platform-card-head"><h4>${escapeHtml(deliverable.title)}</h4><button class="copy-platform" type="button" data-copy-platform="${escapeHtml(platform)}">Copiar</button></div>
        ${deliverable.lines.map(([label, value]) => `<div class="deliverable"><span>${escapeHtml(label)}</span><p>${escapeHtml(value).replace(/\n/g, '<br>')}</p></div>`).join('')}
      </article>`;
  }).join('');

  result.innerHTML = `
    <div class="result-heading">
      <div><h3>${escapeHtml(pack.topic)}</h3><p>${packPlatforms(pack).length} ${packPlatforms(pack).length > 1 ? uiText('plataformas') : uiText('plataforma')} · ${escapeHtml(pack.tone)}${pack.audience ? ' · ' + escapeHtml(uiText('Público')) + ': ' + escapeHtml(pack.audience) : ''}${pack.publishAt ? ' · ' + escapeHtml(uiText('Planejado para')) + ' ' + escapeHtml(formatPlannedDate(pack.publishAt)) : ''}</p></div>
      <span class="project-status status-${escapeHtml(pack.status || 'draft')}">${statusLabel(pack.status || 'draft')}</span>
    </div>
    <div class="platform-grid">${cards}</div>
    <p class="generator-note"><small>${currentUser ? 'Projeto sincronizado na sua conta.' : 'Projeto salvo neste dispositivo.'} O gerador atual usa regras locais, sem IA externa.</small></p>
    <div class="result-actions"><button class="secondary" id="copy" type="button">Copiar pacote completo</button><button class="secondary" id="export" type="button">Exportar .txt</button></div>`;
  result.classList.add('show');
  document.querySelector('#copy').addEventListener('click', () => copyText(packageText(pack)));
  document.querySelector('#export').addEventListener('click', () => exportPackage(pack));
  result.querySelectorAll('[data-copy-platform]').forEach(button => {
    button.addEventListener('click', () => copyText(platformText(pack, button.dataset.copyPlatform)));
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
  const pack = {
    id: makeUuid(),
    topic: values.f0.trim(),
    transcript: values.f1.trim(),
    platforms,
    channel: platforms[0],
    tone: values.f3,
    goal: values.goal,
    audience: String(values.audience || '').trim(),
    publishAt: String(values.publishAt || ''),
    status: 'draft',
    time: Date.now()
  };

  if (currentUser) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const saved = await saveCloudPack(pack);
      cloudPacks = [saved, ...cloudPacks].slice(0, 20);
      renderPack(saved);
      renderList();
      showToast('Pacote salvo na sua conta.');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível sincronizar. Tente novamente.');
    } finally {
      submit.disabled = false;
    }
    return;
  }

  const packs = readPacks();
  packs.push(pack);
  localStorage.setItem(storageKey, JSON.stringify(packs.slice(-20)));
  renderPack(pack);
  renderList();
  showToast('Pacote salvo neste dispositivo.');
});

projectStatusFilter?.addEventListener('change', renderList);
projectSearch?.addEventListener('input', renderList);
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
