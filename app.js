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

let currentUser = null;
let cloudPacks = [];
let cloudLoading = false;

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
  const messages = {
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

function packageText(pack) {
  const ideas = splitIntoIdeas(pack.transcript);
  const clips = ideas.map((idea, index) => `IDEIA DE CORTE ${index + 1}\n${idea}`);
  return [
    `TEMA: ${pack.topic}`,
    `CANAL: ${pack.channel}`,
    `TOM: ${pack.tone}`,
    `GANCHO: ${pack.topic} — uma ideia para você aplicar hoje.`,
    ...clips,
    `LEGENDA: ${ideas[0] || pack.topic}\n\n${callToAction(pack.goal)}`,
    `HASHTAGS: ${topicHashtags(pack.topic)}`
  ].join('\n\n');
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
  return {
    id: row.id,
    topic: row.title,
    transcript: row.source_text,
    channel: Array.isArray(row.platforms) && row.platforms[0] ? row.platforms[0] : 'Instagram',
    tone: row.tone || 'Natural e direto',
    goal: row.goal || 'conversa',
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
    platforms: [pack.channel],
    tone: pack.tone,
    goal: pack.goal,
    status: 'draft',
    created_at: new Date(pack.time || Date.now()).toISOString(),
    updated_at: now
  };

  const { data, error } = await supabaseClient
    .from('postpilot_projects')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;

  const { error: outputError } = await supabaseClient.from('postpilot_outputs').insert({
    project_id: data.id,
    user_id: currentUser.id,
    kind: 'package',
    title: 'Pacote para ' + pack.channel,
    body: packageText(pack),
    metadata: { channel: pack.channel, tone: pack.tone, goal: pack.goal }
  });
  if (outputError) console.warn('PostPilot output não foi salvo:', outputError.message);

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

function renderList() {
  const packs = visiblePacks().slice(0, 5);
  const normalized = currentUser ? packs : packs.slice().reverse();
  list.innerHTML = normalized.length
    ? normalized.map(pack => `
      <div class="item"><div><strong>${escapeHtml(pack.topic)}</strong>
        <small>${new Date(pack.time).toLocaleString('pt-BR')}</small></div>
        <div class="item-actions">
          <button class="secondary" type="button" data-pack="${escapeHtml(pack.id)}">Abrir</button>
          <button class="secondary" type="button" data-delete="${escapeHtml(pack.id)}" aria-label="Excluir pacote">Excluir</button>
        </div>
      </div>`).join('')
    : '<div class="empty">Seus pacotes recentes aparecem aqui.</div>';
}

function renderPack(pack) {
  const ideas = splitIntoIdeas(pack.transcript);
  const hook = `${pack.topic} — uma ideia para você aplicar hoje.`;
  const caption = callToAction(pack.goal);
  result.innerHTML = `
    <h3>Rascunhos para ${escapeHtml(pack.channel)}</h3>
    <p><b>Gancho sugerido:</b> ${escapeHtml(hook)}</p>
    <p><b>Tom:</b> ${escapeHtml(pack.tone)}</p>
    <h4>Ideias de trechos para revisar</h4>
    <ol>${ideas.map(idea => `<li>${escapeHtml(idea)}</li>`).join('')}</ol>
    <p><b>Legenda sugerida:</b> ${escapeHtml(ideas[0] || pack.topic)} ${escapeHtml(caption)}</p>
    <p><b>Hashtags sugeridas:</b> ${escapeHtml(topicHashtags(pack.topic))}</p>
    <p><small>${currentUser ? 'Projeto sincronizado na sua conta.' : 'Projeto salvo neste dispositivo.'} O gerador atual usa regras locais, sem IA externa.</small></p>
    <button class="secondary" id="copy" type="button">Copiar pacote completo</button>`;
  result.classList.add('show');
  document.querySelector('#copy').addEventListener('click', () => copyText(packageText(pack)));
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
  const pack = {
    id: makeUuid(),
    topic: values.f0.trim(),
    transcript: values.f1.trim(),
    channel: values.f2,
    tone: values.f3,
    goal: values.goal,
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
