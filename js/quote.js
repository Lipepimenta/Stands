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
  const maxBytes = (cfg.maxUploadMB || 25) * 1048576;
  const maxFiles = cfg.maxFiles || 6;
  const LAST = 3, DONE = 4;

  const modal = $('#modal');
  const form = $('#quote');
  const panels = $$('.q-panel', form);
  const steps = $$('.q-progress li', modal);
  const nextBtn = $('#qNext');
  let step = 0, files = [], reference = '', lastFocus = null, requestId = '';
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
    const filesText = files.length
      ? `${files.length} (${filesFit() && endpoint ? t('prontos para envio pelo site') : t('registrados no briefing; envio por link necessário')})\n` + files.map(f => `• ${f.file.name} · ${size(f.file.size)}`).join('\n')
      : '';
    return [
      ['Evento', [
        ['Referência no site', t(reference)],
        ['Ponto de partida', t(val('ponto'))],
        ['Feira ou evento', val('evento')],
        ['Local', [val('cidade'), val('estado')].filter(Boolean).join(' · ')],
        ['Início do evento', dateText(val('dataInicio'))],
        ['Fim previsto', dateText(val('dataFim'))],
        ['Espaço reservado', t(val('reserva'))]
      ]],
      ['Espaço', [
        ['Nível de definição', t(val('definicao'))],
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
  const contactText = failed => [
    t('Olá, JM!'),
    failed ? t('Não consegui concluir o envio pelo site e preciso de ajuda com a solicitação.') : t('Acabei de registrar uma solicitação de projeto pelo site.'),
    '',
    `Protocolo: ${requestId}`,
    val('evento') ? `Evento: ${val('evento')}` : '',
    val('empresa') ? `Empresa: ${val('empresa')}` : '',
    `${t('Contato')}: ${val('nome')}`,
    '',
    failed ? t('O briefing continua preenchido no site.') : t('Podemos continuar por aqui.')
  ].filter(line => line !== '').join('\n');
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
    if (n === 2 && files.length && (!endpoint || !filesFit()) && !val('links')) {
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
    if (endpoint) {
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
      if (files.some(f => f.file.name === file.name && f.file.size === file.size)) return;
      if (files.length >= maxFiles) { skipped += 1; return; }
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      files.push({ file, kind, url: kind === 'file' ? '' : URL.createObjectURL(file) });
    });
    renderFiles();
    if (skipped) {
      hint.classList.add('warn');
      hint.textContent += ` · ${skipped} ${t('arquivo(s) não adicionado(s): limite de 6.')}`;
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

  const submissionData = () => {
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
    data.append('Preferencia', channel() === 'ambos' ? 'WhatsApp e e-mail' : channel() === 'email' ? 'E-mail' : 'WhatsApp');
    data.append('Evento', val('evento'));
    data.append('Local', [val('cidade'), val('estado')].filter(Boolean).join(' · '));
    data.append('Datas', [dateText(val('dataInicio')), dateText(val('dataFim'))].filter(Boolean).join(' a '));
    data.append('Ponto_de_partida', val('ponto'));
    data.append('Nivel_de_definicao', val('definicao'));
    data.append('Metragem', metragem());
    data.append('Tipo_de_espaco', espaco());
    data.append('Itens', checked('itens').join(', '));
    data.append('Investimento', val('investimento'));
    data.append('Detalhes', val('mensagem'));
    data.append('Referencia_no_site', reference);
    data.append('Links', val('links'));
    data.append('Arquivos', files.map(item => `${item.file.name} (${size(item.file.size)})`).join('\n'));
    data.append('Origem', source);
    data.append('body', asText());
    if (filesFit()) files.forEach((item, index) => data.append(`arquivo_${String(index + 1).padStart(2, '0')}`, item.file, item.file.name));
    return data;
  };

  const send = async () => {
    error.hidden = true;
    fallback.hidden = true;
    if (!validateStep(LAST)) return;
    if (!requestId) requestId = makeRequestId();
    if (!endpoint) {
      showFallback(t('O recebimento seguro ainda não está disponível. Baixe o briefing ou continue pelo WhatsApp sem perder o que preencheu.'));
      return;
    }
    if (!filesFit() && !val('links')) {
      showFallback(t('Para não perder arquivos grandes, envie-os pelo Drive ou WeTransfer e cole o link para continuar.'));
      return;
    }
    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando…';
    try {
      const res = await fetch(endpoint, { method: 'POST', body: submissionData(), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      done();
    } catch (_) {
      showFallback(t('Não foi possível registrar agora. Nada foi apagado: tente novamente ou continue pelo WhatsApp com o protocolo.'));
    } finally {
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
      : both ? t('Seu briefing foi salvo. A equipe poderá responder pelo WhatsApp ou por e-mail.')
      : t('Seu briefing foi salvo. A equipe da JM responderá pelo WhatsApp informado.');
    $('#qProtocol').textContent = requestId;
    $('#qDoneFiles').hidden = !files.length;
    if (files.length) $('#qDoneCount').innerHTML = filesFit()
      ? `${files.length} <span>arquivo(s) recebidos e vinculados a este protocolo.</span>`
      : `<span>Os arquivos grandes foram registrados pelo nome; a equipe usará o link informado no briefing.</span>`;
    const reopen = $('#qReopen');
    reopen.hidden = false;
    reopen.href = waUrl(false);

    go(DONE);
    // Conversão (só existe se o visitante aceitou os cookies — ver consent.js)
    if (window.gtag) gtag('event', 'generate_lead', { method: 'site', contact_preference: ch });
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
