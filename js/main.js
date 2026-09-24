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

  /* Projetos --------------------------------------------------------------- */
  const photos = p => (p.images || (p.img ? [{ src: p.img, alt: p.title }] : []))
    .map(item => typeof item === 'string' ? { src: item, alt: p.title } : item)
    .filter(item => item && item.src);
  const realProjects = (SITE.projects || []).filter(p => photos(p).length);
  const conceptMode = realProjects.length === 0;
  const featured = (conceptMode ? (SITE.projectConcepts || []) : realProjects)
    .filter(p => photos(p).length)
    .map(p => ({ ...p, concept: conceptMode }));
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
      link.textContent = link.classList.contains('btn') ? 'Ver projetos ↓' : 'Projetos';
    });
  }
  if (!SITE.images.hero && featured.length) {
    const first = photos(featured[0])[0];
    $('.hero-media').innerHTML = media(first.src, first.alt || featured[0].title, true);
  }
  if (featured.length) {
    $('#portfolioPreview').hidden = false;
    $('#portfolioPreview').innerHTML = featured.slice(0, 3).map((p, i) => `
      <button type="button" data-gallery="${i}" aria-label="Ver fotos do projeto">
        ${media(photos(p)[0].src, photos(p)[0].alt || p.title)}
        ${p.concept ? '<small class="concept-label">Visual conceitual</small>' : ''}
        <span>${esc(p.client || p.title)} <i aria-hidden="true">↗</i></span>
      </button>`).join('');
  }
  $('#projectList').innerHTML = featured.map((p, i) => `
    <article class="portfolio-card reveal">
      <button class="portfolio-image" type="button" data-gallery="${i}" aria-label="Ver fotos do projeto">
        ${media(photos(p)[0].src, photos(p)[0].alt || p.title)}
        ${p.concept ? '<span class="concept-label">Visual conceitual</span>' : ''}
        <span class="portfolio-count"><b>${String(photos(p).length).padStart(2, '0')}</b> <span>${photos(p).length === 1 ? 'FOTO' : 'FOTOS'}</span> ↗</span>
      </button>
      <div class="portfolio-caption">
        <div><span class="portfolio-client">${p.concept ? 'Possibilidade de projeto' : esc(p.client || p.event || 'JM Stands')}</span><h3>${esc(p.title)}</h3><p>${[p.event, p.city, p.area, p.type, p.objective].filter(Boolean).map(value => `<span>${esc(value)}</span>`).join(' · ')}</p></div>
        <a class="project-link" href="#contato" data-open data-project="${esc(p.client ? p.client + ' — ' + p.title : p.title)}">${p.concept ? 'EXPLORAR ESTA DIREÇÃO' : 'QUERO UM PROJETO ASSIM'} ↗</a>
      </div>
    </article>`).join('');

  if (featured.length) {
    const gallery = document.createElement('div');
    gallery.className = 'gallery-lightbox';
    gallery.hidden = true;
    gallery.setAttribute('role', 'dialog');
    gallery.setAttribute('aria-modal', 'true');
    gallery.setAttribute('aria-label', 'Galeria de projetos');
    gallery.innerHTML = '<button class="gallery-close" type="button" aria-label="Fechar galeria">×</button><div class="gallery-stage"><button class="gallery-prev" type="button" aria-label="Foto anterior">←</button><img alt=""><button class="gallery-next" type="button" aria-label="Próxima foto">→</button></div><div class="gallery-footer"><p></p><span></span></div>';
    document.body.appendChild(gallery);
    let projectIndex = 0, imageIndex = 0, previousFocus = null;
    const draw = () => {
      const p = featured[projectIndex], items = photos(p), item = items[imageIndex];
      const img = $('img', gallery);
      img.src = item.src;
      img.alt = item.alt || p.title;
      $('.gallery-footer p', gallery).textContent = [p.concept ? 'Visual conceitual' : p.client, p.title, p.event].filter(Boolean).join(' · ');
      $('.gallery-footer span', gallery).textContent = `${imageIndex + 1} / ${items.length}`;
      $('.gallery-prev', gallery).hidden = items.length < 2;
      $('.gallery-next', gallery).hidden = items.length < 2;
    };
    const close = () => {
      gallery.hidden = true;
      document.body.classList.remove('gallery-open');
      if (previousFocus) previousFocus.focus();
    };
    document.addEventListener('click', e => {
      const button = e.target.closest('[data-gallery]');
      if (!button) return;
      previousFocus = button;
      projectIndex = Number(button.dataset.gallery);
      imageIndex = 0;
      draw();
      gallery.hidden = false;
      document.body.classList.add('gallery-open');
      $('.gallery-close', gallery).focus();
    });
    const change = amount => {
      const items = photos(featured[projectIndex]);
      imageIndex = (imageIndex + amount + items.length) % items.length;
      draw();
    };
    $('.gallery-close', gallery).addEventListener('click', close);
    $('.gallery-prev', gallery).addEventListener('click', () => change(-1));
    $('.gallery-next', gallery).addEventListener('click', () => change(1));
    gallery.addEventListener('click', e => { if (e.target === gallery) close(); });
    document.addEventListener('keydown', e => {
      if (gallery.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') change(-1);
      if (e.key === 'ArrowRight') change(1);
      if (e.key === 'Tab') {
        const controls = $$('button:not([hidden])', gallery);
        const next = controls.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1);
        if (next < 0 || next >= controls.length) {
          e.preventDefault();
          controls[e.shiftKey ? controls.length - 1 : 0].focus();
        }
      }
    });
  }

  /* Clientes --------------------------------------------------------------- */
  $('#clientsSection').hidden = !SITE.clients.length;
  if (SITE.clients.length) {
    $('#projetos').after($('#clientsSection'));
    $('#clientGrid').innerHTML = SITE.clients.map(c =>
      `<div class="client">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy">` : esc(c.name)}</div>`
    ).join('');
  }

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
