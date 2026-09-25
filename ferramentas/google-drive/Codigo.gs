/* ==========================================================================
   JM Stands — recebimento de orçamentos do site (Google Apps Script)

   Roda na conta Google da JM. Para cada pedido:
   1. cria uma pasta no Drive ("Orçamentos do site JM / JM-AAAAMMDD-XXXXXX · Evento · Nome");
   2. recebe os arquivos em partes de 5 MB (vídeos grandes retomam se a conexão cair);
   3. registra uma linha na planilha "Orçamentos do site JM — registro";
   4. envia um e-mail formatado para a equipe e uma confirmação para o cliente;
   5. salva o briefing em PDF dentro da pasta do pedido.

   Instalação: veja ferramentas/google-drive/LEIA-ME.md
   ========================================================================== */

const CONFIG = {
  PASTA_RAIZ: 'Orçamentos do site JM',
  PLANILHA: 'Orçamentos do site JM — registro',
  EMAIL_EQUIPE: 'marcenariarodsouza@gmail.com', // vários: 'a@x.com, b@y.com'
  NOME_REMETENTE: 'JM Stands',
  CONFIRMAR_PARA_CLIENTE: true,
  SITE: 'https://www.jmstandspr.com.br',
  LOGO: 'https://jmstandspr.netlify.app/assets/img/logo/logo1.png',
  WHATSAPP_JM: '5541995605724',
  MAX_ARQUIVOS: 15,
  MAX_MB_POR_ARQUIVO: 2048,
  TEMPO_MINIMO_MS: 8000 // pedidos preenchidos mais rápido que isso são tratados como robô
};

const PROTOCOLO = /^JM-\d{8}-[0-9A-F]{6}$/;
const CACHE_SEG = 6 * 60 * 60; // 6 h para concluir os envios

/* Entrada ------------------------------------------------------------------ */
function doGet() {
  return json_({ ok: true, servico: 'JM Stands · orçamentos', hora: new Date().toISOString() });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.hp) return json_({ ok: true }); // campo invisível preenchido: robô
    if (!PROTOCOLO.test(req.protocolo || '')) throw new Error('protocolo inválido');
    if (req.acao === 'iniciar') return json_(iniciar_(req));
    if (req.acao === 'parte') return json_(parte_(req));
    if (req.acao === 'status') return json_(status_(req));
    if (req.acao === 'concluir') return json_(concluir_(req));
    throw new Error('ação desconhecida');
  } catch (err) {
    console.error(err);
    return json_({ ok: false, erro: String(err && err.message || err) });
  }
}

/* 1. Iniciar: cria a pasta e uma sessão de envio para cada arquivo ---------- */
function iniciar_(req) {
  const cache = CacheService.getScriptCache();
  const ja = cache.get('pr_' + req.protocolo);
  if (ja) return JSON.parse(ja); // pedido repetido (ex.: nova tentativa)

  if (Number(req.tempo || 0) < CONFIG.TEMPO_MINIMO_MS) throw new Error('envio rápido demais');
  const arquivos = (req.arquivos || []).slice(0, CONFIG.MAX_ARQUIVOS);
  arquivos.forEach(a => {
    if (!(a.tamanho > 0) || a.tamanho > CONFIG.MAX_MB_POR_ARQUIVO * 1048576) throw new Error('arquivo fora do limite: ' + a.nome);
  });

  const pasta = pastaDoPedido_(req.protocolo, req.evento, req.nome);
  const token = ScriptApp.getOAuthToken();
  const uploads = arquivos.map(a => {
    const tipo = a.tipo || 'application/octet-stream';
    const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,thumbnailLink', {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify({ name: limpa_(a.nome, 180) || 'arquivo', parents: [pasta.getId()], mimeType: tipo }),
      headers: { Authorization: 'Bearer ' + token, 'X-Upload-Content-Type': tipo, 'X-Upload-Content-Length': String(a.tamanho) },
      muteHttpExceptions: true
    });
    const h = res.getHeaders();
    const url = h.Location || h.location;
    if (!url) throw new Error('não foi possível preparar o envio de ' + a.nome + ' (' + res.getResponseCode() + ')');
    const id = Utilities.getUuid();
    cache.put('up_' + id, JSON.stringify({ url, tamanho: a.tamanho, protocolo: req.protocolo }), CACHE_SEG);
    return { id, nome: a.nome };
  });

  const resposta = { ok: true, pasta: { id: pasta.getId(), url: pasta.getUrl() }, uploads };
  cache.put('pr_' + req.protocolo, JSON.stringify(resposta), CACHE_SEG);
  return resposta;
}

