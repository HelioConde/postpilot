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
const productionInsights = document.querySelector('#production-insights');
const productionMetrics = document.querySelector('#production-metrics');
const focusDashboard = document.querySelector('#focus-dashboard');
const projectPlatformFilter = document.querySelector('#project-platform-filter');
const projectGoalFilter = document.querySelector('#project-goal-filter');
const projectToneFilter = document.querySelector('#project-tone-filter');
const projectGenerationFilter = document.querySelector('#project-generation-filter');
const projectMediaFilter = document.querySelector('#project-media-filter');
const projectDateFrom = document.querySelector('#project-date-from');
const projectDateTo = document.querySelector('#project-date-to');
const projectFilterReset = document.querySelector('#project-filter-reset');
const composerMode = document.querySelector('#composer-mode');
const composerModeTitle = document.querySelector('#composer-mode-title');
const composerCancelButton = document.querySelector('#composer-cancel');
const composerSubmitButton = document.querySelector('#composer-submit');
const calendarGrid = document.querySelector('#calendar-grid');
const calendarRange = document.querySelector('#calendar-range');
const calendarPrevButton = document.querySelector('#calendar-prev');
const calendarTodayButton = document.querySelector('#calendar-today');
const calendarNextButton = document.querySelector('#calendar-next');
const calendarExportButton = document.querySelector('#calendar-export');
const calendarViewSelect = document.querySelector('#calendar-view');
const calendarPlatformSelect = document.querySelector('#calendar-platform');
const localBackupControls = document.querySelector('#local-backup-controls');
const exportBackupButton = document.querySelector('#export-backup');
const importBackupButton = document.querySelector('#import-backup');
const importBackupFile = document.querySelector('#import-backup-file');
const contentTemplateSelect = document.querySelector('#content-template');
const applyContentTemplateButton = document.querySelector('#apply-content-template');
const aiGenerationToggle = document.querySelector('#ai-generation');
const mediaFileInput = document.querySelector('#media-file');
const mediaFileLabel = document.querySelector('#media-file-label');
const mediaClearButton = document.querySelector('#media-clear');
const mediaCancelUploadButton = document.querySelector('#media-cancel-upload');
const mediaProgressWrap = document.querySelector('#media-progress-wrap');
const mediaProgress = document.querySelector('#media-progress');
const mediaProgressLabel = document.querySelector('#media-progress-label');
const mediaStatus = document.querySelector('#media-status');
const serviceHealthHost = document.querySelector('#service-health');
const aiServiceStatus = document.querySelector('#ai-service-status');
const aiServiceLimit = document.querySelector('#ai-service-limit');
const transcriptionServiceStatus = document.querySelector('#transcription-service-status');
const transcriptionServiceLimit = document.querySelector('#transcription-service-limit');
const refreshServiceHealthButton = document.querySelector('#refresh-service-health');
const exportAccountDataButton = document.querySelector('#export-account-data');
const togglePasswordButton = document.querySelector('#toggle-password');

let currentUser = null;
let cloudPacks = [];
let cloudLoading = false;
let openedPackId = null;
let editingPackId = null;
let calendarWeekOffset = 0;
let calendarMonthOffset = 0;
let calendarView = 'week';
let pendingMediaFile = null;
let activeMediaUpload = null;
let activeMediaUploadReject = null;
let pendingUploadedMedia = null;
let serviceHealth = {
  ai: { configured: null, hourlyLimit: 20, remaining: 20, resetAt: '' },
  transcription: { configured: null, hourlyLimit: 10, remaining: 10, resetAt: '', maxBytes: 6 * 1024 * 1024 }
};

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

function contentTemplateDefinition(key) {
  const english = currentLocale() === 'en';
  const templates = {
    education: {
      audience: english ? 'people who want to learn about the topic' : 'pessoas que querem aprender sobre o tema',
      tone: 'didatico',
      goal: 'alcance',
      platforms: ['Instagram', 'TikTok', 'YouTube Shorts']
    },
    'local-business': {
      audience: english ? 'potential customers in your area' : 'potenciais clientes da sua região',
      tone: 'natural',
      goal: 'oferta',
      platforms: ['Instagram', 'TikTok']
    },
    authority: {
      audience: english ? 'potential clients and professional partners' : 'potenciais clientes e parceiros profissionais',
      tone: 'didatico',
      goal: 'alcance',
      platforms: ['Instagram', 'YouTube Shorts']
    },
    community: {
      audience: english ? 'your current followers and community' : 'seus seguidores atuais e sua comunidade',
      tone: 'natural',
      goal: 'conversa',
      platforms: ['Instagram', 'TikTok', 'YouTube Shorts']
    }
  };
  return templates[key] || null;
}

function applyContentTemplate(key) {
  const template = contentTemplateDefinition(key);
  if (!template) return;
  form.elements.audience.value = template.audience;
  form.elements.f3.value = template.tone;
  form.elements.goal.value = template.goal;
  const selected = new Set(template.platforms);
  form.querySelectorAll('[name="platforms"]').forEach(input => {
    input.checked = selected.has(input.value);
  });
  form.elements.f0.focus();
  showToast('Modelo aplicado ao briefing.');
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
    publishChecklist: raw.publishChecklist && typeof raw.publishChecklist === 'object' ? raw.publishChecklist : {},
    cutOverrides: Array.isArray(raw.cutOverrides)
      ? raw.cutOverrides.slice(0, 20).filter(item => item && typeof item === 'object').map(item => ({
          key: safeBackupText(item.key, 80),
          start: Math.max(0, Number(item.start) || 0),
          end: Math.max(0, Number(item.end) || 0),
          favorite: Boolean(item.favorite),
          rejected: Boolean(item.rejected)
        }))
      : [],
    versions: Array.isArray(raw.versions)
      ? raw.versions.slice(-10).filter(item => item && typeof item === 'object' && item.snapshot && typeof item.snapshot === 'object')
      : [],
    contentOverrides: raw.contentOverrides && typeof raw.contentOverrides === 'object' && !Array.isArray(raw.contentOverrides)
      ? raw.contentOverrides
      : {}
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

function allowedMediaType(type) {
  return ['audio/mpeg','audio/mp4','audio/wav','audio/webm','video/mp4','video/webm','video/quicktime'].includes(String(type || ''));
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '';
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + ' KB';
  return (value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1) + ' MB';
}

function mediaFileText(file) {
  if (!file) return '';
  const size = file.size < 1024 * 1024
    ? Math.max(1, Math.round(file.size / 1024)) + ' KB'
    : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
  return file.name + ' · ' + size;
}

function setMediaProgress(percent = 0, active = false) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  if (mediaProgress) mediaProgress.value = safe;
  if (mediaProgressLabel) mediaProgressLabel.textContent = Math.round(safe) + '%';
  if (mediaProgressWrap) mediaProgressWrap.hidden = !active;
  if (mediaCancelUploadButton) mediaCancelUploadButton.hidden = !active;
}

function resetMediaSelection() {
  pendingMediaFile = null;
  pendingUploadedMedia = null;
  activeMediaUpload = null;
  if (mediaFileInput) mediaFileInput.value = '';
  if (mediaFileLabel) mediaFileLabel.textContent = uiText('Escolher mídia');
  if (mediaClearButton) mediaClearButton.hidden = true;
  if (mediaStatus) mediaStatus.textContent = '';
  setMediaProgress(0, false);
}

async function uploadMediaResumable(file, path) {
  if (!window.tus?.Upload || !supabaseClient || !currentUser) {
    const { error } = await supabaseClient.storage
      .from('postpilot-media')
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
    if (error) throw error;
    setMediaProgress(100, false);
    return;
  }

  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) throw sessionError || new Error('Sessão não encontrada.');
  const accessToken = sessionData.session.access_token;
  const projectUrl = String(window.POSTPILOT_SUPABASE?.url || '');
  const projectHost = new URL(projectUrl).hostname.split('.')[0];
  const endpoint = 'https://' + projectHost + '.storage.supabase.co/storage/v1/upload/resumable';
  const publishableKey = window.POSTPILOT_SUPABASE?.publishableKey || '';

  await new Promise((resolve, reject) => {
    activeMediaUploadReject = reject;
    const upload = new window.tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: 'Bearer ' + accessToken,
        apikey: publishableKey
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: 'postpilot-media',
        objectName: path,
        contentType: file.type,
        cacheControl: '3600'
      },
      onError(error) {
        activeMediaUpload = null;
        activeMediaUploadReject = null;
        setMediaProgress(0, false);
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percent = bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0;
        setMediaProgress(percent, true);
      },
      onSuccess() {
        activeMediaUpload = null;
        activeMediaUploadReject = null;
        setMediaProgress(100, false);
        resolve();
      }
    });
    activeMediaUpload = upload;
    setMediaProgress(0, true);
    upload.findPreviousUploads().then(previous => {
      if (previous?.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}

async function uploadAndTranscribeMedia(file, packId, { transcribe = true } = {}) {
  if (!supabaseClient || !currentUser) throw new Error('Entre na sua conta para enviar mídia.');
  if (!file || !allowedMediaType(file.type)) throw new Error('Formato de mídia não suportado.');
  if (file.size > 6 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 6 MB.');

  const fingerprint = [file.name, file.size, file.lastModified].join(':');
  let media = pendingUploadedMedia?.fingerprint === fingerprint
    ? pendingUploadedMedia
    : null;

  if (!media) {
    const safeName = String(file.name || 'media')
      .normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'media';
    const path = currentUser.id + '/' + packId + '/' + Date.now() + '-' + safeName;

    if (mediaStatus) mediaStatus.textContent = uiText('Enviando mídia privada…');
    await uploadMediaResumable(file, path);
    media = {
      fingerprint,
      mediaPath: path,
      mediaName: file.name,
      mediaType: file.type,
      mediaSizeBytes: file.size
    };
    pendingUploadedMedia = media;
  }

  if (!transcribe) {
    return {
      ...media,
      transcript: '',
      segments: [],
      transcriptionSkipped: true
    };
  }

  try {
    if (mediaStatus) mediaStatus.textContent = uiText('Transcrevendo mídia…');
    const { data, error } = await supabaseClient.functions.invoke('postpilot-transcribe', {
      body: { path: media.mediaPath, name: file.name, locale: currentLocale() }
    });
    if (error) throw error;
    if (!data?.transcript) throw new Error('Transcrição vazia.');
    if (data.rateLimit) {
      serviceHealth.transcription.remaining = Number(data.rateLimit.remaining) || 0;
      serviceHealth.transcription.resetAt = String(data.rateLimit.resetAt || '');
      renderServiceHealth();
    }
    return {
      ...media,
      transcript: String(data.transcript).slice(0, 12000),
      segments: Array.isArray(data.segments) ? data.segments : [],
      rateLimit: data.rateLimit || null
    };
  } catch (error) {
    if (error && typeof error === 'object') error.uploadedMedia = media;
    throw error;
  }
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return minutes + ':' + String(secs).padStart(2, '0');
}

function normalizeCutOverrides(pack) {
  return Array.isArray(pack?.cutOverrides)
    ? pack.cutOverrides.slice(0, 20).filter(item => item && typeof item === 'object')
    : [];
}

function cutSuggestions(pack) {
  const overrides = new Map(normalizeCutOverrides(pack).map(item => [String(item.key || ''), item]));
  const segments = Array.isArray(pack?.transcriptionSegments) ? pack.transcriptionSegments : [];
  return segments
    .filter(segment => Number.isFinite(Number(segment.start)) && Number.isFinite(Number(segment.end)) && String(segment.text || '').trim().length >= 24)
    .map(segment => {
      const originalStart = Number(segment.start);
      const originalEnd = Number(segment.end);
      const text = String(segment.text || '').trim();
      const key = originalStart.toFixed(2) + '-' + originalEnd.toFixed(2);
      const override = overrides.get(key) || {};
      return {
        key,
        start: Number.isFinite(Number(override.start)) ? Number(override.start) : originalStart,
        end: Number.isFinite(Number(override.end)) ? Number(override.end) : originalEnd,
        text,
        favorite: Boolean(override.favorite),
        rejected: Boolean(override.rejected)
      };
    })
    .filter(segment => segment.end > segment.start)
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      const aDuration = a.end - a.start;
      const bDuration = b.end - b.start;
      const aScore = (aDuration >= 8 && aDuration <= 45 ? 2 : 0) + Math.min(a.text.length / 120, 1);
      const bScore = (bDuration >= 8 && bDuration <= 45 ? 2 : 0) + Math.min(b.text.length / 120, 1);
      return bScore - aScore;
    })
    .slice(0, 6);
}

function cleanTranscriptionSegments(segments) {
  return (Array.isArray(segments) ? segments : []).slice(0, 500).map(segment => ({
    start: Math.max(0, Number(segment.start) || 0),
    end: Math.max(0, Number(segment.end) || 0),
    text: String(segment.text || '').replace(/\s+/g, ' ').trim().slice(0, 800)
  })).filter(segment => segment.text && segment.end >= segment.start);
}

async function persistTranscriptionResult(pack, transcript, segments) {
  const cleanedSegments = cleanTranscriptionSegments(segments);
  const cleanTranscript = String(transcript || '').replace(/\s+/g, ' ').trim().slice(0, 12000);
  if (!cleanTranscript) throw new Error('Transcrição vazia.');

  const updated = {
    ...pack,
    transcript: cleanTranscript,
    transcriptionSegments: cleanedSegments,
    generationMode: 'local',
    generationData: {},
    contentOverrides: {},
    cutOverrides: [],
    time: Date.now()
  };

  if (currentUser) {
    await recordCloudVersion(pack);
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({
        source_text: cleanTranscript,
        transcription_segments: cleanedSegments,
        generation_mode: 'local',
        generation_data: {},
        content_overrides: {},
        cut_overrides: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item);
    return saved;
  }

  const versionEntry = { createdAt: Date.now(), snapshot: packSnapshot(pack) };
  updated.versions = [...localVersions(pack), versionEntry].slice(-10);
  localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === updated.id ? updated : item)));
  return updated;
}

