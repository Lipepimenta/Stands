/* ==========================================================================
   Miniaturas — versões menores das fotos para celular e tablet
   Para cada foto em assets/img/projetos e assets/img/home, gera cópias com
   640 e 1024 px de largura em assets/img/_m/ e lista tudo em
   content/miniaturas.json. O site usa essa lista para montar o srcset:
   o celular baixa a foto de 640 px em vez da de 1600 px.

   Foto sem miniatura (ex.: acabou de entrar pelo painel) continua aparecendo
   normal, só que no tamanho original. Rodar de novo não refaz o que já existe.

   Uso: node ferramentas/robo-fotos/miniaturas.mjs
        (o robô de fotos e a GitHub Action .github/workflows/miniaturas.yml rodam sozinhos)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCES = ['assets/img/projetos', 'assets/img/home'];
const OUT = 'assets/img/_m';
const MANIFEST = 'content/miniaturas.json';
const WIDTHS = [640, 1024];
const QUALITY = 74;
const PHOTO = /\.(webp|jpe?g|png)$/i;

const posix = p => p.split(path.sep).join('/');
// assets/img/projetos/stand-x-01.webp → assets/img/_m/projetos/stand-x-01-640.webp
export const variantPath = (src, w) => src.replace(/^assets\/img\//, `${OUT}/`).replace(/\.[^.]+$/, `-${w}.webp`);

const walk = dir => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : PHOTO.test(e.name) ? [`${dir}/${e.name}`] : []);
};

/** Gera o que falta e devolve os caminhos (relativos à raiz) criados ou apagados. */
export async function gerarMiniaturas({ log = console.log } = {}) {
  const old = fs.existsSync(path.join(ROOT, MANIFEST)) ? JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8')) : {};
  const manifest = {};
  const touched = [];
  for (const src of SOURCES.flatMap(walk).sort()) {
    const abs = path.join(ROOT, src);
    const { width } = await sharp(abs).metadata();
    const widths = WIDTHS.filter(w => width > w * 1.15);
    for (const w of widths) {
      const out = variantPath(src, w);
      const outAbs = path.join(ROOT, out);
      // Refaz só se não existe ou se a foto original mudou depois da miniatura
      if (fs.existsSync(outAbs) && fs.statSync(outAbs).mtimeMs >= fs.statSync(abs).mtimeMs && old[src]) continue;
      fs.mkdirSync(path.dirname(outAbs), { recursive: true });
      await sharp(abs).resize({ width: w }).webp({ quality: QUALITY }).toFile(outAbs);
      touched.push(out);
    }
    manifest[src] = [width, ...widths];
  }

  // Apaga miniaturas de fotos que saíram do site
  const keep = new Set(Object.entries(manifest).flatMap(([src, [, ...ws]]) => ws.map(w => variantPath(src, w))));
  for (const file of walk(OUT)) {
    if (!keep.has(file)) { fs.rmSync(path.join(ROOT, file)); touched.push(file); }
  }

  // Uma foto por linha: { "caminho": [largura original, miniaturas…] }
  const json = '{\n' + Object.entries(manifest).map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';
  const manifestAbs = path.join(ROOT, MANIFEST);
  if (!fs.existsSync(manifestAbs) || fs.readFileSync(manifestAbs, 'utf8') !== json) {
    fs.writeFileSync(manifestAbs, json);
    touched.push(MANIFEST);
  }
  log(`Miniaturas: ${Object.keys(manifest).length} fotos, ${touched.length} arquivo(s) alterado(s).`);
  return touched.map(posix);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  gerarMiniaturas().catch(e => { console.error(e); process.exit(1); });
}
