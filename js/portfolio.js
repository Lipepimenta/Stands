/* ==========================================================================
   Página de portfólio (projetos.html) — grid, filtros, marcas e feiras.
   Os projetos vêm do painel /admin (content/*.json) e de js/config.js;
   leitura dos dados e galeria ficam em js/projects.js.
   ========================================================================== */
(() => {
  const SITE = window.SITE;
  const P = window.JM_PROJECTS;
  const { esc, media } = P;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  // Abrindo o arquivo no computador (ou localhost), a página completa a vitrine com
  // espaços reservados para visualizar o layout cheio. No site publicado eles não aparecem.
  const localPreview = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  P.ready.then(() => {
    /* Filtros ---------------------------------------------------------------- */
    const groups = [
      { key: 'format', label: 'Formato', value: P.format },
      { key: 'build', label: 'Construção', value: p => p.build || '' }
    ].map(g => ({ ...g, options: [...new Set(P.list.map(g.value).filter(Boolean))] }))
      .filter(g => g.options.length > 1);
    const active = {};

    const filters = $('#pfFilters');
    filters.hidden = !groups.length;
    filters.innerHTML = groups.map(g => `
      <div class="pf-filter-row">
        <span>${g.label}</span>
        <button type="button" data-filter="${g.key}" data-value="" aria-pressed="true">Todos</button>
        ${g.options.map(o => `<button type="button" data-filter="${g.key}" data-value="${esc(o)}" aria-pressed="false">${esc(o)} <small>${P.list.filter(p => g.value(p) === o).length}</small></button>`).join('')}
      </div>`).join('');

    const visible = () => P.list.filter(p => groups.every(g => !active[g.key] || g.value(p) === active[g.key]));

    /* Grid ------------------------------------------------------------------- */
    const card = p => {
      const i = P.list.indexOf(p);
      const kicker = p.concept ? 'Possibilidade de projeto' : [p.client, [p.event, p.year].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
      const line = [[p.city, p.state].filter(Boolean).join(' · '), p.area, P.format(p), p.build].filter(Boolean);
      const ref = p.client ? `${p.client} — ${p.title}` : p.title;
      return `
        <article class="pf-card" id="${esc(p.id)}">
          <button class="pf-media" type="button" data-pf-gallery="${i}" aria-label="Ver fotos do projeto">
            ${media(p.shots[0].src, p.shots[0].alt || p.title)}
            ${p.concept ? '<span class="concept-label">Visual conceitual</span>' : ''}
            <span class="portfolio-count"><b>${String(p.shots.length).padStart(2, '0')}</b> <span>${p.shots.length === 1 ? 'FOTO' : 'FOTOS'}</span> ↗</span>
          </button>
          <div class="pf-caption">
            <span class="portfolio-client">${esc(kicker || 'JM Stands')}</span>
            <h3>${esc(p.title)}</h3>
            ${line.length ? `<p>${line.map(v => `<span>${esc(v)}</span>`).join(' · ')}</p>` : ''}
            ${p.summary || p.objective ? `<p class="pf-summary">${esc(p.summary || p.objective)}</p>` : ''}
            <a class="pf-link" href="index.html?projeto=${encodeURIComponent(ref)}#solicitar">${p.concept ? 'Explorar esta direção' : 'Quero um projeto assim'} ↗</a>
          </div>
        </article>`;
    };
    const slot = n => `
      <article class="pf-card pf-slot" aria-hidden="true">
        <div class="pf-media"><div class="placeholder"></div><span class="pf-slot-label">Espaço para projeto real ${String(n).padStart(2, '0')}</span></div>
        <div class="pf-caption"><span class="portfolio-client">Cliente · Feira 2026</span><h3>Nome do projeto</h3><p><span>Cidade · UF</span> · <span>000 m²</span> · <span>Formato</span></p></div>
      </article>`;

    const render = () => {
      const items = visible();
      const allShown = groups.every(g => !active[g.key]);
      const slots = P.concept && localPreview && allShown ? Array.from({ length: 6 }, (_, n) => slot(n + 1)).join('') : '';
      $('#pfGrid').innerHTML = items.map(card).join('') + slots;
      $('#pfEmpty').hidden = items.length > 0 || !P.list.length;
    };

    filters.addEventListener('click', e => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      active[b.dataset.filter] = b.dataset.value;
      $$(`[data-filter="${b.dataset.filter}"]`, filters).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });

    document.addEventListener('click', e => {
      const b = e.target.closest('[data-pf-gallery]');
      if (!b) return;
      const p = P.list[Number(b.dataset.pfGallery)];
      history.replaceState(null, '', '#' + p.id);
      P.open(P.list, P.list.indexOf(p), b);
    });

    $('#pfNotice').hidden = !P.concept;
    if (!P.list.length) $('#pfIntro').textContent = 'Em breve, os projetos desenvolvidos pela JM. Enquanto isso, conte sobre o seu próximo evento.';
    render();

    // Link direto para um projeto: projetos.html#id-do-projeto abre a galeria
    const fromHash = () => {
      const i = P.list.findIndex(p => p.id === decodeURIComponent(location.hash.slice(1)));
      if (i >= 0) P.open(P.list, i, $(`[data-pf-gallery="${i}"]`));
    };
    addEventListener('hashchange', fromHash);
    fromHash();

    /* Marcas atendidas ------------------------------------------------------- */
    const clients = P.clients;
    const logoSlots = !clients.length && localPreview ? 10 : 0;
    $('#pfBrands').hidden = !clients.length && !logoSlots;
    $('#pfClientGrid').innerHTML = clients.map(c =>
      `<div class="client">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy">` : esc(c.name)}</div>`
    ).join('') + Array.from({ length: logoSlots }, () => '<div class="client pf-logo-slot" aria-hidden="true">LOGO</div>').join('');

    /* Feiras e eventos atendidos (só de projetos reais) ---------------------- */
    const events = P.concept ? [] : [...new Set(P.list.map(p => p.event).filter(Boolean))];
    $('#pfEvents').hidden = !events.length;
    $('#pfEventList').innerHTML = events.map(ev => `<li>${esc(ev)}</li>`).join('');
  });

  /* WhatsApp, redes, ano e header ------------------------------------------ */
  $$('[data-wa-link]').forEach(a => {
    a.href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(SITE.whatsappMessage)}`;
    a.target = '_blank';
    a.rel = 'noopener';
  });
  const instagram = SITE.social && SITE.social.instagram;
  if (instagram) $('#social').innerHTML = `<a href="${esc(instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg></a>`;
  $('#year').textContent = new Date().getFullYear();
  const head = $('#header');
  const onScroll = () => head.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
