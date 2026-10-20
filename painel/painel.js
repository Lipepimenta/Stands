/* ==========================================================================
   Painel JM Stands — cadastro de projetos, fotos da página inicial e logos.
   Sem servidor: entra com a conta do GitHub (login pela Netlify), lê e grava
   content/*.json e as fotos em assets/img/ direto no repositório.
   Cada publicação vira UM commit; a Netlify publica o site em ~1 minuto.
   ========================================================================== */
(() => {
  'use strict';

  /* Configuração ------------------------------------------------------------- */
  const REPO = 'Lipepimenta/Stands';
  // ?branch=nome só para testes; o normal é sempre main
  const BRANCH = new URLSearchParams(location.search).get('branch') || 'main';
  const NETLIFY_SITE = 'jmstandspr.netlify.app'; // onde o login do GitHub está configurado
  const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
  const PHOTO_MAX = 1600; // mesmo tamanho do painel antigo (admin/config.yml)
  const HERO_MAX = 2000;
  const LOGO_MAX = 600;
  const FILES = { projects: 'content/projetos.json', home: 'content/home.json', clients: 'content/clientes.json' };

  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const safe = area => ({
    get(k, d) { try { const v = window[area].getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { window[area].setItem(k, v); } catch (e) { /* navegador sem armazenamento */ } },
    del(k) { try { window[area].removeItem(k); } catch (e) { /* idem */ } }
  });
  const local = safe('localStorage');

  /* Ícones (traço 24×24) ---------------------------------------------------- */
  const ICONS = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    plus: 'M12 5v14M5 12h14',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    auto: 'M3 4h18v12H3zM8 20h8M12 16v4',
    phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eyeoff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    x: 'M6 6l12 12M18 6 6 18',
    check: 'M5 12.5l4.5 4.5L19 7',
    rotl: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
    upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    more: 'M5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM19 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v5h1',
    chev: 'M6 9l6 6 6-6',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    github: 'M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5a3 3 0 0 0-1-2.5c3 0 6-1.5 6-6.5a5 5 0 0 0-1.5-3.5 4.5 4.5 0 0 0 0-3.5s-1.2-.3-3.8 1.5a13 13 0 0 0-6.8 0C6.3 1.2 5 1.5 5 1.5a4.5 4.5 0 0 0 0 3.5A5 5 0 0 0 3.5 8.5c0 5 3 6.5 6 6.5a3 3 0 0 0-1 2.5V22',
    warn: 'M12 3 2 20h20zM12 10v4M12 17h.01',
    crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
    monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
    logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3'
  };
  const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

  /* Opções ------------------------------------------------------------------- */
  const MAX = { destaque: 4, faixa: 3 };
  const PLACES = [
    { v: '', t: 'Só no Portfólio', d: 'Fica na página de projetos, junto com os outros trabalhos.' },
    { v: 'destaque', t: 'Destaques da página inicial', d: 'Os trabalhos principais, com foto grande, no meio da página.' },
    { v: 'faixa', t: 'Faixa logo abaixo da abertura', d: 'Três fotos em sequência, logo no começo do site.' }
  ];
  const STEPS = ['Fotos', 'Ajustar', 'Informações', 'Onde aparece', 'Pré-visualizar', 'Publicar'];
  const ASPECTS = [['orig', 'Original', 'como foi tirada'], ['4:3', '4:3', 'card do site'], ['16:9', '16:9', 'tela larga'], ['1:1', '1:1', 'quadrado']];
  const WALL = { top: '<rect x="12" y="1.5" width="20" height="5" rx="1" stroke-dasharray="2 2"/>', left: '<rect x="2" y="9" width="8" height="16" rx="1" stroke-dasharray="2 2"/>', right: '<rect x="34" y="9" width="8" height="16" rx="1" stroke-dasharray="2 2"/>' };
  const FORMATS = [
    ['Ilha', '4 lados abertos', ''],
    ['Península', '3 lados abertos', WALL.top],
    ['Esquina', '2 lados abertos', WALL.top + WALL.right],
    ['Linear', '1 lado aberto', WALL.top + WALL.left + WALL.right]
  ];
  const BUILDS = ['Construído', 'Misto', 'Octanorm', 'Cenografia'];
  const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
  const FILTERS = [
    ['todos', 'Todos', () => true],
    ['site', 'No site', p => !p.hidden],
    ['home', 'Na página inicial', p => !p.hidden && !!p.home],
    ['ocultos', 'Ocultos', p => !!p.hidden]
  ];

  /* Estado ------------------------------------------------------------------- */
  const S = { token: local.get('jm-painel-token', ''), user: null, projects: [], home: {}, clients: [], filter: 'todos', q: '', loaded: false, busy: false };
  let W = null; // assistente de projeto (novo ou edição)
  let H = null; // fotos da página inicial
  let L = null; // logos
  let lastKey = '';

  const cover = p => (p.images && p.images[0]) || '';
  const view = ph => ph.out || ph.src;
  const metaLine = p => [p.client, p.year].filter(Boolean).join(' · ') || 'Cliente não informado';
  const firstName = () => (S.user && (S.user.name || S.user.login) || '').split(' ')[0];

  /* Tema --------------------------------------------------------------------- */
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const themePref = () => local.get('jm-painel-tema', 'auto');
  function applyTheme() {
    const p = themePref();
    document.documentElement.dataset.theme = p === 'dark' || (p === 'auto' && dark.matches) ? 'dark' : 'light';
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === p)));
    const cyc = $('[data-act="theme-cycle"]');
    if (cyc) {
      cyc.innerHTML = ic(p === 'auto' ? 'auto' : p === 'dark' ? 'moon' : 'sun');
      cyc.setAttribute('aria-label', `Tema: ${p === 'auto' ? 'automático' : p === 'dark' ? 'escuro' : 'claro'} (toque para trocar)`);
    }
  }
  dark.addEventListener('change', applyTheme);
  const themeSwitch = () => `
    <div class="theme-switch" role="group" aria-label="Tema do painel">
      <button type="button" data-theme-set="light" aria-label="Tema claro" title="Claro">${ic('sun')}</button>
      <button type="button" data-theme-set="auto" aria-label="Tema automático, igual ao do aparelho" title="Automático">${ic('auto')}</button>
      <button type="button" data-theme-set="dark" aria-label="Tema escuro" title="Escuro">${ic('moon')}</button>
    </div>`;

  /* Avisos ------------------------------------------------------------------- */
  function toast(msg, kind = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${kind === 'ok' ? ic('check') : ic('warn')}<span>${esc(msg)}</span>`;
    if (kind !== 'ok') el.querySelector('svg').style.color = 'var(--warn)';
    $('#toasts').append(el);
    setTimeout(() => el.remove(), kind === 'ok' ? 3200 : 6000);
  }
  const errText = err => (err && err.message) || 'Algo deu errado. Confira a internet e tente de novo.';

  /* GitHub ------------------------------------------------------------------- */
  async function gh(path, opts = {}) {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${S.token}` };
    if (opts.body) headers['Content-Type'] = 'application/json';
    let r;
    try {
      r = await fetch('https://api.github.com' + path, { ...opts, headers, cache: 'no-store', body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch (e) {
      throw new Error('Sem conexão com o GitHub. Confira a internet e tente de novo.');
    }
    if (r.status === 401) { signOut(); throw new Error('Seu acesso expirou. Entre de novo.'); }
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const err = new Error(body.message || `Erro ${r.status} no GitHub`);
      err.status = r.status;
      throw err;
    }
    return r.status === 204 ? null : r.json();
  }
  const b64ToText = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const blobToB64 = blob => new Promise((ok, fail) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(',')[1]);
    fr.onerror = () => fail(fr.error);
    fr.readAsDataURL(blob);
  });
  async function readJSON(path, ref, fallback) {
    try {
      const f = await gh(`/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`);
      return JSON.parse(b64ToText(f.content));
    } catch (e) {
      if (e.status === 404) return fallback;
      throw e;
    }
  }
  const readAll = async ref => {
    const [projects, home, clients] = await Promise.all([readJSON(FILES.projects, ref, []), readJSON(FILES.home, ref, {}), readJSON(FILES.clients, ref, [])]);
    return { projects: Array.isArray(projects) ? projects : [], home: home && !Array.isArray(home) ? home : {}, clients: Array.isArray(clients) ? clients : [] };
  };

  /* Publica tudo num commit só. build(fresh, taken) recebe os dados mais recentes
     do repositório e devolve { files: [{ path, text } | { path, blob }], data }.
     As fotos sobem uma por vez (o GitHub não corta envios pequenos) e, se alguém
     publicar no meio, tenta de novo em cima da versão nova. */
  async function commit(message, build, progress = () => {}) {
    const uploaded = new Map(); // blob → sha (não reenvia na nova tentativa)
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
      const head = ref.object.sha;
      const base = await gh(`/repos/${REPO}/git/commits/${head}`);
      const [fresh, tree] = await Promise.all([readAll(head), gh(`/repos/${REPO}/git/trees/${base.tree.sha}?recursive=1`)]);
      const taken = new Set(tree.tree.map(t => t.path));
      const { files, data } = await build(fresh, taken);
      const blobs = files.filter(f => f.blob);
      const entries = [];
      let n = 0;
      for (const f of files) {
        if (f.blob) {
          n++;
          progress(n, blobs.length);
          if (!uploaded.has(f.blob)) {
            const b = await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: { content: await blobToB64(f.blob), encoding: 'base64' } });
            uploaded.set(f.blob, b.sha);
          }
          entries.push({ path: f.path, mode: '100644', type: 'blob', sha: uploaded.get(f.blob) });
        } else {
          entries.push({ path: f.path, mode: '100644', type: 'blob', content: f.text });
        }
      }
      progress(blobs.length, blobs.length, true);
      const newTree = await gh(`/repos/${REPO}/git/trees`, { method: 'POST', body: { base_tree: base.tree.sha, tree: entries } });
      const c = await gh(`/repos/${REPO}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [head] } });
      try {
        await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: c.sha, force: false } });
      } catch (e) {
        if (e.status === 422 || e.status === 409) continue; // alguém publicou antes: refaz em cima
        throw e;
      }
      Object.assign(S, fresh, data);
      return c.sha;
    }
    throw new Error('Outra pessoa está publicando agora. Espere um minuto e tente de novo.');
  }
  const jsonFile = (path, value) => ({ path, text: JSON.stringify(value, null, 2) + '\n' });
  // Nome livre para uma foto nova: stand-cliente-01.webp, -02…
  function freePath(dir, base, ext, taken) {
    for (let i = 1; ; i++) {
      const p = `${dir}/${base}-${pad(i)}.${ext}`;
      if (!taken.has(p)) { taken.add(p); return p; }
    }
  }

  /* Login (GitHub pela Netlify, como o painel antigo) ----------------------- */
  function oauth() {
    return new Promise((ok, fail) => {
      const w = 600, h = 720;
      const popup = window.open(`https://api.netlify.com/auth?provider=github&site_id=${NETLIFY_SITE}&scope=repo`, 'jm-login',
        `width=${w},height=${h},left=${Math.max(0, (screen.width - w) / 2)},top=${Math.max(0, (screen.height - h) / 2)}`);
      if (!popup) { fail(new Error('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.')); return; }
      let done = false;
      const finish = (fn, v) => { if (done) return; done = true; removeEventListener('message', onMsg); clearInterval(timer); try { popup.close(); } catch (e) { /* já fechou */ } fn(v); };
      const onMsg = e => {
        if (e.origin !== 'https://api.netlify.com' || typeof e.data !== 'string') return;
        if (e.data === 'authorizing:github') { popup.postMessage(e.data, e.origin); return; }
        const m = /^authorization:github:(success|error):([\s\S]*)$/.exec(e.data);
        if (!m) return;
        let d = {};
        try { d = JSON.parse(m[2]); } catch (err) { /* resposta inesperada */ }
        if (m[1] === 'success' && d.token) finish(ok, d.token);
        else finish(fail, new Error('O GitHub não autorizou o acesso. Tente de novo.'));
      };
      addEventListener('message', onMsg);
      const timer = setInterval(() => { if (popup.closed) finish(fail, null); }, 700);
    });
  }
  async function signIn(token) {
    S.token = token;
    const [user, repo] = await Promise.all([gh('/user'), gh(`/repos/${REPO}`)]);
    if (!repo.permissions || !repo.permissions.push) {
      S.token = '';
      throw new Error(`A conta ${user.login} ainda não tem permissão para editar o site. Peça para o dono do projeto dar acesso “Write”.`);
    }
    local.set('jm-painel-token', token);
    S.user = user;
    local.set('jm-painel-user', JSON.stringify({ login: user.login, name: user.name, avatar_url: user.avatar_url }));
  }
  function signOut() {
    local.del('jm-painel-token');
    local.del('jm-painel-user');
    S.token = '';
    S.user = null;
    S.loaded = false;
    W = H = L = null;
    if (location.hash) location.hash = '';
    render();
  }

  /* Rascunhos: textos no localStorage, fotos novas no IndexedDB -------------- */
  const idb = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((ok, fail) => {
      const r = indexedDB.open('jm-painel', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fotos');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fail(r.error);
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((ok, fail) => {
        const t = db.transaction('fotos', mode);
        const req = fn(t.objectStore('fotos'));
        t.oncomplete = () => ok(req && req.result);
        t.onerror = () => fail(t.error);
      });
    };
    const guard = p => p.catch(() => undefined);
    return {
      put: (k, v) => guard(tx('readwrite', s => s.put(v, k))),
      get: k => guard(tx('readonly', s => s.get(k))),
      del: k => guard(tx('readwrite', s => s.delete(k)))
    };
  })();
  const draftKey = index => 'jm-painel-rascunho:' + (index === null ? 'novo' : 'p' + index);
  let draftTimer;
  function saveDraft() {
    if (!W || W.pub !== 'idle') return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (!W || W.pub !== 'idle') return;
      W.photos.filter(ph => ph.file && !ph.stored).forEach(ph => { ph.stored = true; idb.put(ph.id, ph.file); });
      local.set(draftKey(W.index), JSON.stringify({
        orig: W.orig, data: W.data, more: W.more, step: W.step, max: W.max, at: Date.now(),
        photos: W.photos.map(ph => ({ id: ph.id, path: ph.file ? '' : ph.src, e: ph.e, name: ph.name }))
      }));
      const el = $('#saved');
      if (el) el.innerHTML = `${ic('check')} Rascunho salvo agora`;
    }, 500);
  }
  function dropDraft(w) {
    local.del(draftKey(w.index));
    w.photos.forEach(ph => { if (ph.file) idb.del(ph.id); });
  }
  const drafts = () => {
    const list = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('jm-painel-rascunho:')) {
          const d = JSON.parse(localStorage.getItem(k));
          list.push({ key: k.split(':')[1], title: d.data && d.data.title, at: d.at });
        }
      }
    } catch (e) { /* sem armazenamento */ }
    return list.sort((a, b) => b.at - a.at);
  };

  /* Rotas -------------------------------------------------------------------- */
  const route = () => {
    const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
    return { name, arg };
  };

  function render() {
    const r = route();
    if (!S.token || !S.user) {
      document.body.className = '';
      app.innerHTML = loginView();
      applyTheme();
      return;
    }
    if (!S.loaded) {
      app.innerHTML = loadingView('Carregando os projetos…');
      return;
    }
    if (!r.name || r.name === 'entrar') { location.replace('#/inicio'); return; }
    if (r.name === 'projeto' && !ensureWizard(r.arg)) { app.innerHTML = loadingView('Abrindo o rascunho…'); return; }
    let content;
    if (r.name === 'projetos') content = projectsView();
    else if (r.name === 'projeto') content = wizardView();
    else if (r.name === 'abertura') { ensureHero(); content = heroView(); }
    else if (r.name === 'logos') { ensureLogos(); content = logosView(); }
    else content = homeView();
    document.body.className = r.name === 'projeto' ? 'body-wizard' : '';
    app.innerHTML = shellView(r.name, content);
    applyTheme();
    if (r.name === 'projeto' && W.step === 1) mountEditor();
    const key = location.hash + '|' + (r.name === 'projeto' ? W.step + W.pub : '');
    if (key !== lastKey) {
      lastKey = key;
      window.scrollTo(0, 0);
      const h1 = $('#main h1');
      if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    }
  }
  const loadingView = text => `<div class="login"><div class="login-card"><span class="logo">JM</span><p style="margin:0">${esc(text)}</p></div></div>`;

  /* Login -------------------------------------------------------------------- */
  const loginView = () => `
    <div class="login">
      <div class="login-card">
        <span class="logo">JM</span>
        <h1>Painel do site</h1>
        <p>Atualize as fotos e os projetos da JM Stands de um jeito simples, pelo computador ou pelo celular.</p>
        <button type="button" class="btn primary big" data-act="login">${ic('github')} Entrar com GitHub</button>
        <p class="fine">O acesso é protegido pelo GitHub. Nenhuma senha passa por este site.</p>
        <details class="token-login">
          <summary>Outra forma de entrar</summary>
          <label class="field"><span>Chave de acesso do GitHub</span>
            <input class="input" id="tokenInput" type="password" autocomplete="off" placeholder="ghp_… ou github_pat_…"></label>
          <button type="button" class="btn" data-act="login-token">Entrar com a chave</button>
        </details>
      </div>
    </div>`;

  /* Moldura (menu lateral no computador, barra inferior no celular) ---------- */
  const NAV = [['inicio', 'home', 'Início'], ['projetos', 'grid', 'Projetos'], ['abertura', 'image', 'Página inicial'], ['logos', 'tag', 'Logos de clientes']];
  function shellView(active, content) {
    const on = k => (k === active || (k === 'projetos' && active === 'projeto') ? 'aria-current="page"' : '');
    const brand = `<div class="brand"><span class="logo">JM</span><div><b>JM Stands</b><small>Painel do site</small></div></div>`;
    const u = S.user;
    const avatar = u.avatar_url ? `<img class="avatar" src="${esc(u.avatar_url)}&s=80" alt="">` : `<span class="avatar" aria-hidden="true">${esc(firstName().charAt(0).toUpperCase())}</span>`;
    return `
      <div class="shell">
        <aside class="side" aria-label="Menu do painel">
          ${brand}
          <a class="btn primary side-new" href="#/projeto/novo">${ic('plus')} Novo projeto</a>
          <nav>
            ${NAV.map(([k, i, l]) => `<a class="nav-link" href="#/${k}" ${on(k)}>${ic(i)}<span>${l}</span></a>`).join('')}
            <a class="nav-link" href="../" target="_blank" rel="noopener">${ic('external')}<span>Ver o site</span></a>
          </nav>
          <div class="spacer"></div>
          ${themeSwitch()}
          <div class="who">${avatar}<div><b>${esc(u.name || u.login)}</b><a href="#" data-act="logout">Sair</a></div></div>
        </aside>
        <header class="topbar">
          ${brand}
          <div class="row">
            <button type="button" class="icon-btn" data-act="theme-cycle"></button>
            <button type="button" class="icon-btn" data-act="logout" aria-label="Sair">${ic('logout')}</button>
          </div>
        </header>
        <main class="main" id="main">${BRANCH !== 'main' ? `<p class="tip" style="margin:0 0 18px">${ic('warn')}<span><b>Modo de teste:</b> salvando na versão “${esc(BRANCH)}”, não no site.</span></p>` : ''}${content}</main>
        <nav class="tabbar" aria-label="Menu do painel">
          <a href="#/inicio" ${on('inicio')}>${ic('home')}<span>Início</span></a>
          <a href="#/projetos" ${on('projetos')}>${ic('grid')}<span>Projetos</span></a>
          <a href="#/projeto/novo" class="tab-new" aria-label="Novo projeto"><span>${ic('plus')}</span><span>Novo</span></a>
          <a href="#/abertura" ${on('abertura')}>${ic('image')}<span>Home</span></a>
          <a href="#/logos" ${on('logos')}>${ic('tag')}<span>Logos</span></a>
        </nav>
      </div>`;
  }

  /* Início ------------------------------------------------------------------- */
  function homeView() {
    const vis = S.projects.filter(p => !p.hidden);
    const count = k => vis.filter(p => p.home === k).length;
    const photos = vis.reduce((n, p) => n + (p.images || []).length, 0);
    const pending = drafts().map(d => `
      <a class="tip" href="#/projeto/${d.key === 'novo' ? 'novo' : d.key.slice(1)}" style="text-decoration:none;margin:0 0 12px">${ic('pencil')}<span><b>${d.key === 'novo' ? 'Projeto novo em andamento' : 'Edição em andamento'}${d.title ? `: “${esc(d.title)}”` : ''}.</b> Toque para continuar de onde parou.</span></a>`).join('');
    const heroImg = S.home.hero || cover(S.projects[0] || {});
    return `
      <div class="page-head">
        <div><h1>Olá, ${esc(firstName())}</h1><p>O que vamos atualizar no site hoje?</p></div>
        <a class="btn" href="../" target="_blank" rel="noopener">${ic('external')} Ver o site</a>
      </div>
      ${pending ? `<div style="margin-bottom:8px">${pending}</div>` : ''}
      <div class="actions-grid">
        <a class="action-card hero-card" href="#/projeto/novo">
          ${heroImg ? `<img src="${esc(heroImg)}" alt="">` : ''}
          <span class="ic">${ic('plus')}</span>
          <b>Novo projeto</b>
          <span>Fotos, informações e onde aparece, passo a passo.</span>
        </a>
        <a class="action-card" href="#/abertura">
          <span class="ic">${ic('image')}</span>
          <b>Foto de abertura</b>
          <span>A foto grande do topo e as fotos da Estrutura.</span>
        </a>
        <a class="action-card" href="#/logos">
          <span class="ic">${ic('tag')}</span>
          <b>Logos de clientes</b>
          <span>${S.clients.length ? `${S.clients.length} logo(s) no site` : 'Nenhuma logo ainda'}</span>
        </a>
      </div>
      <div class="stats">
        <div class="stat"><b>${vis.length}</b><span>projetos no site</span></div>
        <div class="stat"><b>${photos}</b><span>fotos publicadas</span></div>
        <div class="stat"><b>${count('destaque')} de ${MAX.destaque}</b><span>nos Destaques</span><div class="meter"><i style="width:${Math.min(1, count('destaque') / MAX.destaque) * 100}%"></i></div></div>
        <div class="stat"><b>${count('faixa')} de ${MAX.faixa}</b><span>na faixa da abertura</span><div class="meter"><i style="width:${Math.min(1, count('faixa') / MAX.faixa) * 100}%"></i></div></div>
      </div>
      <h2 class="section-title">Projetos recentes <a href="#/projetos">Ver todos →</a></h2>
      <div class="cards">${S.projects.length ? S.projects.slice(0, 4).map(card).join('') : `<a class="add-card" href="#/projeto/novo">${ic('plus')}<span>Cadastrar o primeiro projeto</span></a>`}</div>`;
  }

  /* Projetos ----------------------------------------------------------------- */
  function card(p) {
    const i = S.projects.indexOf(p);
    const pin = p.hidden
      ? `<span class="badge warn pin">${ic('eyeoff')} Oculto</span>`
      : p.home === 'destaque' ? `<span class="badge accent pin">${ic('star')} Destaques</span>`
      : p.home === 'faixa' ? `<span class="badge accent pin">${ic('star')} Faixa da abertura</span>` : '';
    return `
      <article class="p-card ${p.hidden ? 'is-hidden' : ''}">
        <div class="cover">
          ${cover(p) ? `<img src="${esc(cover(p))}" alt="" loading="lazy">` : ''}
          ${pin}
          <span class="count">${ic('image')} ${(p.images || []).length}</span>
        </div>
        <div class="body"><b>${esc(p.title)}</b><span>${esc(metaLine(p))}</span></div>
        <button type="button" class="stretch" data-act="edit" data-i="${i}" aria-label="Editar ${esc(p.title)}"></button>
        <button type="button" class="icon-btn more" data-act="menu" data-i="${i}" aria-label="Mais opções de ${esc(p.title)}" aria-haspopup="menu">${ic('more')}</button>
      </article>`;
  }
  function cardsHtml() {
    const f = FILTERS.find(x => x[0] === S.filter)[2];
    const q = S.q.trim().toLowerCase();
    const list = S.projects.filter(f).filter(p => !q || [p.title, p.client, p.event, p.city].join(' ').toLowerCase().includes(q));
    const add = !q && S.filter === 'todos' ? `<a class="add-card" href="#/projeto/novo">${ic('plus')}<span>Novo projeto</span></a>` : '';
    return list.length || add
      ? add + list.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1">Nenhum projeto encontrado${q ? ` para “${esc(S.q)}”` : ''}.</div>`;
  }
  function projectsView() {
    return `
      <div class="page-head">
        <div><h1>Projetos</h1><p>${S.projects.length} projetos · toque em um para editar</p></div>
        <a class="btn primary" href="#/projeto/novo">${ic('plus')} Novo projeto</a>
      </div>
      <div class="toolbar">
        <label class="search"><span class="sr-only">Buscar projeto</span>${ic('search')}<input class="input" id="q" type="search" placeholder="Buscar por nome, cliente ou cidade" value="${esc(S.q)}"></label>
        <div class="chips" role="group" aria-label="Filtrar projetos">
          ${FILTERS.map(([k, l, f]) => `<button type="button" class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter === k}">${l} <small>${S.projects.filter(f).length}</small></button>`).join('')}
        </div>
      </div>
      <div class="cards" id="cardList">${cardsHtml()}</div>`;
  }
  function openMenu(btn) {
    const open = $('.menu');
    const i = +btn.dataset.i;
    if (open) { open.remove(); if (+open.dataset.i === i) return; }
    const p = S.projects[i];
    const m = document.createElement('div');
    m.className = 'menu';
    m.dataset.i = i;
    m.setAttribute('role', 'menu');
    m.innerHTML = `
      <button type="button" role="menuitem" data-act="edit" data-i="${i}">${ic('pencil')} Editar</button>
      <button type="button" role="menuitem" data-act="toggle-hidden" data-i="${i}">${p.hidden ? ic('eye') + ' Mostrar no site' : ic('eyeoff') + ' Ocultar do site'}</button>
      <button type="button" role="menuitem" data-act="open-site">${ic('external')} Ver no site</button>
      <button type="button" role="menuitem" data-act="delete" data-i="${i}" class="danger">${ic('trash')} Excluir projeto</button>`;
    btn.closest('.p-card').append(m);
    m.querySelector('button').focus();
  }
  // Mudança rápida num projeto (ocultar/mostrar/excluir), direto da lista
  async function quickChange(i, kind) {
    if (S.busy) return;
    const orig = S.projects[i];
    if (!orig) return;
    if (kind === 'delete' && !confirm(`Excluir o projeto “${orig.title}”? Ele some do site (as fotos continuam guardadas).`)) return;
    S.busy = true;
    toast('Salvando…');
    const verb = kind === 'delete' ? 'remove' : orig.hidden ? 'mostra' : 'oculta';
    try {
      await commit(`Painel: ${verb} projeto "${orig.title}"`, fresh => {
        const list = fresh.projects.slice();
        const at = list.findIndex(p => same(p, orig));
        if (at < 0) throw new Error('Esse projeto foi alterado por outra pessoa. A lista foi atualizada; tente de novo.');
        if (kind === 'delete') list.splice(at, 1);
        else list[at] = { ...orig, hidden: !orig.hidden };
        return { files: [jsonFile(FILES.projects, list)], data: { projects: list } };
      });
      toast(kind === 'delete' ? 'Projeto excluído. O site atualiza em ~1 minuto.' : orig.hidden ? 'Projeto de volta ao site em ~1 minuto.' : 'Projeto ocultado. O site atualiza em ~1 minuto.');
    } catch (e) {
      toast(errText(e), 'warn');
      await reload();
    }
    S.busy = false;
    render();
  }

  /* Assistente: novo projeto / edição ---------------------------------------- */
  const blankEdit = () => ({ aspect: 'orig', rot: 0, str: 0, zoom: 1, x: 0, y: 0, b: 100, c: 100 });
  const newPhoto = (src, extra = {}) => ({ id: uid(), src, name: '', out: null, e: blankEdit(), w: 0, h: 0, ...extra });
  const dataFrom = p => ({
    title: p ? p.title || '' : '', client: p ? p.client || '' : '', clientOk: !!(p && p.client),
    event: p ? p.event || '' : '', year: p ? p.year || '' : new Date().getFullYear(),
    city: p ? p.city || '' : '', state: p ? p.state || '' : 'PR', area: p ? p.area || '' : '',
    format: p ? p.format || '' : '', build: p ? p.build || '' : '', summary: p ? p.summary || '' : '',
    home: p ? p.home || '' : '', hidden: !!(p && p.hidden)
  });
  let restoring = null;
  // Prepara o assistente; devolve false enquanto um rascunho com fotos está sendo aberto
  function ensureWizard(arg) {
    const index = arg === 'novo' ? null : Number(arg);
    if (W && W.index === index) return !W.loading;
    const p = index === null ? null : S.projects[index];
    if (index !== null && !p) { location.replace('#/projetos'); return false; }
    let draft = null;
    try { draft = JSON.parse(local.get(draftKey(index), 'null')); } catch (e) { draft = null; }
    if (draft && index !== null && !same(draft.orig, p)) { local.del(draftKey(index)); draft = null; }
    W = {
      index, orig: p, step: 0, max: p ? 5 : 0, cur: 0, device: 'desktop', swapOut: null, pub: 'idle', error: '',
      more: !!(p && (p.area || p.format || p.build || p.summary)),
      photos: p ? (p.images || []).map(src => newPhoto(src)) : [],
      data: dataFrom(p)
    };
    if (!draft) return true;
    // Reabre o rascunho (fotos novas vêm do IndexedDB)
    const w = W;
    w.loading = true;
    restoring = (async () => {
      const photos = [];
      for (const d of draft.photos || []) {
        if (d.path) photos.push(newPhoto(d.path, { id: d.id, e: d.e || blankEdit(), name: d.name || '' }));
        else {
          const file = await idb.get(d.id);
          if (file) photos.push(newPhoto(URL.createObjectURL(file), { id: d.id, e: d.e || blankEdit(), name: d.name || '', file, stored: true }));
        }
      }
      Object.assign(w, { photos, data: { ...w.data, ...draft.data }, more: !!draft.more, step: Math.min(draft.step || 0, 4), max: Math.max(w.max, draft.max || 0) });
      w.loading = false;
      restoring = null;
      if (W === w) { render(); toast('Rascunho recuperado. Continue de onde parou.'); }
    })();
    return false;
  }
  const stepHead = (title, text) => `
    <div class="step-head">
      <span class="step-kicker">Etapa ${W.step + 1} de ${STEPS.length} · ${W.index === null ? 'Novo projeto' : 'Editando projeto'}</span>
      <h1 id="stepTitle">${title}</h1>
      <p>${text}</p>
    </div>`;
  function wizardView() {
    const steps = [stepPhotos, stepAdjust, stepInfo, stepPlace, stepPreview, stepPublish];
    const locked = W.pub === 'running' || W.pub === 'done';
    return `
      <div class="wizard">
        <div class="wiz-top">
          <a class="btn ghost" href="#/projetos">${ic('left')} ${locked ? 'Projetos' : 'Sair'}</a>
          ${W.pub === 'idle' ? `<span class="row" style="align-items:center"><span class="saved" id="saved">${ic('check')} Rascunho salvo automaticamente</span><button type="button" class="btn ghost danger" data-act="discard" style="min-height:36px;padding:6px 12px;font-size:13px">Descartar</button></span>` : ''}
        </div>
        <ol class="steps" aria-label="Etapas">
          ${STEPS.map((s, i) => `<li class="${i < W.step ? 'done' : ''} ${i === W.step ? 'current' : ''}"><button type="button" data-act="goto" data-step="${i}" ${i > W.max || locked ? 'disabled' : ''} ${i === W.step ? 'aria-current="step"' : ''} aria-label="Etapa ${i + 1}: ${s}"><span>${i + 1}. ${s}</span></button></li>`).join('')}
        </ol>
        <section aria-labelledby="stepTitle">${steps[W.step]()}</section>
        ${W.step < 5 ? `
          <div class="wiz-foot">
            <button type="button" class="btn" data-act="back">${ic('left')} ${W.step ? 'Voltar' : 'Cancelar'}</button>
            <button type="button" class="btn primary" data-act="next">${W.step === 4 ? 'Tudo certo, publicar' : 'Continuar'} ${ic('right')}</button>
          </div>` : ''}
      </div>`;
  }

  /* Etapa 1: fotos */
  function stepPhotos() {
    const n = W.photos.length;
    const thumb = (ph, i) => `
      <div class="thumb ${i === 0 ? 'cover-pick' : ''}" data-thumb="${i}" tabindex="0" role="listitem" aria-label="Foto ${i + 1}${i === 0 ? ', capa' : ''}. Use as setas para mudar a ordem.">
        <img src="${esc(view(ph))}" alt="">
        <span class="n">${i + 1}</span>
        ${i === 0 ? `<span class="cover-tag">${ic('star')} Capa</span>` : ''}
        ${ph.out ? '<span class="edited">Ajustada</span>' : ''}
        <div class="tools">
          ${i ? `<button type="button" class="mv" data-act="move" data-i="${i}" data-d="-1" aria-label="Mover para a esquerda">${ic('left')}</button>` : ''}
          ${i < n - 1 ? `<button type="button" class="mv" data-act="move" data-i="${i}" data-d="1" aria-label="Mover para a direita">${ic('right')}</button>` : ''}
          ${i ? `<button type="button" data-act="cover" data-i="${i}" aria-label="Tornar capa" title="Tornar capa">${ic('star')}</button>` : ''}
          <button type="button" data-act="adjust" data-i="${i}" aria-label="Ajustar foto ${i + 1}" title="Ajustar">${ic('crop')}</button>
          <button type="button" data-act="remove-photo" data-i="${i}" aria-label="Remover foto ${i + 1}" title="Remover">${ic('x')}</button>
        </div>
      </div>`;
    return stepHead(
      W.index === null ? 'Quais fotos mostram esse stand?' : 'Fotos do projeto',
      'Arraste as fotos ou toque para escolher. Pode mandar direto do celular: o painel reduz e converte sozinho.'
    ) + `
      <label class="drop ${n ? 'compact' : ''}">
        <input type="file" class="sr-only" accept="image/*,.heic,.heif" multiple data-files="photos">
        <span class="ic">${ic('upload')}</span>
        <div><b>${n ? 'Adicionar mais fotos' : 'Arraste as fotos aqui'}</b><br><span>${n ? 'toque para escolher ou arraste para cá' : 'ou toque para escolher do celular ou do computador'}</span></div>
      </label>
      ${n ? `
        <div class="thumbs" role="list" aria-label="Fotos do projeto">${W.photos.map(thumb).join('')}</div>
        <p class="tip">${ic('info')}<span><b>A 1ª foto é a capa.</b> Arraste as fotos para mudar a ordem, ou toque na estrela para escolher outra capa.</span></p>`
      : `<p class="tip">${ic('info')}<span><b>Sem limite de fotos por vez.</b> Mande as fotos como estão no celular, inclusive HEIC do iPhone. Elas são enviadas uma por uma na hora de publicar.</span></p>`}`;
  }
  // Fotos HEIC (iPhone): o Safari abre direto; nos outros navegadores converte com heic2any
  let heicLib;
  async function decodable(file) {
    if (!/\.(heic|heif)$/i.test(file.name) && !/hei[cf]/i.test(file.type)) return file;
    try { await createImageBitmap(file); return file; } catch (e) { /* precisa converter */ }
    heicLib = heicLib || new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => ok(window.heic2any);
      s.onerror = () => fail(new Error('Não foi possível converter a foto do iPhone. Confira a internet.'));
      document.head.append(s);
    });
    const lib = await heicLib;
    const out = await lib({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    return new File([Array.isArray(out) ? out[0] : out], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  }
  const isImage = f => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name);
  async function addPhotos(files) {
    const list = [...files].filter(isImage);
    if (!list.length) { toast('Escolha arquivos de imagem (JPG, PNG, WebP ou HEIC).', 'warn'); return; }
    if (list.some(f => /\.(heic|heif)$/i.test(f.name))) toast('Convertendo fotos do iPhone…');
    let added = 0;
    for (const f of list) {
      try {
        const file = await decodable(f);
        W.photos.push(newPhoto(URL.createObjectURL(file), { name: f.name, file }));
        added++;
      } catch (e) {
        toast(`Não deu para abrir “${f.name}”.`, 'warn');
      }
    }
    if (added) toast(added === 1 ? '1 foto adicionada' : `${added} fotos adicionadas`);
    saveDraft();
    render();
  }
  function movePhoto(from, to) {
    if (to < 0 || to >= W.photos.length || from === to) return;
    const [ph] = W.photos.splice(from, 1);
    W.photos.splice(to, 0, ph);
    saveDraft();
    render();
    const t = $(`.thumb[data-thumb="${to}"]`);
    if (t) t.focus();
  }

  /* Etapa 2: ajustar (recorte, giro, endireitar, zoom, brilho, contraste) */
  const isEdited = ph => { const e = ph.e; return e.aspect !== 'orig' || e.rot || e.str || e.zoom !== 1 || e.x || e.y || e.b !== 100 || e.c !== 100; };
  const range = (k, label, min, max, v, unit) => `
    <div class="range">
      <label for="r-${k}">${label} <output id="o-${k}">${v}${unit}</output></label>
      <input type="range" id="r-${k}" data-edit="${k}" data-unit="${unit}" min="${min}" max="${max}" step="1" value="${v}">
    </div>`;
  function stepAdjust() {
    if (W.cur >= W.photos.length) W.cur = 0;
    const ph = W.photos[W.cur];
    const e = ph.e;
    return stepHead('Quer ajustar alguma foto?', 'Opcional. Recorte, gire ou clareie as fotos. Se já estão boas, é só continuar.') + `
      <div class="editor">
        <div>
          <div class="stage" id="stage">
            <div class="frame" id="frame" aria-label="Área de enquadramento: arraste para mover a foto">
              <img id="edImg" src="${esc(ph.src)}" alt="Foto ${W.cur + 1} em edição" draggable="false">
              <span class="grid"></span>
            </div>
          </div>
          <p class="stage-hint">Arraste a foto para enquadrar · use o zoom para aproximar</p>
          <div class="strip" aria-label="Escolher a foto para ajustar">
            ${W.photos.map((p, i) => `<button type="button" data-act="pick-photo" data-i="${i}" aria-current="${i === W.cur}" aria-label="Foto ${i + 1}${isEdited(p) ? ', ajustada' : ''}"><img src="${esc(view(p))}" alt="">${isEdited(p) ? '<span class="dot"></span>' : ''}</button>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div><h3>Recorte</h3><div class="seg">${ASPECTS.map(([k, l, s]) => `<button type="button" data-act="aspect" data-v="${k}" aria-pressed="${e.aspect === k}">${l}<small>${s}</small></button>`).join('')}</div></div>
          <div><h3>Girar</h3><div class="seg"><button type="button" data-act="rot" data-v="-90">↺ Esquerda</button><button type="button" data-act="rot" data-v="90">↻ Direita</button></div></div>
          ${range('str', 'Endireitar', -15, 15, e.str, '°')}
          ${range('zoom', 'Zoom', 100, 300, Math.round(e.zoom * 100), '%')}
          ${range('b', 'Brilho', 50, 150, e.b, '%')}
          ${range('c', 'Contraste', 50, 150, e.c, '%')}
          <button type="button" class="btn ghost" data-act="reset-edit">${ic('rotl')} Desfazer ajustes desta foto</button>
        </div>
      </div>`;
  }
  function ratioOf(ph) {
    const e = ph.e;
    if (e.aspect === 'orig') return (e.rot / 90) % 2 ? ph.h / ph.w : ph.w / ph.h;
    const [a, b] = e.aspect.split(':').map(Number);
    return a / b;
  }
  // Escala para a foto cobrir o quadro, inclusive inclinada (sem cantos pretos)
  function geom(ph, fw, fh) {
    const e = ph.e;
    const quarter = (e.rot / 90) % 2 === 1;
    const iw = quarter ? ph.h : ph.w, ih = quarter ? ph.w : ph.h;
    const s = Math.max(fw / iw, fh / ih);
    const a = Math.abs(e.str) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const A = iw * s, B = ih * s;
    const fit = Math.max(1, (fw * c + fh * sn) / A, (fw * sn + fh * c) / B);
    return { s, k: fit * e.zoom, A, B };
  }
  function clampPan(ph, fw, fh) {
    const g = geom(ph, fw, fh);
    const mx = Math.max(0, (g.A * g.k - fw) / 2) / fw;
    const my = Math.max(0, (g.B * g.k - fh) / 2) / fh;
    ph.e.x = Math.min(mx, Math.max(-mx, ph.e.x));
    ph.e.y = Math.min(my, Math.max(-my, ph.e.y));
  }
  function layoutEditor() {
    const frame = $('#frame'), img = $('#edImg'), stage = $('#stage');
    if (!frame || !img || !W) return;
    const ph = W.photos[W.cur];
    if (!ph || !ph.w) return;
    const r = ratioOf(ph);
    const maxW = stage.clientWidth - 36, maxH = Math.min(innerHeight * 0.62, 560);
    let fw = maxW, fh = fw / r;
    if (fh > maxH) { fh = maxH; fw = fh * r; }
    frame.style.width = fw + 'px';
    frame.style.height = fh + 'px';
    clampPan(ph, fw, fh);
    const g = geom(ph, fw, fh), e = ph.e;
    Object.assign(img.style, {
      width: ph.w * g.s + 'px', height: ph.h * g.s + 'px',
      marginLeft: -ph.w * g.s / 2 + 'px', marginTop: -ph.h * g.s / 2 + 'px',
      transform: `translate(${e.x * fw}px, ${e.y * fh}px) rotate(${e.rot + e.str}deg) scale(${g.k})`,
      filter: `brightness(${e.b}%) contrast(${e.c}%)`
    });
  }
  function mountEditor() {
    const img = $('#edImg');
    if (!img) return;
    const ph = W.photos[W.cur];
    const go = () => { ph.w = img.naturalWidth; ph.h = img.naturalHeight; layoutEditor(); };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  }
  // Abre a imagem; se o site ainda não publicou a foto, busca direto no GitHub
  const loadOnce = (src, cors) => new Promise((ok, fail) => {
    const i = new Image();
    if (cors) i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = src;
  });
  const loadImg = src => loadOnce(src).catch(() => {
    if (/^\/assets\//.test(src)) return loadOnce(RAW + src, true);
    throw new Error('Não foi possível abrir uma das fotos.');
  });
  // Desenha a foto com os ajustes, no máximo `maxSide` px (sem aumentar fotos pequenas)
  async function renderPhoto(ph, maxSide) {
    const img = await loadImg(ph.src);
    ph.w = img.naturalWidth;
    ph.h = img.naturalHeight;
    const r = ratioOf(ph), e = ph.e;
    const dims = Lg => (r >= 1 ? [Lg, Math.round(Lg / r)] : [Math.round(Lg * r), Lg]);
    let [ow, oh] = dims(maxSide);
    const g0 = geom(ph, ow, oh);
    const srcAcross = ow / (g0.s * g0.k);
    if (srcAcross < ow) [ow, oh] = dims(Math.max(1, Math.round(maxSide * srcAcross / ow)));
    const cv = document.createElement('canvas');
    cv.width = ow;
    cv.height = oh;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (e.b !== 100 || e.c !== 100) ctx.filter = `brightness(${e.b}%) contrast(${e.c}%)`;
    const g = geom(ph, ow, oh);
    ctx.translate(ow / 2 + e.x * ow, oh / 2 + e.y * oh);
    ctx.rotate((e.rot + e.str) * Math.PI / 180);
    ctx.scale(g.s * g.k, g.s * g.k);
    ctx.drawImage(img, -ph.w / 2, -ph.h / 2);
    return cv;
  }
  // WebP (como o painel antigo); onde o navegador não gera WebP, usa JPG (ou PNG para logos)
  const encode = (cv, quality = 0.78, fallback = 'image/jpeg') => new Promise(ok => cv.toBlob(b => {
    if (b && b.type === 'image/webp') ok({ blob: b, ext: 'webp' });
    else cv.toBlob(j => ok({ blob: j, ext: fallback === 'image/png' ? 'png' : 'jpg' }), fallback, 0.85);
  }, 'image/webp', quality));
  // Gera a versão final (e a prévia) de uma foto, só quando os ajustes mudaram
  async function bake(ph) {
    const key = JSON.stringify(ph.e);
    if (ph.blob && ph.bakedKey === key) return;
    if (!ph.file && !isEdited(ph)) {
      if (ph.out) URL.revokeObjectURL(ph.out);
      Object.assign(ph, { out: null, blob: null, bakedKey: null });
      return;
    }
    const { blob, ext } = await encode(await renderPhoto(ph, PHOTO_MAX));
    if (ph.out) URL.revokeObjectURL(ph.out);
    Object.assign(ph, { blob, ext, out: isEdited(ph) ? URL.createObjectURL(blob) : null, bakedKey: key });
  }
  const bakeEdited = () => Promise.all(W.photos.filter(isEdited).map(bake));

  /* Etapa 3: informações */
  function stepInfo() {
    const d = W.data;
    const fmtSvg = walls => `<svg viewBox="0 0 44 32" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${walls}<rect x="12" y="9" width="20" height="16" rx="2" fill="currentColor" stroke="none" opacity=".85"/></svg>`;
    return stepHead('Conte um pouco sobre o projeto', 'Só o nome é obrigatório. O resto ajuda o cliente a entender o trabalho e a encontrar no Google.') + `
      <div class="form">
        <label class="field c6"><span>Nome do projeto *</span>
          <input class="input" id="f-title" data-k="title" value="${esc(d.title)}" placeholder="Ex.: Stand com arco de LED e lounge" required>
          <small>Aparece como título no site. Descreva o stand, não a empresa.</small></label>
        <label class="field c3"><span>Cliente</span><input class="input" data-k="client" value="${esc(d.client)}" placeholder="Ex.: Autolac"></label>
        <label class="field c3"><span>Feira ou evento</span><input class="input" data-k="event" value="${esc(d.event)}" placeholder="Ex.: Expoinovação"></label>
        <label class="check c6"><input type="checkbox" data-k="clientOk" ${d.clientOk ? 'checked' : ''}><span>O cliente autorizou mostrar o nome dele no site</span></label>
        <label class="field c2"><span>Ano</span><input class="input" data-k="year" type="number" inputmode="numeric" min="2000" max="2100" value="${esc(d.year)}"></label>
        <label class="field c2"><span>Cidade</span><input class="input" data-k="city" value="${esc(d.city)}" placeholder="Ex.: Curitiba"></label>
        <label class="field c2"><span>Estado</span><select class="select" data-k="state"><option value="">—</option>${UFS.map(u => `<option ${u === d.state ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <div class="c6">
          <button type="button" class="more-toggle" data-act="more" aria-expanded="${W.more}" aria-controls="moreBox"><span>Mais detalhes <span class="badge">opcional</span> · tamanho, formato, construção e resumo</span>${ic('chev')}</button>
        </div>
        <div class="c6 form" id="moreBox" ${W.more ? '' : 'hidden'} style="max-width:none">
          <label class="field c2"><span>Metragem</span><input class="input" data-k="area" value="${esc(d.area)}" placeholder="Ex.: 60 m²"></label>
          <div class="field c6"><span>Formato do espaço</span>
            <div class="opt-cards">${FORMATS.map(([f, s, w]) => `<button type="button" class="opt-card" data-act="set" data-k="format" data-v="${f}" aria-pressed="${d.format === f}">${fmtSvg(w)}${f}<small class="muted" style="font-weight:500">${s}</small></button>`).join('')}</div></div>
          <div class="field c6"><span>Tipo de construção</span>
            <div class="chips">${BUILDS.map(b => `<button type="button" class="chip" data-act="set" data-k="build" data-v="${b}" aria-pressed="${d.build === b}">${b}</button>`).join('')}</div></div>
          <label class="field c6"><span>Resumo</span>
            <textarea class="textarea" data-k="summary" maxlength="220" placeholder="Uma ou duas frases: o desafio e a solução.">${esc(d.summary)}</textarea>
            <small class="counter" id="sumCount">${d.summary.length}/220</small></label>
        </div>
      </div>`;
  }

  /* Etapa 4: onde aparece */
  const occupants = key => S.projects.map((p, i) => ({ p, i })).filter(o => o.i !== W.index && !o.p.hidden && o.p.home === key);
  const isFull = key => !!MAX[key] && occupants(key).length >= MAX[key];
  function stepPlace() {
    const d = W.data;
    const swap = d.home && !d.hidden && isFull(d.home) ? `
      <div class="swap">
        <p>${ic('warn').replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-4px;color:var(--warn)"')} Os ${MAX[d.home]} lugares já estão ocupados. Toque no projeto que vai sair da página inicial (ele continua no Portfólio):</p>
        <div class="swap-list" role="radiogroup" aria-label="Projeto que sai da página inicial">
          ${occupants(d.home).map(o => `<button type="button" class="swap-item" role="radio" data-act="swap" data-i="${o.i}" aria-checked="${W.swapOut === o.i}"><img src="${esc(cover(o.p))}" alt=""><span>${esc(o.p.title)}</span></button>`).join('')}
        </div>
      </div>` : '';
    return stepHead('Onde esse projeto aparece?', 'Todo projeto visível entra no Portfólio. Você também pode dar destaque a ele na página inicial.') + `
      <div class="places">
        <div>
          <div class="place-list" role="radiogroup" aria-label="Onde aparece">
            ${PLACES.map(pl => {
              const used = MAX[pl.v] ? occupants(pl.v).length : 0;
              const tag = MAX[pl.v] ? `<span class="badge ${used >= MAX[pl.v] ? 'warn' : 'ok'}">${used} de ${MAX[pl.v]} ocupados</span>` : '';
              return `<button type="button" class="place" role="radio" data-act="place" data-v="${pl.v}" aria-checked="${d.home === pl.v}"><i class="radio"></i><b>${pl.t} ${tag}</b><span class="desc">${pl.d}</span></button>`;
            }).join('')}
          </div>
          ${swap ? `<div style="margin-top:14px">${swap}</div>` : ''}
          <div class="visible-row">
            <div><b>Mostrar no site</b><span>${d.hidden ? 'Desligado: fica guardado como rascunho, sem aparecer.' : 'Ligado: aparece no site assim que publicar.'}</span></div>
            <button type="button" class="switch" role="switch" data-act="toggle-visible" aria-checked="${!d.hidden}" aria-label="Mostrar no site"></button>
          </div>
        </div>
        ${miniPage()}
      </div>`;
  }
  function miniPage() {
    const mine = W.photos[0] ? view(W.photos[0]) : '';
    const zone = key => {
      let list = occupants(key).filter(o => o.i !== W.swapOut).map(o => ({ src: cover(o.p) }));
      const here = W.data.home === key && !W.data.hidden;
      if (here) list = [{ src: mine, mine: true }, ...list];
      list = list.slice(0, MAX[key]);
      while (list.length < MAX[key]) list.push({ src: '' });
      return { here, html: list.map(b => `<div class="mp-block ${b.mine ? 'hl' : ''}">${b.src ? `<img src="${esc(b.src)}" alt="">` : ''}</div>`).join('') };
    };
    const faixa = zone('faixa'), dest = zone('destaque');
    const inPortfolio = !W.data.hidden && !W.data.home;
    return `
      <aside class="mini-page" aria-label="Como fica a página inicial">
        <small>Página inicial do site</small>
        <div class="mp">
          <div class="mp-block mp-hero">${S.home.hero ? `<img src="${esc(S.home.hero)}" alt="">` : ''}</div>
          <p class="mp-label">Abertura</p>
          <div class="mp-zone ${faixa.here ? 'active' : ''}"><div class="mp-row r3">${faixa.html}</div><p class="mp-label">Faixa${faixa.here ? ' · seu projeto' : ''}</p></div>
          <div class="mp-block mp-text"></div>
          <div class="mp-zone ${dest.here ? 'active' : ''}"><div class="mp-row r2">${dest.html}</div><p class="mp-label">Destaques${dest.here ? ' · seu projeto' : ''}</p></div>
          <div class="mp-block mp-text ${inPortfolio ? 'hl' : ''}"></div>
          <p class="mp-label" ${inPortfolio ? 'style="color:var(--accent)"' : ''}>Portfólio${inPortfolio ? ' · seu projeto' : ''}</p>
        </div>
      </aside>`;
  }

  /* Etapa 5: pré-visualizar */
  function siteCard(d, photos, ghost) {
    const client = d.clientOk || ghost ? d.client : '';
    const kicker = [client, [d.event, d.year].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'JM Stands';
    const line = [[d.city, d.state].filter(Boolean).join(' · '), d.area, d.format, d.build].filter(Boolean);
    return `
      <article class="pf-card ${ghost ? 'ghost' : ''}" ${ghost ? 'aria-hidden="true"' : ''}>
        <div class="pf-media">${photos[0] ? `<img src="${esc(photos[0])}" alt="">` : ''}<span class="pf-count"><b>${pad(photos.length)}</b> ${photos.length === 1 ? 'FOTO' : 'FOTOS'} ↗</span></div>
        <div class="pf-caption">
          <span class="pf-client">${esc(kicker)}</span>
          <h3>${esc(d.title || 'Nome do projeto')}</h3>
          ${line.length ? `<p>${line.map(esc).join(' · ')}</p>` : ''}
          ${d.summary ? `<p class="sum">${esc(d.summary)}</p>` : ''}
          <span class="pf-link">Quero um projeto assim ↗</span>
        </div>
      </article>`;
  }
  function stepPreview() {
    const d = W.data;
    const photos = W.photos.map(view);
    const others = S.projects.filter((p, i) => i !== W.index && !p.hidden).slice(0, 2);
    const place = PLACES.find(p => p.v === d.home) || PLACES[0];
    const item = (ok, text) => `<li class="${ok ? 'ok' : 'warn'}">${ic(ok ? 'check' : 'warn')}<span>${text}</span></li>`;
    return stepHead('Confira como vai ficar', 'É assim que o projeto aparece no Portfólio do site. Troque entre computador e celular.') + `
      <div class="device-toggle" role="group" aria-label="Ver como fica no">
        <button type="button" data-act="device" data-v="desktop" aria-pressed="${W.device === 'desktop'}">${ic('monitor')} Computador</button>
        <button type="button" data-act="device" data-v="phone" aria-pressed="${W.device === 'phone'}">${ic('phone')} Celular</button>
      </div>
      <div class="site-frame ${W.device}">
        <div class="site-bar"><i></i><i></i><i></i><span>${esc(location.host)}/projetos.html</span></div>
        <div class="site-body">
          <div class="site-kicker">Portfólio</div>
          <h2 class="site-h">Projetos realizados</h2>
          <div class="pf-grid">
            ${siteCard(d, photos, false)}
            ${others.map(p => siteCard({ ...p, clientOk: true }, p.images || [], true)).join('')}
          </div>
          <div class="gal" aria-label="Galeria de fotos do projeto">${photos.map(s => `<img src="${esc(s)}" alt="">`).join('')}</div>
        </div>
      </div>
      <ul class="checks">
        ${item(true, `<b>${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}</b>, com a capa escolhida`)}
        ${d.client && !d.clientOk ? item(false, 'O nome do cliente <b>não vai aparecer</b>, porque a autorização não foi marcada.') : item(true, d.client ? `Cliente <b>${esc(d.client)}</b> autorizado` : 'Sem nome de cliente')}
        ${d.summary ? item(true, 'Resumo preenchido') : item(false, 'Sem resumo (opcional, mas ajuda a vender o trabalho)')}
        ${d.hidden ? item(false, '<b>Desligado:</b> vai ficar guardado, sem aparecer no site') : item(true, `Aparece em: <b>${place.t}</b>${d.home ? ' e no Portfólio' : ''}`)}
      </ul>`;
  }

  /* Etapa 6: publicar */
  function stepPublish() {
    const d = W.data;
    const place = d.hidden ? 'Guardado sem aparecer' : (PLACES.find(p => p.v === d.home) || PLACES[0]).t;
    const sum = `<div class="summary-card">${W.photos[0] ? `<img src="${esc(view(W.photos[0]))}" alt="">` : ''}<div><b>${esc(d.title)}</b><span>${W.photos.length} fotos · ${place}</span></div></div>`;
    if (W.pub === 'running') return `
      <div class="publish">
        <span class="big-ic">${ic('upload')}</span>
        <h1 id="stepTitle">Publicando…</h1>
        <p>Deixe esta tela aberta. As fotos vão uma por vez, então nenhuma fica pelo caminho.</p>
        <div class="progress" role="progressbar" aria-label="Progresso da publicação" aria-valuemin="0" aria-valuemax="100"><i id="pbar"></i></div>
        <div class="progress-label" id="plabel" aria-live="polite">Preparando…</div>
      </div>`;
    if (W.pub === 'done') return `
      <div class="publish done">
        <span class="big-ic">${ic('check')}</span>
        <h1 id="stepTitle">Publicado!</h1>
        <p id="liveNote">${d.hidden ? 'O projeto foi guardado e não aparece no site até você ligar “Mostrar no site”.' : W.live ? 'Já está no ar.' : 'O site está atualizando: leva cerca de 1 minuto.'}</p>
        ${sum}
        <div class="row" style="justify-content:center">
          <a class="btn" href="../projetos.html" target="_blank" rel="noopener">${ic('external')} Ver no site</a>
          <button type="button" class="btn primary" data-act="new-again">${ic('plus')} Cadastrar outro projeto</button>
        </div>
        <p style="margin-top:18px"><a href="#/projetos">Voltar para Projetos</a></p>
      </div>`;
    return `
      <div class="publish">
        <span class="big-ic">${ic(W.pub === 'error' ? 'warn' : 'upload')}</span>
        <span class="step-kicker">Etapa 6 de 6</span>
        <h1 id="stepTitle">${W.pub === 'error' ? 'Não deu para publicar' : 'Tudo pronto para publicar'}</h1>
        <p>${W.pub === 'error' ? `${esc(W.error)} Nada foi perdido: é só tentar de novo.` : 'Ao publicar, as fotos são enviadas e o site se atualiza sozinho em cerca de 1 minuto.'}</p>
        ${sum}
        <div class="row" style="justify-content:center">
          <button type="button" class="btn" data-act="back">${ic('left')} Revisar</button>
          <button type="button" class="btn primary big" data-act="publish">${ic('upload')} ${W.pub === 'error' ? 'Tentar de novo' : 'Publicar no site'}</button>
        </div>
      </div>`;
  }
  // Monta o projeto como o site lê (mantém campos extras que já existiam)
  function projectFrom(d, images, orig) {
    const p = { ...(orig || {}) };
    Object.assign(p, {
      title: d.title.trim(), images, client: d.clientOk ? d.client.trim() : '', event: d.event.trim(),
      city: d.city.trim(), state: d.state, area: d.area.trim(), summary: d.summary.trim(),
      home: d.hidden ? '' : d.home, hidden: !!d.hidden, format: d.format, build: d.build
    });
    const year = parseInt(d.year, 10);
    if (year) p.year = year; else delete p.year;
    ['state', 'format', 'build'].forEach(k => { if (!p[k]) delete p[k]; });
    return p;
  }
  async function publish() {
    if (W.pub === 'running') return;
    const w = W;
    w.pub = 'running';
    render();
    const set = (pct, text) => { const b = $('#pbar'), l = $('#plabel'); if (b) b.style.width = pct + '%'; if (l) l.textContent = text; };
    try {
      const pending = w.photos.filter(ph => ph.file || isEdited(ph));
      for (let i = 0; i < pending.length; i++) {
        set((i + 1) / (pending.length + 1) * 45, `Preparando foto ${i + 1} de ${pending.length}…`);
        await bake(pending[i]);
      }
      const d = w.data;
      const base = 'stand-' + (slug(d.clientOk && d.client ? d.client : d.title).replace(/^stand-/, '') || 'projeto');
      const swapOrig = w.swapOut !== null ? S.projects[w.swapOut] : null;
      const verb = w.index === null ? 'cria' : 'atualiza';
      await commit(`Painel: ${verb} projeto "${d.title.trim()}"`, (fresh, taken) => {
        const files = [];
        const images = w.photos.map(ph => {
          if (!ph.blob) return ph.src;
          const path = freePath('assets/img/projetos', base, ph.ext, taken);
          files.push({ path, blob: ph.blob });
          return '/' + path;
        });
        const list = fresh.projects.slice();
        let at = 0;
        if (w.orig) {
          at = list.findIndex(p => same(p, w.orig));
          if (at < 0) throw new Error('Esse projeto foi alterado por outra pessoa enquanto você editava. Saia e abra de novo.');
          list[at] = projectFrom(d, images, w.orig);
        } else {
          list.unshift(projectFrom(d, images, null));
        }
        if (swapOrig) {
          const si = list.findIndex(p => same(p, swapOrig));
          if (si >= 0) list[si] = { ...list[si], home: '' };
        }
        files.push(jsonFile(FILES.projects, list));
        return { files, data: { projects: list } };
      }, (n, total, last) => set(45 + (total ? n / total : 1) * 45, last ? 'Salvando no site…' : `Enviando foto ${n} de ${total}…`));
      set(100, 'Pronto!');
      dropDraft(w);
      w.pub = 'done';
      w.live = false;
      if (W === w) render();
      if (!w.data.hidden) watchLive(w);
    } catch (e) {
      w.pub = 'error';
      w.error = errText(e);
      if (W === w) render();
    }
  }
  // Confere quando o site publicado já mostra o projeto (a Netlify leva ~1 min)
  async function watchLive(w) {
    const title = w.data.title.trim();
    for (let i = 0; i < 48 && W === w; i++) {
      await sleep(5000);
      const list = await fetch('../' + FILES.projects, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
      if (Array.isArray(list) && list.some(p => p.title === title && !p.hidden)) {
        w.live = true;
        const n = $('#liveNote');
        if (n) n.innerHTML = `<b style="color:var(--ok)">Já está no ar.</b> Pode conferir no site.`;
        return;
      }
    }
  }

  /* Navegação do assistente */
  async function next() {
    const d = W.data;
    if (W.step === 0 && !W.photos.length) { toast('Adicione pelo menos uma foto para continuar.', 'warn'); return; }
    if (W.step === 1) await bakeEdited();
    if (W.step === 2 && !d.title.trim()) { toast('Dê um nome ao projeto.', 'warn'); $('#f-title').focus(); return; }
    if (W.step === 3 && d.home && !d.hidden && isFull(d.home) && W.swapOut === null) { toast('Escolha qual projeto sai da página inicial.', 'warn'); return; }
    W.step++;
    W.max = Math.max(W.max, W.step);
    saveDraft();
    render();
  }
  async function goStep(i) {
    if (i === W.step || i > W.max) return;
    if (W.step === 1) await bakeEdited();
    W.step = i;
    saveDraft();
    render();
  }

  /* Página inicial: foto de abertura e fotos da Estrutura --------------------- */
  const homeItem = src => (src ? { src } : null);
  function ensureHero() {
    if (H) return;
    const est = (S.home.estrutura || []).slice(0, 3);
    H = { target: 'hero', hero: homeItem(S.home.hero), alt: S.home.heroAlt || '', estrutura: [0, 1, 2].map(i => homeItem(est[i])), dirty: false };
  }
  const itemSrc = it => (it ? it.src : '');
  function heroView() {
    const screen = () => `
      <div class="hv">${H.hero ? `<img src="${esc(itemSrc(H.hero))}" alt="">` : ''}
        <div class="hv-ui"><span class="e">Projeto · Produção · Montagem</span><h2>Sua marca merece um stand <em>à altura.</em></h2></div>
      </div>`;
    const slot = i => {
      const it = H.estrutura[i];
      return `<button type="button" class="est-slot ${H.target === i ? 'on' : ''}" data-act="hero-target" data-v="${i}" aria-pressed="${H.target === i}" aria-label="Estrutura, foto ${i + 1}">${it ? `<img src="${esc(it.src)}" alt="">` : `<span>${i + 1}ª foto</span>`}</button>`;
    };
    const used = new Set([itemSrc(H.hero), ...H.estrutura.map(itemSrc)].filter(Boolean));
    const all = [...new Set([...used, ...S.projects.flatMap(p => p.images || [])])];
    const current = H.target === 'hero' ? itemSrc(H.hero) : itemSrc(H.estrutura[H.target]);
    const filled = H.estrutura.filter(Boolean).length;
    return `
      <div class="page-head">
        <div><h1>Fotos da página inicial</h1><p>A foto grande do topo e as três fotos da seção Estrutura (oficina, marcenaria, montagem).</p></div>
      </div>
      <div class="hero-layout">
        <div>
          <button type="button" class="target-head ${H.target === 'hero' ? 'on' : ''}" data-act="hero-target" data-v="hero" aria-pressed="${H.target === 'hero'}"><b>Foto de abertura</b><span>${H.target === 'hero' ? 'Escolhendo esta' : 'Tocar para trocar'}</span></button>
          <div class="devices">
            <div class="dev-desktop"><p class="dev-label">Computador</p>${screen()}</div>
            <div class="dev-phone"><p class="dev-label">Celular</p>${screen()}</div>
          </div>
          <p class="tip">${ic('info')}<span>A foto é cortada para preencher a tela e escurecida à esquerda para o título ficar legível. <b>Confira se o stand aparece bem nos dois.</b></span></p>
          <div class="target-head static"><b>Seção Estrutura</b><span>${filled === 3 ? 'A 1ª fica grande, as outras duas ao lado.' : `Faltam ${3 - filled}. Com menos de 3, o site mostra só o texto da seção.`}</span></div>
          <div class="est-grid">${slot(0)}<div>${slot(1)}${slot(2)}</div></div>
        </div>
        <div class="panel">
          <div><h3>Trocando</h3><b style="font-size:16px">${H.target === 'hero' ? 'Foto de abertura' : `Estrutura · ${H.target + 1}ª foto`}</b></div>
          <label class="drop compact">
            <input type="file" class="sr-only" accept="image/*,.heic,.heif" data-files="home">
            <span class="ic">${ic('upload')}</span>
            <div><b>Enviar foto nova</b><br><span>do celular ou do computador</span></div>
          </label>
          <div><h3>Ou escolha uma já enviada</h3>
            <div class="pick-grid">${all.map(s => `<button type="button" data-act="hero-pick" data-src="${esc(s)}" aria-pressed="${s === current}" aria-label="Usar esta foto"><img src="${esc(s)}" alt="" loading="lazy"></button>`).join('')}</div>
          </div>
          ${H.target !== 'hero' && H.estrutura[H.target] ? `<button type="button" class="btn ghost danger" data-act="est-clear">${ic('x')} Tirar esta foto da Estrutura</button>` : ''}
          <label class="field"><span>Descrição da foto de abertura</span>
            <input class="input" data-h="alt" value="${esc(H.alt)}" placeholder="Ex.: Stand da Autolac com arco de LED">
            <small>Ajuda pessoas com deficiência visual e o Google.</small></label>
          <button type="button" class="btn primary" data-act="hero-save" ${H.dirty ? '' : 'disabled'}>${ic('check')} Publicar mudanças</button>
        </div>
      </div>`;
  }
  function setHomeItem(item) {
    if (H.target === 'hero') H.hero = item; else H.estrutura[H.target] = item;
    H.dirty = true;
  }
  async function saveHome() {
    if (S.busy) return;
    if (!H.hero) { toast('Escolha a foto de abertura.', 'warn'); return; }
    S.busy = true;
    const btn = $('[data-act="hero-save"]');
    if (btn) { btn.disabled = true; btn.innerHTML = `${ic('upload')} Publicando…`; }
    try {
      const items = [H.hero, ...H.estrutura].filter(it => it && it.file);
      for (const it of items) {
        if (it.blob) continue;
        const ph = newPhoto(it.src);
        const { blob, ext } = await encode(await renderPhoto(ph, it === H.hero ? HERO_MAX : PHOTO_MAX));
        Object.assign(it, { blob, ext });
      }
      await commit('Painel: atualiza fotos da página inicial', (fresh, taken) => {
        const files = [];
        const pathOf = (it, name) => {
          if (!it) return '';
          if (!it.blob) return it.src;
          const path = freePath('assets/img/home', name, it.ext, taken);
          files.push({ path, blob: it.blob });
          return '/' + path;
        };
        const home = { ...fresh.home, hero: pathOf(H.hero, 'abertura'), heroAlt: H.alt.trim(), estrutura: H.estrutura.map(it => pathOf(it, 'estrutura')).filter(Boolean) };
        files.push(jsonFile(FILES.home, home));
        return { files, data: { home } };
      }, (n, total, last) => { if (btn) btn.innerHTML = `${ic('upload')} ${last ? 'Salvando…' : `Enviando foto ${n} de ${total}…`}`; });
      H = null;
      toast(S.home.heroAlt ? 'Publicado! O site atualiza em ~1 minuto.' : 'Publicado! Dica: escreva uma descrição para a foto de abertura.');
    } catch (e) {
      toast(errText(e), 'warn');
    }
    S.busy = false;
    render();
  }

  /* Logos -------------------------------------------------------------------- */
  function ensureLogos() { if (!L) L = { list: S.clients.map(c => ({ name: c.name || '', src: c.logo || '', ok: true })), dirty: false }; }
  function logosView() {
    const add = `<label class="btn primary">${ic('plus')} Adicionar logo<input type="file" class="sr-only" accept="image/*,.svg" multiple data-files="logos"></label>`;
    return `
      <div class="page-head">
        <div><h1>Logos de clientes</h1><p>Aparecem na faixa “Marcas atendidas”. Só coloque com autorização da marca.</p></div>
        ${L.list.length ? add : ''}
      </div>
      ${L.list.length ? `
        <div class="logo-grid">
          ${L.list.map((c, i) => `
            <div class="logo-card">
              <div class="lg">${c.src ? `<img src="${esc(c.src)}" alt="">` : ''}</div>
              <label class="field"><span class="sr-only">Nome da marca</span><input class="input" data-logo="${i}" value="${esc(c.name)}" placeholder="Nome da marca"></label>
              <label class="check"><input type="checkbox" data-logo-ok="${i}" ${c.ok ? 'checked' : ''}><span>Marca autorizou</span></label>
              <button type="button" class="btn ghost danger" data-act="logo-remove" data-i="${i}">${ic('trash')} Remover</button>
            </div>`).join('')}
        </div>
        <div class="wiz-foot" style="justify-content:flex-end"><button type="button" class="btn primary" data-act="logos-save" ${L.dirty ? '' : 'disabled'}>${ic('check')} Publicar logos</button></div>`
      : `
        <div class="empty">
          <div class="drop" style="border:0;background:transparent">
            <span class="ic">${ic('tag')}</span>
            <b>Nenhuma logo ainda</b>
            <span>Prefira PNG com fundo transparente ou SVG.</span>
            ${add}
          </div>
        </div>
        ${L.dirty ? `<div class="wiz-foot" style="justify-content:flex-end"><button type="button" class="btn primary" data-act="logos-save">${ic('check')} Publicar logos</button></div>` : ''}`}`;
  }
  async function saveLogos() {
    if (S.busy) return;
    if (L.list.some(c => !c.ok)) { toast('Marque a autorização de todas as logos antes de publicar.', 'warn'); return; }
    if (L.list.some(c => !c.name.trim())) { toast('Dê um nome a todas as logos.', 'warn'); return; }
    S.busy = true;
    const btn = $('[data-act="logos-save"]');
    if (btn) { btn.disabled = true; btn.innerHTML = `${ic('upload')} Publicando…`; }
    try {
      for (const c of L.list) {
        if (!c.file || c.blob) continue;
        if (/svg/.test(c.file.type) || /\.svg$/i.test(c.file.name)) Object.assign(c, { blob: c.file, ext: 'svg' });
        else Object.assign(c, await encode(await renderPhoto(newPhoto(c.src), LOGO_MAX), 0.9, 'image/png'));
      }
      await commit('Painel: atualiza logos de clientes', (fresh, taken) => {
        const files = [];
        const clients = L.list.map(c => {
          let logo = c.src;
          if (c.blob) {
            const path = freePath('assets/img/clientes', slug(c.name) || 'logo', c.ext, taken);
            files.push({ path, blob: c.blob });
            logo = '/' + path;
          }
          return { name: c.name.trim(), logo };
        });
        files.push(jsonFile(FILES.clients, clients));
        return { files, data: { clients } };
      }, (n, total, last) => { if (btn) btn.innerHTML = `${ic('upload')} ${last ? 'Salvando…' : `Enviando logo ${n} de ${total}…`}`; });
      L = null;
      toast('Logos publicadas. O site atualiza em ~1 minuto.');
    } catch (e) {
      toast(errText(e), 'warn');
    }
    S.busy = false;
    render();
  }

  /* Arquivos (botão ou arrastar) --------------------------------------------- */
  async function handleFiles(kind, files) {
    if (!files || !files.length) return;
    if (kind === 'photos') { addPhotos(files); return; }
    const list = [...files].filter(f => isImage(f) || /\.svg$/i.test(f.name));
    if (!list.length) { toast('Escolha um arquivo de imagem.', 'warn'); return; }
    if (kind === 'home') {
      try {
        const file = await decodable(list[0]);
        setHomeItem({ src: URL.createObjectURL(file), file });
        render();
        toast('Foto carregada. Confira como ficou e publique.');
      } catch (e) { toast(errText(e), 'warn'); }
    }
    if (kind === 'logos') {
      for (const f of list) {
        try {
          const file = /\.svg$/i.test(f.name) ? f : await decodable(f);
          L.list.push({ name: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), src: URL.createObjectURL(file), file, ok: false });
        } catch (e) { toast(`Não deu para abrir “${f.name}”.`, 'warn'); }
      }
      L.dirty = true;
      render();
    }
  }

  /* Eventos ------------------------------------------------------------------ */
  async function doLogin(getToken) {
    const btns = $$('[data-act^="login"]');
    btns.forEach(b => { b.disabled = true; });
    try {
      const token = await getToken();
      if (!token) { btns.forEach(b => { b.disabled = false; }); return; }
      await signIn(token);
      await reload();
      if (!location.hash || location.hash === '#/entrar') location.hash = '#/inicio';
      render();
    } catch (e) {
      toast(errText(e), 'warn');
      btns.forEach(b => { b.disabled = false; });
    }
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-act], [data-theme-set]');
    if (!e.target.closest('.menu') && !e.target.closest('[data-act="menu"]')) $$('.menu').forEach(m => m.remove());
    if (!t || t.disabled) return;
    if (t.dataset.themeSet) { local.set('jm-painel-tema', t.dataset.themeSet); applyTheme(); return; }
    const act = t.dataset.act, i = Number(t.dataset.i);
    switch (act) {
      case 'login': doLogin(oauth); break;
      case 'login-token': {
        const v = $('#tokenInput').value.trim();
        if (!v) { toast('Cole a chave de acesso.', 'warn'); break; }
        doLogin(async () => v);
        break;
      }
      case 'logout': e.preventDefault(); signOut(); break;
      case 'theme-cycle': {
        const order = ['auto', 'light', 'dark'];
        local.set('jm-painel-tema', order[(order.indexOf(themePref()) + 1) % 3]);
        applyTheme();
        break;
      }
      case 'filter': S.filter = t.dataset.v; render(); break;
      case 'menu': openMenu(t); break;
      case 'edit': location.hash = `#/projeto/${i}`; break;
      case 'open-site': window.open('../projetos.html', '_blank', 'noopener'); break;
      case 'toggle-hidden': quickChange(i, 'toggle'); break;
      case 'delete': quickChange(i, 'delete'); break;
      // assistente
      case 'next': next(); break;
      case 'back': if (W.step === 0) location.hash = '#/projetos'; else goStep(W.step - 1); break;
      case 'goto': goStep(Number(t.dataset.step)); break;
      case 'discard':
        if (!confirm('Descartar este rascunho? O que foi feito aqui será perdido.')) break;
        dropDraft(W);
        W = null;
        location.hash = '#/projetos';
        break;
      case 'cover': movePhoto(i, 0); toast('Capa trocada'); break;
      case 'move': movePhoto(i, i + Number(t.dataset.d)); break;
      case 'remove-photo': {
        const [ph] = W.photos.splice(i, 1);
        if (ph && ph.file) idb.del(ph.id);
        saveDraft();
        render();
        break;
      }
      case 'adjust': W.cur = i; W.max = Math.max(W.max, 1); W.step = 1; render(); break;
      case 'pick-photo': await bake(W.photos[W.cur]).catch(() => {}); W.cur = i; render(); break;
      case 'aspect': { const ed = W.photos[W.cur].e; ed.aspect = t.dataset.v; ed.x = 0; ed.y = 0; saveDraft(); render(); break; }
      case 'rot': { const ed = W.photos[W.cur].e; ed.rot = (ed.rot + Number(t.dataset.v) + 360) % 360; ed.x = 0; ed.y = 0; saveDraft(); render(); break; }
      case 'reset-edit': W.photos[W.cur].e = blankEdit(); W.photos[W.cur].out = null; saveDraft(); render(); break;
      case 'more': W.more = !W.more; t.setAttribute('aria-expanded', W.more); $('#moreBox').hidden = !W.more; saveDraft(); break;
      case 'set': {
        const k = t.dataset.k;
        W.data[k] = W.data[k] === t.dataset.v ? '' : t.dataset.v;
        $$(`[data-act="set"][data-k="${k}"]`).forEach(b => b.setAttribute('aria-pressed', String(W.data[k] === b.dataset.v)));
        saveDraft();
        break;
      }
      case 'place': W.data.home = t.dataset.v; W.swapOut = null; saveDraft(); render(); break;
      case 'swap': W.swapOut = i; render(); break;
      case 'toggle-visible': W.data.hidden = !W.data.hidden; saveDraft(); render(); break;
      case 'device': W.device = t.dataset.v; render(); break;
      case 'publish': publish(); break;
      case 'new-again': W = null; if (location.hash === '#/projeto/novo') render(); else location.hash = '#/projeto/novo'; break;
      // página inicial
      case 'hero-target': H.target = t.dataset.v === 'hero' ? 'hero' : Number(t.dataset.v); render(); break;
      case 'hero-pick': setHomeItem({ src: t.dataset.src }); render(); break;
      case 'est-clear': H.estrutura[H.target] = null; H.dirty = true; render(); break;
      case 'hero-save': saveHome(); break;
      // logos
      case 'logo-remove': L.list.splice(i, 1); L.dirty = true; render(); break;
      case 'logos-save': saveLogos(); break;
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k && W) {
      W.data[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.k === 'summary') $('#sumCount').textContent = `${t.value.length}/220`;
      saveDraft();
    } else if (t.dataset.edit && W) {
      const ed = W.photos[W.cur].e, k = t.dataset.edit, v = Number(t.value);
      ed[k] = k === 'zoom' ? v / 100 : v;
      $(`#o-${k}`).textContent = (k === 'str' && v > 0 ? '+' : '') + v + t.dataset.unit;
      layoutEditor();
      saveDraft();
    } else if (t.id === 'q') {
      S.q = t.value;
      $('#cardList').innerHTML = cardsHtml();
    } else if (t.dataset.h) {
      H[t.dataset.h] = t.value;
      H.dirty = true;
      const b = $('[data-act="hero-save"]');
      if (b) b.disabled = false;
    } else if (t.dataset.logo) {
      L.list[+t.dataset.logo].name = t.value;
      L.dirty = true;
      const b = $('[data-act="logos-save"]');
      if (b) b.disabled = false;
    } else if (t.dataset.logoOk) {
      L.list[+t.dataset.logoOk].ok = t.checked;
      L.dirty = true;
      const b = $('[data-act="logos-save"]');
      if (b) b.disabled = false;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.files) { handleFiles(t.dataset.files, t.files); t.value = ''; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'tokenInput') $('[data-act="login-token"]').click();
  });

  // Arrastar arquivos para as áreas de envio
  document.addEventListener('dragover', e => {
    if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    const d = e.target.closest && e.target.closest('.drop');
    $$('.drop.over').forEach(x => x !== d && x.classList.remove('over'));
    if (d) d.classList.add('over');
  });
  document.addEventListener('drop', e => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    $$('.drop.over').forEach(x => x.classList.remove('over'));
    const d = e.target.closest && e.target.closest('.drop');
    const input = d && d.querySelector('input[type=file]');
    if (input) handleFiles(input.dataset.files, e.dataTransfer.files);
    else if (W && route().name === 'projeto' && W.step === 0) addPhotos(e.dataTransfer.files);
  });

  // Reordenar fotos arrastando (mouse) ou com as setas (teclado); enquadrar no editor
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const th = e.target.closest('.thumb');
    if (th && !e.target.closest('button') && e.button === 0 && e.pointerType !== 'touch') {
      drag = { from: +th.dataset.thumb, el: th, x: e.clientX, y: e.clientY, on: false, over: null };
      return;
    }
    const frame = e.target.closest('#frame');
    if (frame && W) {
      const ph = W.photos[W.cur];
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('moving');
      drag = { pan: true, frame, sx: ph.e.x, sy: ph.e.y, x: e.clientX, y: e.clientY };
    }
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.pan) {
      const ph = W.photos[W.cur];
      ph.e.x = drag.sx + (e.clientX - drag.x) / drag.frame.clientWidth;
      ph.e.y = drag.sy + (e.clientY - drag.y) / drag.frame.clientHeight;
      layoutEditor();
      return;
    }
    if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.on) { drag.on = true; drag.el.classList.add('dragging'); }
    const over = document.elementFromPoint(e.clientX, e.clientY);
    const th = over && over.closest('.thumb');
    $$('.thumb.drop-target').forEach(x => x.classList.remove('drop-target'));
    if (th && th !== drag.el) { th.classList.add('drop-target'); drag.over = +th.dataset.thumb; } else drag.over = null;
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.pan) { d.frame.classList.remove('moving'); saveDraft(); return; }
    if (d.on && d.over !== null) movePhoto(d.from, d.over);
    else if (d.on) d.el.classList.remove('dragging');
  });
  document.addEventListener('keydown', e => {
    const th = e.target.closest && e.target.closest('.thumb');
    if (th && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const i = +th.dataset.thumb;
      movePhoto(i, i + (e.key === 'ArrowLeft' ? -1 : 1));
    }
    if (e.key === 'Escape') $$('.menu').forEach(m => m.remove());
  });

  // Foto que o site ainda não publicou (acabou de subir): mostra direto do GitHub
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.fb) return;
    const src = img.getAttribute('src') || '';
    if (/^\/assets\//.test(src)) { img.dataset.fb = '1'; img.src = RAW + src; }
  }, true);

  // Avisa antes de fechar a aba no meio de uma publicação
  addEventListener('beforeunload', e => {
    if ((W && W.pub === 'running') || S.busy) { e.preventDefault(); e.returnValue = ''; }
  });
  addEventListener('resize', layoutEditor);
  addEventListener('hashchange', () => {
    if (W && W.pub === 'done') W = null;
    render();
  });

  /* Início -------------------------------------------------------------------- */
  async function reload() {
    Object.assign(S, await readAll(BRANCH));
    S.loaded = true;
  }
  (async () => {
    applyTheme();
    if (!S.token) { render(); return; }
    try { S.user = JSON.parse(local.get('jm-painel-user', 'null')); } catch (e) { S.user = null; }
    render();
    try {
      if (!S.user) await signIn(S.token);
      await reload();
    } catch (e) {
      if (S.token) toast(errText(e), 'warn');
    }
    render();
  })();
})();
