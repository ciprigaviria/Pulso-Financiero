/* Flujo de la prueba personal: intro → 16 preguntas → resultado. */
(function () {
  'use strict';
  var S = window.PulsoScoring, UI = window.PulsoUI, cfg = window.PULSO_CONFIG || {};
  var app = document.getElementById('app');
  var STORE_KEY = 'pulso_personal_v1';

  var AREA_NAME = {};
  S.AREAS.forEach(function (a) { AREA_NAME[a.id] = a.name; });

  // Lista plana de pasos: 4 de perfil + 12 que suman puntos.
  var steps = S.PROFILE.map(function (p) { return { kind: 'profile', label: 'Tu perfil', text: p.text, options: p.options }; })
    .concat(S.QUESTIONS.map(function (q) { return { kind: 'q', label: AREA_NAME[q.area], text: q.text, options: q.options }; }));

  var state = { step: -1, answers: new Array(steps.length) };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function save(obj) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* sin almacenamiento */ } }
  function load() { try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }

  function renderIntro() {
    app.innerHTML =
      '<div class="q-card">' +
      '<div class="eyebrow"><span class="dot"></span>Test de salud financiera personal</div>' +
      '<h1 style="font-size:clamp(2rem,4.5vw,2.8rem)">Mide el pulso de tus finanzas</h1>' +
      '<p class="lead" style="font-size:1.1rem">16 preguntas rápidas: 4 sobre tu perfil y 12 sobre cómo gastas, ahorras, te endeudas, te proteges y planeas.</p>' +
      '<div class="card" style="margin:24px 0">' +
      '<p style="margin:0"><strong>Tu privacidad primero.</strong> No pedimos nombre, documento ni montos de dinero. El puntaje se calcula aquí, en tu navegador.</p>' +
      '</div>' +
      '<button class="btn btn-primary" id="start">Empezar →</button>' +
      '<p class="note" style="margin-top:14px">Consejo: puedes responder con las teclas 1 a 5.</p>' +
      '</div>';
    document.getElementById('start').addEventListener('click', function () { go(0); });
  }

  function renderStep() {
    var s = steps[state.step], n = state.step + 1, total = steps.length;
    var pct = Math.round((state.step / total) * 100);
    var html =
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + state.step + '"><div style="width:' + pct + '%"></div></div>' +
      '<div class="progress-meta"><span>Pregunta ' + n + ' de ' + total + '</span><span>' + pct + '%</span></div>' +
      '<div class="q-card">' +
      '<div class="q-area">' + esc(s.label) + '</div>' +
      '<h1 class="q-text">' + esc(s.text) + '</h1>' +
      '<div class="options" role="radiogroup">' +
      s.options.map(function (o, i) {
        var sel = state.answers[state.step] === i;
        return '<button class="option' + (sel ? ' selected' : '') + '" role="radio" aria-checked="' + sel + '" data-i="' + i + '">' +
          '<span class="key">' + (i + 1) + '</span><span>' + esc(o) + '</span></button>';
      }).join('') +
      '</div>' +
      '<div class="q-nav">' +
      '<button class="link-btn" id="back">← Atrás</button>' +
      (state.answers[state.step] != null ? '<button class="link-btn" id="next">Siguiente →</button>' : '<span></span>') +
      '</div></div>';
    app.innerHTML = html;
    app.querySelectorAll('.option').forEach(function (b) {
      b.addEventListener('click', function () { choose(Number(b.dataset.i)); });
    });
    document.getElementById('back').addEventListener('click', function () { go(state.step - 1); });
    var next = document.getElementById('next');
    if (next) next.addEventListener('click', function () { go(state.step + 1); });
    var first = app.querySelector('.option.selected') || app.querySelector('.option');
    if (first) first.focus({ preventScroll: true });
  }

  function choose(i) {
    state.answers[state.step] = i;
    app.querySelectorAll('.option').forEach(function (b) {
      var on = Number(b.dataset.i) === i;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on);
    });
    setTimeout(function () { go(state.step + 1); }, 220);
  }

  function go(step) {
    if (step < 0) { state.step = -1; renderIntro(); return; }
    if (step >= steps.length) { finish(); return; }
    state.step = step;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('keydown', function (e) {
    if (state.step < 0 || state.step >= steps.length) return;
    var k = Number(e.key);
    if (k >= 1 && k <= steps[state.step].options.length) choose(k - 1);
    if (e.key === 'Backspace' && document.activeElement.tagName !== 'INPUT') go(state.step - 1);
  });

  function finish() {
    var answers = { profile: state.answers.slice(0, 4), q: state.answers.slice(4) };
    var code = S.encode(answers);
    save({ code: code });
    renderResult(code);
  }

  function checkoutUrl(code, email) {
    if (!cfg.checkoutPersonal) return '';
    var url = cfg.checkoutPersonal + (cfg.checkoutPersonal.indexOf('?') > -1 ? '&' : '?') +
      encodeURIComponent('checkout[custom][r]') + '=' + code;
    if (email) url += '&' + encodeURIComponent('checkout[email]') + '=' + encodeURIComponent(email);
    return url;
  }

  function renderResult(code) {
    var res = S.score(S.decode(code));
    state.step = steps.length;
    var flag = res.flags[0];
    var more = res.flags.length - 1;
    var buy = checkoutUrl(code);

    app.innerHTML =
      '<div class="q-card">' +
      '<div class="result-head">' +
      '<div class="gauge gauge-lg" id="gauge"></div>' +
      '<div><span class="level-pill c-' + res.level.color + '">' + esc(res.level.name) + '</span>' +
      '<h1 style="font-size:clamp(1.8rem,4vw,2.4rem);margin-bottom:.3em">Tu puntaje es ' + res.total + ' de 100</h1>' +
      '<p style="margin:0">' + esc(res.level.message) + '</p></div>' +
      '</div>' +
      (flag ? '<div class="flag"><span aria-hidden="true">⚠️</span><div><strong>Alerta: ' + esc(flag.name) + '.</strong> ' +
        (more > 0 ? 'Y ' + more + (more === 1 ? ' alerta más' : ' alertas más') + '. ' : '') +
        (res.total > 59 ? 'Por eso tu nivel no pasa de "En riesgo", aunque tu puntaje sea mayor. ' : '') +
        'En el paquete completo te explicamos qué hacer.</div></div>' : '') +
      '<h2 style="font-size:1.3rem;margin-top:8px">Tu semáforo por área</h2>' +
      '<div class="area-list">' +
      res.areas.map(function (a) {
        return '<div class="area-item"><span class="name"><span class="dot c-' + a.color + '"></span>' + esc(a.name) + '</span>' +
          '<span class="score t-' + a.color + '">' + a.score + '</span>' +
          '<div class="bar-track"><div class="bar-fill c-' + a.color + '" data-w="' + a.score + '"></div></div>' +
          '<span class="msg">' + esc(a.message) + '</span></div>';
      }).join('') +
      '</div>' +

      '<div class="card offer">' +
      '<div class="eyebrow" style="margin-bottom:6px">Paquete Personal</div>' +
      '<h2 style="font-size:1.5rem">Convierte tu puntaje en un plan</h2>' +
      '<div class="price">' + esc(cfg.pricePersonal || 'USD 15') + '<small>' + (cfg.pricePersonalLocal ? esc(cfg.pricePersonalLocal) + ' · ' : '') + 'pago único</small></div>' +
      '<ul>' +
      '<li>Informe en PDF con tu resultado explicado área por área</li>' +
      '<li>Qué hacer con cada alerta, en orden de urgencia</li>' +
      '<li>Archivo de presupuesto, fondo de emergencia y plan de salida de deudas (Excel y Google Sheets)</li>' +
      '<li>Plan de acción de 30 días, semana por semana</li>' +
      '</ul>' +
      (buy ? '<a class="btn btn-primary" id="buy" href="' + buy + '">Quiero mi paquete →</a>'
           : '<button class="btn btn-primary" disabled title="Falta configurar el enlace de pago en assets/js/config.js">Pago no configurado</button>') +
      '<p class="note" style="margin-top:12px">Pago seguro con Lemon Squeezy. Llega a tu correo en pocos minutos.</p>' +
      '</div>' +

      '<div class="card" style="margin-top:20px">' +
      '<h3>¿Prefieres pensarlo? Te enviamos tu resumen gratis</h3>' +
      '<form class="email-form" id="lead" novalidate>' +
      '<label class="sr-only" for="email">Correo electrónico</label>' +
      '<input type="email" id="email" placeholder="tu@correo.com" autocomplete="email" required>' +
      '<button class="btn btn-ghost" type="submit">Enviarme el resumen</button>' +
      '</form>' +
      '<label class="consent"><input type="checkbox" id="consent"> <span>Autorizo el tratamiento de mi correo y mis respuestas según la <a href="privacidad.html" target="_blank">política de privacidad</a> para recibir mi resumen y consejos por correo. Puedo darme de baja cuando quiera.</span></label>' +
      '<div class="form-msg" id="form-msg" role="status"></div>' +
      '</div>' +

      '<p style="margin-top:28px;text-align:center"><button class="link-btn" id="restart">Volver a hacer el test</button></p>' +
      '</div>';

    UI.renderGauge(document.getElementById('gauge'), res.total, res.level.color);
    UI.animateBars(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('restart').addEventListener('click', function () {
      state.answers = new Array(steps.length); save(null); go(-1);
    });
    document.getElementById('lead').addEventListener('submit', function (e) {
      e.preventDefault(); sendLead(code);
    });
  }

  function sendLead(code) {
    var email = document.getElementById('email').value.trim();
    var consent = document.getElementById('consent').checked;
    var msg = document.getElementById('form-msg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Revisa tu correo.'; msg.className = 'form-msg t-rojo'; return; }
    if (!consent) { msg.textContent = 'Necesitamos tu autorización para enviarte el correo.'; msg.className = 'form-msg t-rojo'; return; }
    var buy = document.getElementById('buy');
    if (buy) buy.href = checkoutUrl(code, email);
    if (!cfg.appsScriptUrl) { msg.textContent = 'El envío de correos aún no está configurado.'; msg.className = 'form-msg t-naranja'; return; }
    msg.textContent = 'Enviando…'; msg.className = 'form-msg';
    fetch(cfg.appsScriptUrl, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'lead', email: email, r: code, consent: true, test: 'personal' })
    }).then(function () {
      msg.textContent = 'Listo. Revisa tu correo en unos minutos (y la carpeta de spam).'; msg.className = 'form-msg t-verde';
    }).catch(function () {
      msg.textContent = 'No pudimos enviarlo. Intenta de nuevo.'; msg.className = 'form-msg t-rojo';
    });
  }

  // Si la persona recarga la página después de terminar, mostramos su resultado.
  var saved = load();
  if (saved && saved.code) { try { renderResult(saved.code); } catch (e) { renderIntro(); } }
  else renderIntro();
})();