/* 2. Parte: repassa um pedaço do arquivo ao Drive --------------------------- */
function parte_(req) {
  const up = sessao_(req);
  const bytes = Utilities.base64Decode(req.dados);
  const inicio = Number(req.inicio);
  const fim = inicio + bytes.length - 1;
  const res = UrlFetchApp.fetch(up.url, {
    method: 'put',
    payload: bytes,
    contentType: 'application/octet-stream',
    headers: { 'Content-Range': 'bytes ' + inicio + '-' + fim + '/' + up.tamanho },
    muteHttpExceptions: true
  });
  return resultadoDoDrive_(res, up);
}

/* Consulta quanto do arquivo já chegou (para retomar depois de uma falha) */
function status_(req) {
  const up = sessao_(req);
  const res = UrlFetchApp.fetch(up.url, {
    method: 'put',
    headers: { 'Content-Range': 'bytes */' + up.tamanho },
    muteHttpExceptions: true
  });
  return resultadoDoDrive_(res, up);
}

function resultadoDoDrive_(res, up) {
  const code = res.getResponseCode();
  if (code === 200 || code === 201) {
    const f = JSON.parse(res.getContentText());
    return { ok: true, concluido: true, recebido: up.tamanho, arquivo: { id: f.id, nome: f.name, tipo: f.mimeType, url: 'https://drive.google.com/file/d/' + f.id + '/view' } };
  }
  if (code === 308) {
    const range = res.getHeaders().Range || res.getHeaders().range || '';
    const recebido = range ? Number(range.split('-')[1]) + 1 : 0;
    return { ok: true, concluido: false, recebido };
  }
  throw new Error('Drive respondeu ' + code + ': ' + res.getContentText().slice(0, 200));
}

function sessao_(req) {
  const raw = CacheService.getScriptCache().get('up_' + req.uploadId);
  if (!raw) throw new Error('sessão de envio expirada');
  const up = JSON.parse(raw);
  if (up.protocolo !== req.protocolo) throw new Error('sessão de outro pedido');
  return up;
}

