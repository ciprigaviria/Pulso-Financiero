/* Utilidades de interfaz compartidas por todas las páginas. */
(function () {
  'use strict';
  var cfg = window.PULSO_CONFIG || {};

  document.querySelectorAll('[data-brand]').forEach(function (el) { if (cfg.brand) el.textContent = cfg.brand; });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll('[data-price]').forEach(function (el) { if (cfg.pricePersonal) el.textContent = cfg.pricePersonal; });
  document.querySelectorAll('[data-contact]').forEach(function (el) {
    if (cfg.contactEmail) { el.textContent = cfg.contactEmail; el.href = 'mailto:' + cfg.contactEmail; }
  });

  function colorVar(color) { return 'var(--' + color + ')'; }

  // Medidor circular. value 0-100.
  function renderGauge(el, value, color) {
    if (!el) return;
    value = value != null ? value : Number(el.dataset.gauge);
    color = color || el.dataset.color || 'verde';
    var r = 52, c = 2 * Math.PI * r;
    el.innerHTML =
      '<svg viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--bg-soft)" stroke-width="12"/>' +
      '<circle class="arc" cx="60" cy="60" r="' + r + '" fill="none" stroke="' + colorVar(color) + '" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/>' +
      '</svg><div class="num"><div>' + value + '<small>de 100</small></div></div>';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Puntaje ' + value + ' de 100');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.querySelector('.arc').style.strokeDashoffset = c * (1 - value / 100);
      });
    });
  }

  function barHtml(name, score, color) {
    return '<div class="bar-row"><span>' + name + '</span>' +
      '<div class="bar-track"><div class="bar-fill c-' + color + '" data-w="' + score + '"></div></div>' +
      '<span class="val">' + score + '</span></div>';
  }

  function animateBars(root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.querySelectorAll('[data-w]').forEach(function (b) { b.style.width = b.dataset.w + '%'; });
      });
    });
  }

  function renderDemoBars(el) {
    if (!el) return;
    var demo = [['Gastar', 82], ['Ahorrar', 75], ['Deber', 87], ['Proteger', 68], ['Planear', 55]];
    el.innerHTML = demo.map(function (d) {
      return barHtml(d[0], d[1], window.PulsoScoring.areaColor(d[1]));
    }).join('');
    animateBars(el);
  }

  window.PulsoUI = { renderGauge: renderGauge, renderDemoBars: renderDemoBars, barHtml: barHtml, animateBars: animateBars, colorVar: colorVar };
})();
