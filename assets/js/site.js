/* FLYBUSINESS · логика посадочной (чистый JS, без зависимостей) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var HERO = root.getAttribute('data-hero') || 'porthole';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(offsetHours) {
    var d = new Date(Date.now() + offsetHours * 3600000);
    return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
  }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function cleanCode(v) { return String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
  function setPressed(buttons, attr, value) {
    buttons.forEach(function (b) {
      var isOn = b.getAttribute(attr) === String(value);
      b.classList.toggle('is-on', isOn);
      b.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    });
  }
  function restartAnimation(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  var CITY = {
    MOW: 'Москва', SVO: 'Москва, Шереметьево', VKO: 'Москва, Внуково', DME: 'Москва, Домодедово',
    LED: 'Санкт-Петербург', AER: 'Сочи', KZN: 'Казань', SVX: 'Екатеринбург', OVB: 'Новосибирск',
    DXB: 'Дубай', AUH: 'Абу-Даби', DOH: 'Доха', IST: 'Стамбул', MLE: 'Мале, Мальдивы',
    HKT: 'Пхукет', BKK: 'Бангкок', PEK: 'Пекин', PVG: 'Шанхай', EVN: 'Ереван', GYD: 'Баку',
    TAS: 'Ташкент', SEZ: 'Маэ, Сейшелы'
  };
  function cityOf(code) { return CITY[String(code || '').toUpperCase()] || 'Город или аэропорт'; }

  var MODES = {
    business: { code: 'J', name: 'Бизнес-класс', short: 'Бизнес' },
    first: { code: 'F', name: 'Первый класс', short: 'Первый' },
    private: { code: 'JET', name: 'Частный самолёт', short: 'Частный' }
  };
  var NOTE_FLIGHT = 'Тарифы поставщика подключаются на этапе MVP, прототип не показывает вымышленные цены.';
  var NOTE_JET = 'Заявка получит номер и статус, оператор пришлёт предложение с условиями.';

  /* ---------- shared API between sections and the active hero ---------- */
  var FB = {
    heroes: {},
    setMode: function (mode) { var h = FB.heroes[HERO]; if (h && h.setMode) h.setMode(mode); },
    setTo: function (code) { var h = FB.heroes[HERO]; if (h && h.setTo) h.setTo(code); },
    scrollToSearch: function () {
      var target = $('#hero-' + HERO + ' [data-search-anchor]') || $('#top');
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  };
  window.FB = FB;

  /* ================= HERO 1 · ИЛЛЮМИНАТОР ================= */
  function initPorthole() {
    var sec = $('#hero-porthole');
    if (!sec) return;
    var s = { mode: 'business', from: 'MOW', to: 'DXB', dateOut: '14 нояб.', dateBack: '21 нояб.', timeWin: '10:00–14:00', pax: 2, shadeUp: false, search: 'idle' };
    var SKY = { business: 'Бизнес-класс · золотой час', first: 'Первый класс · ночной рейс', private: 'Частный борт · рассвет' };
    var tabs = $$('.fb-tab', sec);
    var skies = $$('.ph-sky', sec);
    var el = {
      from: $('#ph-from'), to: $('#ph-to'), fromCity: $('#ph-from-city'), toCity: $('#ph-to-city'),
      f3: $('#ph-f3'), f3Label: $('#ph-f3-label'), f4: $('#ph-f4'), f4Label: $('#ph-f4-label'), f4Sub: $('#ph-f4-sub'),
      pax: $('#ph-pax'), paxWord: $('#ph-pax-word'), code: $('#ph-class-code'), route: $('#ph-route'), className: $('#ph-class-name'),
      ctaLabel: $('#ph-cta-label'), ctaNote: $('#ph-cta-note'), loading: $('#ph-loading'), done: $('#ph-done'), priv: $('#ph-private'),
      skyLabel: $('#ph-sky-label'), shade: $('#ph-shade'), shadeBtn: $('#ph-shade-btn')
    };
    var timer = null;

    function summary() {
      var priv = s.mode === 'private';
      var parts = [(s.from || '—') + ' → ' + (s.to || '—'), s.dateOut];
      if (!priv && s.dateBack) parts.push(s.dateBack);
      parts.push(s.pax + ' ' + paxWord(), MODES[s.mode].name);
      return parts.join(' · ');
    }
    function paxWord() {
      return s.mode === 'private' ? plural(s.pax, 'пассажир', 'пассажира', 'пассажиров') : plural(s.pax, 'взрослый', 'взрослых', 'взрослых');
    }
    function render(modeChanged) {
      var priv = s.mode === 'private';
      setPressed(tabs, 'data-mode', s.mode);
      skies.forEach(function (img) { img.classList.toggle('is-on', img.getAttribute('data-sky') === s.mode); });
      el.skyLabel.textContent = SKY[s.mode];
      el.code.textContent = MODES[s.mode].code;
      el.className.textContent = MODES[s.mode].name;
      el.route.textContent = (s.from || '—') + ' → ' + (s.to || '—');
      el.fromCity.textContent = cityOf(s.from);
      el.toCity.textContent = cityOf(s.to);
      el.f3Label.textContent = priv ? 'Дата' : 'Туда';
      el.f4Label.textContent = priv ? 'Окно вылета' : 'Обратно';
      el.f4Sub.textContent = priv ? 'удобное время' : 'возвращение';
      if (modeChanged) el.f4.value = priv ? s.timeWin : s.dateBack;
      el.pax.textContent = s.pax;
      el.paxWord.textContent = paxWord();
      el.ctaLabel.textContent = priv ? 'Отправить запрос' : 'Найти предложения';
      el.ctaNote.textContent = priv ? 'Заявка получит номер и статус' : 'Цены от подключённых поставщиков';
      el.loading.hidden = s.search !== 'loading';
      el.done.hidden = s.search !== 'done';
      el.priv.hidden = s.search !== 'private';
      $$('.ph-summary', sec).forEach(function (x) { x.textContent = summary(); });
      el.shade.classList.toggle('is-up', s.shadeUp);
      el.shadeBtn.textContent = s.shadeUp ? 'Опустить шторку' : 'Поднять шторку';
    }
    function setMode(mode) {
      if (!MODES[mode]) return;
      s.mode = mode;
      s.pax = Math.min(s.pax, mode === 'private' ? 19 : 9);
      s.search = 'idle';
      render(true);
    }

    tabs.forEach(function (b) { on(b, 'click', function () { setMode(b.getAttribute('data-mode')); }); });
    on(el.from, 'input', function () { s.from = cleanCode(el.from.value); el.from.value = s.from; s.search = 'idle'; render(); });
    on(el.to, 'input', function () { s.to = cleanCode(el.to.value); el.to.value = s.to; s.search = 'idle'; render(); });
    on(el.f3, 'input', function () { s.dateOut = el.f3.value; render(); });
    on(el.f4, 'input', function () { if (s.mode === 'private') s.timeWin = el.f4.value; else s.dateBack = el.f4.value; render(); });
    on($('#ph-swap'), 'click', function () {
      var t = s.from; s.from = s.to; s.to = t;
      el.from.value = s.from; el.to.value = s.to; s.search = 'idle'; render();
    });
    $$('[data-ph-pax]', sec).forEach(function (b) {
      on(b, 'click', function () {
        var max = s.mode === 'private' ? 19 : 9;
        s.pax = Math.max(1, Math.min(max, s.pax + Number(b.getAttribute('data-ph-pax'))));
        render();
      });
    });
    on($('#ph-cta'), 'click', function () {
      clearTimeout(timer);
      if (s.mode === 'private') { s.search = 'private'; render(); return; }
      s.search = 'loading'; render();
      timer = setTimeout(function () { s.search = 'done'; render(); }, 1700);
    });
    $$('[data-ph-close]', sec).forEach(function (b) { on(b, 'click', function () { s.search = 'idle'; render(); }); });
    on(el.shadeBtn, 'click', function () { s.shadeUp = !s.shadeUp; render(); });

    render(true);
    setTimeout(function () { s.shadeUp = true; render(); }, reduceMotion ? 0 : 1100);

    FB.heroes.porthole = {
      setMode: setMode,
      setTo: function (code) { s.to = code; el.to.value = code; s.search = 'idle'; render(); }
    };
  }

  /* ================= HERO 2 · ТАБЛО ================= */
  function initBoard() {
    var sec = $('#hero-board');
    var rowsEl = $('#hb-rows');
    if (!sec || !rowsEl) return;
    var s = { phase: 0, tick: 99, from: 'MOW', to: 'DXB', date: '14.11', mode: 'business', pax: 2 };
    var NAME = {
      MOW: 'МОСКВА', SVO: 'ШЕРЕМЕТЬЕВО', VKO: 'ВНУКОВО', DME: 'ДОМОДЕДОВО', LED: 'ПЕТЕРБУРГ', AER: 'СОЧИ',
      KZN: 'КАЗАНЬ', DXB: 'ДУБАЙ', AUH: 'АБУ-ДАБИ', DOH: 'ДОХА', IST: 'СТАМБУЛ', MLE: 'МАЛЕ',
      HKT: 'ПХУКЕТ', BKK: 'БАНГКОК', PEK: 'ПЕКИН', PVG: 'ШАНХАЙ', EVN: 'ЕРЕВАН', GYD: 'БАКУ', TAS: 'ТАШКЕНТ'
    };
    var MON = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    var WORD = { business: 'БИЗНЕС', first: 'ПЕРВЫЙ', private: 'ЧАСТНЫЙ' };
    var AL = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789';
    var cols = 19, rowsCount = 2, tiles = [], flipT = null, cycleT = null, lastPhase = -1;
    var status = $('#hb-status'), boardText = $('#hb-board-text');

    function messages() {
      var m = /^(\d{1,2})\.(\d{1,2})$/.exec(s.date || '');
      var dateWord = m && +m[2] >= 1 && +m[2] <= 12 ? (+m[1]) + ' ' + MON[+m[2] - 1] : (s.date || '');
      var route = (NAME[s.from] || s.from || '—') + ' → ' + (NAME[s.to] || s.to || '—');
      if (route.length > cols * 2 - 2 || (cols >= 19 && route.length > 19)) route = (s.from || '—') + ' → ' + (s.to || '—');
      return [
        ['ПОЛЁТ НАЧИНАЕТСЯ', 'У ВАШЕЙ ДВЕРИ'],
        ['БИЗНЕС · ПЕРВЫЙ', 'ЧАСТНЫЙ БОРТ'],
        [route, WORD[s.mode] + ' · ' + dateWord],
        s.mode === 'private' ? ['ЗАЯВКА ПРИНЯТА', 'FB-J-2814'] : ['ИЩЕМ ПРЕДЛОЖЕНИЯ', (s.from || '—') + ' → ' + (s.to || '—') + ' · ' + MODES[s.mode].code]
      ];
    }
    function wrap(text) {
      if (text.length <= cols) return [text];
      var words = text.split(' '), out = [], cur = '';
      words.forEach(function (w) {
        while (w.length > cols) { if (cur) { out.push(cur); cur = ''; } out.push(w.slice(0, cols)); w = w.slice(cols); }
        if (!cur) cur = w;
        else if ((cur + ' ' + w).length <= cols) cur += ' ' + w;
        else { out.push(cur); cur = w; }
      });
      if (cur) out.push(cur);
      return out;
    }
    function lines(msg) {
      var out = [];
      msg.forEach(function (t) { out = out.concat(cols >= 19 ? [t.slice(0, cols)] : wrap(t)); });
      while (out.length < rowsCount) out.push('');
      return out.slice(0, rowsCount);
    }
    function center(t) {
      var p = Math.floor((cols - t.length) / 2);
      var str = new Array(p + 1).join(' ') + t;
      while (str.length < cols) str += ' ';
      return str;
    }
    function build() {
      var w = rowsEl.clientWidth || sec.clientWidth;
      var nextCols = w >= 1100 ? 19 : (w >= 700 ? 14 : 11);
      var gap = w >= 700 ? 6 : 4;
      var tile = Math.max(14, Math.min(58, Math.floor((w - (nextCols - 1) * gap) / nextCols)));
      cols = nextCols;
      rowsCount = cols >= 19 ? 2 : 4;
      rowsEl.style.setProperty('--cols', cols);
      rowsEl.style.setProperty('--tile', tile + 'px');
      rowsEl.style.setProperty('--tileh', Math.round(tile * 1.48) + 'px');
      rowsEl.style.setProperty('--gap', gap + 'px');
      rowsEl.style.setProperty('--fs', Math.round(tile * 0.86) + 'px');
      rowsEl.innerHTML = '';
      tiles = [];
      for (var r = 0; r < rowsCount; r++) {
        var row = doc.createElement('div');
        row.className = 'hb-row';
        var arr = [];
        for (var c = 0; c < cols; c++) {
          var t = doc.createElement('span');
          t.className = 'hb-tile';
          t.textContent = ' ';
          row.appendChild(t);
          arr.push(t);
        }
        rowsEl.appendChild(row);
        tiles.push(arr);
      }
      paint();
    }
    function paint() {
      var msg = messages()[s.phase];
      var ls = lines(msg);
      for (var r = 0; r < tiles.length; r++) {
        var line = center(ls[r] || '');
        for (var c = 0; c < cols; c++) {
          var ch = line.charAt(c) || ' ';
          var moving = s.tick < 2 + c + r * 3;
          var shown = moving ? AL.charAt((s.tick * 7 + c * 13 + r * 29) % AL.length) : ch;
          var t = tiles[r][c];
          var txt = shown === ' ' ? ' ' : shown;
          if (t.textContent !== txt) t.textContent = txt;
          t.classList.toggle('is-moving', moving);
          t.classList.toggle('is-accent', !moving && (ch === '→' || ch === '·'));
        }
      }
      if (lastPhase !== s.phase) { boardText.textContent = msg.join('. '); lastPhase = s.phase; }
    }
    function flipTo(p) {
      s.phase = p;
      clearInterval(flipT);
      if (reduceMotion) { s.tick = 99; paint(); return; }
      s.tick = 0;
      paint();
      flipT = setInterval(function () {
        s.tick += 1;
        if (s.tick > 44) { clearInterval(flipT); s.tick = 99; }
        paint();
      }, 50);
    }
    function startCycle() {
      clearInterval(cycleT);
      cycleT = setInterval(function () { flipTo(s.phase >= 2 ? 0 : s.phase + 1); }, 6500);
    }
    function syncControls() {
      setPressed($$('.hb-cls', sec), 'data-mode', s.mode);
      $('#hb-pax').textContent = pad2(s.pax);
      $('#hb-go-label').textContent = s.mode === 'private' ? 'Запросить борт' : 'Найти рейсы';
    }
    function touch(patch) {
      for (var k in patch) s[k] = patch[k];
      status.textContent = '';
      syncControls();
      flipTo(2);
      startCycle();
    }

    on($('#hb-from'), 'input', function (e) { var v = cleanCode(e.target.value); e.target.value = v; touch({ from: v }); });
    on($('#hb-to'), 'input', function (e) { var v = cleanCode(e.target.value); e.target.value = v; touch({ to: v }); });
    on($('#hb-date'), 'input', function (e) { var v = String(e.target.value || '').replace(/[^0-9.]/g, '').slice(0, 5); e.target.value = v; touch({ date: v }); });
    $$('.hb-cls', sec).forEach(function (b) {
      on(b, 'click', function () {
        var m = b.getAttribute('data-mode');
        touch({ mode: m, pax: Math.min(s.pax, m === 'private' ? 19 : 9) });
      });
    });
    $$('[data-hb-pax]', sec).forEach(function (b) {
      on(b, 'click', function () {
        var max = s.mode === 'private' ? 19 : 9;
        touch({ pax: Math.max(1, Math.min(max, s.pax + Number(b.getAttribute('data-hb-pax')))) });
      });
    });
    on($('#hb-go'), 'click', function () {
      flipTo(3);
      startCycle();
      status.innerHTML = '<span class="fb-mono" style="color:#CFB07A">' + (s.from || '—') + ' → ' + (s.to || '—') + ' · ' + MODES[s.mode].code + ' · ' + s.date + ' · ' + s.pax + ' пасс.</span> · ' + (s.mode === 'private' ? NOTE_JET : NOTE_FLIGHT);
    });

    function clock() { $('#hb-msk').textContent = hhmm(3); }
    clock();
    setInterval(clock, 15000);

    var resizeT = null, lastW = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        var w = rowsEl.clientWidth;
        if (Math.abs(w - lastW) > 4) { lastW = w; build(); }
      }, 150);
    });
    lastW = rowsEl.clientWidth;
    build();
    syncControls();
    flipTo(0);
    startCycle();

    FB.heroes.board = {
      setMode: function (m) { if (MODES[m]) touch({ mode: m }); },
      setTo: function (code) { $('#hb-to').value = code; touch({ to: code }); }
    };
  }

  /* ================= HERO 3 · НАВИГАЦИОННАЯ СФЕРА ================= */
  function initSphere() {
    var sec = $('#hero-sphere');
    var svg = $('#hs-svg');
    if (!sec || !svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var C = [
      ['DXB', 'Дубай', 440.9, 533.7, '≈ 5 ч', 4, 'start', [11, 56], 'M392 301 L392 303 L392 306 L391 309 L391 312 L391 315 L390 318 L390 322 L390 326 L390 330 L390 334 L391 338 L391 343 L391 347 L392 352 L392 357 L393 362 L394 368 L394 373 L395 379 L396 385 L397 391 L399 397 L400 403 L401 409 L403 415 L404 421 L406 428 L407 434 L409 440 L411 447 L413 453 L415 459 L416 466 L418 472 L420 478 L422 484 L424 490 L427 496 L429 502 L431 507 L433 513 L435 518 L437 524 L439 529 L441 534'],
      ['MLE', 'Мале', 570.9, 684.3, '≈ 9 ч', 5, 'start', [60.2, 64.8], 'M392 301 L395 306 L397 312 L400 318 L402 325 L405 331 L408 338 L411 346 L414 353 L418 361 L421 370 L425 378 L429 387 L433 396 L437 405 L441 415 L445 424 L450 434 L454 444 L459 454 L464 464 L468 474 L473 485 L478 495 L483 505 L488 516 L492 526 L497 536 L502 546 L507 556 L512 566 L516 576 L521 585 L525 594 L530 603 L534 612 L538 621 L542 629 L546 637 L550 644 L554 652 L558 659 L561 666 L564 672 L568 678 L571 684'],
      ['HKT', 'Пхукет', 740.0, 624.9, '≈ 9,5 ч', 7, 'start', [56.6, 44.6], 'M392 301 L399 304 L407 308 L414 312 L422 317 L429 322 L438 327 L446 332 L455 338 L463 344 L472 350 L481 356 L491 363 L500 370 L510 378 L519 385 L529 393 L539 401 L549 409 L558 418 L568 426 L578 435 L588 444 L597 453 L606 461 L616 470 L625 479 L633 488 L642 497 L650 506 L658 515 L666 523 L674 532 L681 540 L688 549 L694 557 L700 565 L706 572 L711 580 L716 587 L721 594 L726 600 L730 607 L733 613 L737 619 L740 625'],
      ['PEK', 'Пекин', 761.4, 361.7, '≈ 7,5 ч', 8, 'start', [60.2, 40.5], 'M392 301 L400 298 L407 295 L415 293 L423 291 L431 289 L440 287 L448 285 L457 283 L466 281 L476 280 L485 279 L495 278 L504 277 L514 277 L524 277 L534 276 L544 277 L554 277 L564 278 L574 279 L584 280 L594 281 L604 283 L614 285 L624 287 L633 289 L642 292 L651 294 L660 297 L669 300 L677 304 L685 307 L693 311 L700 315 L707 319 L714 323 L721 327 L727 331 L733 335 L738 339 L743 344 L748 348 L753 353 L757 357 L761 362'],
      ['IST', 'Стамбул', 313.8, 388.5, '≈ 3,5 ч', 3, 'end', [4.8, 21.2], 'M392 301 L390 301 L387 302 L385 303 L382 304 L380 304 L377 305 L375 306 L372 307 L370 308 L367 309 L365 311 L362 312 L360 313 L358 315 L355 316 L353 318 L351 320 L349 321 L347 323 L344 325 L342 327 L340 329 L339 331 L337 333 L335 336 L333 338 L332 340 L330 343 L329 345 L327 348 L326 350 L325 353 L323 356 L322 358 L321 361 L320 364 L319 366 L318 369 L318 372 L317 375 L316 378 L316 380 L315 383 L314 386 L314 389'],
      ['AER', 'Сочи', 372.0, 385.1, '≈ 2,5 ч', 3, 'start', [40.4, 36.1], 'M392 301 L391 301 L390 302 L389 303 L389 304 L388 305 L387 307 L386 308 L385 309 L384 310 L383 311 L382 313 L381 314 L380 315 L379 317 L379 318 L378 320 L377 322 L377 323 L376 325 L375 327 L375 329 L374 331 L374 333 L373 335 L373 337 L373 339 L372 341 L372 344 L372 346 L371 348 L371 351 L371 353 L371 355 L371 358 L371 360 L371 363 L371 365 L371 368 L371 370 L371 373 L371 375 L371 378 L372 380 L372 383 L372 385']
    ];
    var s = { sel: 0, auto: true, mode: 'business' };
    function mk(tag, attrs) {
      var e = doc.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    var arcs = [], dots = [], labels = [];
    C.forEach(function (c) {
      var p = mk('path', { d: c[8], pathLength: '1', 'class': 'hs-arc' });
      svg.appendChild(p);
      arcs.push(p);
    });
    var comet = mk('path', { d: C[0][8], pathLength: '1', 'class': 'hs-comet' });
    svg.appendChild(comet);
    svg.appendChild(mk('circle', { cx: '392.5', cy: '300.6', r: '12', fill: 'none', stroke: '#CFB07A', 'stroke-width': '1', opacity: '0.6' }));
    svg.appendChild(mk('circle', { cx: '392.5', cy: '300.6', r: '5.5', fill: '#E4CB98' }));
    var mow = mk('text', { x: '378', y: '282', 'text-anchor': 'end', 'class': 'hs-label', fill: '#F2ECE1' });
    mow.textContent = 'Москва';
    svg.appendChild(mow);
    var pulse = mk('circle', { cx: C[0][2], cy: C[0][3], r: '7', fill: 'none', stroke: '#E4CB98', 'stroke-width': '1.4', 'class': 'hs-pulse' });
    svg.appendChild(pulse);
    C.forEach(function (c) {
      var d = mk('circle', { cx: c[2], cy: c[3], r: '4', fill: '#CFB07A' });
      svg.appendChild(d);
      dots.push(d);
      var right = c[6] === 'start';
      var t = mk('text', { x: right ? c[2] + 15 : c[2] - 15, y: c[3] + 6, 'text-anchor': c[6], 'class': 'hs-label' });
      t.textContent = c[1];
      svg.appendChild(t);
      labels.push(t);
    });

    var chips = $$('.hs-chip', sec);
    var card = $('#hs-card');
    function select(i, byUser) {
      if (byUser) s.auto = false;
      s.sel = i;
      var c = C[i];
      arcs.forEach(function (a, j) { a.classList.toggle('is-on', j === i); });
      dots.forEach(function (d, j) { d.setAttribute('r', j === i ? '6.5' : '4'); d.setAttribute('fill', j === i ? '#FFF3D6' : '#CFB07A'); });
      labels.forEach(function (l, j) { l.classList.toggle('is-on', j === i); });
      comet.setAttribute('d', c[8]);
      restartAnimation(comet, 'hs-comet');
      pulse.setAttribute('cx', c[2]);
      pulse.setAttribute('cy', c[3]);
      restartAnimation(pulse, 'hs-pulse');
      setPressed(chips, 'data-i', i);
      $('#hs-card-name').textContent = c[1];
      $('#hs-card-code').textContent = c[0];
      $('#hs-card-dur').textContent = c[4];
      $('#hs-card-time').textContent = hhmm(c[5]);
      card.style.left = c[7][0] + '%';
      card.style.top = c[7][1] + '%';
      restartAnimation(card, 'hs-card');
      $('#hs-to-code').textContent = c[0];
      $('#hs-to-name').textContent = c[1];
      $('#hs-status').textContent = '';
    }
    chips.forEach(function (b) { on(b, 'click', function () { select(Number(b.getAttribute('data-i')), true); }); });
    var segs = $$('.hs-seg', sec);
    function setMode(m) {
      if (!MODES[m]) return;
      s.mode = m;
      setPressed(segs, 'data-mode', m);
      $('#hs-go-label').textContent = m === 'private' ? 'Запросить борт' : 'Найти рейсы';
      $('#hs-status').textContent = '';
    }
    segs.forEach(function (b) { on(b, 'click', function () { setMode(b.getAttribute('data-mode')); }); });
    on($('#hs-go'), 'click', function () {
      s.auto = false;
      var c = C[s.sel];
      $('#hs-status').innerHTML = '<span class="fb-mono" style="color:#CFB07A">MOW → ' + c[0] + ' · ' + $('#hs-date').value + ' · ' + MODES[s.mode].short + '</span> · ' + (s.mode === 'private' ? NOTE_JET : NOTE_FLIGHT);
    });
    select(0);
    setInterval(function () { if (s.auto) select((s.sel + 1) % C.length); }, 4800);
    setInterval(function () { $('#hs-card-time').textContent = hhmm(C[s.sel][5]); }, 15000);

    FB.heroes.sphere = {
      setMode: setMode,
      setTo: function (code) {
        for (var i = 0; i < C.length; i++) if (C[i][0] === code) { select(i, true); return; }
      }
    };
  }

  /* ================= HERO 4 · ОБЛОЖКА ================= */
  function initCover() {
    var sec = $('#hero-cover');
    if (!sec) return;
    var s = { mode: 'business', pax: 2 };
    var tabs = $$('.hc-tab', sec);
    var status = $('#hc-status');
    function render() {
      setPressed(tabs, 'data-mode', s.mode);
      $('#hc-date-l').textContent = s.mode === 'private' ? 'Дата и время' : 'Туда';
      $('#hc-go-label').textContent = s.mode === 'private' ? 'Запросить борт' : 'Найти предложения';
      $('#hc-pax').textContent = s.pax;
    }
    function setMode(m) {
      if (!MODES[m]) return;
      s.mode = m;
      s.pax = Math.min(s.pax, m === 'private' ? 19 : 9);
      status.textContent = '';
      render();
    }
    tabs.forEach(function (b) { on(b, 'click', function () { setMode(b.getAttribute('data-mode')); }); });
    ['#hc-from', '#hc-to'].forEach(function (id) {
      on($(id), 'input', function (e) { e.target.value = cleanCode(e.target.value); status.textContent = ''; });
    });
    $$('[data-hc-pax]', sec).forEach(function (b) {
      on(b, 'click', function () {
        var max = s.mode === 'private' ? 19 : 9;
        s.pax = Math.max(1, Math.min(max, s.pax + Number(b.getAttribute('data-hc-pax'))));
        status.textContent = '';
        render();
      });
    });
    on($('#hc-go'), 'click', function () {
      status.innerHTML = '<span class="fb-mono" style="color:#E4CB98">' + ($('#hc-from').value || '—') + ' → ' + ($('#hc-to').value || '—') + ' · ' + $('#hc-date').value + ' · ' + s.pax + ' пасс. · ' + MODES[s.mode].short + '</span> · ' + (s.mode === 'private' ? NOTE_JET : NOTE_FLIGHT);
    });
    render();
    FB.heroes.cover = {
      setMode: setMode,
      setTo: function (code) { $('#hc-to').value = code; status.textContent = ''; }
    };
  }

  /* ================= HERO 5 · КОНСЬЕРЖ ================= */
  function initConcierge() {
    var sec = $('#hero-concierge');
    if (!sec) return;
    var OPT = {
      cls: { title: 'Класс', items: [['бизнес-класс', 'J'], ['первый класс', 'F'], ['частный самолёт', 'JET']] },
      from: { title: 'Откуда', items: [['Москвы', 'MOW'], ['Санкт-Петербурга', 'LED'], ['Казани', 'KZN'], ['Екатеринбурга', 'SVX'], ['Сочи', 'AER']] },
      to: { title: 'Куда', items: [['Дубай', 'DXB'], ['Доху', 'DOH'], ['Мале', 'MLE'], ['Пхукет', 'HKT'], ['Стамбул', 'IST'], ['Пекин', 'PEK'], ['Сочи', 'AER']] },
      date: { title: 'Когда', items: [['14 ноября', '14.11'], ['15 ноября', '15.11'], ['21 ноября', '21.11'], ['28 ноября', '28.11'], ['5 декабря', '05.12'], ['ближайшие выходные', 'ВЫХОДНЫЕ']] },
      pax: { title: 'Сколько вас', items: [['лечу один', 1], ['летим вдвоём', 2], ['летим втроём', 3], ['летим вчетвером', 4], ['летим впятером', 5], ['летим вшестером', 6]] }
    };
    var EXT = [['t', 'трансфером', 'трансфер'], ['l', 'VIP-залом', 'VIP-зал'], ['h', 'отелем', 'отель']];
    var ARIA = { cls: 'Класс', from: 'Откуда', to: 'Куда', date: 'Дата', pax: 'Пассажиры', ext: 'Дополнительные услуги' };
    var s = { cls: 0, from: 0, to: 0, date: 0, pax: 1, ext: { t: true, l: true, h: false }, open: null };
    var panel = $('#hq-panel'), opts = $('#hq-opts'), hint = $('#hq-hint');
    var slots = $$('.hq-slot', sec);

    function val(key) { return OPT[key].items[s[key]]; }
    function extText() {
      var ch = EXT.filter(function (e) { return s.ext[e[0]]; });
      if (!ch.length) return 'без лишних услуг';
      // неразрывный пробел после «с» и «и», чтобы предлоги не висели в конце строки
      if (ch.length === 1) return 'с\u00a0' + ch[0][1];
      if (ch.length === 2) return 'с\u00a0' + ch[0][1] + ' и\u00a0' + ch[1][1];
      return 'с\u00a0' + ch[0][1] + ', ' + ch[1][1] + ' и\u00a0' + ch[2][1];
    }
    function render() {
      slots.forEach(function (b) {
        var key = b.getAttribute('data-slot');
        var text = key === 'ext' ? extText() : val(key)[0];
        b.textContent = text;
        b.setAttribute('aria-expanded', s.open === key ? 'true' : 'false');
        b.setAttribute('aria-label', ARIA[key] + ': ' + text + '. Изменить');
      });
      panel.hidden = !s.open;
      hint.hidden = !!s.open;
      if (s.open) {
        $('#hq-panel-title').textContent = s.open === 'ext' ? 'Добавить к поездке' : OPT[s.open].title;
        opts.innerHTML = '';
        var list = s.open === 'ext'
          ? EXT.map(function (e) { return { label: e[2], on: !!s.ext[e[0]], pick: function () { s.ext[e[0]] = !s.ext[e[0]]; render(); } }; })
          : OPT[s.open].items.map(function (it, i) {
            var key = s.open;
            return { label: it[0], on: s[key] === i, pick: function () {
              if (key === 'to' && it[1] === val('from')[1]) return;
              if (key === 'from' && it[1] === val('to')[1]) return;
              s[key] = i; s.open = null; render();
            } };
          });
        list.forEach(function (o) {
          var b = doc.createElement('button');
          b.type = 'button';
          b.className = 'hq-opt' + (o.on ? ' is-on' : '');
          b.setAttribute('aria-pressed', o.on ? 'true' : 'false');
          b.textContent = o.label;
          b.addEventListener('click', o.pick);
          opts.appendChild(b);
        });
      }
      var chosen = EXT.filter(function (e) { return s.ext[e[0]]; }).map(function (e) { return e[2]; });
      $('#hq-summary').textContent = val('from')[1] + ' → ' + val('to')[1] + ' · ' + val('date')[1] + ' · ' + val('pax')[1] + ' пасс. · ' + val('cls')[1] + (chosen.length ? ' · ' + chosen.join(', ') : '');
    }
    slots.forEach(function (b) {
      on(b, 'click', function () {
        var key = b.getAttribute('data-slot');
        s.open = s.open === key ? null : key;
        $('#hq-sent').hidden = true;
        $('#hq-actions').hidden = false;
        render();
      });
      on(b, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
      });
    });
    on($('#hq-done'), 'click', function () { s.open = null; render(); });
    on($('#hq-send'), 'click', function () { s.open = null; render(); $('#hq-actions').hidden = true; $('#hq-sent').hidden = false; });
    on($('#hq-reset'), 'click', function () { $('#hq-sent').hidden = true; $('#hq-actions').hidden = false; });
    render();

    FB.heroes.concierge = {
      setMode: function (m) { s.cls = m === 'first' ? 1 : (m === 'private' ? 2 : 0); render(); },
      setTo: function (code) {
        OPT.to.items.forEach(function (it, i) { if (it[1] === code && code !== val('from')[1]) s.to = i; });
        render();
      }
    };
  }

  /* ================= ТАБЛО НАПРАВЛЕНИЙ ================= */
  function initRoutes() {
    var box = $('#routes-rows');
    if (!box) return;
    var PAGES = [
      [['ДУБАЙ', 'DXB', '≈ 5 ч', 4], ['ДОХА', 'DOH', '≈ 5,5 ч', 3], ['АБУ-ДАБИ', 'AUH', '≈ 5 ч', 4],
       ['СТАМБУЛ', 'IST', '≈ 3,5 ч', 3], ['МАЛЕ', 'MLE', '≈ 9 ч', 5], ['ПХУКЕТ', 'HKT', '≈ 9,5 ч', 7]],
      [['ПЕКИН', 'PEK', '≈ 7,5 ч', 8], ['ШАНХАЙ', 'PVG', '≈ 9 ч', 8], ['СОЧИ', 'AER', '≈ 2,5 ч', 3],
       ['ЕРЕВАН', 'EVN', '≈ 3 ч', 4], ['БАКУ', 'GYD', '≈ 3 ч', 4], ['ТАШКЕНТ', 'TAS', '≈ 4 ч', 5]]
    ];
    var RU = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ', EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var page = 0, tick = 99, flipT = null, rows = [];
    for (var i = 0; i < 6; i++) {
      var row = doc.createElement('div');
      row.className = 'fb-row';
      var cityBox = doc.createElement('div');
      cityBox.className = 'fb-row-city';
      var sr = doc.createElement('span');
      sr.className = 'fb-sr';
      cityBox.appendChild(sr);
      var cityCells = [];
      for (var c = 0; c < 8; c++) {
        var f = doc.createElement('span');
        f.className = 'fb-flap';
        f.setAttribute('aria-hidden', 'true');
        cityBox.appendChild(f);
        cityCells.push(f);
      }
      var codeBox = doc.createElement('div');
      codeBox.className = 'fb-row-code';
      codeBox.setAttribute('aria-hidden', 'true');
      var codeCells = [];
      for (var k = 0; k < 3; k++) {
        var g = doc.createElement('span');
        g.className = 'fb-flap is-code';
        codeBox.appendChild(g);
        codeCells.push(g);
      }
      var dur = doc.createElement('div');
      dur.className = 'fb-mono fb-row-dur';
      var time = doc.createElement('div');
      time.className = 'fb-mono fb-row-time';
      var act = doc.createElement('div');
      act.className = 'fb-row-act';
      var a = doc.createElement('a');
      a.href = '#top';
      a.className = 'fb-btn-line fb-row-btn';
      a.innerHTML = '<span class="fb-row-btn-label">Подобрать</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/></svg>';
      act.appendChild(a);
      row.appendChild(cityBox); row.appendChild(codeBox); row.appendChild(dur); row.appendChild(time); row.appendChild(act);
      box.appendChild(row);
      rows.push({ sr: sr, cityCells: cityCells, codeCells: codeCells, dur: dur, time: time, link: a });
    }
    rows.forEach(function (r, ri) {
      on(r.link, 'click', function (e) {
        e.preventDefault();
        var code = PAGES[page][ri][1];
        FB.setTo(code);
        FB.scrollToSearch();
      });
    });
    function paint() {
      PAGES[page].forEach(function (d, ri) {
        var r = rows[ri];
        var city = d[0];
        while (city.length < 8) city += ' ';
        for (var ci = 0; ci < 8; ci++) {
          var ch = city.charAt(ci);
          var blank = ch === ' ';
          var moving = !blank && tick < 3 + ri * 2 + ci;
          var txt = blank ? ' ' : (moving ? RU.charAt((tick * 7 + ri * 31 + ci * 13) % RU.length) : ch);
          if (r.cityCells[ci].textContent !== txt) r.cityCells[ci].textContent = txt;
          r.cityCells[ci].classList.toggle('is-moving', moving);
        }
        for (var k = 0; k < 3; k++) {
          var mv = tick < 12 + ri * 2 + k;
          var t2 = mv ? EN.charAt((tick * 5 + ri * 17 + k * 11) % EN.length) : d[1].charAt(k);
          if (r.codeCells[k].textContent !== t2) r.codeCells[k].textContent = t2;
        }
        r.sr.textContent = d[0].charAt(0) + d[0].slice(1).toLowerCase() + ', ' + d[1];
        r.dur.textContent = d[2];
        r.time.textContent = hhmm(d[3]);
        r.link.setAttribute('aria-label', 'Подобрать перелёт: ' + d[0].charAt(0) + d[0].slice(1).toLowerCase());
      });
      $('#routes-msk').textContent = hhmm(3);
      $('#routes-page').textContent = (page + 1) + ' / 2';
    }
    function flip() {
      clearInterval(flipT);
      if (reduceMotion) { tick = 99; paint(); return; }
      tick = 0;
      paint();
      flipT = setInterval(function () {
        tick += 1;
        if (tick > 32) { clearInterval(flipT); tick = 99; }
        paint();
      }, 55);
    }
    // перелистываем табло, только когда оно на экране
    var visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var was = visible;
          visible = e.isIntersecting;
          if (visible && !was) flip();
        });
      }, { threshold: 0.2 }).observe(box);
    } else {
      visible = true;
    }
    tick = 99;
    paint();
    setInterval(function () { if (visible) { page = page ? 0 : 1; flip(); } }, 9000);
    setInterval(function () { if (tick === 99) paint(); }, 15000);
  }

  /* ================= прочие секции ================= */
  function initSections() {
    $$('[data-set-mode]').forEach(function (a) {
      on(a, 'click', function (e) {
        e.preventDefault();
        FB.setMode(a.getAttribute('data-set-mode'));
        FB.scrollToSearch();
      });
    });
    var faqButtons = $$('[data-faq]');
    faqButtons.forEach(function (b) {
      on(b, 'click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        faqButtons.forEach(function (o) {
          var isThis = o === b;
          o.setAttribute('aria-expanded', isThis && open ? 'true' : 'false');
          var ans = doc.getElementById(o.getAttribute('aria-controls'));
          if (ans) ans.hidden = !(isThis && open);
        });
      });
    });
    on($('#req-send'), 'click', function () {
      $('#req-form').hidden = true;
      $('#req-sent').hidden = false;
    });
    var header = $('.site-header');
    function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (!/[?&]switcher=0/.test(location.search)) {
      var sw = $('#fb-switcher');
      if (sw) {
        sw.hidden = false;
        $$('[data-switch]', sw).forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('data-switch') === HERO); });
      }
    }
  }

  function start() {
    var inits = { porthole: initPorthole, board: initBoard, sphere: initSphere, cover: initCover, concierge: initConcierge };
    try { (inits[HERO] || initPorthole)(); } catch (err) { if (window.console) console.error(err); }
    try { initRoutes(); } catch (err2) { if (window.console) console.error(err2); }
    try { initSections(); } catch (err3) { if (window.console) console.error(err3); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})();
