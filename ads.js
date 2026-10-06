(() => {
  const config = window.POSTPILOT_ADS || {};
  if (!config.enabled || !config.publisherId) return;

  const slot = config.slots?.appFooter;
  if (!slot) return;

  const active = Array.from(document.querySelectorAll('[data-ad-placement="app-footer"]')).filter(container => {
    const ad = container.querySelector('.adsbygoogle');
    if (!ad) return false;
    ad.dataset.adClient = config.publisherId;
    ad.dataset.adSlot = slot;
    container.hidden = false;
    return true;
  });
  if (!active.length) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisherId)}`;
  script.onload = () => active.forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (error) { console.warn('PostPilot: anúncio não pôde ser inicializado.', error); }
  });
  document.head.append(script);
})();