async function transcribeExistingMedia(pack) {
  if (!supabaseClient || !currentUser || !pack.mediaPath) throw new Error('Mídia indisponível.');
  if (serviceHealth.transcription.configured !== true || Number(serviceHealth.transcription.remaining) <= 0) {
    await refreshServiceHealth();
    if (serviceHealth.transcription.configured !== true) throw new Error('Transcrição não configurada.');
    if (Number(serviceHealth.transcription.remaining) <= 0) throw new Error('Limite de transcrição atingido.');
  }

  const { data, error } = await supabaseClient.functions.invoke('postpilot-transcribe', {
    body: {
      path: pack.mediaPath,
      name: pack.mediaName || 'media',
      locale: currentLocale()
    }
  });
  if (error) throw error;
  if (data?.rateLimit) {
    serviceHealth.transcription.remaining = Number(data.rateLimit.remaining) || 0;
    serviceHealth.transcription.resetAt = String(data.rateLimit.resetAt || '');
    renderServiceHealth();
  }
  return persistTranscriptionResult(pack, data?.transcript, data?.segments || []);
}

async function persistTranscriptionSegments(pack, segments) {
  const cleaned = cleanTranscriptionSegments(segments);
  const transcript = cleaned.map(segment => segment.text).join(' ').slice(0, 12000);
  const updated = { ...pack, transcriptionSegments: cleaned, transcript, time: Date.now() };

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({
        transcription_segments: cleaned,
        source_text: transcript,
        updated_at: new Date().toISOString()
      })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item);
    return saved;
  }

  localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === updated.id ? updated : item)));
  return updated;
}

async function persistCutOverrides(pack, overrides) {
  const cleaned = overrides.slice(0, 20).map(item => ({
    key: String(item.key || '').slice(0, 80),
    start: Math.max(0, Number(item.start) || 0),
    end: Math.max(0, Number(item.end) || 0),
    favorite: Boolean(item.favorite),
    rejected: Boolean(item.rejected)
  }));

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({ cut_overrides: cleaned, updated_at: new Date().toISOString() })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item);
    return saved;
  }

  const saved = { ...pack, cutOverrides: cleaned, time: Date.now() };
  localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === saved.id ? saved : item)));
  return saved;
}

async function renderMediaPreview(pack) {
  const host = result.querySelector('#media-preview-host');
  if (!host || !currentUser || !pack.mediaPath || !supabaseClient) return;
  host.innerHTML = '<small>' + escapeHtml(uiText('Carregando mídia privada…')) + '</small>';
  const { data, error } = await supabaseClient.storage.from('postpilot-media').createSignedUrl(pack.mediaPath, 1800);
  if (error || !data?.signedUrl) {
    host.innerHTML = '<small>' + escapeHtml(uiText('Não foi possível carregar a prévia da mídia.')) + '</small>';
    return;
  }
  const tag = String(pack.mediaType || '').startsWith('video/') ? 'video' : 'audio';
  host.innerHTML = '<' + tag + ' id="media-preview-player" controls preload="metadata" src="' + escapeHtml(data.signedUrl) + '"></' + tag + '>';
  const player = host.querySelector('#media-preview-player');
  player?.addEventListener('loadedmetadata', () => {
    const duration = result.querySelector('[data-media-duration]');
    if (duration && Number.isFinite(player.duration)) {
      duration.textContent = uiText('Duração') + ': ' + formatTimestamp(player.duration);
    }
  }, { once: true });
}

function packSnapshot(pack) {
  return {
    topic: pack.topic || '',
    transcript: pack.transcript || '',
    platforms: packPlatforms(pack),
    tone: normalizeTone(pack.tone),
    goal: pack.goal || 'conversa',
    audience: pack.audience || '',
    publishAt: pack.publishAt || '',
    publishChecklist: normalizePublishChecklist(pack),
    generationMode: pack.generationMode === 'ai' ? 'ai' : 'local',
    generationData: pack.generationData && typeof pack.generationData === 'object' ? pack.generationData : {},
    transcriptionSegments: Array.isArray(pack.transcriptionSegments) ? pack.transcriptionSegments : [],
    cutOverrides: normalizeCutOverrides(pack),
    contentOverrides: pack.contentOverrides && typeof pack.contentOverrides === 'object' ? pack.contentOverrides : {},
    status: pack.status || 'draft'
  };
}

function localVersions(pack) {
  return Array.isArray(pack?.versions) ? pack.versions.slice(-10) : [];
}

async function recordCloudVersion(pack) {
  if (!supabaseClient || !currentUser) return;
  const { error } = await supabaseClient.from('postpilot_project_versions').insert({
    project_id: pack.id,
    user_id: currentUser.id,
    snapshot: packSnapshot(pack)
  });
  if (error) {
    console.warn('PostPilot version history:', error.message);
    return;
  }

  const { data: stale } = await supabaseClient
    .from('postpilot_project_versions')
    .select('id')
    .eq('project_id', pack.id)
    .order('created_at', { ascending: false })
    .range(10, 49);
  if (stale?.length) {
    await supabaseClient.from('postpilot_project_versions').delete().in('id', stale.map(item => item.id));
  }
}

async function restorePackVersion(pack, snapshot) {
  const restored = {
    ...pack,
    ...snapshot,
    id: pack.id,
    createdAt: pack.createdAt,
    time: Date.now()
  };

  if (currentUser) {
    const saved = await saveCloudPack(restored);
    cloudPacks = [saved, ...cloudPacks.filter(item => item.id !== saved.id)].slice(0, 20);
    renderPack(saved);
    renderList();
  } else {
    const versions = [...localVersions(pack), { createdAt: Date.now(), snapshot: packSnapshot(pack) }].slice(-10);
    restored.versions = versions;
    localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === pack.id ? restored : item)));
    renderPack(restored);
    renderList();
  }
  showToast('Versão restaurada.');
}

