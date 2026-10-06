(() => {
  const QUEUE_KEY = 'postpilot-beta-feedback-queue-v1';
  const BACKOFF_KEY = 'postpilot-beta-feedback-backoff-v1';
  const MAX_QUEUE = 20;
  const BACKOFF_MS = 10 * 60 * 1000;
  const endpointName = 'postpilot-beta-feedback';

  const card = document.querySelector('#beta-feedback-card');
  const openButton = document.querySelector('#beta-feedback-open');
  const dialog = document.querySelector('#beta-feedback-dialog');
  const form = document.querySelector('#beta-feedback-form');
  const closeButton = document.querySelector('#beta-feedback-close');
  const cancelButton = document.querySelector('#beta-feedback-cancel');
  const status = document.querySelector('#beta-feedback-status');
  const count = document.querySelector('#beta-feedback-count');
  const queueCount = document.querySelector('#beta-feedback-queue-count');

  if (!card || !openButton || !dialog || !form) return;

  function t(value) {
    return window.AppI18n?.t?.(value) || value;
  }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value.slice(-MAX_QUEUE) : [];
    } catch {
      return [];
    }
  }

  function writeQueue(items) {
    const queue = Array.isArray(items) ? items.slice(-MAX_QUEUE) : [];
    try {
      if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      else localStorage.removeItem(QUEUE_KEY);
    } catch {}
    renderQueueCount(queue.length);
  }

  function renderQueueCount(size = readQueue().length) {
    if (!queueCount) return;
    queueCount.hidden = size === 0;
    queueCount.textContent = size ? String(size) : '';
    openButton.setAttribute(
      'aria-label',
      size ? t('Dar feedback') + ' · ' + size + ' ' + t('aguardando envio') : t('Dar feedback')
    );
  }

  function viewportKind() {
    if (innerWidth < 600) return 'mobile';
    if (innerWidth < 1024) return 'tablet';
    return 'desktop';
  }

  function buildFeedback(values) {
    return {
      id: crypto.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(16).slice(2),
      rating: Number(values.get('rating')),
      category: String(values.get('category') || '').slice(0, 24),
      comment: String(values.get('comment') || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500),
      website: String(values.get('website') || '').slice(0, 80),
      locale: document.documentElement.lang === 'en' ? 'en' : 'pt-BR',
      viewport: viewportKind(),
      displayMode: matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      online: navigator.onLine,
      appVersion: '2026-10-06',
      createdAt: new Date().toISOString()
    };
  }

  function validFeedback(item) {
    return item
      && Number.isInteger(item.rating)
      && item.rating >= 1
      && item.rating <= 5
      && ['usability', 'quality', 'bug', 'idea', 'other'].includes(item.category)
      && typeof item.comment === 'string'
      && item.comment.length >= 2
      && item.comment.length <= 500
      && !item.website;
  }

  async function sendRemote(item) {
    const client = window.POSTPILOT_SUPABASE?.client;
    if (!client || !navigator.onLine) return false;
    const { error } = await client.functions.invoke(endpointName, { body: item });
    if (error) throw error;
    return true;
  }

  function backendInBackoff() {
    try {
      return Number(sessionStorage.getItem(BACKOFF_KEY) || 0) > Date.now();
    } catch {
      return false;
    }
  }

  function setBackendBackoff() {
    try {
      sessionStorage.setItem(BACKOFF_KEY, String(Date.now() + BACKOFF_MS));
    } catch {}
  }

  async function flushQueue({ force = false } = {}) {
    if (!force && backendInBackoff()) return;
    const queue = readQueue().filter(validFeedback);
    if (!queue.length) {
      writeQueue([]);
      return;
    }

    const remaining = [];
    let backendFailed = false;
    for (const item of queue) {
      if (backendFailed) {
        remaining.push(item);
        continue;
      }
      try {
        const sent = await sendRemote(item);
        if (!sent) {
          remaining.push(item);
          backendFailed = true;
        }
      } catch {
        remaining.push(item);
        backendFailed = true;
        setBackendBackoff();
      }
    }
    writeQueue(remaining);
  }

  function closeDialog() {
    dialog.close();
    if (status) status.textContent = '';
  }

  openButton.addEventListener('click', () => {
    form.reset();
    if (count) count.textContent = '0';
    if (status) status.textContent = '';
    dialog.showModal();
    dialog.querySelector('input[name="rating"]')?.focus();
  });

  closeButton?.addEventListener('click', closeDialog);
  cancelButton?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  form.elements.comment?.addEventListener('input', () => {
    if (count) count.textContent = String(form.elements.comment.value.length);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector('[type="submit"]');
    const item = buildFeedback(new FormData(form));
    if (!validFeedback(item)) {
      if (status) status.textContent = t('Confira a nota e o comentário.');
      return;
    }

    submit.disabled = true;
    if (status) status.textContent = t('Enviando feedback…');
    try {
      if (!backendInBackoff() && await sendRemote(item)) {
        if (status) status.textContent = t('Feedback enviado. Obrigado!');
        window.setTimeout(closeDialog, 900);
        return;
      }
    } catch {
      setBackendBackoff();
    } finally {
      submit.disabled = false;
    }

    const queue = readQueue();
    if (!queue.some(entry => entry.id === item.id)) queue.push(item);
    writeQueue(queue);
    if (status) status.textContent = t('Feedback salvo. Vamos enviar automaticamente quando o serviço estiver disponível.');
    window.setTimeout(closeDialog, 1200);
  });

  window.addEventListener('online', () => flushQueue({ force: true }));
  window.addEventListener('app-language-change', () => renderQueueCount());
  renderQueueCount();
  window.setTimeout(() => flushQueue(), 1200);
})();
