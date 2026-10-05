const form = document.querySelector('#form');
const result = document.querySelector('#result');
const list = document.querySelector('#list');
const storageKey = 'postpilot-packs';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function readPacks() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function showToast(message) {
  let toast = document.querySelector('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('on');
  window.setTimeout(() => toast.classList.remove('on'), 1800);
}

function splitIntoIdeas(transcript) {
  const sentences = transcript
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20);

  if (sentences.length) return sentences.slice(0, 3);
  const clean = transcript.trim();
  if (!clean) return [];
  return [clean.slice(0, 220)];
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
  const words = topic.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '').match(/[a-z0-9]+/g) || [];
  return [...new Set(words.filter(word => word.length > 3).slice(0, 3).concat(['criadores', 'conteudo']))].map(word => '#' + word).join(' ');
}
const goalField = document.createElement('label');
goalField.className = 'field';
goalField.innerHTML = '<span>Objetivo do conteúdo</span><select name="goal"><option value="conversa">Gerar conversa</option><option value="alcance">Alcançar novas pessoas</option><option value="oferta">Apresentar um serviço</option></select>';
form.querySelector('button').before(goalField);

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

function renderList() {
  const packs = readPacks().slice(-5).reverse();
  list.innerHTML = packs.length
    ? packs.map(pack => `
      <div class="item"><div><strong>${escapeHtml(pack.topic)}</strong>
        <small>${new Date(pack.time).toLocaleString('pt-BR')}</small></div>
        <button class="secondary" type="button" data-pack="${escapeHtml(pack.id)}">Abrir</button>
        <button class="secondary" type="button" data-delete="${escapeHtml(pack.id)}" aria-label="Excluir pacote">Excluir</button>
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
    <p><small>Rascunho local para revisar; este protótipo não usa IA.</small></p>
    <button class="secondary" id="copy" type="button" style="margin-top:12px">Copiar pacote completo</button>`;
  result.classList.add('show');
  document.querySelector('#copy').addEventListener('click', () => copyText(packageText(pack)));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const pack = {
    id: crypto.randomUUID?.() || String(Date.now()),
    topic: values.f0.trim(), transcript: values.f1.trim(), channel: values.f2, tone: values.f3, goal: values.goal,
    time: Date.now()
  };
  const packs = readPacks();
  packs.push(pack);
  localStorage.setItem(storageKey, JSON.stringify(packs.slice(-20)));
  renderPack(pack);
  renderList();
});

list.addEventListener('click', event => {
  const removeButton = event.target.closest('[data-delete]');
  if (removeButton) {
    if (!window.confirm('Excluir este pacote do histórico salvo neste navegador?')) return;
    const id = removeButton.dataset.delete;
    localStorage.setItem(storageKey, JSON.stringify(readPacks().filter(item => item.id !== id)));
    renderList();
    showToast('Pacote removido do histórico.');
    return;
  }
  const button = event.target.closest('[data-pack]');
  if (!button) return;
  const pack = readPacks().find(item => item.id === button.dataset.pack);
  if (pack) renderPack(pack);
});

renderList();
