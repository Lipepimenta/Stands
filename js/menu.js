/* ==========================================================================
   Menu do celular e do tablet (até 1100px)
   O botão de três linhas abre a navegação em painel; tema e idioma vão para
   dentro do painel nessas telas, para o cabeçalho caber em 360px.
   ========================================================================== */
(() => {
  const BREAKPOINT = '(max-width: 1100px)';

  const start = () => {
    const header = document.getElementById('header');
    const inner = header && header.querySelector('.inner');
    const nav = document.getElementById('menuPrincipal');
    const toggle = header && header.querySelector('.nav-toggle');
    if (!inner || !nav || !toggle) return;

    const extras = document.createElement('div');
    extras.className = 'nav-extras';
    nav.appendChild(extras);

    const mq = matchMedia(BREAKPOINT);
    const controls = () => [inner.querySelector('.theme-toggle') || extras.querySelector('.theme-toggle'),
      inner.querySelector('.language-control') || extras.querySelector('.language-control')].filter(Boolean);

    // Tema e idioma: no painel em telas pequenas, no cabeçalho no computador
    const place = () => {
      const [theme, language] = controls();
      if (mq.matches) controls().forEach(el => extras.appendChild(el));
      else {
        if (theme) inner.insertBefore(theme, toggle);
        if (language) inner.insertBefore(language, toggle);
      }
      if (!mq.matches) close(false);
    };

    const isOpen = () => header.classList.contains('menu-open');
    const open = () => {
      header.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-lock');
      const first = nav.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    };
    function close(focusToggle = true) {
      if (!isOpen()) return;
      header.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-lock');
      if (focusToggle) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', () => (isOpen() ? close() : open()));
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', e => { if (isOpen() && !header.contains(e.target)) close(false); });
    // O formulário de orçamento abre por cima; o menu fecha antes
    document.addEventListener('click', e => { if (e.target.closest('[data-open]')) close(false); }, true);

    mq.addEventListener('change', place);
    place();
  };

  // theme.js monta o botão de tema no DOMContentLoaded; este arquivo vem depois, então roda depois dele
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
