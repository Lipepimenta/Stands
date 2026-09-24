/* ==========================================================================
   Solicitar projeto — assistente em 4 etapas
   Sem endpoint (config.js → form.endpoint): o briefing abre pronto no WhatsApp
   ou no e-mail do cliente e ele anexa os arquivos por lá.
   Com endpoint: dados e arquivos são enviados direto pelo site.
   Textos do DOM ficam em português; o js/i18n.js traduz automaticamente.
   ========================================================================== */
(() => {
  const SITE = window.SITE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = s => (window.JM_I18N ? window.JM_I18N.t(s) : s);

  const cfg = SITE.form || {};
  const endpoint = cfg.endpoint || '';
  const maxBytes = (cfg.maxUploadMB || 25) * 1048576;
  const LAST = 3, DONE = 4;

  const modal = $('#modal');
  const form = $('#quote');
  const panels = $$('.q-panel', form);
  const steps = $$('.q-progress li', modal);
  const nextBtn = $('#qNext');
  let step = 0, files = [], reference = '', lastFocus = null;

  // Origem do visitante (?origem=instagram ou ?utm_source=instagram), guardada na visita
  const params = new URLSearchParams(location.search);
  let source = params.get('origem') || params.get('utm_source') || '';
  try {
    if (source) sessionStorage.setItem('jm-origem', source);
    else source = sessionStorage.getItem('jm-origem') || '';
  } catch (_) {}
  source = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';

  /* Leitura dos campos ----------------------------------------------------- */
  const val = name => (form.elements[name] ? form.elements[name].value : '').trim();
  const checked = name => $$(`[name="${name}"]:checked`, form).map(el => el.value);
  const num = v => Number(String(v).replace(',', '.')) || 0;
  const fmt = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const size = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : fmt(b / 1048576) + ' MB';
  const totalSize = () => files.reduce((s, f) => s + f.file.size, 0);
  const channel = () => val('canal') || 'whatsapp';

  const metragem = () => {
    const m = val('metragem');
    if (m !== 'medidas') return t(m);
    const a = num(val('frente')), b = num(val('fundo'));
    return a && b ? `${fmt(a)} × ${fmt(b)} m (${fmt(a * b)} m²)` : '';
  };
  const espaco = () => {
    const e = val('espaco');
    return e === 'outro' ? val('espacoOutro') || t('Outro') : t(e);
  };

  /* Briefing estruturado (usado no resumo, no WhatsApp, no e-mail e no envio) */
  const briefing = () => {
    const via = channel() === 'email' ? 'vou anexar neste e-mail' : 'vou anexar nesta conversa';
    const filesText = files.length
      ? `${files.length} (${t(endpoint ? 'enviados pelo site' : via)})\n` + files.map(f => '• ' + f.file.name).join('\n')
      : '';
    return [
      ['Evento', [
        ['Referência no site', t(reference)],
        ['Ponto de partida', t(val('ponto'))],
        ['Feira ou evento', val('evento')],
        ['Cidade', val('cidade')],
        ['Data', val('data')],
        ['Espaço reservado', t(val('reserva'))]
      ]],
      ['Espaço', [
        ['Metragem', metragem()],
        ['Tipo de espaço', espaco()],
        ['Precisa ter', checked('itens').map(t).join(', ')],
        ['Investimento previsto', t(val('investimento'))],
        ['Detalhes', val('mensagem')]
      ]],
      ['Referências', [
        ['Links', val('links')],
        ['Arquivos', filesText]
      ]],
      ['Contato', [
        ['Nome', val('nome')],
        ['Empresa', val('empresa')],
        ['WhatsApp', val('whatsapp')],
        ['E-mail', val('email')],
        ['Veio pelo', source]
      ]]
    ].map(([title, rows]) => [title, rows.filter(([, v]) => v)]).filter(([, rows]) => rows.length);
  };

  const asText = (bold = false) => {
    const b = s => (bold ? `*${s}*` : s);
    return b(t('Nova solicitação de projeto') + ' — JM Stands') + '\n\n' +
      briefing().map(([title, rows]) =>
        b(t(title).toUpperCase()) + '\n' + rows.map(([l, v]) => `${t(l)}: ${v}`).join('\n')
      ).join('\n\n');
  };
  const subject = () => `${t('Solicitação de projeto')} — ${val('evento') || val('empresa') || val('nome')}`;
  const waUrl = () => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(asText(true))}`;
  const mailUrl = () => `mailto:${SITE.email}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(asText())}`;

  /* Navegação entre etapas ------------------------------------------------- */
  const submitLabel = () => endpoint ? 'Enviar solicitação ↗'
    : channel() === 'email' ? 'Enviar por e-mail ↗' : 'Enviar pelo WhatsApp ↗';

  const go = (n, focus = true) => {
    step = n;
    panels.forEach((p, i) => { p.hidden = i !== n; });
    steps.forEach((li, i) => {
      li.classList.toggle('on', i === n);
      li.classList.toggle('done', i < n);
    });
    $('#qBar').style.width = (n >= DONE ? 100 : (n + 1) * 25) + '%';
    $('#qNav').hidden = n === DONE;
    $('#qBack').style.visibility = n === 0 ? 'hidden' : '';
    nextBtn.textContent = n === LAST ? submitLabel() : 'Continuar →';
    if (n === LAST) renderSummary();
    modal.scrollTop = 0;
    if (focus) $('h3', panels[n]).focus({ preventScroll: true });
  };

  steps.forEach((li, i) => $('button', li).addEventListener('click', () => { if (step !== DONE) go(i); }));
  $('#qBack').addEventListener('click', () => go(Math.max(0, step - 1)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (step < LAST) go(step + 1);
    else if (step === LAST) send();
  });

  /* Abrir / fechar --------------------------------------------------------- */
  const setRef = title => {
    reference = title;
    $('#qRef').hidden = !title;
    $('#qRef b').textContent = title;
  };
  const show = (project = '') => {
    lastFocus = document.activeElement;
    if (step === DONE) reset();
    if (project) setRef(project);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    go(step);
  };
  const open = e => {
    e.preventDefault();
    show(e.currentTarget.dataset.project);
  };
  const DEEP_LINK = '#solicitar';
  const close = () => {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (step === DONE) reset();
    if (location.hash === DEEP_LINK) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  };
  $$('[data-open]').forEach(el => el.addEventListener('click', open));
  // Link direto para o formulário (ex.: bio do Instagram): .../#solicitar
  const checkHash = () => { if (location.hash === DEEP_LINK) show(); };
  addEventListener('hashchange', checkHash);
  $('#close').addEventListener('click', close);
  $('#qFinish').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $('#qRef button').addEventListener('click', () => setRef(''));

  /* Campos condicionais ---------------------------------------------------- */
  const measure = $('#qMeasure'), outro = $('#qOutro');
  const updateArea = () => {
    const a = num(val('frente')), b = num(val('fundo'));
    $('#qArea').textContent = a && b ? `${fmt(a * b)} m²` : '— m²';
  };
  const updateChannel = () => {
    const email = channel() === 'email';
    $('#f-email').required = email;
    $('#qEmailReq').hidden = !email;
    if (step === LAST) nextBtn.textContent = submitLabel();
  };
  form.addEventListener('change', e => {
    const { name, value } = e.target;
    if (name === 'metragem') {
      measure.hidden = value !== 'medidas';
      if (!measure.hidden) $('#f-frente').focus();
    }
    if (name === 'espaco') {
      outro.hidden = value !== 'outro';
      if (!outro.hidden) $('#f-outro').focus();
    }
    if (name === 'canal') updateChannel();
    if (step === LAST) renderSummary();
  });
  $('#f-frente').addEventListener('input', updateArea);
  $('#f-fundo').addEventListener('input', updateArea);

  // Máscara de telefone brasileiro; números começando com + ficam livres
  const phone = $('#f-whats');
  phone.addEventListener('input', () => {
    phone.setCustomValidity('');
    if (phone.value.trim().startsWith('+')) return;
    const d = phone.value.replace(/\D/g, '').slice(0, 11);
    phone.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });

  /* Arquivos --------------------------------------------------------------- */
  const input = $('#f-files'), drop = $('#qDrop'), list = $('#qFiles'), hint = $('#qFilesHint');

  const renderFiles = () => {
    list.innerHTML = files.map((f, i) => {
      const ext = (f.file.name.split('.').pop() || '').slice(0, 4).toUpperCase();
      const thumb = f.kind === 'image' ? `<img src="${f.url}" alt="">`
        : f.kind === 'video' ? `<video src="${f.url}" muted preload="metadata"></video><i class="q-play" aria-hidden="true">▶</i>`
        : `<span>${esc(ext || 'ARQ')}</span>`;
      return `<li class="q-file">
        <div class="q-thumb">${thumb}</div>
        <div class="q-meta"><b>${esc(f.file.name)}</b><small>${size(f.file.size)}</small></div>
        <button type="button" data-remove="${i}" aria-label="Remover arquivo">×</button>
      </li>`;
    }).join('');

    hint.classList.remove('warn');
    if (!files.length) { hint.textContent = ''; return; }
    if (endpoint) {
      const over = totalSize() > maxBytes;
      hint.classList.toggle('warn', over);
      hint.textContent = `${size(totalSize())} / ${cfg.maxUploadMB || 25} MB` +
        (over ? ' · ' + t('Passou do limite: envie os maiores por link (Drive, WeTransfer).') : '');
    } else {
      hint.textContent = 'Seus arquivos estão prontos. Ao final, você anexa eles na conversa do WhatsApp ou no e-mail. A gente te lembra.';
    }
  };

  const add = fileList => {
    [...fileList].forEach(file => {
      if (files.some(f => f.file.name === file.name && f.file.size === file.size)) return;
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      files.push({ file, kind, url: kind === 'file' ? '' : URL.createObjectURL(file) });
    });
    renderFiles();
  };

  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const [f] = files.splice(Number(btn.dataset.remove), 1);
    if (f.url) URL.revokeObjectURL(f.url);
    renderFiles();
  });
  // Arrastar e soltar (no modal inteiro, para o navegador não abrir o arquivo)
  ['dragenter', 'dragover'].forEach(ev => modal.addEventListener(ev, e => {
    e.preventDefault();
    drop.classList.toggle('over', drop.contains(e.target));
  }));
  modal.addEventListener('dragleave', e => { if (!modal.contains(e.relatedTarget)) drop.classList.remove('over'); });
  modal.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer.files.length) add(e.dataTransfer.files);
  });

  /* Resumo ----------------------------------------------------------------- */
  const renderSummary = () => {
    $('#qSummary').innerHTML = briefing().map(([title, rows]) =>
      `<h4>${esc(title)}</h4><dl>${rows.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    ).join('');
  };

  /* Envio ------------------------------------------------------------------ */
  const error = $('#qError');
  const fail = msg => { error.textContent = msg; error.hidden = false; };

  const send = async () => {
    error.hidden = true;
    const digits = phone.value.replace(/\D/g, '');
    phone.setCustomValidity(digits.length >= 10 ? '' : t('Informe o WhatsApp com DDD.'));
    const invalid = $$('input[required]', panels[LAST]).find(el => !el.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }

    const ch = channel();
    if (!endpoint) {
      const url = ch === 'email' ? mailUrl() : waUrl();
      if (ch === 'email') location.href = url;
      else window.open(url, '_blank', 'noopener');
      done(false, ch, url);
      return;
    }

    if (totalSize() > maxBytes) {
      fail(t('Os arquivos passaram do limite. Remova os maiores e envie por link (Drive, WeTransfer).'));
      return;
    }
    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando…';
    const data = new FormData();
    data.append('_subject', subject());
    if (val('email')) data.append('_replyto', val('email'));
    briefing().forEach(([, rows]) => rows.forEach(([l, v]) => data.append(l, v)));
    data.append('Canal preferido', ch === 'email' ? 'E-mail' : 'WhatsApp');
    data.append('Briefing completo', asText());
    files.forEach(f => data.append('arquivos', f.file, f.file.name));
    try {
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      done(true, ch);
    } catch (_) {
      fail(t('Não foi possível enviar agora. Verifique a conexão e tente de novo, ou fale com a gente pelo WhatsApp.'));
    } finally {
      nextBtn.disabled = false;
      if (step === LAST) nextBtn.textContent = submitLabel();
    }
  };

  const done = (sent, ch, url) => {
    const email = ch === 'email';
    $('#qDoneTitle').textContent = sent ? 'Solicitação enviada.' : 'Briefing pronto.';
    $('#qDoneText').textContent = sent
      ? (email ? 'Recebemos o seu briefing e os arquivos. Nossa equipe vai analisar e responder por e-mail.'
               : 'Recebemos o seu briefing e os arquivos. Nossa equipe vai analisar e responder pelo WhatsApp.')
      : (email ? 'Abrimos o seu e-mail com tudo preenchido. Confira e clique em enviar.'
               : 'Abrimos o WhatsApp da JM com tudo preenchido. É só tocar em enviar na conversa.');

    // Sem endpoint, os arquivos precisam ser anexados pelo próprio cliente
    const pending = !sent && files.length > 0;
    $('#qDoneFiles').hidden = !pending;
    if (pending) {
      $('#qDoneCount').innerHTML = `${files.length} <span>${email ? 'arquivo(s) para anexar no e-mail antes de enviar.' : 'arquivo(s) para anexar na conversa.'}</span>`;
      const shareable = files.map(f => f.file);
      $('#qShare').hidden = !(navigator.canShare && navigator.canShare({ files: shareable }));
    }

    $('#qDoneMail').hidden = sent || !email;
    $('#qCopy').hidden = sent;
    $('#qCopy').textContent = 'Copiar briefing';

    const reopen = $('#qReopen');
    reopen.hidden = sent;
    if (!sent) {
      reopen.href = url;
      reopen.textContent = email ? 'Abrir o e-mail de novo ↗' : 'Abrir o WhatsApp de novo ↗';
      if (email) reopen.removeAttribute('target'); else reopen.target = '_blank';
    }

    go(DONE);
    // Conversão (só existe se o visitante aceitou os cookies — ver consent.js)
    if (window.gtag) gtag('event', 'generate_lead', { method: sent ? 'site' : ch });
    if (window.fbq) fbq('track', 'Lead');
  };

  $('#qCopy').addEventListener('click', e => {
    const btn = e.currentTarget;
    const ok = () => { btn.textContent = 'Copiado ✓'; };
    if (navigator.clipboard) navigator.clipboard.writeText(asText()).then(ok).catch(() => {});
  });
  $$('[data-mail]', modal).forEach(a => { a.href = 'mailto:' + SITE.email; a.textContent = SITE.email; });

  // No celular, abre a folha de compartilhamento com os arquivos (ex.: direto no WhatsApp)
  $('#qShare').addEventListener('click', () => {
    navigator.share({ files: files.map(f => f.file), title: t('Arquivos do projeto'), text: subject() }).catch(() => {});
  });

  const reset = () => {
    form.reset();
    files.forEach(f => f.url && URL.revokeObjectURL(f.url));
    files = [];
    renderFiles();
    setRef('');
    measure.hidden = true;
    outro.hidden = true;
    error.hidden = true;
    updateArea();
    updateChannel();
    go(0, false);
  };

  go(0, false);
  checkHash();
})();