async function renderVersionHistory(pack) {
  const host = result.querySelector('#version-list');
  if (!host) return;

  let versions = [];
  if (currentUser) {
    host.innerHTML = '<small>' + escapeHtml(uiText('Carregando histórico…')) + '</small>';
    const { data, error } = await supabaseClient
      .from('postpilot_project_versions')
      .select('id,snapshot,created_at')
      .eq('project_id', pack.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      host.innerHTML = '<small>' + escapeHtml(uiText('Não foi possível carregar o histórico.')) + '</small>';
      return;
    }
    versions = (data || []).map(row => ({ id: String(row.id), createdAt: Date.parse(row.created_at), snapshot: row.snapshot }));
  } else {
    versions = localVersions(pack).slice().reverse().map((item, index) => ({
      id: 'local-' + index,
      createdAt: Number(item.createdAt) || Date.now(),
      snapshot: item.snapshot
    }));
  }

  if (!versions.length) {
    host.innerHTML = '<small>' + escapeHtml(uiText('Nenhuma versão anterior ainda.')) + '</small>';
    return;
  }

  host.innerHTML = versions.map((version, index) => {
    const snapshot = version.snapshot || {};
    return '<article class="version-item">' +
      '<div><strong>' + escapeHtml(snapshot.topic || pack.topic) + '</strong>' +
      '<small>' + escapeHtml(new Date(version.createdAt).toLocaleString(currentLocale())) + ' · ' + escapeHtml(statusLabel(snapshot.status || 'draft')) + '</small></div>' +
      '<button class="secondary compact" type="button" data-restore-version="' + index + '">' + escapeHtml(uiText('Restaurar versão')) + '</button>' +
    '</article>';
  }).join('');

  host.querySelectorAll('[data-restore-version]').forEach(button => {
    button.addEventListener('click', async () => {
      const version = versions[Number(button.dataset.restoreVersion)];
      if (!version?.snapshot) return;
      button.disabled = true;
      try {
        await restorePackVersion(pack, version.snapshot);
      } catch (error) {
        console.error(error);
        button.disabled = false;
        showToast('Não foi possível restaurar a versão.');
      }
    });
  });
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

function assessContentContext(topic, transcript) {
  const clean = String(transcript || '').replace(/\s+/g, ' ').trim();
  const normalized = clean
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const words = normalized.match(/[a-z0-9]+/g) || [];
  const generic = new Set(['teste', 'testes', 'test', 'testing', 'demo', 'rascunho', 'exemplo']);
  const meaningfulWords = words.filter(word => word.length > 2 && !generic.has(word));
  const topicNormalized = String(topic || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
  const topicIsGeneric = generic.has(topicNormalized);
  const enough = clean.length >= 24 && words.length >= 4 && meaningfulWords.length >= 2 && !(topicIsGeneric && meaningfulWords.length < 3);

  return { enough, length: clean.length, words: words.length, meaningfulWords: meaningfulWords.length };
}

function sparseContextDeliverable(pack, platform) {
  const english = currentLocale() === 'en';
  const topic = String(pack.topic || '').trim() || (english ? 'this topic' : 'este tema');
  const message = english
    ? 'There is not enough source context to create a useful publish-ready draft yet.'
    : 'Ainda não há contexto suficiente para criar um rascunho útil e pronto para publicar.';
  const nextStep = english
    ? 'Add at least one main idea plus an example, explanation, or conclusion in the transcript/summary.'
    : 'Adicione ao menos uma ideia principal e um exemplo, explicação ou conclusão na transcrição/resumo.';
  const outline = english
    ? '1. Main idea\n2. Practical example\n3. Clear next step'
    : '1. Ideia principal\n2. Exemplo prático\n3. Próximo passo claro';

  if (platform === 'TikTok') {
    return withContentOverrides(pack, {
      title: 'TikTok',
      lines: [
        [uiText('Gancho de 2 segundos'), message],
        [uiText('Texto na tela'), topic],
        [uiText('Legenda curta'), nextStep],
        [uiText('Hashtags'), '—']
      ]
    });
  }

  if (platform === 'YouTube Shorts') {
    return withContentOverrides(pack, {
      title: 'YouTube Shorts',
      lines: [
        [uiText('Título'), topic.slice(0, 90)],
        [uiText('Abertura'), message],
        [uiText('Descrição'), nextStep],
        [uiText('Hashtags'), '—']
      ]
    });
  }

  return withContentOverrides(pack, {
    title: 'Instagram',
    lines: [
      [uiText('Gancho para Reels'), message],
      [uiText('Legenda'), nextStep],
      [uiText('Carrossel / apoio'), outline],
      [uiText('Hashtags'), '—']
    ]
  });
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

function contentOverrideKey(platform, label) {
  return platform + '::' + label;
}

function withContentOverrides(pack, deliverable) {
  const overrides = pack?.contentOverrides && typeof pack.contentOverrides === 'object' ? pack.contentOverrides : {};
  return {
    ...deliverable,
    lines: deliverable.lines.map(([label, value]) => {
      const override = overrides[contentOverrideKey(deliverable.title, label)];
      return [label, typeof override?.value === 'string' && override.value ? override.value : value];
    })
  };
}

function regenerateFieldValue(pack, platform, label, current, revision = 0) {
  const english = currentLocale() === 'en';
  const ideas = splitIntoIdeas(pack.transcript);
  const lead = ideas[revision % Math.max(ideas.length, 1)] || pack.topic;
  const audience = pack.audience ? (english ? ` for ${pack.audience}` : ` para ${pack.audience}`) : '';
  const normalized = String(label || '').toLocaleLowerCase(currentLocale());

  if (normalized.includes('hashtag')) {
    const tags = topicHashtags(pack.topic).split(' ').filter(Boolean);
    const extras = english ? ['#creator', '#contenttips', '#shortform'] : ['#criacao', '#conteudodigital', '#reelsbrasil'];
    return [...new Set(tags.concat(extras).slice(revision % 2, revision % 2 + 5))].join(' ');
  }
  if (normalized.includes('cta') || normalized.includes('chamada')) {
    const options = english
      ? ['Save this idea and try it in your next post.', 'Comment with the part you want to test first.', 'Share this with someone who can use it today.']
      : ['Salve esta ideia e teste no seu próximo conteúdo.', 'Comente qual parte você quer testar primeiro.', 'Compartilhe com alguém que pode aplicar isso hoje.'];
    return options[revision % options.length];
  }
  if (normalized.includes('gancho') || normalized.includes('abertura') || normalized.includes('título') || normalized.includes('title')) {
    const options = english
      ? [
          `${pack.topic}: the detail most creators overlook${audience}.`,
          `Before you publish about ${pack.topic}, check this${audience}.`,
          `A simpler way to approach ${pack.topic}${audience}.`
        ]
      : [
          `${pack.topic}: o detalhe que muita gente ignora${audience}.`,
          `Antes de publicar sobre ${pack.topic}, confira isso${audience}.`,
          `Uma forma mais simples de abordar ${pack.topic}${audience}.`
        ];
    return options[revision % options.length];
  }

  const cta = callToAction(pack.goal);
  const options = english
    ? [`${lead} ${cta}`, `Start with this: ${lead} Then connect it directly to your audience.`, `${lead} Keep the message specific and finish with one clear next step.`]
    : [`${lead} ${cta}`, `Comece por aqui: ${lead} Depois conecte a ideia diretamente ao seu público.`, `${lead} Mantenha a mensagem específica e finalize com um próximo passo claro.`];
  return options[revision % options.length];
}

async function persistContentOverride(pack, platform, label, current) {
  const key = contentOverrideKey(platform, label);
  const source = pack?.contentOverrides && typeof pack.contentOverrides === 'object' ? pack.contentOverrides : {};
  const previous = source[key] && typeof source[key] === 'object' ? source[key] : {};
  const revision = (Number(previous.revision) || 0) + 1;
  const contentOverrides = {
    ...source,
    [key]: {
      value: regenerateFieldValue(pack, platform, label, current, revision),
      revision
    }
  };

  if (currentUser) {
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({ content_overrides: contentOverrides, updated_at: new Date().toISOString() })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item);
    return saved;
  }

  const saved = { ...pack, contentOverrides, time: Date.now() };
  localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === saved.id ? saved : item)));
  return saved;
}

function platformDeliverable(pack, platform) {
  const generated = pack?.generationData?.platforms?.[platform];
  if (generated && Array.isArray(generated.lines) && generated.lines.length) {
    return withContentOverrides(pack, {
      title: platform,
      lines: generated.lines
        .filter(line => line && typeof line.label === 'string' && typeof line.value === 'string')
        .slice(0, 6)
        .map(line => [line.label, line.value])
    });
  }

  if (!assessContentContext(pack.topic, pack.transcript).enough) {
    return sparseContextDeliverable(pack, platform);
  }

  const ideas = splitIntoIdeas(pack.transcript);
  const lead = ideas[0] || pack.topic;
  const english = currentLocale() === 'en';
  const cleanLead = String(lead || '').replace(/[.!?]+$/, '').trim();
  const hook = cleanLead.toLocaleLowerCase(currentLocale()).startsWith(String(pack.topic || '').trim().toLocaleLowerCase(currentLocale()))
    ? cleanLead + (cleanLead.endsWith('?') ? '' : '.')
    : `${pack.topic}: ${cleanLead}`;
  const cta = callToAction(pack.goal);
  const hashtags = topicHashtags(pack.topic);

  if (platform === 'TikTok') {
    return withContentOverrides(pack, {
      title: 'TikTok',
      lines: [
        [uiText('Gancho de 2 segundos'), hook],
        [uiText('Texto na tela'), lead.slice(0, 110)],
        [uiText('Legenda curta'), `${lead} ${cta}`],
        [uiText('Hashtags'), hashtags]
      ]
    });
  }

  if (platform === 'YouTube Shorts') {
    return withContentOverrides(pack, {
      title: 'YouTube Shorts',
      lines: [
        [uiText('Título'), pack.topic.slice(0, 90)],
        [uiText('Abertura'), hook],
        [uiText('Descrição'), `${lead}\n\n${cta}`],
        [uiText('Hashtags'), hashtags]
      ]
    });
  }

  return withContentOverrides(pack, {
    title: 'Instagram',
    lines: [
      [uiText('Gancho para Reels'), hook],
      [uiText('Legenda'), `${lead}\n\n${cta}`],
      [uiText('Carrossel / apoio'), ideas.slice(0, 3).map((idea, index) => `${index + 1}. ${idea}`).join('\n')],
      [uiText('Hashtags'), hashtags]
    ]
  });
}

function platformPublishUrl(platform) {
  if (platform === 'TikTok') return 'https://www.tiktok.com/upload';
  if (platform === 'YouTube Shorts') return 'https://studio.youtube.com/';
  return 'https://www.instagram.com/';
}

function assistPublish(pack, platform) {
  const url = platformPublishUrl(platform);
  window.open(url, '_blank', 'noopener,noreferrer');
  copyText(platformText(pack, platform));
  showToast('Conteúdo copiado. Finalize a publicação na plataforma.');
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

function exportableCuts(pack) {
  return cutSuggestions(pack).map((cut, index) => ({
    index: index + 1,
    start: cut.start,
    end: cut.end,
    startLabel: formatTimestamp(cut.start),
    endLabel: formatTimestamp(cut.end),
    text: cut.text,
    favorite: Boolean(cut.favorite),
    rejected: Boolean(cut.rejected)
  }));
}

function exportableSegments(pack) {
  return cleanTranscriptionSegments(pack.transcriptionSegments).map(segment => ({
    start: segment.start,
    end: segment.end,
    startLabel: formatTimestamp(segment.start),
    endLabel: formatTimestamp(segment.end),
    text: segment.text
  }));
}

function packageText(pack) {
  const english = currentLocale() === 'en';
  const cuts = exportableCuts(pack);
  const segments = exportableSegments(pack);
  const extras = [
    ...(pack.mediaName ? [
      `${english ? 'MEDIA' : 'MÍDIA'}: ${pack.mediaName}${pack.mediaSizeBytes ? ' · ' + formatFileSize(pack.mediaSizeBytes) : ''}`
    ] : []),
    ...(segments.length ? [
      (english ? 'TIMESTAMPED TRANSCRIPT' : 'TRANSCRIÇÃO COM TIMESTAMPS') + ':\n' +
      segments.map(segment => `[${segment.startLabel}–${segment.endLabel}] ${segment.text}`).join('\n')
    ] : []),
    ...(cuts.length ? [
      (english ? 'CLIPS' : 'CORTES') + ':\n' +
      cuts.map(cut => `#${cut.index} [${cut.startLabel}–${cut.endLabel}] ${cut.favorite ? '★ ' : ''}${cut.rejected ? (english ? '[discarded] ' : '[descartado] ') : ''}${cut.text}`).join('\n')
    ] : [])
  ];

  return [
    `${english ? 'TOPIC' : 'TEMA'}: ${pack.topic}`,
    `${english ? 'GOAL' : 'OBJETIVO'}: ${pack.goal}`,
    `${english ? 'TONE' : 'TOM'}: ${toneLabel(pack.tone)}`,
    ...(pack.audience ? [`${english ? 'AUDIENCE' : 'PÚBLICO'}: ${pack.audience}`] : []),
    ...(pack.publishAt ? [`${english ? 'PLANNED DATE' : 'DATA PLANEJADA'}: ${pack.publishAt}`] : []),
    ...extras,
    ...packPlatforms(pack).map(platform => platformText(pack, platform))
  ].join('\n\n---\n\n');
}

function packageSlug(pack) {
  return pack.topic.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'pacote';
}

function packageMarkdown(pack) {
  const english = currentLocale() === 'en';
  const sections = packPlatforms(pack).map(platform => {
    const deliverable = platformDeliverable(pack, platform);
    return [
      `## ${deliverable.title}`,
      ...deliverable.lines.map(([label, value]) => `### ${label}\n\n${value}`)
    ].join('\n\n');
  });

  const segments = exportableSegments(pack);
  const cuts = exportableCuts(pack);
  return [
    `# ${pack.topic}`,
    `**${english ? 'Goal' : 'Objetivo'}:** ${pack.goal}`,
    `**${english ? 'Tone' : 'Tom'}:** ${toneLabel(pack.tone)}`,
    ...(pack.audience ? [`**${english ? 'Audience' : 'Público'}:** ${pack.audience}`] : []),
    ...(pack.publishAt ? [`**${english ? 'Planned date' : 'Data planejada'}:** ${pack.publishAt}`] : []),
    ...(pack.mediaName ? [`**${english ? 'Media' : 'Mídia'}:** ${pack.mediaName}${pack.mediaSizeBytes ? ' · ' + formatFileSize(pack.mediaSizeBytes) : ''}`] : []),
    ...(segments.length ? [
      `## ${english ? 'Timestamped transcript' : 'Transcrição com timestamps'}`,
      segments.map(segment => `- **${segment.startLabel}–${segment.endLabel}** — ${segment.text}`).join('\n')
    ] : []),
    ...(cuts.length ? [
      `## ${english ? 'Clip suggestions' : 'Sugestões de cortes'}`,
      cuts.map(cut => `- **#${cut.index} · ${cut.startLabel}–${cut.endLabel}** ${cut.favorite ? '★ ' : ''}${cut.rejected ? (english ? '_(discarded)_ ' : '_(descartado)_ ') : ''}— ${cut.text}`).join('\n')
    ] : []),
    '',
    ...sections
  ].join('\n\n');
}

function packageJson(pack) {
  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    package: {
      id: pack.id,
      topic: pack.topic,
      goal: pack.goal,
      tone: normalizeTone(pack.tone),
      audience: pack.audience || '',
      publishAt: pack.publishAt || '',
      status: pack.status || 'draft',
      generationMode: pack.generationMode || 'local',
      media: pack.mediaName ? {
        name: pack.mediaName,
        type: pack.mediaType || '',
        sizeBytes: Number(pack.mediaSizeBytes || 0)
      } : null,
      transcriptionSegments: exportableSegments(pack).map(({ start, end, text }) => ({ start, end, text })),
      clips: exportableCuts(pack).map(({ index, start, end, text, favorite, rejected }) => ({
        index, start, end, text, favorite, rejected
      })),
      platforms: packPlatforms(pack),
      deliverables: packPlatforms(pack).map(platform => {
        const deliverable = platformDeliverable(pack, platform);
        return {
          platform: deliverable.title,
          fields: Object.fromEntries(deliverable.lines.map(([label, value]) => [label, value]))
        };
      })
    }
  }, null, 2);
}

