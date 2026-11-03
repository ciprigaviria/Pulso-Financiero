// Pruebas: el puntaje del sitio (assets/js/scoring.js) y el de Apps Script (apps-script/Code.gs)
// deben dar exactamente lo mismo. También simula el flujo de correo y de pedido con servicios falsos.
// Uso: node tests/scoring.test.mjs            → corre las pruebas
//      node tests/scoring.test.mjs --dump N   → imprime N resultados en JSON (lo usa validate.py)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const web = require('../assets/js/scoring.js');
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
  console,
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
vm.runInContext(gasSrc + '\n;globalThis.__gas = { score_, decode_, buildPlan_, reportHtml_, doPost, handleOrder_ };', ctx);
const gas = ctx.__gas;

// ---- Generador de códigos ----
let seed = 7;
const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
function randomCode() {
  const p = web.PROFILE.map(x => rand(x.options.length));
  const q = web.QUESTIONS.map(x => rand(x.options.length));
  return p.join('') + q.join('');
}
const best = '0000' + '000000000000';
const worst = '0000' + web.QUESTIONS.map(x => x.options.length - 1).join('');

const dumpIdx = process.argv.indexOf('--dump');
if (dumpIdx > -1) {
  const n = Number(process.argv[dumpIdx + 1] || 2000);
  const codes = [best, worst];
  while (codes.length < n) codes.push(randomCode());
  const out = codes.map(code => { const r = web.score(web.decode(code)); return { code, total: r.total, level: r.level.id, areas: r.areas.map(a => a.score), flags: r.flags.map(f => f.id) }; });
  writeFileSync(1, JSON.stringify(out));
  process.exit(0);
}

// ---- 1. El sitio y Apps Script coinciden ----
const strip = r => JSON.parse(JSON.stringify({ total: r.total, level: r.level.id, areas: r.areas.map(a => [a.id, a.score, a.color, a.message]), flags: r.flags.map(f => f.id) }));
const codes = [best, worst];
for (let i = 0; i < 50000; i++) codes.push(randomCode());
for (const c of codes) assert.deepEqual(strip(gas.score_(gas.decode_(c))), strip(web.score(web.decode(c))), 'Difieren en ' + c);
console.log('✓ Sitio y Apps Script coinciden en ' + codes.length + ' combinaciones');

// ---- 2. Extremos y reglas ----
assert.equal(web.score(web.decode(best)).total, 100);
assert.equal(web.score(web.decode(best)).level.id, 'sana');
assert.equal(web.score(web.decode(worst)).total, 0);
assert.equal(web.score(web.decode(worst)).flags.length, 5);
const capped = web.score(web.decode('0000' + '300000000000')); // gasta mucho más, todo lo demás perfecto
assert.equal(capped.level.id, 'riesgo'); assert.ok(capped.total > 59);
assert.throws(() => web.decode('123'));
assert.throws(() => web.score(web.decode('0000' + '900000000000')));
console.log('✓ Extremos, bandera roja y validación de entradas');

// ---- 3. Plan e informe ----
for (const c of [best, worst, '1110101111121112']) {
  const res = gas.score_(gas.decode_(c));
  const plan = gas.buildPlan_(res);
  assert.equal(plan.length, 4); plan.forEach(w => assert.equal(w.actions.length, 2));
  const html = gas.reportHtml_(res, gas.decode_(c), 'Ana', { BRAND_NAME: 'Pulso Financiero' });
  assert.ok(html.includes('Tu plan de 30 días') && html.includes(String(res.total)));
  assert.ok(!html.includes('undefined'), 'El informe tiene "undefined" para ' + c);
}
console.log('✓ Plan de 30 días e informe se generan sin huecos');

// ---- 4. Flujo de correo gratis ----
const post = (body, src) => gas.doPost({ parameter: src ? { src } : {}, postData: { contents: JSON.stringify(body) } });
assert.equal(post({ type: 'lead', email: 'malo', r: best, consent: true }).ok, false);
assert.equal(post({ type: 'lead', email: 'a@b.com', r: best, consent: false }).ok, false);
assert.equal(post({ type: 'lead', email: 'a@b.com', r: best, consent: true }).ok, true);
assert.equal(sent.length, 1); assert.ok(sent[0].htmlBody.includes('checkout%5Bcustom%5D%5Br%5D=' + best));
post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
const third = post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
assert.equal(third.throttled, true); assert.equal(sent.length, 2);
console.log('✓ Resumen gratis: valida correo y autorización, y limita reenvíos');

// ---- 5. Flujo de pedido ----
const order = r => ({ meta: { event_name: 'order_created', custom_data: r ? { r } : {} }, data: { id: '9' } });
sent.length = 0;
assert.equal(post(order(worst), 'ls').ok, true);
assert.equal(sent.length, 1); assert.equal(sent[0].attachments.length, 2); assert.equal(sent[0].to, 'comprador@test.com');
assert.equal(post(order(worst), 'ls').duplicate, true); assert.equal(sent.length, 1);
orderStatus = 'refunded'; rows.Pedidos = [['h']];
assert.ok(post(order(worst), 'ls').ignored); assert.equal(sent.length, 1);
orderStatus = 'paid'; orderStore = 99;
assert.equal(post(order(worst), 'ls').ok, false); assert.equal(sent.length, 1);
orderStore = 42; rows.Pedidos = [['h']];
post(order(null), 'ls'); assert.ok(sent[1].subject.includes('falta un paso'));
assert.ok(post({ meta: { event_name: 'subscription_created' }, data: { id: '1' } }, 'ls').ignored);
console.log('✓ Pedido: verifica tienda y estado, no duplica envíos y maneja compras sin test');

console.log('\nTodas las pruebas pasaron.');
