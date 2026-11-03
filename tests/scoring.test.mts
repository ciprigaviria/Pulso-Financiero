// Pruebas: el puntaje del sitio (src/lib/scoring.js) y el de Apps Script (apps-script/Code.gs)
// deben dar exactamente lo mismo, con los mismos hallazgos, potencial y plan.
// También simula el flujo de correo y de pedido con servicios falsos.
// Uso: npm test (o npx tsx tests/scoring.test.mts) → corre las pruebas
//      npx tsx tests/scoring.test.mts --dump N   → imprime N resultados en JSON (lo usa validate.py)
// @ts-nocheck — prueba en Node con servicios simulados; no forma parte del sitio.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

import * as web from '../src/lib/scoring.js';
const gasSrc = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

// ---- Servicios de Google simulados ----
const sent = [], rows = { Leads: [['h']], Pedidos: [['h']], Errores: [['h']] };
const props = { DB_ID: 'db', TEMPLATE_ID: 'tpl', LS_API_KEY: 'k', LS_STORE_ID: '42', CHECKOUT_PERSONAL: 'https://x.lemonsqueezy.com/buy/abc', SITE_URL: 'https://pulso.test' };
let orderStatus = 'paid', orderStore = 42;
const sheet = name => ({
  getDataRange: () => ({ getValues: () => rows[name] }),
  appendRow: r => rows[name].push(r)
});
const blob = { getAs: () => ({ setName: () => ({ pdf: true }) }), setName: () => ({ xlsx: true }) };
const ctx = {
  console: { log() {}, error() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperties: () => props, getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) },
  SpreadsheetApp: { openById: () => ({ getSheetByName: sheet }) },
  MailApp: { sendEmail: o => sent.push(o), getRemainingDailyQuota: () => 100 },
  Utilities: { newBlob: html => { ctx.__lastHtml = html; return blob; }, formatDate: () => '02/11/2026' },
  UrlFetchApp: { fetch: url => url.includes('lemonsqueezy')
    ? { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: { id: '9', attributes: { store_id: orderStore, status: orderStatus, user_email: 'comprador@test.com', user_name: 'Ana Pérez' } } }) }
    : { getResponseCode: () => 200, getBlob: () => blob } },
  ScriptApp: { getOAuthToken: () => 't' },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { createTextOutput: t => ({ setMimeType: () => JSON.parse(t), text: t }), MimeType: { JSON: 'json' } },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'yo@marca.com' }) }
};
vm.createContext(ctx);
vm.runInContext(gasSrc + '\n;globalThis.__gas = { score_, decode_, buildPlan_, reportHtml_, doPost, PROFILE, QUESTIONS, FLAGS, LEVELS, AREA_DETAIL };', ctx);
const gas = ctx.__gas;

// ---- Generador de códigos (3 de perfil + 12 respuestas) ----
let seed = 7;
const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
function randomCode() {
  return web.PROFILE.map(x => rand(x.options.length)).join('') + web.QUESTIONS.map(x => rand(x.options.length)).join('');
}
const best = '000' + '000000000000';
const worst = '000' + web.QUESTIONS.map(x => x.options.length - 1).join('');

const dumpIdx = process.argv.indexOf('--dump');
if (dumpIdx > -1) {
  const n = Number(process.argv[dumpIdx + 1] || 2000);
  const codes = [best, worst];
  while (codes.length < n) codes.push(randomCode());
  const out = codes.map(code => {
    const r = web.score(web.decode(code));
    return { code, total: r.total, level: r.level.id, areas: r.areas.map(a => a.score), flags: r.flags.map(f => f.id),
      potential: r.potential ? r.potential.to : null };
  });
  await new Promise(done => process.stdout.write(JSON.stringify(out), done));
  process.exit(0);
}

// ---- 0. Los datos de las dos copias son idénticos ----
assert.deepEqual(JSON.parse(JSON.stringify(gas.PROFILE)), web.PROFILE.map(p => ({ id: p.id, text: p.text, options: p.options })));
assert.deepEqual(JSON.parse(JSON.stringify(gas.QUESTIONS)), web.QUESTIONS.map(q => ({ n: q.n, area: q.area, points: q.points, insights: q.insights })));
assert.deepEqual(JSON.parse(JSON.stringify(gas.FLAGS)), web.FLAGS.map(f => ({ id: f.id, q: f.q, minIndex: f.minIndex, name: f.name, action: f.action })));
for (const id of Object.keys(web.AREA_ACTIONS)) assert.deepEqual([...gas.AREA_DETAIL[id].actions], web.AREA_ACTIONS[id]);
web.QUESTIONS.forEach(q => assert.equal(q.insights.length, q.options.length, 'Faltan hallazgos en la pregunta ' + q.n));
console.log('✓ Preguntas, puntos, hallazgos, banderas y acciones idénticos en sitio y Apps Script');