function csvCell(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

function packageCsv(pack) {
  const rows = [['platform', 'field', 'value']];
  if (pack.mediaName) {
    rows.push(['META', 'media_name', pack.mediaName]);
    rows.push(['META', 'media_type', pack.mediaType || '']);
    rows.push(['META', 'media_size_bytes', Number(pack.mediaSizeBytes || 0)]);
  }
  exportableSegments(pack).forEach((segment, index) => {
    rows.push(['TRANSCRIPT', `segment_${index + 1}_${segment.startLabel}-${segment.endLabel}`, segment.text]);
  });
  exportableCuts(pack).forEach(cut => {
    const flags = [cut.favorite ? 'favorite' : '', cut.rejected ? 'rejected' : ''].filter(Boolean).join('|');
    rows.push(['CLIP', `clip_${cut.index}_${cut.startLabel}-${cut.endLabel}${flags ? '_' + flags : ''}`, cut.text]);
  });
  packPlatforms(pack).forEach(platform => {
    const deliverable = platformDeliverable(pack, platform);
    deliverable.lines.forEach(([label, value]) => rows.push([deliverable.title, label, value]));
  });
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

function downloadPackage(pack, format) {
  const exporters = {
    txt: { content: packageText(pack), type: 'text/plain;charset=utf-8' },
    md: { content: packageMarkdown(pack), type: 'text/markdown;charset=utf-8' },
    json: { content: packageJson(pack), type: 'application/json;charset=utf-8' },
    csv: { content: packageCsv(pack), type: 'text/csv;charset=utf-8' }
  };
  const selected = exporters[format] || exporters.txt;
  const blob = new Blob([selected.content], { type: selected.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `postpilot-${packageSlug(pack)}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`Pacote exportado em .${format}.`);
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
    generationMode: row.generation_mode === 'ai' ? 'ai' : 'local',
    generationData: row.generation_data && typeof row.generation_data === 'object' ? row.generation_data : {},
    mediaPath: row.media_path || '',
    mediaName: row.media_name || '',
    mediaType: row.media_type || '',
    mediaSizeBytes: Number(row.media_size_bytes || 0),
    transcriptionSegments: Array.isArray(row.transcription_segments) ? row.transcription_segments : [],
    cutOverrides: Array.isArray(row.cut_overrides) ? row.cut_overrides : [],
    contentOverrides: row.content_overrides && typeof row.content_overrides === 'object' ? row.content_overrides : {},
    versions: [],
    status: row.status || 'draft',
    createdAt: Date.parse(row.created_at),
    time: Date.parse(row.updated_at || row.created_at)
  };
}

async function generateAiContent(pack) {
  if (!supabaseClient || !currentUser) throw new Error('Sessão não encontrada.');

  const { data, error } = await supabaseClient.functions.invoke('postpilot-generate', {
    body: {
      topic: pack.topic,
      transcript: pack.transcript,
      audience: pack.audience || '',
      tone: normalizeTone(pack.tone),
      goal: pack.goal,
      platforms: packPlatforms(pack),
      locale: currentLocale()
    }
  });

  if (error) throw error;
  if (!data?.generation?.platforms) throw new Error('Resposta de IA inválida.');
  if (data.rateLimit) {
    serviceHealth.ai.remaining = Number(data.rateLimit.remaining) || 0;
    serviceHealth.ai.resetAt = String(data.rateLimit.resetAt || '');
    renderServiceHealth();
  }
  return data.generation;
}

async function saveCloudPack(pack) {
  if (!supabaseClient || !currentUser) throw new Error('Sessão não encontrada.');
  const now = new Date().toISOString();
  const row = {
    id: pack.id,
    user_id: currentUser.id,
    title: pack.topic,
    source_type: pack.mediaType ? (String(pack.mediaType).startsWith('video/') ? 'video' : 'audio') : 'transcript',
    source_text: pack.transcript,
    platforms: packPlatforms(pack),
    tone: normalizeTone(pack.tone),
    goal: pack.goal,
    audience: String(pack.audience || '').slice(0, 120),
    publish_at: pack.publishAt || null,
    publish_checklist: normalizePublishChecklist(pack),
    generation_mode: pack.generationMode === 'ai' ? 'ai' : 'local',
    generation_data: pack.generationData && typeof pack.generationData === 'object' ? pack.generationData : {},
    media_path: pack.mediaPath || null,
    media_name: pack.mediaName || null,
    media_type: pack.mediaType || null,
    media_size_bytes: pack.mediaSizeBytes || null,
    transcription_segments: Array.isArray(pack.transcriptionSegments) ? pack.transcriptionSegments : [],
    cut_overrides: normalizeCutOverrides(pack),
    content_overrides: pack.contentOverrides && typeof pack.contentOverrides === 'object' ? pack.contentOverrides : {},
    status: pack.status || 'draft',
    created_at: new Date(pack.createdAt || pack.time || Date.now()).toISOString(),
    updated_at: now
  };

  let { data, error } = await supabaseClient
    .from('postpilot_projects')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error && /generation_(mode|data)|schema cache|column/i.test(String(error.message || ''))) {
    const compatibleRow = { ...row };
    delete compatibleRow.generation_mode;
    delete compatibleRow.generation_data;
    const retry = await supabaseClient
      .from('postpilot_projects')
      .upsert(compatibleRow, { onConflict: 'id' })
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

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

  const savedPack = mapCloudPack(data);
  await recordCloudVersion(savedPack);
  return savedPack;
}

function portableProject(row) {
  const pack = mapCloudPack(row);
  return {
    id: pack.id,
    topic: pack.topic,
    transcript: pack.transcript,
    platforms: packPlatforms(pack),
    tone: normalizeTone(pack.tone),
    goal: pack.goal,
    audience: pack.audience || '',
    publishAt: pack.publishAt || '',
    publishChecklist: normalizePublishChecklist(pack),
    generationMode: pack.generationMode || 'local',
    generationData: pack.generationData || {},
    transcriptionSegments: cleanTranscriptionSegments(pack.transcriptionSegments),
    cutOverrides: normalizeCutOverrides(pack),
    contentOverrides: pack.contentOverrides || {},
    status: pack.status || 'draft',
    createdAt: new Date(pack.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(pack.time || pack.createdAt || Date.now()).toISOString(),
    media: pack.mediaName ? {
      name: pack.mediaName,
      type: pack.mediaType || '',
      sizeBytes: Number(pack.mediaSizeBytes || 0),
      privateFileStored: Boolean(row.media_path)
    } : null
  };
}

function safeAccountOutput(row) {
  return {
    projectId: String(row.project_id || ''),
    kind: safeBackupText(row.kind, 80),
    title: safeBackupText(row.title, 180),
    body: String(row.body || '').slice(0, 30000),
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {},
    createdAt: row.created_at || null
  };
}

function safeAccountVersion(row) {
  return {
    projectId: String(row.project_id || ''),
    createdAt: row.created_at || null,
    snapshot: row.snapshot && typeof row.snapshot === 'object' && !Array.isArray(row.snapshot) ? row.snapshot : {}
  };
}

async function fetchAllAccountRows(table, columns, orderColumn, pageSize = 500) {
  const rows = [];
  const maxPages = 100;

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabaseClient
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: false })
      .range(from, to);

    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }

  throw new Error('Limite de segurança da exportação excedido.');
}

async function exportAccountData() {
  if (!supabaseClient || !currentUser) return;
  exportAccountDataButton.disabled = true;
  const originalLabel = exportAccountDataButton.textContent;
  exportAccountDataButton.textContent = uiText('Preparando exportação…');

  try {
    const [projectRows, versionRows, outputRows] = await Promise.all([
      fetchAllAccountRows('postpilot_projects', '*', 'updated_at'),
      fetchAllAccountRows('postpilot_project_versions', 'project_id,snapshot,created_at', 'created_at'),
      fetchAllAccountRows('postpilot_outputs', 'project_id,kind,title,body,metadata,created_at', 'created_at')
    ]);

    const payload = {
      format: 'postpilot-account-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      account: {
        id: currentUser.id,
        email: currentUser.email || ''
      },
      notes: {
        privateMediaFilesIncluded: false,
        signedUrlsIncluded: false,
        credentialsIncluded: false
      },
      counts: {
        projects: projectRows.length,
        versions: versionRows.length,
        outputs: outputRows.length
      },
      projects: projectRows.map(portableProject),
      versions: versionRows.map(safeAccountVersion),
      outputs: outputRows.map(safeAccountOutput)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'postpilot-dados-da-conta-' + localDateKey(new Date()) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Dados da conta exportados.');
  } catch (error) {
    console.error('PostPilot account export:', error);
    showToast('Não foi possível exportar os dados da conta.');
  } finally {
    exportAccountDataButton.disabled = false;
    exportAccountDataButton.textContent = originalLabel;
  }
}

async function cleanupOrphanMedia() {
  if (!supabaseClient || !currentUser) return;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  try {
    const { data: projects, error: projectError } = await supabaseClient
      .from('postpilot_projects')
      .select('id')
      .limit(1000);
    if (projectError) throw projectError;
    const activeIds = new Set((projects || []).map(item => String(item.id)));

    const { data: folders, error: folderError } = await supabaseClient.storage
      .from('postpilot-media')
      .list(currentUser.id, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (folderError) throw folderError;

    for (const folder of folders || []) {
      const projectId = String(folder.name || '');
      if (!projectId || activeIds.has(projectId)) continue;

      const { data: files, error: filesError } = await supabaseClient.storage
        .from('postpilot-media')
        .list(currentUser.id + '/' + projectId, { limit: 1000 });
      if (filesError) continue;

      const stalePaths = (files || []).filter(file => {
        const created = Date.parse(file.created_at || file.updated_at || '');
        return Number.isFinite(created) && created < cutoff;
      }).map(file => currentUser.id + '/' + projectId + '/' + file.name);

      if (stalePaths.length) {
        await supabaseClient.storage.from('postpilot-media').remove(stalePaths);
      }
    }
  } catch (error) {
    console.warn('PostPilot orphan media cleanup:', error?.message || error);
  }
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
  window.setTimeout(cleanupOrphanMedia, 0);
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

function escapeIcsText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function nextCalendarDate(value) {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + 1);
  return localDateKey(date).replace(/-/g, '');
}

function buildCalendarIcs(source = visiblePacks()) {
  const scheduled = source
    .filter(pack => /^\d{4}-\d{2}-\d{2}$/.test(String(pack.publishAt || '')))
    .sort((a, b) => String(a.publishAt).localeCompare(String(b.publishAt)));

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const events = scheduled.map(pack => {
    const date = pack.publishAt.replace(/-/g, '');
    const description = [
      (currentLocale() === 'en' ? 'Platforms: ' : 'Plataformas: ') + packPlatforms(pack).join(', '),
      (currentLocale() === 'en' ? 'Status: ' : 'Status: ') + statusLabel(pack.status || 'draft'),
      ...(pack.audience ? [(currentLocale() === 'en' ? 'Audience: ' : 'Público: ') + pack.audience] : [])
    ].join('\n');

    return [
      'BEGIN:VEVENT',
      'UID:' + escapeIcsText(pack.id + '@postpilot'),
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + date,
      'DTEND;VALUE=DATE:' + nextCalendarDate(pack.publishAt),
      'SUMMARY:' + escapeIcsText('PostPilot · ' + pack.topic),
      'DESCRIPTION:' + escapeIcsText(description),
      'CATEGORIES:PostPilot',
      'END:VEVENT'
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PostPilot//Editorial Calendar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

function exportEditorialCalendar() {
  const scheduled = visiblePacks().filter(pack => /^\d{4}-\d{2}-\d{2}$/.test(String(pack.publishAt || '')));
  if (!scheduled.length) {
    showToast('Adicione uma data planejada antes de exportar.');
    return;
  }

  const blob = new Blob([buildCalendarIcs(scheduled)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'postpilot-calendario-editorial.ics';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Calendário exportado em .ics.');
}

function startOfCalendarMonth(offset = calendarMonthOffset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date;
}

async function persistPublishDate(pack, publishAt) {
  const updated = { ...pack, publishAt, time: Date.now() };
  if (currentUser) {
    const { data, error } = await supabaseClient
      .from('postpilot_projects')
      .update({ publish_at: publishAt || null, updated_at: new Date().toISOString() })
      .eq('id', pack.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapCloudPack(data);
    cloudPacks = cloudPacks.map(item => item.id === saved.id ? saved : item)
      .sort((a, b) => b.time - a.time);
    return saved;
  }

  localStorage.setItem(storageKey, JSON.stringify(readPacks().map(item => item.id === updated.id ? updated : item)));
  return updated;
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
  const platformFilter = calendarPlatformSelect?.value || 'all';
  const filteredSource = platformFilter === 'all'
    ? source
    : source.filter(pack => packPlatforms(pack).includes(platformFilter));
  const today = localDateKey(new Date());

  let days = [];
  if (calendarView === 'month') {
    const monthStart = startOfCalendarMonth();
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const gridStart = new Date(monthStart);
    const weekday = gridStart.getDay();
    const mondayDelta = weekday === 0 ? -6 : 1 - weekday;
    gridStart.setDate(gridStart.getDate() + mondayDelta);

    days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });

    calendarRange.textContent = monthStart.toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
    calendarGrid.classList.add('is-month');
    calendarGrid.classList.remove('is-week');
  } else {
    const start = startOfCalendarWeek();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });

    calendarRange.textContent = start.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' })
      + ' – '
      + end.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
    calendarGrid.classList.add('is-week');
    calendarGrid.classList.remove('is-month');
  }

  const activeMonth = calendarView === 'month' ? startOfCalendarMonth().getMonth() : null;
  calendarGrid.innerHTML = days.map(date => {
    const key = localDateKey(date);
    const dayPacks = filteredSource
      .filter(pack => pack.publishAt === key)
      .sort((a, b) => String(a.topic).localeCompare(String(b.topic), currentLocale()));
    const outsideMonth = calendarView === 'month' && date.getMonth() !== activeMonth;

    return '<article class="calendar-day' + (key === today ? ' is-today' : '') + (outsideMonth ? ' is-outside' : '') + '" data-calendar-date="' + key + '">' +
      '<header><span>' + escapeHtml(date.toLocaleDateString(currentLocale(), { weekday: 'short' })) + '</span>' +
      '<strong>' + escapeHtml(String(date.getDate()).padStart(2, '0')) + '</strong></header>' +
      '<div class="calendar-day-items">' +
      (dayPacks.length
        ? dayPacks.map(pack =>
          '<button draggable="true" type="button" class="calendar-pack status-' + escapeHtml(pack.status || 'draft') + '" data-calendar-pack="' + escapeHtml(pack.id) + '">' +
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
  if (aiGenerationToggle) aiGenerationToggle.checked = !asTemplate && pack.generationMode === 'ai' && Boolean(currentUser);
  resetMediaSelection();
  if (!asTemplate && pack.mediaName && mediaStatus) {
    mediaStatus.textContent = uiText('Mídia vinculada') + ': ' + pack.mediaName;
  }

  const selected = new Set(packPlatforms(pack));
  form.querySelectorAll('[name="platforms"]').forEach(input => {
    input.checked = selected.has(input.value);
  });

  setComposerMode(pack, asTemplate);
  form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  form.elements.f0.focus();
  showToast(asTemplate ? 'Modelo carregado. Ajuste e gere um novo pacote.' : 'Pacote aberto para edição.');
}

function focusCreatedPackage() {
  if (!result?.classList.contains('show')) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  result.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  window.setTimeout(() => result.focus?.({ preventScroll: true }), reducedMotion ? 0 : 250);
}

function cancelComposerEdit({ reset = false } = {}) {
  editingPackId = null;
  if (composerMode) composerMode.hidden = true;
  if (composerSubmitButton) composerSubmitButton.textContent = uiText('Montar pacote');
  if (reset) {
    form.reset();
    resetMediaSelection();
  }
}


function renderFocusDashboard(source) {
  if (!focusDashboard) return;
  const today = localDateKey(new Date());
  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = localDateKey(weekEndDate);

  const todayPacks = source.filter(pack => pack.publishAt === today && (pack.status || 'draft') !== 'published');
  const overdue = source.filter(pack => pack.publishAt && pack.publishAt < today && (pack.status || 'draft') !== 'published');
  const upcoming = source.filter(pack => pack.publishAt && pack.publishAt > today && pack.publishAt <= weekEnd && (pack.status || 'draft') !== 'published');
  const drafts = source.filter(pack => (pack.status || 'draft') === 'draft');

  focusDashboard.innerHTML = `
    <article><span>${uiText('Publicar hoje')}</span><strong>${todayPacks.length}</strong><small>${uiText('pacotes planejados')}</small></article>
    <article class="${overdue.length ? 'needs-attention' : ''}"><span>${uiText('Atrasados')}</span><strong>${overdue.length}</strong><small>${uiText('precisam de atenção')}</small></article>
    <article><span>${uiText('Próximos 7 dias')}</span><strong>${upcoming.length}</strong><small>${uiText('no calendário')}</small></article>
    <article><span>${uiText('Rascunhos')}</span><strong>${drafts.length}</strong><small>${uiText('para continuar')}</small></article>`;
}

function matchesAdvancedFilters(pack) {
  const platform = projectPlatformFilter?.value || 'all';
  const goal = projectGoalFilter?.value || 'all';
  const tone = projectToneFilter?.value || 'all';
  const generation = projectGenerationFilter?.value || 'all';
  const media = projectMediaFilter?.value || 'all';
  const from = projectDateFrom?.value || '';
  const to = projectDateTo?.value || '';

  if (platform !== 'all' && !packPlatforms(pack).includes(platform)) return false;
  if (goal !== 'all' && (pack.goal || 'conversa') !== goal) return false;
  if (tone !== 'all' && normalizeTone(pack.tone) !== tone) return false;
  if (generation !== 'all' && (pack.generationMode || 'local') !== generation) return false;
  if (media === 'with' && !pack.mediaPath) return false;
  if (media === 'without' && pack.mediaPath) return false;
  if (from && (!pack.publishAt || pack.publishAt < from)) return false;
  if (to && (!pack.publishAt || pack.publishAt > to)) return false;
  return true;
}

function renderProductionInsights(source) {
  if (!productionInsights) return;
  if (!source.length) {
    productionInsights.innerHTML = '<p>' + uiText('Crie alguns pacotes para ver seus padrões de produção.') + '</p>';
    return;
  }

  const platformCounts = {};
  const goalCounts = {};
  source.forEach(pack => {
    packPlatforms(pack).forEach(platform => { platformCounts[platform] = (platformCounts[platform] || 0) + 1; });
    const goal = pack.goal || 'conversa';
    goalCounts[goal] = (goalCounts[goal] || 0) + 1;
  });
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const topGoalCode = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'conversa';
  const topGoal = uiText(({ conversa: 'Gerar conversa', alcance: 'Alcançar novas pessoas', oferta: 'Apresentar um serviço' })[topGoalCode] || 'Gerar conversa');
  const withMedia = source.filter(pack => pack.mediaPath).length;
  const withAi = source.filter(pack => pack.generationMode === 'ai').length;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = source.filter(pack => Number(pack.createdAt || pack.time || 0) >= sevenDaysAgo).length;

  const percent = count => Math.round((count / source.length) * 100);
  productionInsights.innerHTML = `
    <div class="insight-head"><span class="eyebrow">${uiText('INSIGHTS')}</span><strong>${uiText('Seu ritmo editorial')}</strong></div>
    <div class="insight-grid">
      <article><span>${uiText('Plataforma mais usada')}</span><strong>${escapeHtml(topPlatform)}</strong></article>
      <article><span>${uiText('Objetivo dominante')}</span><strong>${escapeHtml(topGoal)}</strong></article>
      <article><span>${uiText('Com mídia')}</span><strong>${percent(withMedia)}%</strong></article>
      <article><span>${uiText('Gerados com IA')}</span><strong>${percent(withAi)}%</strong></article>
      <article><span>${uiText('Criados nos últimos 7 dias')}</span><strong>${recent}</strong></article>
    </div>`;
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
  const hasProjects = source.length > 0;
  const compactProjectActions = Boolean(window.matchMedia?.('(max-width: 900px)').matches);
  [
    focusDashboard,
    productionMetrics,
    projectSearch?.closest('.history-toolbar'),
    document.querySelector('.advanced-filters')
  ].forEach(element => {
    if (element) element.hidden = !hasProjects;
  });

  if (hasProjects) {
    if (productionMetrics && !productionMetrics.dataset.initialized) {
      productionMetrics.open = !window.matchMedia?.('(max-width: 620px)').matches;
      productionMetrics.dataset.initialized = 'true';
    }
    renderFocusDashboard(source);
    renderProductionSummary(source);
    renderProductionInsights(source);
  }
  renderEditorialCalendar(source);
  const normalized = source
    .filter(pack => filter === 'all' || (pack.status || 'draft') === filter)
    .filter(matchesAdvancedFilters)
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
          <div class="item-actions-primary">
            <select class="project-status-select" data-status-id="${escapeHtml(pack.id)}" aria-label="Status do projeto">
              <option value="draft"${status === 'draft' ? ' selected' : ''}>Rascunho</option>
              <option value="ready"${status === 'ready' ? ' selected' : ''}>Pronto</option>
              <option value="published"${status === 'published' ? ' selected' : ''}>Publicado</option>
            </select>
            <button class="secondary project-open-action" type="button" data-pack="${escapeHtml(pack.id)}">Abrir</button>
          </div>
          <details class="project-more-actions"${compactProjectActions ? '' : ' open'}>
            <summary>${uiText('Mais opções')}</summary>
            <div class="project-more-actions-body">
              <button class="secondary" type="button" data-edit-pack="${escapeHtml(pack.id)}">${uiText('Editar')}</button>
              <button class="secondary" type="button" data-template-pack="${escapeHtml(pack.id)}">${uiText('Usar como modelo')}</button>
              <button class="secondary project-delete-action" type="button" data-delete="${escapeHtml(pack.id)}" aria-label="${uiText('Excluir pacote')}">${uiText('Excluir')}</button>
            </div>
          </details>
        </div>
      </div>`;
    }).join('')
    : '<div class="empty empty-pack-state"><span class="empty-pack-icon" aria-hidden="true">✦</span><strong>' + uiText('Seu primeiro pacote começa no briefing.') + '</strong><p>' + uiText('Preencha o tema e a transcrição à esquerda. O PostPilot organiza o restante para revisão e planejamento.') + '</p><a class="secondary compact empty-pack-action" href="#form">' + uiText('Começar briefing') + '</a></div>';
}

function renderPack(pack, { expandFirst = false } = {}) {
  openedPackId = pack.id;
  const checklist = normalizePublishChecklist(pack);
  const cards = packPlatforms(pack).map((platform, platformIndex) => {
    const deliverable = platformDeliverable(pack, platform);
    const state = checklist[platform];
    const platformProgress = Number(state.reviewed) + Number(state.mediaReady) + Number(state.published);
    const bodyId = 'platform-body-' + platformIndex;
    const compactViewport = window.matchMedia?.('(max-width: 620px)').matches;
    const expanded = platformIndex === 0 && (expandFirst || !compactViewport);
    return `
      <article class="platform-card${expanded ? '' : ' is-collapsed'}">
        <div class="platform-card-head">
          <div><h4>${escapeHtml(deliverable.title)}</h4><small class="platform-progress">${platformProgress}/3 ${uiText('concluídos')}</small></div>
          <button class="platform-card-toggle" type="button" data-platform-toggle aria-expanded="${expanded}" aria-controls="${bodyId}">${expanded ? uiText('Recolher') : uiText('Expandir')}</button>
        </div>
        <div class="platform-card-body" id="${bodyId}"${expanded ? '' : ' hidden'}>
          <div class="platform-card-actions"><button class="copy-platform" type="button" data-copy-platform="${escapeHtml(platform)}">${uiText('Copiar')}</button><button class="publish-assist" type="button" data-publish-platform="${escapeHtml(platform)}">${uiText('Copiar e abrir')}</button></div>
          ${deliverable.lines.map(([label, value]) => `<div class="deliverable" data-deliverable-platform="${escapeHtml(platform)}" data-deliverable-label="${escapeHtml(label)}"><div class="deliverable-head"><span>${escapeHtml(label)}</span><button class="regenerate-field" type="button" data-regenerate-field>${uiText('Nova versão')}</button></div><p>${escapeHtml(value).replace(/\n/g, '<br>')}</p></div>`).join('')}
          <details class="publish-checklist-details"${compactViewport ? '' : ' open'}>
            <summary>${uiText('Checklist de publicação')} <small>${platformProgress}/3</small></summary>
            <fieldset class="publish-checklist">
              <legend class="sr-only">${uiText('Checklist de publicação')}</legend>
              <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="reviewed"${state.reviewed ? ' checked' : ''}><span>${uiText('Texto revisado')}</span></label>
              <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="mediaReady"${state.mediaReady ? ' checked' : ''}><span>${uiText('Mídia pronta')}</span></label>
              <label><input type="checkbox" data-check-platform="${escapeHtml(platform)}" data-check-step="published"${state.published ? ' checked' : ''}><span>${uiText('Publicado na plataforma')}</span></label>
            </fieldset>
          </details>
        </div>
      </article>`;
  }).join('');

  const checklistStats = checklistProgress(pack);
  const segments = cleanTranscriptionSegments(pack.transcriptionSegments);
  const transcriptEditorHtml = segments.length ? `
    <details class="transcript-editor">
      <summary>${uiText('Transcrição com timestamps')} <small>${segments.length} ${uiText('segmentos')}</small></summary>
      <div class="transcript-segment-list">
        ${segments.map((segment, index) => `
          <article class="transcript-segment" data-segment-index="${index}">
            <button type="button" class="segment-time" data-seek-segment="${segment.start}">${formatTimestamp(segment.start)}–${formatTimestamp(segment.end)}</button>
            <textarea data-segment-text maxlength="800">${escapeHtml(segment.text)}</textarea>
            <div class="segment-actions">
              <button class="secondary compact" type="button" data-segment-split>${uiText('Dividir')}</button>
              <button class="secondary compact" type="button" data-segment-merge${index === segments.length - 1 ? ' disabled' : ''}>${uiText('Mesclar próximo')}</button>
            </div>
          </article>`).join('')}
      </div>
    </details>` : '';
  const cuts = cutSuggestions(pack);
  const cutsHtml = cuts.length ? `
    <section class="cut-suggestions" aria-label="${uiText('Sugestões de cortes')}">
      <div class="cut-suggestions-head"><div><span class="eyebrow">${uiText('CORTES')}</span><h4>${uiText('Sugestões de cortes')}</h4></div><small>${uiText('Baseadas nos timestamps da transcrição.')}</small></div>
      <div class="cut-suggestion-list">
        ${cuts.map((cut, index) => `
          <article class="cut-suggestion${cut.rejected ? ' is-rejected' : ''}${cut.favorite ? ' is-favorite' : ''}" data-cut-key="${escapeHtml(cut.key)}">
            <button class="cut-time" type="button" data-seek-cut="${cut.start}">${formatTimestamp(cut.start)}–${formatTimestamp(cut.end)}</button>
            <div class="cut-suggestion-body">
              <div class="cut-title-row"><strong>${uiText('Corte')} ${index + 1}</strong><span>${cut.favorite ? '★' : ''}</span></div>
              <p>${escapeHtml(cut.text)}</p>
              <div class="cut-editor-controls">
                <label><span>${uiText('Início')}</span><input type="number" min="0" step="0.1" data-cut-start value="${cut.start.toFixed(1)}"></label>
                <label><span>${uiText('Fim')}</span><input type="number" min="0" step="0.1" data-cut-end value="${cut.end.toFixed(1)}"></label>
                <button class="secondary compact" type="button" data-cut-favorite>${cut.favorite ? uiText('Desfavoritar') : uiText('Favoritar')}</button>
                <button class="secondary compact" type="button" data-cut-reject>${cut.rejected ? uiText('Restaurar') : uiText('Descartar')}</button>
              </div>
            </div>
          </article>`).join('')}
      </div>
    </section>` : '';

  result.innerHTML = `
    <div class="result-heading">
      <div class="result-heading-main">
        <h3>${escapeHtml(pack.topic)}</h3>
        <div class="pack-meta-chips">
          <span>${packPlatforms(pack).length} ${packPlatforms(pack).length > 1 ? uiText('plataformas') : uiText('plataforma')}</span>
          <span>${escapeHtml(toneLabel(pack.tone))}</span>
          ${pack.audience ? '<span>' + escapeHtml(uiText('Público')) + ': ' + escapeHtml(pack.audience) + '</span>' : ''}
          ${pack.publishAt ? '<span>' + escapeHtml(uiText('Planejado para')) + ' ' + escapeHtml(formatPlannedDate(pack.publishAt)) + '</span>' : ''}
        </div>
        <small class="pack-checklist-progress">${uiText('Checklist')}: ${checklistStats.done}/${checklistStats.total}</small>
      </div>
      <span class="project-status status-${escapeHtml(pack.status || 'draft')}">${statusLabel(pack.status || 'draft')}</span>
    </div>
    ${pack.mediaName ? '<div class="media-linked"><strong>' + escapeHtml(uiText('Mídia vinculada')) + ':</strong> <span>' + escapeHtml(pack.mediaName) + '</span>' + (pack.mediaSizeBytes ? '<small>' + escapeHtml(formatFileSize(pack.mediaSizeBytes)) + '</small>' : '') + '<small data-media-duration></small>' + (currentUser ? '<button class="secondary compact media-retranscribe" type="button" data-transcribe-existing' + (serviceHealth.transcription.configured === true && Number(serviceHealth.transcription.remaining) > 0 ? '' : ' disabled') + '>' + escapeHtml(
      serviceHealth.transcription.configured !== true
        ? uiText('Transcrição indisponível')
        : Number(serviceHealth.transcription.remaining) <= 0
          ? uiText('Limite da hora atingido')
          : uiText('Transcrever agora')
    ) + '</button>' : '') + '</div><div id="media-preview-host" class="media-preview-host"></div>' : ''}
    ${transcriptEditorHtml}
    ${cutsHtml}
    <div class="platform-grid">${cards}</div>
    <details class="version-history"><summary>${uiText('Histórico de versões')}</summary><div id="version-list" class="version-list"></div></details>
    <p class="generator-note"><small>${currentUser ? 'Projeto sincronizado na sua conta.' : 'Projeto salvo neste dispositivo.'} ${pack.generationMode === 'ai' ? uiText('Conteúdo melhorado com IA no backend.') : uiText('O gerador atual usa regras locais, sem IA externa.')}</small></p>
    <div class="result-actions">
      <div class="result-action-group">
        <span class="result-action-label">${uiText('Ações do pacote')}</span>
        <div class="result-action-row">
          <button class="secondary" id="edit-pack" type="button">${uiText('Editar')}</button>
          <button class="secondary" id="template-pack" type="button">${uiText('Usar como modelo')}</button>
        </div>
      </div>
      <div class="result-action-group result-export-group">
        <span class="result-action-label">${uiText('Exportar')}</span>
        <div class="result-action-row">
          <button class="secondary" id="copy" type="button">${uiText('Copiar pacote completo')}</button>
          <label class="export-format"><span class="sr-only">${uiText('Exportar')}</span><select id="export-format" aria-label="${uiText('Formato de exportação')}"><option value="txt">TXT</option><option value="md">Markdown</option><option value="json">JSON</option><option value="csv">CSV</option></select></label>
          <button class="secondary" id="export" type="button">${uiText('Baixar')}</button>
        </div>
      </div>
    </div>`;
  result.classList.add('show');
  if (pack.mediaName) renderMediaPreview(pack);
  renderVersionHistory(pack);
  document.querySelector('#edit-pack').addEventListener('click', () => fillComposerFromPack(pack));
  document.querySelector('#template-pack').addEventListener('click', () => fillComposerFromPack(pack, { asTemplate: true }));
  document.querySelector('#copy').addEventListener('click', () => copyText(packageText(pack)));
  document.querySelector('#export').addEventListener('click', () => downloadPackage(pack, document.querySelector('#export-format')?.value || 'txt'));
  result.querySelectorAll('[data-platform-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.platform-card');
      const body = card?.querySelector('.platform-card-body');
      if (!card || !body) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.textContent = expanded ? uiText('Expandir') : uiText('Recolher');
      body.hidden = expanded;
      card.classList.toggle('is-collapsed', expanded);
    });
  });
  result.querySelectorAll('[data-copy-platform]').forEach(button => {
    button.addEventListener('click', () => copyText(platformText(pack, button.dataset.copyPlatform)));
  });
  result.querySelector('[data-transcribe-existing]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = uiText('Transcrevendo mídia…');
    try {
      const saved = await transcribeExistingMedia(pack);
      renderPack(saved);
      renderList();
      showToast('Transcrição atualizada a partir da mídia.');
    } catch (error) {
      console.error(error);
      const canRetry = serviceHealth.transcription.configured === true
        && Number(serviceHealth.transcription.remaining) > 0;
      button.disabled = !canRetry;
      button.textContent = serviceHealth.transcription.configured !== true
        ? uiText('Transcrição indisponível')
        : Number(serviceHealth.transcription.remaining) <= 0
          ? uiText('Limite da hora atingido')
          : uiText('Transcrever agora');
      showToast('Não foi possível transcrever a mídia agora.');
    }
  });
  result.querySelectorAll('[data-publish-platform]').forEach(button => {
    button.addEventListener('click', () => assistPublish(pack, button.dataset.publishPlatform));
  });
  result.querySelectorAll('[data-regenerate-field]').forEach(button => {
    button.addEventListener('click', async () => {
      const field = button.closest('[data-deliverable-platform]');
      const platform = field?.dataset.deliverablePlatform;
      const label = field?.dataset.deliverableLabel;
      const current = field?.querySelector('p')?.innerText || '';
      if (!platform || !label) return;
      button.disabled = true;
      try {
        const saved = await persistContentOverride(pack, platform, label, current);
        renderPack(saved);
        renderList();
        showToast('Nova versão criada.');
      } catch (error) {
        console.error(error);
        button.disabled = false;
        showToast('Não foi possível criar outra versão.');
      }
    });
  });
  result.querySelectorAll('[data-seek-cut],[data-seek-segment]').forEach(button => {
    button.addEventListener('click', () => {
      const player = result.querySelector('#media-preview-player');
      if (!player) return;
      const seconds = button.dataset.seekCut ?? button.dataset.seekSegment;
      player.currentTime = Number(seconds) || 0;
      player.play?.().catch(() => {});
    });
  });
  result.querySelectorAll('[data-segment-index]').forEach(card => {
    const index = Number(card.dataset.segmentIndex);
    const saveSegments = async next => {
      try {
        const saved = await persistTranscriptionSegments(pack, next);
        renderPack(saved);
        renderList();
        showToast('Transcrição atualizada.');
      } catch (error) {
        console.error(error);
        showToast('Não foi possível atualizar a transcrição.');
      }
    };
    card.querySelector('[data-segment-text]')?.addEventListener('change', event => {
      const next = cleanTranscriptionSegments(pack.transcriptionSegments);
      if (!next[index]) return;
      next[index].text = event.target.value;
      saveSegments(next);
    });
    card.querySelector('[data-segment-split]')?.addEventListener('click', () => {
      const next = cleanTranscriptionSegments(pack.transcriptionSegments);
      const segment = next[index];
      if (!segment || segment.text.length < 20 || segment.end <= segment.start) {
        showToast('Este segmento é curto demais para dividir.');
        return;
      }
      const midpoint = Math.floor(segment.text.length / 2);
      let splitAt = segment.text.indexOf(' ', midpoint);
      if (splitAt < 0) splitAt = midpoint;
      const middleTime = segment.start + (segment.end - segment.start) / 2;
      const first = { start: segment.start, end: middleTime, text: segment.text.slice(0, splitAt).trim() };
      const second = { start: middleTime, end: segment.end, text: segment.text.slice(splitAt).trim() };
      next.splice(index, 1, first, second);
      saveSegments(next);
    });
    card.querySelector('[data-segment-merge]')?.addEventListener('click', () => {
      const next = cleanTranscriptionSegments(pack.transcriptionSegments);
      const first = next[index];
      const second = next[index + 1];
      if (!first || !second) return;
      next.splice(index, 2, {
        start: first.start,
        end: second.end,
        text: (first.text + ' ' + second.text).trim().slice(0, 800)
      });
      saveSegments(next);
    });
  });
  result.querySelectorAll('[data-cut-key]').forEach(card => {
    const key = card.dataset.cutKey;
    const saveDecision = async patch => {
      const current = normalizeCutOverrides(pack);
      const found = current.find(item => item.key === key) || { key };
      const next = current.filter(item => item.key !== key);
      next.push({ ...found, ...patch, key });
      try {
        const saved = await persistCutOverrides(pack, next);
        renderPack(saved);
        renderList();
        showToast('Corte atualizado.');
      } catch (error) {
        console.error(error);
        showToast('Não foi possível atualizar o corte.');
      }
    };
    card.querySelector('[data-cut-favorite]')?.addEventListener('click', () => {
      const cut = cuts.find(item => item.key === key);
      saveDecision({ start: cut?.start, end: cut?.end, favorite: !cut?.favorite, rejected: Boolean(cut?.rejected) });
    });
    card.querySelector('[data-cut-reject]')?.addEventListener('click', () => {
      const cut = cuts.find(item => item.key === key);
      saveDecision({ start: cut?.start, end: cut?.end, favorite: Boolean(cut?.favorite), rejected: !cut?.rejected });
    });
    const saveTimes = () => {
      const cut = cuts.find(item => item.key === key);
      const start = Number(card.querySelector('[data-cut-start]')?.value);
      const end = Number(card.querySelector('[data-cut-end]')?.value);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        showToast('O fim do corte deve ser maior que o início.');
        renderPack(pack);
        return;
      }
      saveDecision({ start, end, favorite: Boolean(cut?.favorite), rejected: Boolean(cut?.rejected) });
    };
    card.querySelector('[data-cut-start]')?.addEventListener('change', saveTimes);
    card.querySelector('[data-cut-end]')?.addEventListener('change', saveTimes);
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

function serviceStatusLabel(service) {
  if (service?.configured === true && Number(service.remaining) <= 0) return uiText('Limite da hora atingido');
  if (service?.configured === true) return uiText('Ativo');
  if (service?.configured === false) return uiText('Não configurado');
  return uiText('Verificando…');
}

function renderServiceHealth() {
  if (!serviceHealthHost) return;
  if (aiServiceStatus) aiServiceStatus.textContent = serviceStatusLabel(serviceHealth.ai);
  if (transcriptionServiceStatus) transcriptionServiceStatus.textContent = serviceStatusLabel(serviceHealth.transcription);

  if (aiServiceLimit) {
    if (serviceHealth.ai.configured === true) {
      const reset = serviceHealth.ai.resetAt
        ? new Date(serviceHealth.ai.resetAt).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })
        : '';
      aiServiceLimit.textContent = [
        serviceHealth.ai.hourlyLimit ? serviceHealth.ai.remaining + '/' + serviceHealth.ai.hourlyLimit + ' ' + uiText('disponíveis nesta hora') : '',
        reset ? uiText('renova às') + ' ' + reset : ''
      ].filter(Boolean).join(' · ');
    } else {
      aiServiceLimit.textContent = serviceHealth.ai.configured === false
        ? uiText('Gerador local ativo. Configure um provedor para liberar IA.')
        : uiText('Serviço indisponível para verificação agora.');
    }
  }

  if (transcriptionServiceLimit) {
    const max = formatFileSize(serviceHealth.transcription.maxBytes || 0);
    if (serviceHealth.transcription.configured === true) {
      const reset = serviceHealth.transcription.resetAt
        ? new Date(serviceHealth.transcription.resetAt).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })
        : '';
      transcriptionServiceLimit.textContent = [
        serviceHealth.transcription.hourlyLimit ? serviceHealth.transcription.remaining + '/' + serviceHealth.transcription.hourlyLimit + ' ' + uiText('disponíveis nesta hora') : '',
        max ? uiText('até') + ' ' + max : '',
        reset ? uiText('renova às') + ' ' + reset : ''
      ].filter(Boolean).join(' · ');
    } else {
      transcriptionServiceLimit.textContent = serviceHealth.transcription.configured === false
        ? uiText('Transcrição externa não configurada. Você ainda pode enviar mídia privada e usar um resumo manual.')
        : uiText('Serviço indisponível para verificação agora.');
    }
  }

  if (aiGenerationToggle) {
    const enabled = Boolean(currentUser)
      && serviceHealth.ai.configured === true
      && Number(serviceHealth.ai.remaining) > 0;
    aiGenerationToggle.disabled = !enabled;
    if (!enabled) aiGenerationToggle.checked = false;
  }
}

