(() => {
  const installButton = document.querySelector('#install-app');
  let deferredPrompt = null;

  function t(value) {
    return window.AppI18n?.t?.(value) || value;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => {
        console.warn('PostPilot service worker unavailable:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installButton.disabled = true;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      installButton.hidden = true;
      installButton.disabled = false;
    }
  });

  window.addEventListener('app-language-change', () => {
    if (installButton) installButton.textContent = t('Instalar app');
  });
})();
