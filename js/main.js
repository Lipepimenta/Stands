(() => {
  const SITE = window.SITE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const media = (src, alt, eager) => src
    ? `<img src="${esc(src)}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`
    : '<div class="placeholder" aria-hidden="true"></div>';

  /* Imagens fixas (hero e estrutura) --------------------------------------- */
  $$('[data-img]').forEach(el => {
    const [group, i] = el.dataset.img.split(':');
    const src = i === undefined ? SITE.images[group] : SITE.images[group][i];
    if (src) el.innerHTML = media(src, el.dataset.alt || '', group === 'hero');
  });

  /* Projetos (dados e galeria em js/projects.js) --------------------------- */
  // Os dados chegam de content/*.json (painel /admin); por isso a montagem espera o carregamento.
  window.JM_PROJECTS.ready.then(P => {
    const conceptMode = P.concept;
    // A home mostra só uma seleção: os projetos com `featured: true` (ou os 4 primeiros).
    const picked = P.list.filter(p => p.featured);
    const featured = (picked.length ? picked : P.list).slice(0, 4);
    $('#projectList').hidden = featured.length === 0;
    $('#solutionGrid').hidden = featured.length > 0;
    if (featured.length) {
      $('#portfolioHeading').textContent = conceptMode
        ? 'Espaços pensados para receber, apresentar e negociar.'
        : 'Projetos reais. Marcas em destaque.';
      $('#portfolioIntro').textContent = conceptMode
        ? 'Três direções para visualizar possibilidades de layout, presença e experiência. As imagens abaixo são conceituais e não representam obras executadas.'
        : 'Veja os stands que a JM desenvolveu e entregou. Cada projeto reúne imagens do espaço, da marca e da experiência no evento.';
      $$('a[href="#projetos"]').forEach(link => {
        link.textContent = link.classList.contains('btn') ? 'Ver projetos ↓' : 'Destaques';
      });
    }
    if (!SITE.images.hero && featured.length) {
      const first = featured[0].shots[0];
      $('.hero-media').innerHTML = media(first.src, first.alt || featured[0].title, true);
    }
    if (featured.length) {
      $('#portfolioPreview').hidden = false;
      $('#portfolioPreview').innerHTML = featured.slice(0, 3).map((p, i) => `
        <button type="button" data-gallery="${i}" aria-label="Ver fotos do projeto">
          ${media(p.shots[0].src, p.shots[0].alt || p.title)}
          ${p.concept ? '<small class="concept-label">Visual conceitual</small>' : ''}
          <span>${esc(p.client || p.title)} <i aria-hidden="true">↗</i></span>
        </button>`).join('');
    }
    $('#projectList').innerHTML = featured.map((p, i) => `
      <article class="portfolio-card reveal">
        <button class="portfolio-image" type="button" data-gallery="${i}" aria-label="Ver fotos do projeto">
          ${media(p.shots[0].src, p.shots[0].alt || p.title)}
          ${p.concept ? '<span class="concept-label">Visual conceitual</span>' : ''}
          <span class="portfolio-count"><b>${String(p.shots.length).padStart(2, '0')}</b> <span>${p.shots.length === 1 ? 'FOTO' : 'FOTOS'}</span> ↗</span>
        </button>
        <div class="portfolio-caption">
          <div><span class="portfolio-client">${p.concept ? 'Possibilidade de projeto' : esc(p.client || p.event || 'JM Stands')}</span><h3>${esc(p.title)}</h3><p>${P.meta(p).map(value => `<span>${esc(value)}</span>`).join(' · ')}</p></div>
          <a class="project-link" href="#contato" data-open data-project="${esc(p.client ? p.client + ' — ' + p.title : p.title)}">${p.concept ? 'EXPLORAR ESTA DIREÇÃO' : 'QUERO UM PROJETO ASSIM'} ↗</a>
        </div>
      </article>`).join('');
    document.addEventListener('click', e => {
      const button = e.target.closest('[data-gallery]');
      if (button) P.open(featured, Number(button.dataset.gallery), button);
    });

    /* Clientes --------------------------------------------------------------- */
    $('#clientsSection').hidden = !P.clients.length;
    if (P.clients.length) {
      $('#projetos').after($('#clientsSection'));
      $('#clientGrid').innerHTML = P.clients.map(c =>
        `<div class="client">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy">` : esc(c.name)}</div>`
      ).join('');
    }
    $$('.reveal:not(.on)').forEach(el => io.observe(el));
  });

  /* Show the workshop gallery only when actual photos are available. */
  const structurePhotos = SITE.images.estrutura || [];
  if (!structurePhotos.every(Boolean)) $('.structure').classList.add('no-photos');

  /* WhatsApp --------------------------------------------------------------- */
  const wa = text => `https://wa.me/${SITE.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  $$('[data-wa-link]').forEach(a => {
    a.href = wa(SITE.whatsappMessage);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* Redes sociais ---------------------------------------------------------- */
  const icons = {
    instagram: ['Instagram', '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'],
    facebook: ['Facebook', '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'],
    linkedin: ['LinkedIn', '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'],
    youtube: ['YouTube', '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><path d="m9.75 15.02 5.75-3.27-5.75-3.27z"/>']
  };
  const social = Object.entries(SITE.social || {}).filter(([k, url]) => url && icons[k]);
  $('#social').innerHTML = social.map(([k, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${icons[k][0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[k][1]}</svg></a>`
  ).join('');

  /* O modal de orçamento fica em js/quote.js */

  /* Header, ano e animações ------------------------------------------------ */
  $('#year').textContent = new Date().getFullYear();
  const head = $('#header');
  const onScroll = () => head.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
})();