async function refreshServiceHealth() {
  if (!supabaseClient || !currentUser) {
    serviceHealth = {
      ai: { configured: null, hourlyLimit: 20, remaining: 20, resetAt: '' },
      transcription: { configured: null, hourlyLimit: 10, remaining: 10, resetAt: '', maxBytes: 6 * 1024 * 1024 }
    };
    renderServiceHealth();
    return serviceHealth;
  }

  if (refreshServiceHealthButton) refreshServiceHealthButton.disabled = true;
  try {
    const [aiResult, transcriptionResult] = await Promise.allSettled([
      supabaseClient.functions.invoke('postpilot-generate', { body: { action: 'health' } }),
      supabaseClient.functions.invoke('postpilot-transcribe', { body: { action: 'health' } })
    ]);

    if (aiResult.status === 'fulfilled' && !aiResult.value.error && aiResult.value.data) {
      serviceHealth.ai = {
        configured: Boolean(aiResult.value.data.configured),
        hourlyLimit: Number(aiResult.value.data.hourlyLimit) || 20,
        remaining: Number.isFinite(Number(aiResult.value.data.remaining)) ? Number(aiResult.value.data.remaining) : 20,
        resetAt: String(aiResult.value.data.resetAt || '')
      };
    } else {
      serviceHealth.ai = { configured: null, hourlyLimit: 20, remaining: 20, resetAt: '' };
    }

    if (transcriptionResult.status === 'fulfilled' && !transcriptionResult.value.error && transcriptionResult.value.data) {
      serviceHealth.transcription = {
        configured: Boolean(transcriptionResult.value.data.configured),
        hourlyLimit: Number(transcriptionResult.value.data.hourlyLimit) || 10,
        remaining: Number.isFinite(Number(transcriptionResult.value.data.remaining)) ? Number(transcriptionResult.value.data.remaining) : 10,
        resetAt: String(transcriptionResult.value.data.resetAt || ''),
        maxBytes: Number(transcriptionResult.value.data.maxBytes) || 6 * 1024 * 1024
      };
    } else {
      serviceHealth.transcription = { configured: null, hourlyLimit: 10, remaining: 10, resetAt: '', maxBytes: 6 * 1024 * 1024 };
    }
  } catch (error) {
    console.warn('PostPilot service health:', error);
  } finally {
    renderServiceHealth();
    if (refreshServiceHealthButton) refreshServiceHealthButton.disabled = false;
  }
  return serviceHealth;
}

