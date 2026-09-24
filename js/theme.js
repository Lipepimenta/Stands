/* Tema claro/escuro: segue o sistema até o visitante escolher manualmente. */
(() => {
  const KEY = 'jm-theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const saved = (() => {
    try { return localStorage.getItem(KEY); } catch (_) { return null; }
  })();
  let theme = saved === 'light' || saved === 'dark' ? saved : (system.matches ? 'dark' : 'light');

  const label = () => {
    const source = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
    return window.JM_I18N ? window.JM_I18N.t(source) : source;
  };
  const updateControls = () => document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-label', label());
    button.setAttribute('title', label());
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    const text = button.querySelector('.theme-toggle-label');
    if (text) text.textContent = label();
  });
  const apply = next => {
    theme = next;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0e1418' : '#f4f5f3';
    updateControls();
  };
  apply(theme);

  const buttonMarkup = `
    <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>
    <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>
    <span class="theme-toggle-label sr-only"></span>`;
  const makeButton = className => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `theme-toggle${className ? ` ${className}` : ''}`;
    button.dataset.themeToggle = '';
    button.dataset.i18nDynamic = '';
    button.innerHTML = buttonMarkup;
    button.addEventListener('click', () => {
      apply(theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(KEY, theme); } catch (_) {}
    });
    return button;
  };

  const mount = () => {
    const header = document.querySelector('#header .inner');
    if (header) header.insertBefore(makeButton('theme-toggle-header'), header.querySelector('.language-control'));

    const modalTop = document.querySelector('.modal-top');
    if (modalTop) modalTop.insertBefore(makeButton('theme-toggle-modal'), modalTop.querySelector('.modal-close'));

    const legalTop = document.querySelector('.legal-top .inner');
    if (legalTop) legalTop.insertBefore(makeButton('theme-toggle-header'), legalTop.querySelector('.back'));

    const floatingHost = document.querySelector('.bio-shell, .notfound > div');
    if (floatingHost) floatingHost.prepend(makeButton('theme-toggle-floating'));
    updateControls();
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

  system.addEventListener('change', event => {
    let preference = null;
    try { preference = localStorage.getItem(KEY); } catch (_) {}
    if (!preference) apply(event.matches ? 'dark' : 'light');
  });
  addEventListener('jm:languagechange', updateControls);
})();