/* 3. Concluir: planilha, PDF e e-mails ------------------------------------- */
function concluir_(req) {
  const cache = CacheService.getScriptCache();
  if (cache.get('ok_' + req.protocolo)) return { ok: true, repetido: true };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (cache.get('ok_' + req.protocolo)) return { ok: true, repetido: true };
    const inicio = JSON.parse(cache.get('pr_' + req.protocolo) || 'null');
    const pasta = inicio ? DriveApp.getFolderById(inicio.pasta.id) : pastaDoPedido_(req.protocolo, req.evento, req.nome);
    const p = pedido_(req, pasta);

    // E-mail da equipe (miniaturas das fotos e vídeos vão embutidas)
    const inline = {};
    p.arquivos.forEach((a, i) => { if (a.miniatura) inline['mini' + i] = Utilities.newBlob(Utilities.base64Decode(a.miniatura), 'image/jpeg', 'mini' + i + '.jpg'); });
    const html = emailEquipe_(p, i => 'cid:mini' + i);
    MailApp.sendEmail({
      to: CONFIG.EMAIL_EQUIPE,
      subject: assuntoEquipe_(p),
      htmlBody: html,
      body: textoSimples_(p),
      name: 'Site ' + CONFIG.NOME_REMETENTE,
      replyTo: p.email || undefined,
      inlineImages: inline
    });

    // Briefing em PDF dentro da pasta (as miniaturas entram como imagem embutida)
    try {
      const pdfHtml = emailEquipe_(p, i => 'data:image/jpeg;base64,' + p.arquivos[i].miniatura);
      pasta.createFile(Utilities.newBlob(pdfHtml, 'text/html', 'briefing.html').getAs('application/pdf').setName('Briefing ' + p.protocolo + '.pdf'));
    } catch (err) { console.warn('PDF não gerado', err); }

    registrar_(p);

    if (CONFIG.CONFIRMAR_PARA_CLIENTE && p.email) {
      try {
        MailApp.sendEmail({ to: p.email, subject: 'Recebemos o seu pedido — ' + p.protocolo, htmlBody: emailCliente_(p), body: 'Recebemos o seu pedido ' + p.protocolo + '. A equipe da JM Stands vai analisar e responder em breve.', name: CONFIG.NOME_REMETENTE, replyTo: String(CONFIG.EMAIL_EQUIPE).split(',')[0].trim() });
      } catch (err) { console.warn('confirmação não enviada', err); }
    }

    cache.put('ok_' + req.protocolo, '1', CACHE_SEG);
    return { ok: true, pasta: pasta.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

/* Dados do pedido normalizados (tudo o que os e-mails e a planilha usam) */
function pedido_(req, pasta) {
  const c = req.campos || {};
  return {
    protocolo: req.protocolo,
    data: new Date(),
    pasta: pasta ? pasta.getUrl() : '',
    nome: limpa_(c.nome, 120), empresa: limpa_(c.empresa, 120),
    whatsapp: limpa_(c.whatsapp, 40), email: /@/.test(c.email || '') ? limpa_(c.email, 160) : '',
    preferencia: limpa_(c.preferencia, 40), idioma: limpa_(c.idioma, 20), origem: limpa_(c.origem, 60),
    evento: limpa_(c.evento, 160), local: limpa_(c.local, 120), datas: limpa_(c.datas, 60),
    metragem: limpa_(c.metragem, 80), espaco: limpa_(c.espaco, 120), investimento: limpa_(c.investimento, 60),
    ponto: limpa_(c.ponto, 120), referencia: limpa_(c.referencia, 160),
    secoes: (req.secoes || []).map(([titulo, linhas]) => [limpa_(titulo, 60), (linhas || []).map(([l, v]) => [limpa_(l, 60), limpa_(v, 4000)])]),
    links: limpa_(req.links, 4000),
    arquivos: (req.arquivos || []).map(a => ({ nome: limpa_(a.nome, 180), tamanho: Number(a.tamanho) || 0, tipo: limpa_(a.tipo, 80), url: /^https:\/\/drive\.google\.com\//.test(a.url || '') ? a.url : '', miniatura: /^[A-Za-z0-9+/=]+$/.test(a.miniatura || '') && a.miniatura.length < 200000 ? a.miniatura : '' }))
  };
}

/* Planilha de controle (criada na primeira vez, dentro da pasta raiz) */
function registrar_(p) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('PLANILHA_ID');
  let sheet;
  try { sheet = id && SpreadsheetApp.openById(id).getSheets()[0]; } catch (_) { sheet = null; }
  if (!sheet) {
    const ss = SpreadsheetApp.create(CONFIG.PLANILHA);
    DriveApp.getFileById(ss.getId()).moveTo(pastaRaiz_());
    props.setProperty('PLANILHA_ID', ss.getId());
    sheet = ss.getSheets()[0];
    sheet.setName('Pedidos');
    const cab = ['Recebido em', 'Protocolo', 'Status', 'Nome', 'Empresa', 'WhatsApp', 'E-mail', 'Prefere', 'Evento', 'Local', 'Datas', 'Metragem', 'Tipo de espaço', 'Investimento', 'Arquivos', 'Pasta no Drive', 'Links', 'Veio pelo'];
    sheet.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#11191e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Novo', 'Em análise', 'Proposta enviada', 'Fechado', 'Perdido'], true).build());
  }
  sheet.appendRow([p.data, p.protocolo, 'Novo', p.nome, p.empresa, p.whatsapp, p.email, p.preferencia, p.evento, p.local, p.datas, p.metragem, p.espaco, p.investimento, p.arquivos.length, p.pasta, p.links, p.origem]);
}

/* Pastas ------------------------------------------------------------------- */
function pastaRaiz_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_RAIZ_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (_) {} }
  const it = DriveApp.getFoldersByName(CONFIG.PASTA_RAIZ);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.PASTA_RAIZ);
  props.setProperty('PASTA_RAIZ_ID', pasta.getId());
  return pasta;
}

function pastaDoPedido_(protocolo, evento, nome) {
  const raiz = pastaRaiz_();
  const nomePasta = [protocolo, limpa_(evento, 60), limpa_(nome, 60)].filter(Boolean).join(' · ');
  const it = raiz.searchFolders('title contains "' + protocolo + '"');
  return it.hasNext() ? it.next() : raiz.createFolder(nomePasta);
}

/* E-mails ------------------------------------------------------------------ */
function assuntoEquipe_(p) {
  return ['[' + p.protocolo + '] Novo orçamento', p.evento, p.metragem, p.nome].filter(Boolean).join(' · ');
}

function textoSimples_(p) {
  return [assuntoEquipe_(p), '', ...p.secoes.map(([t, ls]) => t.toUpperCase() + '\n' + ls.map(([l, v]) => l + ': ' + v).join('\n')), '', 'Pasta no Drive: ' + p.pasta].join('\n\n');
}

function soDigitos_(v) { return String(v || '').replace(/\D/g, ''); }
function waCliente_(p) {
  let d = soDigitos_(p.whatsapp);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  const primeiro = (p.nome || '').split(' ')[0];
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent('Olá' + (primeiro ? ', ' + primeiro : '') + '! Aqui é da JM Stands. Recebemos o seu pedido ' + p.protocolo + (p.evento ? ' para a ' + p.evento : '') + ' e já estamos analisando.');
}

// Layout de e-mail em tabelas com estilos inline (compatível com Gmail, Outlook e celular)
function emailEquipe_(p, miniaturaSrc) {
  const D = { fundo: '#eef0ee', cartao: '#ffffff', escuro: '#11191e', texto: '#1d252b', suave: '#667178', linha: '#e3e7e5', ouro: '#8b653a', ouroClaro: '#c4a06a' };
  const e = esc_;
  const kpi = [['Evento', p.evento], ['Local', p.local], ['Datas', p.datas], ['Metragem', p.metragem], ['Tipo de espaço', p.espaco], ['Investimento', p.investimento]].filter(([, v]) => v);
  const kpiRows = [];
  for (let i = 0; i < kpi.length; i += 2) kpiRows.push(kpi.slice(i, i + 2));
  const botao = (href, rotulo, cheio) => href ? '<a href="' + e(href) + '" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:8px;font:700 14px Arial,sans-serif;text-decoration:none;' + (cheio ? 'background:' + D.ouroClaro + ';color:#111;' : 'border:1px solid ' + D.linha + ';color:' + D.texto + ';') + '">' + e(rotulo) + '</a>' : '';
  const wa = waCliente_(p);
  const mail = p.email ? 'mailto:' + p.email + '?subject=' + encodeURIComponent('JM Stands — pedido ' + p.protocolo) : '';
  // O que já está nos cartões do topo, no bloco do cliente ou na lista de arquivos não se repete nas seções
  const jaMostrado = ['Feira ou evento', 'Local', 'Início do evento', 'Fim previsto', 'Metragem', 'Tipo de espaço', 'Investimento previsto', 'Arquivos'];
  const secoes = p.secoes.filter(([t]) => t !== 'Contato')
    .map(([titulo, linhas]) => [titulo, linhas.filter(([l]) => jaMostrado.indexOf(l) === -1)])
    .filter(([, linhas]) => linhas.length).map(([titulo, linhas]) =>
    '<tr><td style="padding:22px 28px 6px;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + D.ouro + '">' + e(titulo) + '</td></tr>' +
    '<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
    linhas.map(([l, v]) => '<tr><td valign="top" style="width:38%;padding:9px 12px 9px 0;border-bottom:1px solid ' + D.linha + ';font:13px Arial,sans-serif;color:' + D.suave + '">' + e(l) + '</td><td valign="top" style="padding:9px 0;border-bottom:1px solid ' + D.linha + ';font:14px/1.5 Arial,sans-serif;color:' + D.texto + ';white-space:pre-line">' + linkify_(e(v)) + '</td></tr>').join('') +
    '</table></td></tr>').join('');
  const arquivos = p.arquivos.length ? '<tr><td style="padding:24px 28px 8px;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + D.ouro + '">Arquivos do cliente · ' + p.arquivos.length + '</td></tr>' +
    '<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    p.arquivos.map((a, i) => '<tr><td style="padding:6px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + D.linha + ';border-radius:10px"><tr>' +
      '<td width="96" style="padding:8px">' + (a.miniatura ? '<img src="' + miniaturaSrc(i) + '" width="88" height="66" alt="" style="display:block;width:88px;height:66px;object-fit:cover;border-radius:6px">' : '<div style="width:88px;height:66px;border-radius:6px;background:' + D.fundo + ';text-align:center;font:700 12px/66px Arial,sans-serif;color:' + D.suave + '">' + e(ext_(a.nome)) + '</div>') + '</td>' +
      '<td style="padding:8px 8px 8px 4px;font:14px Arial,sans-serif;color:' + D.texto + '"><b style="word-break:break-all">' + e(a.nome) + '</b><br><span style="font-size:12px;color:' + D.suave + '">' + e(tipoLegivel_(a.tipo, a.nome)) + ' · ' + e(tamanho_(a.tamanho)) + '</span></td>' +
      '<td align="right" style="padding:8px 12px;white-space:nowrap">' + (a.url ? '<a href="' + e(a.url) + '" style="font:700 13px Arial,sans-serif;color:' + D.ouro + ';text-decoration:none">Abrir ↗</a>' : '') + '</td>' +
      '</tr></table></td></tr>').join('') +
    '</table></td></tr>' +
    '<tr><td style="padding:10px 28px 0">' + botao(p.pasta, 'Abrir a pasta do pedido no Drive ↗', false) + '</td></tr>' : '';

  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(assuntoEquipe_(p)) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + D.fundo + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + D.fundo + '"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:' + D.cartao + ';border-radius:14px;overflow:hidden">' +
    // Cabeçalho
    '<tr><td style="background:' + D.escuro + ';padding:22px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td><img src="' + e(CONFIG.LOGO) + '" width="64" height="40" alt="JM Stands" style="display:block;height:40px;width:auto;background:#fff;border-radius:4px"></td>' +
    '<td align="right" style="font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + D.ouroClaro + '">Novo orçamento pelo site</td></tr></table></td></tr>' +
    '<tr><td style="background:' + D.escuro + ';padding:4px 28px 26px">' +
    '<div style="font:700 26px/1.2 Arial,sans-serif;color:#fff">' + e(p.evento || 'Solicitação de projeto') + '</div>' +
    '<div style="margin-top:8px;font:14px Arial,sans-serif;color:#a9b1b4">' + e([p.nome, p.empresa].filter(Boolean).join(' · ')) + '</div>' +
    '<div style="display:inline-block;margin-top:14px;padding:6px 10px;border:1px solid #334047;border-radius:6px;font:700 13px \'Courier New\',monospace;color:#f5f7f5">' + e(p.protocolo) + '</div>' +
    '<span style="margin-left:10px;font:12px Arial,sans-serif;color:#a9b1b4">' + e(Utilities.formatDate(p.data, 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm")) + '</span>' +
    '</td></tr>' +
    // Números-chave
    (kpiRows.length ? '<tr><td style="padding:22px 22px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      kpiRows.map(r => '<tr>' + r.map(([l, v]) => '<td width="50%" valign="top" style="padding:6px"><div style="padding:12px 14px;border-radius:10px;background:' + D.fundo + '"><div style="font:700 10px Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:' + D.suave + '">' + e(l) + '</div><div style="margin-top:4px;font:700 15px/1.3 Arial,sans-serif;color:' + D.texto + '">' + e(v) + '</div></div></td>').join('') + (r.length < 2 ? '<td width="50%"></td>' : '') + '</tr>').join('') +
      '</table></td></tr>' : '') +
    // Cliente e ações
    '<tr><td style="padding:18px 28px 6px;font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + D.ouro + '">Cliente</td></tr>' +
    '<tr><td style="padding:0 28px;font:14px/1.7 Arial,sans-serif;color:' + D.texto + '">' +
      '<b style="font-size:16px">' + e(p.nome) + '</b>' + (p.empresa ? ' · ' + e(p.empresa) : '') + '<br>' +
      (p.whatsapp ? 'WhatsApp: ' + e(p.whatsapp) + '<br>' : '') + (p.email ? 'E-mail: <a href="mailto:' + e(p.email) + '" style="color:' + D.ouro + '">' + e(p.email) + '</a><br>' : '') +
      '<span style="color:' + D.suave + '">Prefere retorno por: <b style="color:' + D.texto + '">' + e(p.preferencia || '—') + '</b>' + (p.origem ? ' · Veio pelo: ' + e(p.origem) : '') + (p.idioma && p.idioma !== 'pt' ? ' · Idioma: ' + e(p.idioma) : '') + '</span>' +
    '</td></tr>' +
    '<tr><td style="padding:14px 28px 4px">' + botao(wa, 'Responder no WhatsApp', true) + botao(mail, 'Responder por e-mail', false) + '</td></tr>' +
    secoes + arquivos +
    '<tr><td style="padding:26px 28px;font:12px/1.6 Arial,sans-serif;color:' + D.suave + '">Pedido registrado na planilha <b>' + e(CONFIG.PLANILHA) + '</b> com status <b>Novo</b>. Atualize o status por lá para a equipe acompanhar.<br>Enviado automaticamente pelo site ' + e(CONFIG.SITE.replace(/^https?:\/\//, '')) + '.</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function emailCliente_(p) {
  const e = esc_;
  const linhas = [['Protocolo', p.protocolo], ['Evento', p.evento], ['Local', p.local], ['Datas', p.datas], ['Metragem', p.metragem], ['Arquivos enviados', p.arquivos.length ? String(p.arquivos.length) : '']].filter(([, v]) => v);
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef0ee">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">' +
    '<tr><td style="background:#11191e;padding:24px 28px"><img src="' + e(CONFIG.LOGO) + '" height="40" alt="JM Stands" style="display:block;height:40px;background:#fff;border-radius:4px"></td></tr>' +
    '<tr><td style="padding:28px 28px 8px;font:700 24px/1.25 Arial,sans-serif;color:#1d252b">Recebemos o seu pedido' + (p.nome ? ', ' + e(p.nome.split(' ')[0]) : '') + '.</td></tr>' +
    '<tr><td style="padding:0 28px 18px;font:15px/1.6 Arial,sans-serif;color:#4d5a61">A equipe da JM Stands vai analisar o briefing e os arquivos e retornar pelo ' + e(p.preferencia || 'contato informado') + '. Guarde o protocolo abaixo para falar sobre este pedido.</td></tr>' +
    '<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
    linhas.map(([l, v]) => '<tr><td style="padding:9px 0;border-bottom:1px solid #e3e7e5;font:13px Arial,sans-serif;color:#667178">' + e(l) + '</td><td align="right" style="padding:9px 0;border-bottom:1px solid #e3e7e5;font:700 14px Arial,sans-serif;color:#1d252b">' + e(v) + '</td></tr>').join('') +
    '</table></td></tr>' +
    '<tr><td style="padding:22px 28px 28px"><a href="https://wa.me/' + CONFIG.WHATSAPP_JM + '?text=' + encodeURIComponent('Olá, JM! Quero falar sobre o pedido ' + p.protocolo + '.') + '" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#c4a06a;color:#111;font:700 14px Arial,sans-serif;text-decoration:none">Falar com a JM no WhatsApp</a></td></tr>' +
    '<tr><td style="padding:0 28px 26px;font:12px/1.6 Arial,sans-serif;color:#8a9499">JM Produção e Montagem de Estands LTDA · Colombo · PR<br>Você recebeu este e-mail porque solicitou um projeto em ' + e(CONFIG.SITE.replace(/^https?:\/\//, '')) + '.</td></tr>' +
    '</table></td></tr></table></body></html>';
}

/* Utilitários -------------------------------------------------------------- */
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function limpa_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 500); }
function esc_(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function linkify_(html) { return html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#8b653a;word-break:break-all">$1</a>'); }
function ext_(nome) { const m = /\.([a-z0-9]{1,5})$/i.exec(nome || ''); return m ? m[1].toUpperCase() : 'ARQ'; }
function tamanho_(b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace('.', ',') + ' MB'; }
function tipoLegivel_(tipo, nome) {
  if (/^image\//.test(tipo)) return 'Imagem';
  if (/^video\//.test(tipo)) return 'Vídeo';
  if (/pdf/.test(tipo)) return 'PDF';
  const x = ext_(nome);
  return { DWG: 'Planta (DWG)', DXF: 'Planta (DXF)', SKP: 'Projeto SketchUp', ZIP: 'Arquivo compactado', RAR: 'Arquivo compactado' }[x] || 'Arquivo ' + x;
}

/* Rode uma vez pelo editor: autoriza o acesso, cria a pasta e envia um e-mail de teste */
function configurar() {
  const raiz = pastaRaiz_();
  const p = pedido_({
    protocolo: 'JM-00000000-TESTE0', campos: { nome: 'Teste de instalação', evento: 'Teste do site', preferencia: 'WhatsApp' },
    secoes: [['Evento', [['Feira ou evento', 'Teste do site']]]], arquivos: []
  }, raiz);
  MailApp.sendEmail({ to: CONFIG.EMAIL_EQUIPE, subject: 'Teste: recebimento de orçamentos do site está ativo', htmlBody: emailEquipe_(p, () => ''), name: 'Site ' + CONFIG.NOME_REMETENTE });
  console.log('Pasta raiz: ' + raiz.getUrl());
}