function updateAccountButtonLabel() {
  if (!accountOpenButton) return;
  let full = accountOpenButton.querySelector('.account-open-full');
  let short = accountOpenButton.querySelector('.account-open-short');
  if (!full || !short) {
    accountOpenButton.innerHTML = '<span class="account-open-full"></span><span class="account-open-short"></span>';
    full = accountOpenButton.querySelector('.account-open-full');
    short = accountOpenButton.querySelector('.account-open-short');
  }
  const fullLabel = currentUser ? uiText('Minha conta') : uiText('Entrar / sincronizar');
  const shortLabel = currentUser ? uiText('Conta') : uiText('Entrar');
  full.textContent = fullLabel;
  short.textContent = shortLabel;
  accountOpenButton.setAttribute('aria-label', fullLabel);
}

function updateAccountUi() {
  const localCount = readPacks().length;
  // Keep the account dialog reachable even when the cloud SDK/backend is unavailable.
  // The dialog explains the degraded state while local mode keeps working.
  accountOpenButton.disabled = false;
  updateAccountButtonLabel();
  syncStatus.textContent = currentUser
    ? (cloudLoading ? 'Sincronizando…' : 'Nuvem · ' + (currentUser.email || 'conta conectada'))
    : (supabaseClient ? 'Salvo neste dispositivo' : 'Modo local');

  accountForm.hidden = !supabaseClient || Boolean(currentUser);
  accountProfile.hidden = !currentUser;
  if (localBackupControls) localBackupControls.hidden = Boolean(currentUser);
  if (aiGenerationToggle && !currentUser) {
    aiGenerationToggle.disabled = true;
    aiGenerationToggle.checked = false;
  }
  renderServiceHealth();
  if (mediaFileInput) mediaFileInput.disabled = !currentUser;
  if (!currentUser) resetMediaSelection();
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
  togglePasswordButton?.addEventListener('click', () => {
    const input = accountForm?.elements?.password;
    if (!input) return;
    const revealing = input.type === 'password';
    input.type = revealing ? 'text' : 'password';
    togglePasswordButton.textContent = uiText(revealing ? 'Ocultar' : 'Mostrar');
    togglePasswordButton.setAttribute('aria-label', uiText(revealing ? 'Ocultar senha' : 'Mostrar senha'));
    togglePasswordButton.setAttribute('aria-pressed', String(revealing));
  });

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
  refreshServiceHealthButton?.addEventListener('click', refreshServiceHealth);
  exportAccountDataButton?.addEventListener('click', exportAccountData);

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
    if (user) {
      window.setTimeout(loadCloudPacks, 0);
      window.setTimeout(refreshServiceHealth, 0);
    } else {
      renderList();
      refreshServiceHealth();
    }
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
  const manualTranscript = String(values.f1 || '').trim();
  if (!manualTranscript && !pendingMediaFile) {
    showToast(uiText('Informe uma transcrição/resumo ou envie uma mídia.'));
    form.elements.f1.focus();
    return;
  }
  if (!pendingMediaFile && !assessContentContext(values.f0, manualTranscript).enough) {
    showToast(uiText('Adicione mais contexto antes de montar o pacote.'));
    form.elements.f1.focus();
    return;
  }
  const platforms = Array.from(form.querySelectorAll('[name="platforms"]:checked')).map(input => input.value);
  if (!platforms.length) {
    showToast('Escolha pelo menos uma plataforma.');
    return;
  }
  const existing = editingPackId ? visiblePacks().find(item => item.id === editingPackId) : null;
  const pack = {
    id: existing?.id || makeUuid(),
    topic: values.f0.trim(),
    transcript: manualTranscript,
    platforms,
    channel: platforms[0],
    tone: normalizeTone(values.f3),
    goal: values.goal,
    audience: String(values.audience || '').trim(),
    publishAt: String(values.publishAt || ''),
    publishChecklist: existing ? normalizePublishChecklist(existing) : {},
    generationMode: existing?.generationMode || 'local',
    generationData: existing?.generationData || {},
    mediaPath: existing?.mediaPath || '',
    mediaName: existing?.mediaName || '',
    mediaType: existing?.mediaType || '',
    mediaSizeBytes: existing?.mediaSizeBytes || 0,
    transcriptionSegments: existing?.transcriptionSegments || [],
    cutOverrides: existing?.cutOverrides || [],
    contentOverrides: existing?.contentOverrides || {},
    versions: existing?.versions || [],
    status: existing?.status || 'draft',
    createdAt: existing?.createdAt || existing?.time || Date.now(),
    time: Date.now()
  };

  if (currentUser) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (pendingMediaFile) {
        if (serviceHealth.transcription.configured === null) await refreshServiceHealth();
        const canTranscribe = serviceHealth.transcription.configured === true
          && Number(serviceHealth.transcription.remaining) > 0;
        if (!canTranscribe && !assessContentContext(values.f0, manualTranscript).enough) {
          showToast(uiText('A transcrição ainda não está ativa. Adicione um resumo com mais contexto para continuar com a mídia.'));
          if (mediaStatus) mediaStatus.textContent = uiText('Transcrição indisponível. A mídia será preservada quando houver um resumo manual.');
          form.elements.f1.focus();
          return;
        }

        try {
          const media = await uploadAndTranscribeMedia(pendingMediaFile, pack.id, { transcribe: canTranscribe });
          pack.mediaPath = media.mediaPath;
          pack.mediaName = media.mediaName;
          pack.mediaType = media.mediaType;
          pack.mediaSizeBytes = media.mediaSizeBytes;

          if (media.transcript) {
            pack.transcript = media.transcript;
            pack.transcriptionSegments = media.segments;
            form.elements.f1.value = media.transcript;
            if (mediaStatus) mediaStatus.textContent = uiText('Transcrição concluída.');
          } else {
            pack.transcript = manualTranscript;
            if (mediaStatus) mediaStatus.textContent = uiText('Mídia enviada. Usando o resumo manual.');
          }
        } catch (mediaError) {
          console.warn('PostPilot transcription:', mediaError);
          const uploaded = mediaError?.uploadedMedia;
          if (uploaded) {
            pack.mediaPath = uploaded.mediaPath;
            pack.mediaName = uploaded.mediaName;
            pack.mediaType = uploaded.mediaType;
            pack.mediaSizeBytes = uploaded.mediaSizeBytes;
          }
          if (!assessContentContext(values.f0, manualTranscript).enough) {
            showToast(uiText('Mídia preservada. Adicione um resumo com mais contexto ou tente transcrever novamente.'));
            if (mediaStatus) mediaStatus.textContent = uiText('Mídia preservada. A transcrição falhou; você pode tentar novamente.');
            return;
          }
          pack.transcript = manualTranscript;
          showToast('Mídia preservada. Usando o texto informado.');
        }
      }

      if (aiGenerationToggle?.checked) {
        showToast('Gerando conteúdo com IA…');
        try {
          pack.generationData = await generateAiContent(pack);
          pack.generationMode = 'ai';
        } catch (aiError) {
          console.warn('PostPilot AI fallback:', aiError);
          pack.generationData = {};
          pack.generationMode = 'local';
          showToast('IA indisponível. Usando o gerador local.');
        }
      } else {
        pack.generationData = {};
        pack.generationMode = 'local';
      }

      const saved = await saveCloudPack(pack);
      if (existing?.mediaPath && saved.mediaPath && existing.mediaPath !== saved.mediaPath) {
        supabaseClient.storage.from('postpilot-media').remove([existing.mediaPath]).catch(() => {});
      }
      cloudPacks = [saved, ...cloudPacks.filter(item => item.id !== saved.id)].slice(0, 20);
      renderPack(saved, { expandFirst: !existing });
      renderList();
      cancelComposerEdit();
      resetMediaSelection();
      showToast(existing ? 'Alterações salvas na sua conta.' : 'Pacote salvo na sua conta.');
      if (!existing) focusCreatedPackage();
    } catch (error) {
      console.error(error);
      showToast('Não foi possível sincronizar. Tente novamente.');
    } finally {
      submit.disabled = false;
    }
    return;
  }

  const versionEntry = { createdAt: Date.now(), snapshot: packSnapshot(pack) };
  pack.versions = existing
    ? [...localVersions(existing), versionEntry].slice(-10)
    : [versionEntry];
  const packs = existing
    ? readPacks().map(item => item.id === pack.id ? pack : item)
    : [...readPacks(), pack];
  localStorage.setItem(storageKey, JSON.stringify(packs.slice(-20)));
  renderPack(pack, { expandFirst: !existing });
  renderList();
  cancelComposerEdit();
  showToast(existing ? 'Alterações salvas neste dispositivo.' : 'Pacote salvo neste dispositivo.');
  if (!existing) focusCreatedPackage();
});

