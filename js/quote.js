/* ==========================================================================
   Solicitar projeto — assistente em 4 etapas
   O briefing é registrado primeiro pelo site. WhatsApp e e-mail indicam apenas
   onde o cliente prefere receber o retorno — não são usados como armazenamento.
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
  // Com o Google Drive ligado (config.js → form.drive), os arquivos vão direto para a pasta do
  // pedido, em partes, sem o limite de 8 MB da Netlify. A Netlify Forms fica como cópia de segurança.
  const drive = (cfg.drive || '').trim();
  const maxBytes = (cfg.maxUploadMB || 25) * 1048576;
  const maxFiles = drive ? (cfg.driveMaxFiles || 15) : (cfg.maxFiles || 6);
  const maxFileBytes = (cfg.driveMaxFileMB || 2048) * 1048576;
  const CHUNK = 5 * 1048576; // múltiplo de 256 KB, exigido pelo envio retomável do Drive
  const LAST = 3, DONE = 4;

  const modal = $('#modal');
  const form = $('#quote');
  const panels = $$('.q-panel', form);
  const steps = $$('.q-progress li', modal);
  const nextBtn = $('#qNext');
  let step = 0, files = [], reference = '', lastFocus = null, requestId = '', openedAt = 0;
  let driveSession = null; // { pasta, uploads } — mantido entre tentativas para retomar o envio
  const cityCache = new Map();
  let validCities = [];

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
  const filesFit = () => files.length <= maxFiles && totalSize() <= maxBytes;
  const driveFit = () => files.length <= maxFiles && files.every(f => f.file.size <= maxFileBytes);
  const sentBytes = () => files.reduce((s, f) => s + (f.sent || 0), 0);
  const channel = () => val('canal') || 'whatsapp';
  const readyProject = () => val('ponto') === 'Já tenho um projeto pronto';
  const flow = () => readyProject() ? [0, 2, 3] : [0, 1, 2, 3];
  const dateText = value => {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
  };
  const makeRequestId = () => {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    const bytes = new Uint8Array(3);
    if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
    return `JM-${date}-${[...bytes].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  };

  // `tr` traduz os valores para o idioma do visitante; a equipe recebe sempre em português (tr = texto original).
  const same = s => s;
  const metragem = (tr = t) => {
    const m = val('metragem');
    if (m !== 'medidas') return tr(m);
    const a = num(val('frente')), b = num(val('fundo'));
    return a && b ? `${fmt(a)} × ${fmt(b)} m (${fmt(a * b)} m²)` : '';
  };
  const espaco = (tr = t) => {
    const e = val('espaco');
    return e === 'outro' ? val('espacoOutro') || tr('Outro') : tr(e);
  };
  const preference = () => channel() === 'ambos' ? 'WhatsApp e e-mail' : channel() === 'email' ? 'E-mail' : 'WhatsApp';

  /* Briefing estruturado (usado no resumo, no WhatsApp, no e-mail e no envio) */
  const briefing = (tr = t) => {
    const filesText = !files.length ? ''
      : `${files.length} (${drive ? tr('enviados para a pasta do pedido') : filesFit() && endpoint ? tr('prontos para envio pelo site') : tr('registrados no briefing; envio por link necessário')})\n` + files.map(f => `• ${f.file.name} · ${size(f.file.size)}`).join('\n');
    return [
      ['Evento', [
        ['Referência no site', tr(reference)],
        ['Ponto de partida', tr(val('ponto'))],
        ['Feira ou evento', val('evento')],
        ['Local', [val('cidade'), val('estado')].filter(Boolean).join(' · ')],
        ['Início do evento', dateText(val('dataInicio'))],
        ['Fim previsto', dateText(val('dataFim'))],
        ['Espaço reservado', tr(val('reserva'))]
      ]],
      ['Espaço', [
        ['Nível de definição', tr(val('definicao'))],
        ['Metragem', metragem(tr)],
        ['Tipo de espaço', espaco(tr)],
        ['Precisa ter', checked('itens').map(tr).join(', ')],
        ['Investimento previsto', tr(val('investimento'))],
        ['Detalhes', val('mensagem')]
      ]],
      ['Referências', [
        ['Links', val('links')],
        ['Arquivos', filesText]
      ]],
      ['Contato', [
        ['Protocolo', requestId],
        ['Nome', val('nome')],
        ['Empresa', val('empresa')],
        ['WhatsApp', val('whatsapp')],
        ['E-mail', val('email')],
        ['Preferência de contato', channel() === 'ambos' ? 'WhatsApp e e-mail' : channel() === 'email' ? 'E-mail' : 'WhatsApp'],
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
  const subject = () => `[${requestId}] ${t('Solicitação de projeto')} — ${val('evento') || val('empresa') || val('nome')}`;
  // Mensagem curta que o cliente envia à JM pelo próprio WhatsApp (wa.me, sem API da Meta).
  // O briefing completo e os arquivos já chegaram à equipe por e-mail e no Drive.
  const contactText = failed => {
    const row = (label, value) => value ? `*${t(label)}:* ${value}` : '';
    return [
      t('Olá, JM!'),
      failed ? t('Não consegui concluir o envio pelo site e preciso de ajuda com a solicitação.') : t('Acabei de enviar um pedido de orçamento pelo site.'),
      '',
      row('Protocolo', requestId),
      row('Evento', val('evento')),
      row('Local', [val('cidade'), val('estado')].filter(Boolean).join(' · ')),
      row('Metragem', metragem()),
      row('Empresa', val('empresa')),
      row('Contato', val('nome')),
      !failed && files.length ? row('Arquivos', `${files.length} ${t('enviados pelo site')}`) : '',
      '',
      failed ? t('O briefing continua preenchido no site.') : t('O briefing completo já está com a equipe. Podemos continuar por aqui.')
    ].filter((line, i, all) => line !== '' || (all[i - 1] !== '' && i > 0)).join('\n').trim();
  };
  const waUrl = failed => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(contactText(failed))}`;

  /* Navegação entre etapas ------------------------------------------------- */
  const submitLabel = () => 'Enviar solicitação ↗';

  const go = (n, focus = true) => {
    step = n;
    panels.forEach((p, i) => { p.hidden = i !== n; });
    const currentFlow = flow();
    const position = currentFlow.indexOf(n);
    steps.forEach((li, i) => {
      li.hidden = readyProject() && i === 1;
      li.classList.toggle('on', i === n);
      li.classList.toggle('done', currentFlow.indexOf(i) > -1 && currentFlow.indexOf(i) < position);
      $('button', li).disabled = currentFlow.indexOf(i) === -1 || currentFlow.indexOf(i) > position;
    });
    $('#qBar').style.width = (n >= DONE ? 100 : ((position + 1) / currentFlow.length) * 100) + '%';
    $('#qNav').hidden = n === DONE;
    $('#qBack').style.visibility = position <= 0 ? 'hidden' : '';
    nextBtn.textContent = n === LAST ? submitLabel() : 'Continuar →';
    if (n === LAST) renderSummary();
    clearStepError();
    modal.scrollTop = 0;
    if (focus) $('h3', panels[n]).focus({ preventScroll: true });
  };

  steps.forEach((li, i) => $('button', li).addEventListener('click', () => {
    if (step === DONE) return;
    const currentFlow = flow();
    if (currentFlow.indexOf(i) < currentFlow.indexOf(step)) go(i);
  }));
  $('#qBack').addEventListener('click', () => {
    const currentFlow = flow();
    go(currentFlow[Math.max(0, currentFlow.indexOf(step) - 1)]);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateStep(step)) return;
    if (step === LAST) send();
    else {
      const currentFlow = flow();
      go(currentFlow[currentFlow.indexOf(step) + 1]);
    }
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
    if (!requestId) requestId = makeRequestId();
    if (!openedAt) openedAt = Date.now();
    if (project) setRef(project);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    go(step);
  };
  const open = (e, el) => {
    e.preventDefault();
    show(el.dataset.project);
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
  // Delegado: os botões dos projetos são criados depois que os dados carregam.
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-open]');
    if (el) open(e, el);
  });
  // Link direto para o formulário (ex.: bio do Instagram): .../#solicitar
  // Com referência vinda do portfólio: .../?projeto=Nome do projeto#solicitar
  const checkHash = () => { if (location.hash === DEEP_LINK) show(new URLSearchParams(location.search).get('projeto') || ''); };
  addEventListener('hashchange', checkHash);
  $('#close').addEventListener('click', close);
  $('#qFinish').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $('#qRef button').addEventListener('click', () => setRef(''));

  /* Campos condicionais ---------------------------------------------------- */
  const measure = $('#qMeasure'), outro = $('#qOutro');
  const stepError = $('#qStepError');
  const clearStepError = () => {
    stepError.hidden = true;
    stepError.textContent = '';
    $$('.q-invalid', form).forEach(el => el.classList.remove('q-invalid'));
  };
  const showStepError = (message, target) => {
    stepError.textContent = message;
    stepError.hidden = false;
    if (target) {
      (target.closest('.q-group, .field, .consent, .q-drop') || target).classList.add('q-invalid');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const updateJourney = () => {
    const ready = readyProject();
    $('#qPathHint').hidden = !ready;
    $('#qReadyFileHint').hidden = !ready;
    $('b', steps[2]).textContent = ready ? '02' : '03';
    $('b', steps[3]).textContent = ready ? '03' : '04';
    $('#qFilesStep').textContent = ready ? 'Etapa 2 de 3' : 'Etapa 3 de 4';
    $('#qContactStep').textContent = ready ? 'Etapa 3 de 3' : 'Etapa 4 de 4';
    $('#qFilesTitle').textContent = ready ? 'Envie o seu projeto.' : 'Referências e arquivos.';
    $('#qFilesLead').textContent = ready
      ? 'Anexe o projeto pronto ou cole um link. Depois, pedimos apenas os seus dados de contato.'
      : 'Planta do espaço, manual do expositor, logo, fotos ou vídeos de stands que você gostou. Tudo ajuda a chegar mais rápido na proposta certa.';
    if (step !== DONE) go(step, false);
  };
  const updateArea = () => {
    const a = num(val('frente')), b = num(val('fundo'));
    $('#qArea').textContent = a && b ? `${fmt(a * b)} m²` : '— m²';
  };
  const updateChannel = () => {
    const needsEmail = channel() === 'email' || channel() === 'ambos';
    const needsWhats = channel() === 'whatsapp' || channel() === 'ambos';
    $('#f-email').required = needsEmail;
    phone.required = needsWhats;
    $('#qEmailReq').hidden = !needsEmail;
    $('#qWhatsReq').hidden = !needsWhats;
    if (step === LAST) nextBtn.textContent = submitLabel();
  };
  form.addEventListener('change', e => {
    const { name, value } = e.target;
    clearStepError();
    if (name === 'ponto') updateJourney();
    if (name === 'metragem') {
      measure.hidden = value !== 'medidas';
      $('#f-frente').required = value === 'medidas';
      $('#f-fundo').required = value === 'medidas';
      if (!measure.hidden) $('#f-frente').focus();
    }
    if (name === 'espaco') {
      outro.hidden = value !== 'outro';
      $('#f-outro').required = value === 'outro';
      if (!outro.hidden) $('#f-outro').focus();
    }
    if (name === 'canal') updateChannel();
    if (step === LAST) renderSummary();
  });
  $('#f-frente').addEventListener('input', updateArea);
  $('#f-fundo').addEventListener('input', updateArea);

  /* Estado e cidade ------------------------------------------------------- */
  const state = $('#f-estado'), city = $('#f-cidade'), cityList = $('#qCities'), cityStatus = $('#qCityStatus');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const setCities = cities => {
    validCities = cities;
    cityList.innerHTML = cities.map(name => `<option value="${esc(name)}"></option>`).join('');
  };
  const loadCities = async () => {
    const uf = state.value;
    city.value = '';
    city.setCustomValidity('');
    setCities([]);
    if (!uf) {
      city.disabled = true;
      city.placeholder = 'Selecione primeiro o estado';
      cityStatus.textContent = 'Escolha o estado para ver as cidades.';
      return;
    }
    city.disabled = true;
    city.placeholder = 'Carregando cidades…';
    cityStatus.textContent = 'Carregando cidades…';
    try {
      let cities = cityCache.get(uf);
      if (!cities) {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        if (!response.ok) throw new Error(response.status);
        cities = (await response.json()).map(item => item.nome);
        cityCache.set(uf, cities);
      }
      if (state.value !== uf) return;
      setCities(cities);
      city.disabled = false;
      city.placeholder = 'Digite para buscar';
      cityStatus.textContent = `${cities.length} cidades disponíveis. Digite para filtrar.`;
      city.focus();
    } catch (_) {
      if (state.value !== uf) return;
      city.disabled = false;
      city.placeholder = 'Digite a cidade';
      cityStatus.textContent = 'Não foi possível carregar a lista agora. Digite a cidade para continuar.';
    }
  };
  state.addEventListener('change', loadCities);
  city.addEventListener('input', () => city.setCustomValidity(''));
  city.addEventListener('change', () => {
    if (validCities.length && !validCities.some(name => normalize(name) === normalize(city.value))) {
      city.setCustomValidity('Selecione uma cidade da lista.');
    } else city.setCustomValidity('');
  });

  /* Datas e validação por etapa ------------------------------------------ */
  const startDate = $('#f-data-inicio'), endDate = $('#f-data-fim');
  const startPicker = $('#f-data-inicio-picker'), endPicker = $('#f-data-fim-picker');
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  startPicker.min = todayIso;
  const maskDate = value => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };
  const parseDate = value => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return '';
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const formatDateInput = iso => iso ? iso.split('-').reverse().join('/') : '';
  const syncTypedDate = (textInput, picker) => {
    textInput.value = maskDate(textInput.value);
    picker.value = parseDate(textInput.value);
    textInput.setCustomValidity('');
  };
  const validateDates = () => {
    const startIso = parseDate(startDate.value);
    const endIso = parseDate(endDate.value);
    startPicker.value = startIso;
    endPicker.value = endIso;
    startDate.setCustomValidity(startDate.value && !startIso ? t('Informe uma data válida no formato dd/mm/aaaa.')
      : startIso && startIso < todayIso ? t('A data de início não pode estar no passado.') : '');
    endDate.setCustomValidity(endDate.value && !endIso ? t('Informe uma data válida no formato dd/mm/aaaa.')
      : startIso && endIso && endIso < startIso ? t('A data final deve ser igual ou posterior ao início.') : '');
    endPicker.min = startIso || todayIso;
  };
  [[startDate, startPicker], [endDate, endPicker]].forEach(([textInput, picker]) => {
    textInput.addEventListener('input', () => syncTypedDate(textInput, picker));
    textInput.addEventListener('blur', validateDates);
    picker.addEventListener('change', () => {
      textInput.value = formatDateInput(picker.value);
      validateDates();
      textInput.focus();
    });
  });
  $$('[data-date-button]', form).forEach(button => button.addEventListener('click', () => {
    const picker = button.dataset.dateButton === 'inicio' ? startPicker : endPicker;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }));

  const validateStep = n => {
    clearStepError();
    validateDates();
    if (n === 0 && validCities.length && city.value && !validCities.some(name => normalize(name) === normalize(city.value))) {
      city.setCustomValidity('Selecione uma cidade da lista.');
    }
    if (n === 2 && readyProject() && !files.length && !val('links')) {
      showStepError('Anexe o projeto ou cole um link para continuar.', $('#f-files'));
      return false;
    }
    if (n === 2 && drive && !driveFit()) {
      showStepError(t('Algum arquivo passou de 2 GB. Envie esse por link (Drive, WeTransfer) e remova-o da lista.'), $('#f-links'));
      return false;
    }
    if (n === 2 && !drive && files.length && (!endpoint || !filesFit()) && !val('links')) {
      showStepError(t('Para não perder arquivos grandes, envie-os pelo Drive ou WeTransfer e cole o link para continuar.'), $('#f-links'));
      return false;
    }
    if (n === LAST) {
      const digits = phone.value.replace(/\D/g, '');
      phone.setCustomValidity(phone.required && digits.length < 10 ? t('Informe o WhatsApp com DDD.') : '');
    }
    const invalid = $$('input, select, textarea', panels[n]).find(el => !el.disabled && !el.checkValidity());
    if (invalid) {
      showStepError(invalid.validationMessage || 'Preencha os campos obrigatórios para continuar.', invalid);
      invalid.reportValidity();
      return false;
    }
    return true;
  };

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
    if (drive) {
      const over = !driveFit();
      hint.classList.toggle('warn', over);
      hint.textContent = `${files.length} / ${maxFiles} arquivos · ${size(totalSize())} · ` +
        (over ? t('Algum arquivo passou de 2 GB: envie esse por link.') : t('Vão direto para a equipe da JM, inclusive vídeos grandes.'));
    } else if (endpoint) {
      const over = !filesFit();
      hint.classList.toggle('warn', over);
      hint.textContent = `${files.length} / ${maxFiles} arquivos · ${size(totalSize())} / ${cfg.maxUploadMB || 7.5} MB` +
        (over ? ' · ' + t('Os anexos não serão enviados: coloque os arquivos grandes no Drive ou WeTransfer e cole o link abaixo.') : ' · ' + t('Serão enviados e vinculados ao protocolo.'));
    } else {
      hint.classList.add('warn');
      hint.textContent = t('O recebimento direto está indisponível. Use um link do Drive ou WeTransfer para não perder os arquivos.');
    }
  };

  const add = fileList => {
    let skipped = 0;
    [...fileList].forEach(file => {
      if (!file.size || files.some(f => f.file.name === file.name && f.file.size === file.size)) return;
      if (files.length >= maxFiles) { skipped += 1; return; }
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      files.push({ file, kind, url: kind === 'file' ? '' : URL.createObjectURL(file) });
    });
    renderFiles();
    if (skipped) {
      hint.classList.add('warn');
      hint.textContent += ` · ${skipped} ${t('arquivo(s) não adicionado(s): limite atingido.')}`;
    }
    if (files.length) clearStepError();
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
  const fallback = $('#qFallback');
  const fail = msg => { error.textContent = msg; error.hidden = false; };

  const briefFile = () => new File([asText()], `briefing-${requestId}.txt`, { type: 'text/plain;charset=utf-8' });
  const downloadBrief = () => {
    const url = URL.createObjectURL(briefFile());
    const link = document.createElement('a');
    link.href = url;
    link.download = `briefing-${requestId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const showFallback = message => {
    fail(message);
    fallback.hidden = false;
    $('#qFallbackWa').href = waUrl(true);
  };

  // Cópia na Netlify Forms. Com o Drive ligado vai só o texto (os arquivos já estão na pasta do pedido);
  // sem o Drive, os anexos pequenos seguem junto, como antes.
  const submissionData = (withFiles, folder = '') => {
    const data = new FormData();
    data.append('form-name', 'solicitar-projeto');
    data.append('site-check', '');
    data.append('_subject', subject());
    data.append('Protocolo', requestId);
    data.append('Assunto', subject());
    data.append('subject', subject());
    if (val('email')) data.append('_replyto', val('email'));
    data.append('Nome', val('nome'));
    data.append('Empresa', val('empresa'));
    data.append('WhatsApp', val('whatsapp'));
    data.append('Email', val('email'));
    data.append('Preferencia', preference());
    data.append('Evento', val('evento'));
    data.append('Local', [val('cidade'), val('estado')].filter(Boolean).join(' · '));
    data.append('Datas', [dateText(val('dataInicio')), dateText(val('dataFim'))].filter(Boolean).join(' a '));
    data.append('Ponto_de_partida', val('ponto'));
    data.append('Nivel_de_definicao', val('definicao'));
    data.append('Metragem', metragem(same));
    data.append('Tipo_de_espaco', espaco(same));
    data.append('Itens', checked('itens').join(', '));
    data.append('Investimento', val('investimento'));
    data.append('Detalhes', val('mensagem'));
    data.append('Referencia_no_site', reference);
    data.append('Links', val('links'));
    data.append('Arquivos', files.map(item => `${item.file.name} (${size(item.file.size)})${item.drive ? ' — ' + item.drive.url : ''}`).join('\n'));
    data.append('Pasta_Drive', folder);
    data.append('Origem', source);
    data.append('body', briefing(same).map(([title, rows]) => title.toUpperCase() + '\n' + rows.map(([l, v]) => `${l}: ${v}`).join('\n')).join('\n\n'));
    if (withFiles) files.forEach((item, index) => data.append(`arquivo_${String(index + 1).padStart(2, '0')}`, item.file, item.file.name));
    return data;
  };
  const postNetlify = (withFiles, folder) => fetch(endpoint, { method: 'POST', body: submissionData(withFiles, folder), headers: { Accept: 'application/json' } })
    .then(res => { if (!res.ok) throw new Error(res.status); });

  /* Envio para o Google Drive da JM (ferramentas/google-drive/Codigo.gs) ---- */
  const upload = $('#qUpload'), uploadBar = $('#qUploadBar'), uploadText = $('#qUploadText');
  const progress = (label, ratio) => {
    upload.hidden = false;
    uploadText.textContent = label;
    uploadBar.style.width = Math.round(Math.min(1, Math.max(0, ratio)) * 100) + '%';
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Corpo em texto puro: o navegador não faz a verificação prévia (CORS) e o Apps Script aceita.
  const drivePost = async body => {
    const res = await fetch(drive, { method: 'POST', body: JSON.stringify({ protocolo: requestId, hp: val('site-check'), ...body }) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || 'falha no recebimento');
    return data;
  };
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  // Miniatura leve (até 320 px) para o e-mail da equipe: fotos e o 1º segundo dos vídeos
  const thumbnail = f => new Promise(resolve => {
    if (f.kind === 'file' || !f.url) { resolve(''); return; }
    const timer = setTimeout(() => resolve(''), 6000);
    const draw = (source, w, h) => {
      clearTimeout(timer);
      try {
        const scale = Math.min(1, 320 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72).split(',')[1] || '');
      } catch (_) { resolve(''); }
    };
    if (f.kind === 'image') {
      const img = new Image();
      img.onload = () => draw(img, img.naturalWidth, img.naturalHeight);
      img.onerror = () => { clearTimeout(timer); resolve(''); };
      img.src = f.url;
    } else {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.onloadeddata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2); };
      video.onseeked = () => draw(video, video.videoWidth, video.videoHeight);
      video.onerror = () => { clearTimeout(timer); resolve(''); };
      video.src = f.url;
    }
  });

  const uploadFile = async (f, up, onProgress) => {
    let tries = 0;
    while (!f.drive) {
      try {
        const from = f.sent || 0;
        const answer = await drivePost({ acao: 'parte', uploadId: up.id, inicio: from, dados: await toBase64(f.file.slice(from, from + CHUNK)) });
        tries = 0;
        f.sent = answer.concluido ? f.file.size : answer.recebido;
        if (answer.concluido) f.drive = answer.arquivo;
        onProgress();
      } catch (err) {
        if (++tries > 4) throw err;
        await sleep(1500 * tries);
        // Pergunta ao Drive quanto já chegou e continua dali (não reenvia o que já foi)
        try {
          const state = await drivePost({ acao: 'status', uploadId: up.id });
          f.sent = state.concluido ? f.file.size : state.recebido;
          if (state.concluido) f.drive = state.arquivo;
        } catch (_) {}
      }
    }
  };

  const sendDrive = async () => {
    const total = totalSize() || 1;
    progress(t('Preparando o envio…'), 0);
    if (!driveSession) {
      driveSession = await drivePost({
        acao: 'iniciar', tempo: Date.now() - openedAt, evento: val('evento'), nome: val('nome'),
        arquivos: files.map(f => ({ nome: f.file.name, tamanho: f.file.size, tipo: f.file.type }))
      });
    }
    for (const [i, f] of files.entries()) {
      await uploadFile(f, driveSession.uploads[i], () => {
        progress(`${t('Enviando arquivos')} · ${size(sentBytes())} / ${size(total)} · ${Math.floor((sentBytes() / total) * 100)}%`, sentBytes() / total);
      });
    }
    progress(t('Finalizando o pedido…'), 1);
    const thumbs = await Promise.all(files.map(thumbnail));
    await drivePost({
      acao: 'concluir', evento: val('evento'), nome: val('nome'),
      campos: {
        nome: val('nome'), empresa: val('empresa'), whatsapp: val('whatsapp'), email: val('email'),
        preferencia: preference(), idioma: document.documentElement.lang.slice(0, 2), origem: source,
        evento: val('evento'), local: [val('cidade'), val('estado')].filter(Boolean).join(' · '),
        datas: [dateText(val('dataInicio')), dateText(val('dataFim'))].filter(Boolean).join(' a '),
        metragem: metragem(same), espaco: espaco(same), investimento: val('investimento'), ponto: val('ponto'), referencia: reference
      },
      secoes: briefing(same),
      links: val('links'),
      arquivos: files.map((f, i) => ({ nome: f.file.name, tamanho: f.file.size, tipo: f.file.type, url: f.drive && f.drive.url, miniatura: thumbs[i] }))
    });
    return driveSession.pasta.url;
  };

  const send = async () => {
    error.hidden = true;
    fallback.hidden = true;
    if (!validateStep(LAST)) return;
    if (!requestId) requestId = makeRequestId();
    if (!drive && !endpoint) {
      showFallback(t('O recebimento seguro ainda não está disponível. Baixe o briefing ou continue pelo WhatsApp sem perder o que preencheu.'));
      return;
    }
    if (!drive && !filesFit() && !val('links')) {
      showFallback(t('Para não perder arquivos grandes, envie-os pelo Drive ou WeTransfer e cole o link para continuar.'));
      return;
    }
    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando…';
    try {
      if (drive) {
        let folder = '';
        try {
          folder = await sendDrive();
        } catch (err) {
          // Drive indisponível: se os anexos cabem na Netlify, o pedido segue por lá sem perder nada
          if (endpoint && filesFit()) { await postNetlify(true, ''); done(); return; }
          throw err;
        }
        if (endpoint) await Promise.race([postNetlify(false, folder).catch(() => {}), sleep(8000)]);
      } else {
        await postNetlify(filesFit(), '');
      }
      done();
    } catch (_) {
      showFallback(sentBytes() > 0
        ? t('A conexão caiu durante o envio. Nada foi perdido: toque em Enviar de novo para continuar de onde parou.')
        : t('Não foi possível registrar agora. Nada foi apagado: tente novamente ou continue pelo WhatsApp com o protocolo.'));
    } finally {
      upload.hidden = true;
      nextBtn.disabled = false;
      if (step === LAST) nextBtn.textContent = submitLabel();
    }
  };

  const done = () => {
    const ch = channel();
    const email = ch === 'email';
    const both = ch === 'ambos';
    $('#qDoneTitle').textContent = t('Solicitação registrada.');
    $('#qDoneText').textContent = email
      ? t('Seu briefing foi salvo. A equipe da JM responderá pelo e-mail informado.')
      : both ? t('Seu briefing foi salvo. Envie a mensagem no WhatsApp para agilizar; a equipe também poderá responder por e-mail.')
      : t('Seu briefing foi salvo. Agora é só enviar a mensagem pronta no WhatsApp da JM.');
    $('#qProtocol').textContent = requestId;
    $('#qDoneFiles').hidden = !files.length;
    const delivered = files.length && files.every(f => f.drive);
    if (files.length) $('#qDoneCount').innerHTML = delivered
      ? `${files.length} <span>${t('arquivo(s) enviados à equipe')} (${size(totalSize())}).</span>`
      : filesFit()
        ? `${files.length} <span>arquivo(s) recebidos e vinculados a este protocolo.</span>`
        : `<span>Os arquivos grandes foram registrados pelo nome; a equipe usará o link informado no briefing.</span>`;
    const reopen = $('#qReopen');
    const wantsWhats = ch !== 'email';
    reopen.hidden = false;
    reopen.href = waUrl(false);
    reopen.textContent = wantsWhats ? 'Enviar no WhatsApp ↗' : 'Falar sobre este pedido no WhatsApp ↗';
    reopen.classList.toggle('btn-accent', wantsWhats);
    reopen.classList.toggle('btn-outline', !wantsWhats);

    go(DONE);
    // Quem escolheu WhatsApp já sai com a conversa aberta (se o navegador bloquear, o botão acima faz o mesmo)
    if (wantsWhats) { try { window.open(reopen.href, '_blank', 'noopener'); } catch (_) {} }
    // Conversão (só existe se o visitante aceitou os cookies — ver consent.js)
    if (window.gtag) gtag('event', 'generate_lead', { method: drive ? 'site_drive' : 'site', contact_preference: ch });
    if (window.fbq) fbq('track', 'Lead');
  };

  $('#qCopy').addEventListener('click', e => {
    const btn = e.currentTarget;
    const ok = () => { btn.textContent = 'Copiado ✓'; };
    if (navigator.clipboard) navigator.clipboard.writeText(requestId).then(ok).catch(() => {});
  });
  $('#qDownload').addEventListener('click', downloadBrief);
  $('#qFallbackDownload').addEventListener('click', downloadBrief);

  const reset = () => {
    form.reset();
    files.forEach(f => f.url && URL.revokeObjectURL(f.url));
    files = [];
    requestId = '';
    openedAt = 0;
    driveSession = null;
    renderFiles();
    setRef('');
    measure.hidden = true;
    outro.hidden = true;
    $('#f-frente').required = false;
    $('#f-fundo').required = false;
    $('#f-outro').required = false;
    error.hidden = true;
    fallback.hidden = true;
    $('#qCopy').textContent = 'Copiar';
    city.disabled = true;
    setCities([]);
    cityStatus.textContent = 'Escolha o estado para ver as cidades.';
    updateArea();
    updateChannel();
    updateJourney();
    go(0, false);
  };

  go(0, false);
  checkHash();
})();
