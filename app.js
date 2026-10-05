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

function packageText(pack) {
  const ideas = splitIntoIdeas(pack.transcript);
  const clips = ideas.map((idea, index) => `IDEIA DE CORTE ${index + 1}\n${idea}`);
  return [
    `TEMA: ${pack.topic}`,
    `CANAL: ${pack.channel}`,
    `TOM: ${pack.tone}`,
    `GANCHO: ${pack.topic} — uma ideia para você aplicar hoje.`,
    ...clips,
    `LEGENDA: Qual parte mais chamou sua atenção sobre ${pack.topic}? Conte nos comentários.`
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
      </div>`).join('')
    : '<div class="empty">Seus pacotes recentes aparecem aqui.</div>';
}

function renderPack(pack) {
  const ideas = splitIntoIdeas(pack.transcript);
  const hook = `${pack.topic} — uma ideia para você aplicar hoje.`;
  const caption = `Qual parte mais chamou sua atenção sobre ${pack.topic}? Conte nos comentários.`;
  result.innerHTML = `
    <h3>Rascunhos para ${escapeHtml(pack.channel)}</h3>
    <p><b>Gancho sugerido:</b> ${escapeHtml(hook)}</p>
    <p><b>Tom:</b> ${escapeHtml(pack.tone)}</p>
    <h4>Ideias de trechos para revisar</h4>
    <ol>${ideas.map(idea => `<li>${escapeHtml(idea)}</li>`).join('')}</ol>
    <p><b>Legenda sugerida:</b> ${escapeHtml(caption)}</p>
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
    topic: values.f0.trim(), transcript: values.f1.trim(), channel: values.f2, tone: values.f3,
    time: Date.now()
  };
  const packs = readPacks();
  packs.push(pack);
  localStorage.setItem(storageKey, JSON.stringify(packs.slice(-20)));
  renderPack(pack);
  renderList();
});

list.addEventListener('click', event => {
  const button = event.target.closest('[data-pack]');
  if (!button) return;
  const pack = readPacks().find(item => item.id === button.dataset.pack);
  if (pack) renderPack(pack);
});

renderList();