projectStatusFilter?.addEventListener('change', renderList);
projectSearch?.addEventListener('input', renderList);
[projectPlatformFilter, projectGoalFilter, projectToneFilter, projectGenerationFilter, projectMediaFilter, projectDateFrom, projectDateTo]
  .forEach(control => control?.addEventListener('change', renderList));
projectFilterReset?.addEventListener('click', () => {
  if (projectStatusFilter) projectStatusFilter.value = 'all';
  if (projectSearch) projectSearch.value = '';
  [projectPlatformFilter, projectGoalFilter, projectToneFilter, projectGenerationFilter, projectMediaFilter]
    .forEach(control => { if (control) control.value = 'all'; });
  if (projectDateFrom) projectDateFrom.value = '';
  if (projectDateTo) projectDateTo.value = '';
  renderList();
});
contentTemplateSelect?.addEventListener('change', () => {
  if (applyContentTemplateButton) applyContentTemplateButton.disabled = !contentTemplateSelect.value;
});
applyContentTemplateButton?.addEventListener('click', () => {
  if (contentTemplateSelect?.value) applyContentTemplate(contentTemplateSelect.value);
});
mediaFileInput?.addEventListener('change', () => {
  const file = mediaFileInput.files?.[0] || null;
  if (!file) {
    resetMediaSelection();
    return;
  }
  if (!allowedMediaType(file.type)) {
    resetMediaSelection();
    showToast('Formato de mídia não suportado.');
    return;
  }
  if (file.size > 6 * 1024 * 1024) {
    resetMediaSelection();
    showToast('O arquivo deve ter no máximo 6 MB.');
    return;
  }
  pendingMediaFile = file;
  if (mediaFileLabel) mediaFileLabel.textContent = uiText('Trocar mídia');
  if (mediaClearButton) mediaClearButton.hidden = false;
  if (mediaStatus) mediaStatus.textContent = mediaFileText(file);
});
mediaClearButton?.addEventListener('click', async () => {
  const uploadedPath = pendingUploadedMedia?.mediaPath;
  if (uploadedPath && supabaseClient && currentUser) {
    await supabaseClient.storage.from('postpilot-media').remove([uploadedPath]).catch(() => {});
  }
  resetMediaSelection();
});
mediaCancelUploadButton?.addEventListener('click', async () => {
  if (!activeMediaUpload) return;
  try {
    await activeMediaUpload.abort(true);
    activeMediaUpload = null;
    const rejectUpload = activeMediaUploadReject;
    activeMediaUploadReject = null;
    setMediaProgress(0, false);
    rejectUpload?.(new Error('upload-cancelled'));
    if (mediaStatus) mediaStatus.textContent = uiText('Upload cancelado.');
    showToast('Upload cancelado.');
  } catch (error) {
    console.error(error);
    showToast('Não foi possível cancelar o upload.');
  }
});
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
  if (calendarView === 'month') calendarMonthOffset -= 1;
  else calendarWeekOffset -= 1;
  renderEditorialCalendar();
});
calendarTodayButton?.addEventListener('click', () => {
  calendarWeekOffset = 0;
  calendarMonthOffset = 0;
  renderEditorialCalendar();
});
calendarNextButton?.addEventListener('click', () => {
  if (calendarView === 'month') calendarMonthOffset += 1;
  else calendarWeekOffset += 1;
  renderEditorialCalendar();
});
calendarViewSelect?.addEventListener('change', () => {
  calendarView = calendarViewSelect.value === 'month' ? 'month' : 'week';
  renderEditorialCalendar();
});
calendarPlatformSelect?.addEventListener('change', renderEditorialCalendar);
calendarExportButton?.addEventListener('click', exportEditorialCalendar);
calendarGrid?.addEventListener('click', event => {
  const button = event.target.closest('[data-calendar-pack]');
  if (!button) return;
  const pack = visiblePacks().find(item => item.id === button.dataset.calendarPack);
  if (pack) renderPack(pack);
});
calendarGrid?.addEventListener('dragstart', event => {
  const button = event.target.closest('[data-calendar-pack]');
  if (!button || !event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/postpilot-pack', button.dataset.calendarPack);
});
calendarGrid?.addEventListener('dragover', event => {
  const day = event.target.closest('[data-calendar-date]');
  if (!day) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  day.classList.add('is-drop-target');
});
calendarGrid?.addEventListener('dragleave', event => {
  event.target.closest('[data-calendar-date]')?.classList.remove('is-drop-target');
});
calendarGrid?.addEventListener('drop', async event => {
  const day = event.target.closest('[data-calendar-date]');
  if (!day || !event.dataTransfer) return;
  event.preventDefault();
  day.classList.remove('is-drop-target');
  const id = event.dataTransfer.getData('text/postpilot-pack');
  const pack = visiblePacks().find(item => item.id === id);
  if (!pack || pack.publishAt === day.dataset.calendarDate) return;
  try {
    const saved = await persistPublishDate(pack, day.dataset.calendarDate);
    if (openedPackId === saved.id) renderPack(saved);
    renderList();
    showToast('Data de publicação atualizada.');
  } catch (error) {
    console.error(error);
    showToast('Não foi possível reagendar o pacote.');
  }
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
      const pack = cloudPacks.find(item => item.id === id);
      const { error } = await supabaseClient.from('postpilot_projects').delete().eq('id', id);
      if (error) {
        showToast('Não foi possível excluir o pacote.');
        return;
      }
      if (pack?.mediaPath) supabaseClient.storage.from('postpilot-media').remove([pack.mediaPath]).catch(() => {});
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
