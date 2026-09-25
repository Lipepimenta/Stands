/* ==========================================================================
   Projetos — lê os dados (painel /admin → content/*.json, e js/config.js)
   e controla a galeria ampliada.
   Usado pela home (js/main.js) e pela página de portfólio (js/portfolio.js).
   ========================================================================== */
(() => {
  const SITE = window.SITE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pad = n => String(n).padStart(2, '0');

  /* Fotos de um projeto: lista explícita (`images`) ou pasta numerada (`folder` + `photos`).
     Pasta: assets/img/projetos/<folder>/01.jpg, 02.jpg, 03.jpg… — a 01 é a capa. */
  // O painel grava caminhos com / inicial; o site usa caminhos relativos.
  const rel = src => String(src).replace(/^\/+/, '');
  const photos = p => {
    let items = p.images || [];
    if (!items.length && p.folder && p.photos) {
      items = Array.from({ length: p.photos }, (_, i) => `assets/img/projetos/${p.folder}/${pad(i + 1)}.${p.ext || 'jpg'}`);
    }
    if (!items.length && p.img) items = [p.img];
    return items
      .map((item, i) => typeof item === 'string' ? { src: item, alt: `${p.title} — foto ${i + 1}` } : item)
      .filter(item => item && item.src)
      .map(item => ({ ...item, src: rel(item.src) }));
  };

  // Projetos e logos cadastrados pelo painel /admin ficam em content/*.json.
  // Os de js/config.js continuam valendo (e são o que aparece abrindo o arquivo direto no computador).
  const load = file => fetch(file, { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).catch(() => []);
  const loadObj = file => load(file).then(d => d && !Array.isArray(d) ? d : {});
  const api = { concept: true, list: [], clients: [], home: {} };
  const ready = Promise.all([load('content/projetos.json'), load('content/clientes.json'), loadObj('content/home.json')]).then(([projects, clients, home]) => {
    const real = [...(Array.isArray(projects) ? projects : []), ...(SITE.projects || [])]
      .filter(p => p && !p.hidden && photos(p).length);
    api.concept = real.length === 0;
    api.list = (api.concept ? (SITE.projectConcepts || []) : real)
      .filter(p => photos(p).length)
      .map(p => ({ ...p, concept: api.concept, id: p.folder || slug([p.client, p.title, p.event, p.year].filter(Boolean).join(' ')), shots: photos(p) }));
    api.clients = [...(Array.isArray(clients) ? clients : []), ...(SITE.clients || [])]
      .filter(c => c && c.name)
      .map(c => ({ ...c, logo: c.logo ? rel(c.logo) : '' }));
    // Página inicial (painel → Página inicial): foto de abertura e fotos da estrutura
    api.home = {
      hero: home.hero ? rel(home.hero) : '',
      heroAlt: home.heroAlt || '',
      estrutura: (home.estrutura || []).filter(Boolean).map(rel)
    };
    return api;
  });

  // Formato do espaço (ilha, esquina, península, linear) e tipo de construção (construído, misto, octanorm…)
  const format = p => p.format || p.type || '';
  const meta = p => [[p.event, p.year].filter(Boolean).join(' '), [p.city, p.state].filter(Boolean).join(' · '), p.area, format(p), p.build, p.objective]
    .filter(Boolean).map(String);

  const media = (src, alt, eager) => `<img src="${esc(src)}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;

  /* Galeria ampliada ------------------------------------------------------- */
  let gallery, current = [], projectIndex = 0, imageIndex = 0, previousFocus = null, startX = null;

  const draw = () => {
    const p = current[projectIndex], items = p.shots, item = items[imageIndex];
    const img = $('.gallery-stage img', gallery);
    img.src = item.src;
    img.alt = item.alt || p.title;
    $('.gallery-footer p', gallery).textContent = [p.concept ? 'Visual conceitual' : p.client, p.title, p.event].filter(Boolean).join(' · ');
    $('.gallery-footer span', gallery).textContent = `${imageIndex + 1} / ${items.length}`;
    $('.gallery-prev', gallery).hidden = items.length < 2;
    $('.gallery-next', gallery).hidden = items.length < 2;
    const thumbs = $('.gallery-thumbs', gallery);
    thumbs.hidden = items.length < 2;
    if (thumbs.dataset.project !== p.id) {
      thumbs.dataset.project = p.id;
      thumbs.innerHTML = items.map((shot, i) => `<button type="button" data-shot="${i}" aria-label="Foto ${i + 1}">${media(shot.src, '')}</button>`).join('');
    }
    $$('button', thumbs).forEach((b, i) => b.toggleAttribute('aria-current', i === imageIndex));
    const active = $(`[data-shot="${imageIndex}"]`, thumbs);
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    const next = items[(imageIndex + 1) % items.length];
    if (next) new Image().src = next.src;
  };

  const change = amount => {
    const items = current[projectIndex].shots;
    imageIndex = (imageIndex + amount + items.length) % items.length;
    draw();
  };

  const close = () => {
    if (!gallery || gallery.hidden) return;
    gallery.hidden = true;
    document.body.classList.remove('gallery-open');
    if (location.hash.slice(1) === current[projectIndex]?.id) history.replaceState(null, '', location.pathname + location.search);
    if (previousFocus) previousFocus.focus();
  };

  const build = () => {
    gallery = document.createElement('div');
    gallery.className = 'gallery-lightbox';
    gallery.hidden = true;
    gallery.setAttribute('role', 'dialog');
    gallery.setAttribute('aria-modal', 'true');
    gallery.setAttribute('aria-label', 'Galeria de projetos');
    gallery.innerHTML = '<button class="gallery-close" type="button" aria-label="Fechar galeria">×</button><div class="gallery-stage"><button class="gallery-prev" type="button" aria-label="Foto anterior">←</button><img alt=""><button class="gallery-next" type="button" aria-label="Próxima foto">→</button></div><div class="gallery-footer"><p></p><span></span></div><div class="gallery-thumbs"></div>';
    document.body.appendChild(gallery);
    $('.gallery-close', gallery).addEventListener('click', close);
    $('.gallery-prev', gallery).addEventListener('click', () => change(-1));
    $('.gallery-next', gallery).addEventListener('click', () => change(1));
    $('.gallery-thumbs', gallery).addEventListener('click', e => {
      const b = e.target.closest('[data-shot]');
      if (b) { imageIndex = Number(b.dataset.shot); draw(); }
    });
    gallery.addEventListener('click', e => { if (e.target === gallery) close(); });
    const stage = $('.gallery-stage', gallery);
    stage.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) change(dx < 0 ? 1 : -1);
    });
    document.addEventListener('keydown', e => {
      if (gallery.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') change(-1);
      if (e.key === 'ArrowRight') change(1);
      if (e.key === 'Tab') {
        const controls = $$('button:not([hidden])', gallery).filter(b => !b.closest('[hidden]'));
        const next = controls.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1);
        if (next < 0 || next >= controls.length) {
          e.preventDefault();
          controls[e.shiftKey ? controls.length - 1 : 0].focus();
        }
      }
    });
  };

  const open = (projects, index, trigger) => {
    if (!projects[index]) return;
    if (!gallery) build();
    current = projects;
    projectIndex = index;
    imageIndex = 0;
    previousFocus = trigger || document.activeElement;
    draw();
    gallery.hidden = false;
    document.body.classList.add('gallery-open');
    $('.gallery-close', gallery).focus();
  };

  Object.assign(api, { ready, photos, meta, format, media, esc, open, close });
  window.JM_PROJECTS = api;
})();
