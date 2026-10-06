(() => {
  const buttons = [...document.querySelectorAll('[data-page-language]')];
  const sections = [...document.querySelectorAll('[data-lang]')];
  const saved = localStorage.getItem('postpilot-language');
  const initial = saved === 'en' ? 'en' : 'pt-BR';

  function apply(locale) {
    const lang = locale === 'en' ? 'en' : 'pt-BR';
    document.documentElement.lang = lang;
    sections.forEach(section => {
      section.hidden = section.dataset.lang !== lang;
    });
    buttons.forEach(button => {
      const active = button.dataset.pageLanguage === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    localStorage.setItem('postpilot-language', lang);
  }

  buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.pageLanguage)));
  apply(initial);
})();