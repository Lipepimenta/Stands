/* ==========================================================================
   Pré-visualização do painel: mostra a foto de abertura e as fotos da
   Estrutura como ficam no site, no computador e no celular.
   As medidas e o escurecimento copiam css/style.css (.hero, .structure).
   Sveltia CMS expõe h() e createClass() globais: https://sveltiacms.app/en/docs/api
   ========================================================================== */
(() => {
  const ACCENT = '#c4a06a';
  const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Space+Grotesk:wght@600&display=swap');";

  CMS.registerPreviewStyle(`${FONTS}
    body { margin: 0; padding: 20px; background: #0e1418; color: #eef2ef; font-family: Manrope, sans-serif; }
    .pv-title { margin: 0 0 4px; font: 600 18px 'Space Grotesk', sans-serif; letter-spacing: -.02em; }
    .pv-note { margin: 0 0 18px; color: #9aa5aa; font-size: 13px; line-height: 1.5; }
    .pv-row { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 30px; }
    .pv-device { flex: 1 1 360px; min-width: 0; }
    .pv-device.phone { flex: 0 0 min(210px, 100%); }
    .pv-label { margin: 0 0 7px; color: #9aa5aa; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .pv-screen { position: relative; overflow: hidden; container-type: inline-size; border: 1px solid #2a353b; border-radius: 10px; background: #151515; color: #fff; }
    .desktop .pv-screen { aspect-ratio: 1366 / 768; }
    .phone .pv-screen { aspect-ratio: 390 / 780; border-radius: 22px; border-width: 5px; border-color: #29343a; }
    .pv-screen img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .pv-screen::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.74), rgba(0,0,0,.22) 65%), linear-gradient(0deg, rgba(0,0,0,.45), transparent 55%); }
    .pv-empty { position: absolute; inset: 0; background: radial-gradient(circle at 82% 34%, #3b3b32, transparent 35%), linear-gradient(135deg, #171715 25%, #303029 100%); }
    .pv-ui { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; }
    .pv-head { display: flex; align-items: center; justify-content: space-between; }
    .pv-logo { background: #fff; color: #111; font: 700 1em 'Space Grotesk', sans-serif; line-height: 1; }
    .pv-nav { display: flex; opacity: .9; }
    .pv-btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; white-space: nowrap; }
    .pv-btn.accent { background: ${ACCENT}; color: #111; }
    .pv-btn.outline { border: 1px solid #fff; color: #fff; }
    .pv-eyebrow { font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    .pv-h1 { margin: 0; font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -.05em; line-height: 1.04; }
    .pv-h1 em { font-style: normal; color: ${ACCENT}; }
    .pv-copy { color: #d6d6d3; line-height: 1.6; }

    /* Computador: 1cqw = 13,66 px reais */
    .desktop .pv-ui { padding: 0 4.7cqw; }
    .desktop .pv-head { height: 6cqw; font-size: 1cqw; }
    .desktop .pv-logo { padding: .5cqw .7cqw; font-size: 1.6cqw; }
    .desktop .pv-nav { gap: 2.1cqw; font-size: 1cqw; font-weight: 600; }
    .desktop .pv-head .pv-btn { padding: .9cqw 1.6cqw; border-radius: .5cqw; font-size: 1cqw; }
    .desktop .pv-body { margin-top: 5.5cqw; }
    .desktop .pv-eyebrow { font-size: .8cqw; }
    .desktop .pv-h1 { max-width: 12ch; margin-top: 1.4cqw; font-size: 6.5cqw; }
    .desktop .pv-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 2.4cqw; margin-top: 2.4cqw; }
    .desktop .pv-copy { max-width: 45cqw; margin: 0; font-size: 1.45cqw; }
    .desktop .pv-actions { display: flex; gap: .8cqw; }
    .desktop .pv-actions .pv-btn { padding: 1.3cqw 1.8cqw; border-radius: .5cqw; font-size: 1cqw; }

    /* Celular: 1cqw = 3,9 px reais */
    .phone .pv-ui { padding: 0 5.1cqw; }
    .phone .pv-head { height: 18cqw; }
    .phone .pv-logo { padding: 1.5cqw 2cqw; font-size: 5cqw; }
    .phone .pv-nav { display: none; }
    .phone .pv-head .pv-btn { width: 10cqw; height: 10cqw; border-radius: 2cqw; font-size: 4cqw; }
    .phone .pv-body { margin-top: 18cqw; }
    .phone .pv-eyebrow { font-size: 2.8cqw; }
    .phone .pv-h1 { margin-top: 3cqw; font-size: 11cqw; }
    .phone .pv-copy { margin: 5cqw 0 0; font-size: 4.1cqw; }
    .phone .pv-actions { display: grid; gap: 2.6cqw; margin-top: 5cqw; }
    .phone .pv-actions .pv-btn { padding: 3.6cqw; border-radius: 2cqw; font-size: 3.6cqw; }

    /* Estrutura: 1 foto grande + 2 ao lado (como .structure-grid) */
    .pv-structure { display: grid; grid-template-columns: 1.35fr 1fr; gap: 8px; aspect-ratio: 16 / 7.5; }
    .pv-structure > div { display: grid; gap: 8px; }
    .pv-structure img, .pv-slot { width: 100%; height: 100%; min-height: 0; object-fit: cover; border-radius: 6px; background: #1a242a; }
    .pv-slot { display: grid; place-items: center; color: #667178; font-size: 12px; border: 1px dashed #2a353b; }
    .pv-alert { margin: -18px 0 30px; padding: 10px 14px; border-left: 3px solid ${ACCENT}; background: #1a242a; color: #d6d6d3; font-size: 13px; }
  `, { raw: true });

  // Caminho salvo ou foto recém-enviada (ainda não salva) → URL que o navegador consegue mostrar
  const url = (value, getAsset) => {
    if (!value) return '';
    const asset = getAsset(value);
    return String((asset && asset.url) || value);
  };

  const hero = (kind, src) => h('div', { className: 'pv-device ' + kind },
    h('p', { className: 'pv-label' }, kind === 'phone' ? 'Celular' : 'Computador'),
    h('div', { className: 'pv-screen' },
      src ? h('img', { className: 'bg', src, alt: '' }) : h('div', { className: 'pv-empty' }),
      h('div', { className: 'pv-ui' },
        h('div', { className: 'pv-head' },
          h('span', { className: 'pv-logo' }, 'JM'),
          h('span', { className: 'pv-nav' }, 'Destaques', ' ', 'Portfólio', ' ', 'O que fazemos', ' ', 'Processo', ' ', 'Contato'),
          h('span', { className: 'pv-btn accent' }, kind === 'phone' ? '↗' : 'Solicitar projeto ↗')),
        h('div', { className: 'pv-body' },
          h('div', { className: 'pv-eyebrow' }, 'Projeto · Produção · Montagem'),
          h('h1', { className: 'pv-h1' }, 'Sua marca merece um stand ', h('em', null, 'à altura.')),
          h('div', { className: 'pv-bottom' },
            h('p', { className: 'pv-copy' }, 'Projeto, produção e montagem com um único parceiro. Sua equipe foca na feira; a JM entrega um espaço pronto para receber, apresentar e negociar.'),
            h('div', { className: 'pv-actions' },
              h('span', { className: 'pv-btn outline' }, 'Ver projetos ↓'),
              h('span', { className: 'pv-btn accent' }, 'Solicitar projeto ↗')))))));

  const HomePreview = createClass({
    render: function () {
      const { entry, getAsset } = this.props;
      const data = entry.get('data');
      const heroSrc = url(data.get('hero'), getAsset);
      const list = data.get('estrutura');
      const photos = (list && list.toJS ? list.toJS() : list || []).map(v => url(v, getAsset)).filter(Boolean);
      const alt = data.get('heroAlt') || '';
      return h('div', null,
        h('p', { className: 'pv-title' }, 'Foto de abertura — como fica no site'),
        h('p', { className: 'pv-note' }, heroSrc
          ? 'A foto é cortada para preencher a tela (mais larga no computador, mais estreita no celular) e escurecida à esquerda para o título ficar legível. Confira se o stand continua visível nos dois.'
          : 'Sem foto escolhida: o site usa automaticamente uma foto de um projeto que não aparece na home.'),
        h('div', { className: 'pv-row' }, hero('desktop', heroSrc), hero('phone', heroSrc)),
        heroSrc && !alt ? h('p', { className: 'pv-alert' }, 'Falta a descrição da foto de abertura (usada por leitores de tela e pelo Google).') : null,
        h('p', { className: 'pv-title' }, 'Seção Estrutura'),
        h('p', { className: 'pv-note' }, photos.length >= 3
          ? 'A 1ª foto fica grande; a 2ª e a 3ª ao lado.'
          : `Faltam ${3 - photos.length} foto(s). Com menos de 3, o site mostra só o texto da seção.`),
        h('div', { className: 'pv-structure' },
          photos[0] ? h('img', { src: photos[0], alt: '' }) : h('span', { className: 'pv-slot' }, '1ª foto'),
          h('div', null,
            photos[1] ? h('img', { src: photos[1], alt: '' }) : h('span', { className: 'pv-slot' }, '2ª foto'),
            photos[2] ? h('img', { src: photos[2], alt: '' }) : h('span', { className: 'pv-slot' }, '3ª foto'))));
    }
  });

  CMS.registerPreviewTemplate('home', HomePreview);
})();
