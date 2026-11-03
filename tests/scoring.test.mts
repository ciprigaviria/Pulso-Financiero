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
const props = { DB_ID: 'db', LS_API_KEY: 'k', LS_STORE_ID: '42', CHECKOUT_PERSONAL: 'https://x.lemonsqueezy.com/buy/abc', SITE_URL: 'https://pulso.test' };
let orderStatus = 'paid', orderStore = 42, licenseKeys = ['ABCD-1234-EFGH-5678'], licenseCalls = 0;
const LICENSES = {
  'GOOD-KEY-0001': { valid: true, license_key: { status: 'active' }, meta: { store_id: 42, product_id: 7 } },
  'OTHER-STORE-01': { valid: true, license_key: { status: 'active' }, meta: { store_id: 99, product_id: 7 } },
  'OTHER-PROD-001': { valid: true, license_key: { status: 'active' }, meta: { store_id: 42, product_id: 8 } },
  'EXPIRED-KEY-01': { valid: true, license_key: { status: 'expired' }, meta: { store_id: 42, product_id: 7 } }
};
const sheet = name => ({
  getDataRange: () => ({ getValues: () => rows[name] }),
  appendRow: r => rows[name].push(r),
  getRange: () => ({ setFontWeight() {} })
});
const cache = {};
function fetchMock(url, opts) {
  if (url.includes('/v1/licenses/validate')) {
    licenseCalls++;
    const key = opts.payload.license_key;
    const body = LICENSES[key] || { valid: false, error: 'license_key not found.' };
    return { getResponseCode: () => (LICENSES[key] ? 200 : 404), getContentText: () => JSON.stringify(body) };
  }
  if (url.includes('/v1/license-keys')) {
    assert.ok(url.includes('filter[order_id]=9'));
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: licenseKeys.map(key => ({ attributes: { key } })) }) };
  }
  if (url.includes('/v1/orders/')) {
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: { id: '9', attributes: { store_id: orderStore, status: orderStatus, user_email: 'comprador@test.com', user_name: 'Ana Pérez' } } }) };
  }
  throw new Error('URL inesperada ' + url);
}
const blob = { getAs: () => ({ setName: () => ({ pdf: true }) }) };
const ctx = {
  console: { log() {}, error() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperties: () => props, getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) },
  SpreadsheetApp: { openById: () => ({ getSheetByName: n => (rows[n] ? sheet(n) : null), insertSheet: n => { rows[n] = []; return sheet(n); } }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
  MailApp: { sendEmail: o => sent.push(o), getRemainingDailyQuota: () => 100 },
  Utilities: { newBlob: html => { ctx.__lastHtml = html; return blob; }, formatDate: () => '02/11/2026', sleep() {}, getUuid: () => 'ab12cd34-0000-4000-8000-000000000000' },
  UrlFetchApp: { fetch: fetchMock },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { createTextOutput: t => ({ setMimeType: () => JSON.parse(t), text: t }), MimeType: { JSON: 'json' } },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'yo@marca.com' }) }
};
vm.createContext(ctx);
vm.runInContext(gasSrc + '\n;globalThis.__gas = { score_, decode_, buildPlan_, reportHtml_, doPost, doGet, crearCodigoCortesia, PROFILE, QUESTIONS, FLAGS, LEVELS, AREA_DETAIL };', ctx);
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
  const html = gas.reportHtml_(res, gas.decode_(c), 'Ana', { BRAND_NAME: 'Pulso Financiero', SITE_URL: 'https://pulso.test' }, 'Perú <script>', 'K-1');
  assert.ok(html.includes('Tu plan de 30 días') && html.includes('Lo que revelan tus respuestas'));
  assert.ok(html.includes('https://pulso.test/tablero/?licencia=K-1') && !/archivo|Excel|hoja/i.test(html.replace('archivo único', '')), 'El informe debe hablar del tablero, no de un archivo');
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
assert.ok(sent[0].htmlBody.includes('https://pulso.test/tablero/?ejemplo') && !/archivo de presupuesto/.test(sent[0].htmlBody));
assert.equal(rows.Leads.at(-1)[7], 'Perú');
post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
const third = post({ type: 'lead', email: 'a@b.com', r: best, consent: true });
assert.equal(third.throttled, true); assert.equal(sent.length, 2);
console.log('✓ Resumen gratis: valida correo y autorización, guarda el país y limita reenvíos');

