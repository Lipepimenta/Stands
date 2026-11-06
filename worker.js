// Porta de entrada do site: manda tudo para https://www (um endereço só para o Google)
// e entrega os arquivos estáticos normalmente.
// Na página inicial, já coloca a foto de abertura no HTML (escolhida no painel → content/home.json),
// para o navegador começar a baixá-la na hora, sem esperar o JavaScript.
const HOME = new Set(['/', '/index', '/index.html']);
const LOCAL = new Set(['localhost', '127.0.0.1']); // wrangler dev no computador

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rel = src => String(src || '').replace(/^\/+/, '');
// Mesma regra de js/projects.js e ferramentas/robo-fotos/miniaturas.mjs
const variant = (src, w) => src.replace(/^assets\/img\//, 'assets/img/_m/').replace(/\.[^.]+$/, `-${w}.webp`);

async function readJson(env, origin, file) {
  try {
    const res = await env.ASSETS.fetch(new Request(`${origin}/${file}`));
    return res.ok ? await res.json() : {};
  } catch (_) {
    return {};
  }
}

async function withHero(response, env, origin) {
  const [home, variants] = await Promise.all([readJson(env, origin, 'content/home.json'), readJson(env, origin, 'content/miniaturas.json')]);
  const src = rel(home && home.hero);
  if (!src) return response;
  const alt = (home && home.heroAlt) || 'Stand projetado e montado pela JM';
  const v = variants && variants[src];
  const srcset = Array.isArray(v) && v.length > 1
    ? [...v.slice(1).map(w => `${encodeURI(variant(src, w))} ${w}w`), `${encodeURI(src)} ${v[0]}w`].join(', ')
    : '';
  const img = `<img${srcset ? ` srcset="${esc(srcset)}" sizes="100vw"` : ''} src="${esc(src)}" alt="${esc(alt)}" fetchpriority="high" decoding="async">`;
  const preload = `<link rel="preload" as="image" href="${esc(encodeURI(src))}"${srcset ? ` imagesrcset="${esc(srcset)}" imagesizes="100vw"` : ''} fetchpriority="high">`;
  return new HTMLRewriter()
    .on('head', { element: el => el.append(preload, { html: true }) })
    .on('.hero-media', { element: el => el.setInnerContent(img, { html: true }) })
    .transform(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!LOCAL.has(url.hostname) && (url.hostname !== 'www.jmproducaostands.com.br' || url.protocol !== 'https:')) {
      url.hostname = 'www.jmproducaostands.com.br';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    const response = await env.ASSETS.fetch(request);
    if (request.method === 'GET' && HOME.has(url.pathname) && response.status === 200
      && (response.headers.get('content-type') || '').includes('text/html')) {
      try {
        return await withHero(response, env, url.origin);
      } catch (_) {
        return response; // se algo falhar, entrega a página como sempre
      }
    }
    return response;
  },
};
