/* ==========================================================================
   Robô de fotos — JM Stands
   Pega as pastas em fotos-para-subir/, converte as fotos para WebP (máx. 2000 px),
   cadastra cada pasta como projeto em content/projetos.json e publica no GitHub.

   Uso: dois cliques em ENVIAR-FOTOS.bat (na raiz do site)
        ou: node ferramentas/robo-fotos/enviar-fotos.mjs [--sem-publicar]
   ========================================================================== */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INBOX = path.join(ROOT, 'fotos-para-subir');
const DONE = path.join(INBOX, '_enviados');
const IMG_DIR = path.join(ROOT, 'assets/img/projetos');
const DATA = path.join(ROOT, 'content/projetos.json');
const PUBLIC = '/assets/img/projetos';
// Mesmos valores do painel (admin/config.yml → transformations)
const MAX = 1600, QUALITY = 78;
const PHOTO = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;
const publish = !process.argv.includes('--sem-publicar');

const say = (...a) => console.log(...a);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
// Ordena pelo nome sem a extensão: "foto.jpg" vem antes de "foto (1).jpg" (padrão do WhatsApp)
const bare = f => f.replace(/.[^.]+$/, '');
const byName = (a, b) => bare(a).localeCompare(bare(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
const pad = n => String(n).padStart(2, '0');
const kb = n => `${Math.round(n / 1024)} KB`;

function fail(msg) {
  say(`\n✖ ${msg}\n`);
  process.exit(1);
}

async function toWebp(file, out) {
  let input = file;
  if (/\.hei[cf]$/i.test(file)) {
    input = Buffer.from(await heicConvert({ buffer: fs.readFileSync(file), format: 'JPEG', quality: 0.95 }));
  }
  await sharp(input)
    .rotate() // respeita a orientação da câmera
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out); // sem metadados (GPS, câmera etc.)
  return fs.statSync(out).size;
}

async function main() {
  say('\n=== Robô de fotos · JM Stands ===\n');
  fs.mkdirSync(INBOX, { recursive: true });

  const folders = fs.readdirSync(INBOX, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name).sort(byName);
  if (!folders.length) {
    say(`Nenhuma pasta encontrada em:\n  ${INBOX}\n`);
    say('Crie uma pasta por projeto (ex.: "Expotrade 2025 - Marca X"), coloque as fotos dentro e rode de novo.');
    return;
  }

  // 1) Traz o que foi cadastrado pelo painel antes de mexer em qualquer coisa
  if (publish) {
    say('Atualizando com o GitHub…');
    try { git('pull', '--ff-only', '--quiet'); } catch (e) {
      fail('Não consegui atualizar com o GitHub. Verifique a internet ou se há alterações locais pendentes.\n' + (e.stderr || e.message));
    }
  }

  const projects = JSON.parse(fs.readFileSync(DATA, 'utf8') || '[]');
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const created = [], updated = [], written = [];
  let totalIn = 0, totalOut = 0;

  // 2) Converte e cadastra cada pasta
  for (const name of folders) {
    const dir = path.join(INBOX, name);
    const files = fs.readdirSync(dir).filter(f => PHOTO.test(f)).sort(byName);
    if (!files.length) { say(`- "${name}": sem fotos, ignorada.`); continue; }

    const title = name.trim();
    let project = projects.find(p => (p.title || '').trim().toLowerCase() === title.toLowerCase());
    const base = slug(title) || 'projeto';
    const images = [];
    let n = project ? (project.images || []).length : 0;
    say(`\n▸ ${title} — ${files.length} foto(s)${project ? ' (acrescentando ao projeto existente)' : ''}`);

    for (const f of files) {
      let file;
      do { n++; file = `${base}-${pad(n)}.webp`; } while (fs.existsSync(path.join(IMG_DIR, file)));
      const src = path.join(dir, f), out = path.join(IMG_DIR, file);
      try {
        const size = await toWebp(src, out);
        const before = fs.statSync(src).size;
        totalIn += before; totalOut += size;
        written.push(out);
        images.push(`${PUBLIC}/${file}`);
        say(`   ${f}  ${kb(before)} → ${file}  ${kb(size)}`);
      } catch (e) {
        say(`   ✖ ${f}: não consegui converter (${e.message}). Foto ignorada.`);
      }
    }
    if (!images.length) continue;

    if (project) {
      project.images = [...(project.images || []), ...images];
      updated.push(title);
    } else {
      const year = (title.match(/\b(19|20)\d{2}\b/) || [])[0];
      project = {
        title, images, client: '', event: '', ...(year ? { year: Number(year) } : {}),
        city: '', area: '', summary: '', home: '',
        hidden: true // entra como rascunho: complete os dados no painel e desmarque "Ocultar do site"
      };
      projects.unshift(project);
      created.push(title);
    }
  }

  if (!written.length) return say('\nNada para enviar.');
  fs.writeFileSync(DATA, JSON.stringify(projects, null, 2) + '\n');
  say(`\nFotos: ${kb(totalIn)} → ${kb(totalOut)} (${Math.round(100 - (totalOut / totalIn) * 100)}% menores)`);

  // 3) Publica tudo num único envio
  if (publish) {
    say('\nPublicando…');
    try {
      git('add', '--', path.relative(ROOT, DATA), ...written.map(w => path.relative(ROOT, w)));
      const msg = [created.length && `${created.length} projeto(s) novo(s)`, updated.length && `fotos em ${updated.length} projeto(s)`].filter(Boolean).join(' e ');
      git('commit', '-m', `Robô: ${msg} (${written.length} fotos)`);
      git('push', '--quiet');
    } catch (e) {
      fail('As fotos foram convertidas, mas o envio ao GitHub falhou. Rode de novo quando a internet voltar.\n' + (e.stderr || e.message));
    }
  }

  if (!publish) {
    say('\n(--sem-publicar) Fotos convertidas e cadastradas só no computador; nada foi enviado ao GitHub.');
    say('Os originais continuam em fotos-para-subir/.');
    return;
  }

  // 4) Tira as pastas da fila para não enviar duas vezes
  fs.mkdirSync(DONE, { recursive: true });
  for (const name of folders) {
    const from = path.join(INBOX, name);
    if (!fs.existsSync(from)) continue;
    let to = path.join(DONE, name), i = 2;
    while (fs.existsSync(to)) to = path.join(DONE, `${name} (${i++})`);
    fs.renameSync(from, to);
  }

  say('\n✔ Pronto!');
  if (created.length) say(`  Novos (como rascunho): ${created.join(', ')}`);
  if (updated.length) say(`  Com fotos novas: ${updated.join(', ')}`);
  say('\nO site atualiza em ~1 minuto. Para mostrar os projetos novos, abra o painel,\ncomplete feira/cliente/cidade e desmarque "Ocultar do site":\n  https://www.jmstandspr.com.br/admin/');
  say('\nAs fotos originais foram movidas para fotos-para-subir/_enviados/ (pode apagar depois).');
}

main().catch(e => fail(e.stack || e.message));