// ---- 5. Flujo de pedido ----
const order = (r, pais) => ({ meta: { event_name: 'order_created', custom_data: r ? { r, pais } : {} }, data: { id: '9' } });
sent.length = 0;
assert.equal(post(order(worst, 'Chile'), 'ls').ok, true);
assert.equal(sent.length, 1); assert.equal(sent[0].attachments.length, 1); assert.equal(sent[0].to, 'comprador@test.com');
assert.ok(sent[0].htmlBody.includes('https://pulso.test/tablero/?licencia=ABCD-1234-EFGH-5678') && sent[0].htmlBody.includes('Abrir mi tablero'));
assert.ok(ctx.__lastHtml.includes('Chile') && ctx.__lastHtml.includes('?licencia=ABCD-1234-EFGH-5678'));
assert.equal(rows.Pedidos.at(-1)[7], 'Enviado'); assert.equal(rows.Pedidos.at(-1)[8], 'Chile'); assert.equal(rows.Pedidos.at(-1)[9], 'Sí');
assert.equal(post(order(worst), 'ls').duplicate, true); assert.equal(sent.length, 1);
orderStatus = 'refunded'; rows.Pedidos = [['h']];
assert.ok(post(order(worst), 'ls').ignored); assert.equal(sent.length, 1);
orderStatus = 'paid'; orderStore = 99;
assert.equal(post(order(worst), 'ls').ok, false); assert.equal(sent.length, 1);
orderStore = 42; rows.Pedidos = [['h']];
post(order(null), 'ls'); assert.ok(sent[1].subject.includes('falta un paso')); assert.ok(!sent[1].attachments);
assert.ok(sent[1].htmlBody.includes('?licencia=ABCD-1234-EFGH-5678') && sent[1].htmlBody.includes('/prueba-personal/'));
assert.ok(post({ meta: { event_name: 'subscription_created' }, data: { id: '1' } }, 'ls').ignored);
// Sin clave (producto sin licencias activadas): igual envía, avisa y registra el error
licenseKeys = []; rows.Pedidos = [['h']]; const errs = rows.Errores.length;
post(order(best), 'ls');
assert.ok(sent.at(-1).htmlBody.includes('se está generando') && !sent.at(-1).htmlBody.includes('?licencia='));
assert.equal(rows.Pedidos.at(-1)[9], 'No'); assert.ok(rows.Errores.length > errs);
licenseKeys = ['ABCD-1234-EFGH-5678'];
console.log('✓ Pedido: verifica tienda y estado, no duplica, busca la licencia y envía el enlace al tablero + PDF');

// ---- 6. Validación de licencias ----
const lic = key => gas.doGet({ parameter: { action: 'licencia', key } });
assert.equal(lic('GOOD-KEY-0001').ok, true);
assert.equal(lic('NO-EXISTE-0001').ok, false);
assert.equal(lic('OTHER-STORE-01').ok, false);
assert.equal(lic('EXPIRED-KEY-01').ok, false);
assert.equal(lic('<script>').ok, false); assert.equal(lic('').ok, false);
props.LS_PRODUCT_ID = '7';
assert.equal(lic('OTHER-PROD-001').ok, false);
const before = licenseCalls; assert.equal(lic('GOOD-KEY-0001').ok, true); assert.equal(licenseCalls, before, 'usa caché');
delete props.LS_PRODUCT_ID;
assert.equal(typeof gas.doGet({ parameter: {} }).text, 'string');
// Códigos de cortesía: se aceptan sin consultar a Lemon Squeezy, sin importar mayúsculas.
props.CODIGOS_CORTESIA = 'PULSO-QQQQ-1111, pulso-zzzz-9999';
const calls0 = licenseCalls;
assert.equal(lic('PULSO-QQQQ-1111').ok, true); assert.equal(lic('pulso-zzzz-9999').ok, true);
assert.equal(lic('PULSO-NOPE-0000').ok, false);
assert.equal(licenseCalls, calls0 + 1, 'solo el código desconocido consulta a Lemon Squeezy');
const nuevo = gas.crearCodigoCortesia('Revisión del dueño');
assert.equal(nuevo, 'PULSO-AB12-CD34'); assert.ok(props.CODIGOS_CORTESIA.endsWith(',PULSO-AB12-CD34'));
assert.equal(lic('PULSO-AB12-CD34').ok, true);
assert.equal(rows['Cortesías'].at(-1)[1], 'PULSO-AB12-CD34'); assert.equal(rows['Cortesías'].at(-1)[3], 'https://pulso.test/tablero/?licencia=PULSO-AB12-CD34');
props.CODIGOS_CORTESIA = 'PULSO-QQQQ-1111';
assert.equal(lic('PULSO-AB12-CD34').ok, false, 'un código borrado de la propiedad deja de funcionar');
delete props.CODIGOS_CORTESIA;
console.log('✓ Licencias: valida tienda, producto y estado; rechaza formatos raros; usa caché; acepta y revoca códigos de cortesía');

// ---- 7. Beta y comentarios ----
delete rows.Beta; delete rows.Comentarios;
assert.equal(post({ type: 'beta', email: 'x', consent: true }).ok, false);
assert.equal(post({ type: 'beta', email: 'beta@test.com', consent: false }).ok, false);
assert.equal(post({ type: 'beta', email: 'Beta@Test.com', consent: true }).ok, true);
assert.equal(post({ type: 'beta', email: 'beta@test.com', consent: true }).duplicate, true);
assert.equal(rows.Beta.length, 2); assert.equal(rows.Beta[1][1], 'beta@test.com');
assert.equal(post({ type: 'feedback', text: '  ' }).ok, false);
assert.equal(post({ type: 'feedback', text: 'Muy útil <b>el</b> radar', name: 'Ana', publish: true }).ok, true);
assert.equal(rows.Comentarios[1][2], 'Muy útil bel/b radar'); assert.equal(rows.Comentarios[1][3], 'Sí');
console.log('✓ Beta y comentarios: validan, no duplican y crean sus hojas');

console.log('\nTodas las pruebas pasaron.');
