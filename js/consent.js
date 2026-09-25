/* ==========================================================================
   Consentimento de cookies (LGPD)
   Nada além do essencial é carregado antes de o visitante escolher.
   A escolha fica salva no navegador e pode ser alterada pelo link
   "Preferências de cookies" (qualquer elemento com data-cookie-prefs).
   ========================================================================== */
(() => {
  const KEY = 'jm-consent';
  const VERSION = 2; // política atualizada para o recebimento estruturado de briefings e anexos
  const ids = (window.SITE && window.SITE.analytics) || {};

  const read = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY));
      return c && c.v === VERSION ? c : null;
    } catch { return null; }
  };
  const save = c => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...c, v: VERSION, date: new Date().toISOString() })); } catch {}
  };

  /* Carregadores — só rodam com consentimento ------------------------------ */
  const addScript = src => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };
  let gaOn = false, pixelOn = false;
  const loadGA = () => {
    if (gaOn || !ids.ga4) return;
    gaOn = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ids.ga4, { anonymize_ip: true });
    addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ids.ga4));
  };
  const loadPixel = () => {
    if (pixelOn || !ids.metaPixel) return;
    pixelOn = true;
    const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
    if (!window._fbq) window._fbq = f;
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
    fbq('init', ids.metaPixel);
    fbq('track', 'PageView');
    addScript('https://connect.facebook.net/en_US/fbevents.js');
  };
  const apply = c => {
    if (c.analytics) loadGA();
    if (c.marketing) loadPixel();
  };

  /* Aviso ------------------------------------------------------------------ */
  const box = document.createElement('div');
  box.className = 'cookie';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Aviso de cookies');
  box.innerHTML = `
    <div class="wrap cookie-inner">
      <p>Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de estatística e marketing para entender as visitas e melhorar nossos anúncios. Veja a <a href="privacidade.html">Política de Privacidade</a>.</p>
      <div class="cookie-prefs" hidden>
        <label><input type="checkbox" checked disabled> <span><b>Essenciais</b> — necessários para o site funcionar e lembrar esta escolha. Sempre ativos.</span></label>
        <label><input type="checkbox" data-c="analytics"> <span><b>Estatística</b> — contagem anônima de visitas e páginas vistas (Google Analytics).</span></label>
        <label><input type="checkbox" data-c="marketing"> <span><b>Marketing</b> — medir e personalizar anúncios nas redes sociais (Meta Pixel).</span></label>
      </div>
      <div class="cookie-actions">
        <button type="button" class="btn btn-outline" data-act="custom">Personalizar</button>
        <button type="button" class="btn btn-outline" data-act="reject">Recusar</button>
        <button type="button" class="btn btn-accent" data-act="accept">Aceitar todos</button>
      </div>
    </div>`;

  const prefs = box.querySelector('.cookie-prefs');
  const customBtn = box.querySelector('[data-act="custom"]');
  const check = name => box.querySelector(`[data-c="${name}"]`);

  const open = (showPrefs = false) => {
    const c = read() || {};
    check('analytics').checked = !!c.analytics;
    check('marketing').checked = !!c.marketing;
    prefs.hidden = !showPrefs;
    customBtn.textContent = showPrefs ? 'Salvar escolhas' : 'Personalizar';
    customBtn.dataset.act = showPrefs ? 'save' : 'custom';
    if (!box.isConnected) document.body.appendChild(box);
    document.body.classList.add('cookie-open');
  };
  const close = () => {
    box.remove();
    document.body.classList.remove('cookie-open');
  };
  const decide = c => {
    const before = read();
    save(c);
    close();
    // Retirar um consentimento já dado exige recarregar para descarregar os scripts
    if (before && ((before.analytics && !c.analytics) || (before.marketing && !c.marketing))) location.reload();
    else apply(c);
  };

  box.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'accept') decide({ analytics: true, marketing: true });
    if (act === 'reject') decide({ analytics: false, marketing: false });
    if (act === 'custom') open(true);
    if (act === 'save') decide({ analytics: check('analytics').checked, marketing: check('marketing').checked });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-cookie-prefs]')) { e.preventDefault(); open(true); }
  });

  const current = read();
  if (current) apply(current);
  else open();
})();
