(function () {
  const form = document.querySelector('#form');
  if (!form) return;

  const storageKey = 'postpilot-composer-draft-v1';
  const recovery = document.querySelector('#composer-recovery');
  const recoveryText = document.querySelector('#composer-recovery-text');
  const restoreButton = document.querySelector('#composer-draft-restore');
  const discardButton = document.querySelector('#composer-draft-discard');
  const progress = document.querySelector('#briefing-progress');
  const progressBar = document.querySelector('#briefing-progress-bar');
  const progressValue = document.querySelector('#briefing-progress-value');
  const progressHint = document.querySelector('#briefing-progress-hint');
  const draftStatus = document.querySelector('#composer-draft-status');
  const transcriptCounter = document.querySelector('#transcript-counter');
  let saveTimer = 0;
  let userTouched = false;

  const copy = {
    'pt-BR': {
      recovered: 'Há um briefing não finalizado salvo neste dispositivo.',
      restore: 'Restaurar',
      discard: 'Descartar',
      statusIdle: 'Rascunho local protegido automaticamente.',
      statusSaved: 'Rascunho salvo agora.',
      statusRestored: 'Rascunho restaurado.',
      progress: 'Briefing',
      complete: 'Pronto para gerar um pacote bem contextualizado.',
      improve: 'Adicione mais contexto para melhorar os rascunhos.',
      shortcut: 'Atalho: Ctrl/Cmd + Enter para montar o pacote.',
      chars: 'caracteres'
    },
    en: {
      recovered: 'There is an unfinished brief saved on this device.',
      restore: 'Restore',
      discard: 'Discard',
      statusIdle: 'Local draft protected automatically.',
      statusSaved: 'Draft saved just now.',
      statusRestored: 'Draft restored.',
      progress: 'Brief',
      complete: 'Ready to generate a well-contextualized pack.',
      improve: 'Add more context to improve the drafts.',
      shortcut: 'Shortcut: Ctrl/Cmd + Enter to build the pack.',
      chars: 'characters'
    }
  };

  function locale() {
    return window.AppI18n?.locale?.() === 'en' ? 'en' : 'pt-BR';
  }

  function t(key) {
    return copy[locale()][key];
  }

  function safeJsonParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function selectedPlatforms() {
    return [...form.querySelectorAll('[name="platforms"]:checked')].map(input => input.value);
  }

  function snapshot() {
    return {
      version: 1,
      savedAt: Date.now(),
      topic: String(form.elements.f0?.value || '').slice(0, 140),
      transcript: String(form.elements.f1?.value || '').slice(0, 12000),
      audience: String(form.elements.audience?.value || '').slice(0, 120),
      publishAt: String(form.elements.publishAt?.value || ''),
      tone: String(form.elements.f3?.value || 'natural'),
      goal: String(form.elements.goal?.value || ''),
      platforms: selectedPlatforms()
    };
  }

  function hasMeaningfulContent(draft) {
    return Boolean(
      draft &&
      typeof draft === 'object' &&
      (
        String(draft.topic || '').trim() ||
        String(draft.transcript || '').trim() ||
        String(draft.audience || '').trim() ||
        String(draft.publishAt || '').trim()
      )
    );
  }

  function saveDraft() {
    if (!userTouched) return;
    const draft = snapshot();
    if (!hasMeaningfulContent(draft)) {
      localStorage.removeItem(storageKey);
      updateDraftStatus(false);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(draft));
    updateDraftStatus(true);
  }

  function scheduleSave() {
    userTouched = true;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 250);
    updateProgress();
  }

  function updateDraftStatus(saved) {
    if (!draftStatus) return;
    draftStatus.textContent = saved ? t('statusSaved') : t('statusIdle');
  }

  function completeness() {
    const topic = String(form.elements.f0?.value || '').trim();
    const transcript = String(form.elements.f1?.value || '').trim();
    const audience = String(form.elements.audience?.value || '').trim();
    const publishAt = String(form.elements.publishAt?.value || '');
    const platforms = selectedPlatforms();
    let score = 0;
    if (topic.length >= 8) score += 25;
    else if (topic.length) score += 12;
    if (transcript.length >= 180) score += 35;
    else if (transcript.length >= 40) score += 22;
    else if (transcript.length) score += 10;
    if (audience.length >= 5) score += 15;
    if (publishAt) score += 10;
    if (platforms.length) score += 10;
    if (form.elements.f3?.value) score += 5;
    return Math.min(100, score);
  }

  function updateTranscriptCounter() {
    if (!transcriptCounter) return;
    const length = String(form.elements.f1?.value || '').length;
    transcriptCounter.textContent = `${length.toLocaleString(locale() === 'en' ? 'en-US' : 'pt-BR')} / 12.000 ${t('chars')}`;
  }

  function updateProgress() {
    const score = completeness();
    if (progressBar) {
      progressBar.value = score;
      progressBar.setAttribute('aria-valuetext', `${score}%`);
    }
    if (progressValue) progressValue.textContent = `${score}%`;
    if (progressHint) progressHint.textContent = score >= 85 ? t('complete') : t('improve');
    updateTranscriptCounter();
  }

  function applyDraft(draft) {
    if (!hasMeaningfulContent(draft)) return;
    if (form.elements.f0) form.elements.f0.value = String(draft.topic || '').slice(0, 140);
    if (form.elements.f1) form.elements.f1.value = String(draft.transcript || '').slice(0, 12000);
    if (form.elements.audience) form.elements.audience.value = String(draft.audience || '').slice(0, 120);
    if (form.elements.publishAt) form.elements.publishAt.value = /^\d{4}-\d{2}-\d{2}$/.test(String(draft.publishAt || '')) ? draft.publishAt : '';
    if (form.elements.f3 && ['natural', 'didatico', 'humor'].includes(draft.tone)) form.elements.f3.value = draft.tone;
    if (form.elements.goal && draft.goal) form.elements.goal.value = draft.goal;
    const platformSet = new Set(Array.isArray(draft.platforms) ? draft.platforms : []);
    if (platformSet.size) {
      form.querySelectorAll('[name="platforms"]').forEach(input => {
        input.checked = platformSet.has(input.value);
      });
    }
    userTouched = true;
    updateProgress();
    updateDraftStatus(true);
    if (recovery) recovery.hidden = true;
    form.elements.f0?.focus();
  }

  function readDraft() {
    const draft = safeJsonParse(localStorage.getItem(storageKey) || '');
    if (!hasMeaningfulContent(draft)) return null;
    if (draft.savedAt && Date.now() - Number(draft.savedAt) > 1000 * 60 * 60 * 24 * 30) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return draft;
  }

  function renderLanguage() {
    if (recoveryText) recoveryText.textContent = t('recovered');
    if (restoreButton) restoreButton.textContent = t('restore');
    if (discardButton) discardButton.textContent = t('discard');
    const label = document.querySelector('#briefing-progress-label');
    if (label) label.textContent = t('progress');
    const shortcut = document.querySelector('#composer-shortcut');
    if (shortcut) shortcut.textContent = t('shortcut');
    updateDraftStatus(Boolean(localStorage.getItem(storageKey)));
    updateProgress();
  }

  form.addEventListener('input', scheduleSave);
  form.addEventListener('change', scheduleSave);

  form.addEventListener('submit', () => {
    window.setTimeout(() => {
      const topic = String(form.elements.f0?.value || '').trim();
      const transcript = String(form.elements.f1?.value || '').trim();
      if (!topic && !transcript) {
        localStorage.removeItem(storageKey);
        userTouched = false;
        updateDraftStatus(false);
        updateProgress();
      }
    }, 1200);
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (!form.contains(document.activeElement)) return;
    event.preventDefault();
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
  });

  restoreButton?.addEventListener('click', () => {
    const draft = readDraft();
    if (!draft) {
      if (recovery) recovery.hidden = true;
      return;
    }
    applyDraft(draft);
    if (draftStatus) draftStatus.textContent = t('statusRestored');
  });

  discardButton?.addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    if (recovery) recovery.hidden = true;
    userTouched = false;
    updateDraftStatus(false);
  });

  window.addEventListener('app-language-change', renderLanguage);

  const draft = readDraft();
  if (draft && recovery) recovery.hidden = false;
  if (recovery && !draft) recovery.hidden = true;
  if (progress) progress.hidden = false;
  renderLanguage();
})();