// ---- 1. El sitio y Apps Script calculan igual ----
const strip = r => JSON.parse(JSON.stringify({
  total: r.total, level: r.level.id, flags: r.flags.map(f => [f.id, f.action]),
  areas: r.areas.map(a => [a.id, a.score, a.color, a.message, a.insight, a.bestInsight]),
  weakest: r.weakest.id, strongest: r.strongest.id,
  potential: r.potential && [r.potential.area, r.potential.from, r.potential.to, r.potential.level.id]
}));
const codes = [best, worst];
for (let i = 0; i < 50000; i++) codes.push(randomCode());
for (const c of codes) {
  const g = gas.score_(gas.decode_(c)), w = web.score(web.decode(c));
  assert.deepEqual(strip(g), strip(w), 'Difieren en ' + c);
  assert.deepEqual(JSON.parse(JSON.stringify(gas.buildPlan_(g))), w.plan, 'Plan distinto en ' + c);
}
console.log('✓ Sitio y Apps Script coinciden (puntaje, hallazgos, potencial y plan) en ' + codes.length + ' combinaciones');

// ---- 2. Extremos y reglas ----
const b = web.score(web.decode(best)), z = web.score(web.decode(worst));
assert.equal(b.total, 100); assert.equal(b.level.id, 'sana'); assert.equal(b.potential, null);
assert.equal(z.total, 0); assert.equal(z.flags.length, 5); assert.ok(z.potential.to > 0);
const capped = web.score(web.decode('000' + '300000000000')); // gasta mucho más, todo lo demás perfecto
assert.equal(capped.level.id, 'riesgo'); assert.ok(capped.total > 59);
assert.throws(() => web.decode('1234'));
assert.throws(() => web.decode('0000' + '000000000000'), 'un código de 16 dígitos (versión anterior) ya no es válido');
assert.throws(() => web.score(web.decode('000' + '900000000000')));
assert.throws(() => web.decode('900' + '000000000000'));
assert.equal(web.cleanCountry('  <b>Perú</b>  '), 'bPerú/b');
assert.equal(web.cleanCountry('x'.repeat(80)).length, 40);
console.log('✓ Extremos, bandera roja, potencial y validación de entradas');

// ---- 3. Informe ----
for (const c of [best, worst, '110101111121112']) {
  const res = gas.score_(gas.decode_(c));
  const html = gas.reportHtml_(res, gas.decode_(c), 'Ana', { BRAND_NAME: 'Pulso Financiero' }, 'Perú <script>');
  assert.ok(html.includes('Tu plan de 30 días') && html.includes('Lo que revelan tus respuestas'));
  assert.ok(html.includes('Perú &lt;script&gt;'), 'El país se escapa en el informe');
  assert.ok(!html.includes('undefined'), 'El informe tiene "undefined" para ' + c);
}
console.log('✓ Informe PDF con hallazgos, potencial y plan, sin huecos');

// ---- 4. Flujo de correo gratis ----
const post = (body, src) => gas.doPost({ parameter: src ? { src } : {}, postData: { contents: JSON.stringify(body) } });
assert.equal(post({ type: 'lead', email: 'malo', r: best, consent: true }).ok, false);
assert.equal(post({ type: 'lead', email: 'a@b.com', r: best, consent: false }).ok, false);
assert.equal(post({ type: 'lead', email: 'a@b.com', r: worst, pais: 'Perú', consent: true }).ok, true);
assert.equal(sent.length, 1);
assert.ok(sent[0].htmlBody.includes('checkout%5Bcustom%5D%5Br%5D=' + worst));
assert.ok(sent[0].htmlBody.includes('checkout%5Bcustom%5D%5Bpais%5D=Per%C3%BA'));
assert.ok(sent[0].htmlBody.includes('USD 9') && sent[0].htmlBody.includes('Lo que revelan'));
assert.equal(rows.Leads.at(-1)[7], 'Perú');
post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
const third = post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
assert.equal(third.throttled, true); assert.equal(sent.length, 2);
console.log('✓ Resumen gratis: valida correo y autorización, guarda el país y limita reenvíos');

// ---- 5. Flujo de pedido ----
const order = (r, pais) => ({ meta: { event_name: 'order_created', custom_data: r ? { r, pais } : {} }, data: { id: '9' } });
sent.length = 0;
assert.equal(post(order(worst, 'Chile'), 'ls').ok, true);
assert.equal(sent.length, 1); assert.equal(sent[0].attachments.length, 2); assert.equal(sent[0].to, 'comprador@test.com');
assert.ok(ctx.__lastHtml.includes('Chile'));
assert.equal(rows.Pedidos.at(-1)[7], 'Enviado'); assert.equal(rows.Pedidos.at(-1)[8], 'Chile');
assert.equal(post(order(worst), 'ls').duplicate, true); assert.equal(sent.length, 1);
orderStatus = 'refunded'; rows.Pedidos = [['h']];
assert.ok(post(order(worst), 'ls').ignored); assert.equal(sent.length, 1);
orderStatus = 'paid'; orderStore = 99;
assert.equal(post(order(worst), 'ls').ok, false); assert.equal(sent.length, 1);
orderStore = 42; rows.Pedidos = [['h']];
post(order(null), 'ls'); assert.ok(sent[1].subject.includes('falta un paso'));
assert.ok(post({ meta: { event_name: 'subscription_created' }, data: { id: '1' } }, 'ls').ignored);
console.log('✓ Pedido: verifica tienda y estado, no duplica envíos, guarda el país y maneja compras sin test');

console.log('\nTodas las pruebas pasaron.');
