// Pruebas del bot de WhatsApp (apps-script-bot/Bot.gs) con servicios de Google, Meta y Anthropic simulados.
// Uso: npx tsx tests/bot.test.mts [--dump N]
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { BOT_CATEGORIES, summarizeMovements } from '../src/lib/bot-categories.ts';
import { COUNTRIES } from '../src/lib/money.ts';

const src = readFileSync(new URL('../apps-script-bot/Bot.gs', import.meta.url), 'utf8');
const TODAY = '2026-11-04';

function makeEnv(extraProps: Record<string, string> = {}) {
  const sheets: Record<string, any[][]> = {};
  const sent: { to: string; body: string }[] = [];
  const llmCalls: any[] = [];
  let uuid = 0;
  const props: Record<string, string> = { DB_ID: 'db', RELAY_SECRET: 'secreto', WA_TOKEN: 'wa', WA_PHONE_NUMBER_ID: '111', SITE_URL: 'https://pulso.test', ...extraProps };
  const cache: Record<string, string> = {};
  const clean = (v: any) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
  const sheet = (name: string) => ({
    getDataRange: () => ({ getValues: () => sheets[name].map((r) => r.slice()) }),
    appendRow: (r: any[]) => { sheets[name].push(r.map(clean)); },
    getRange: (row: number, col: number) => ({ setValue: (v: any) => { sheets[name][row - 1][col - 1] = clean(v); }, setFontWeight() {} }),
    deleteRow: (row: number) => { sheets[name].splice(row - 1, 1); },
    getLastColumn: () => sheets[name][0].length,
    setName: (n: string) => { sheets[n] = sheets[name]; delete sheets[name]; return sheet(n); },
  });
  const env: any = {
    llm: null as null | ((body: any) => any),
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...props }), getProperty: (k: string) => props[k], setProperty: (k: string, v: string) => { props[k] = v; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n: string) => (sheets[n] ? sheet(n) : null), insertSheet: (n: string) => { sheets[n] = []; return sheet(n); } }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache[k] || null, put: (k: string, v: string) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: (t: string) => ({ setMimeType: () => JSON.parse(t), text: t }), MimeType: { JSON: 'json' } },
    Utilities: {
      formatDate: (_d: Date, _tz: string, f: string) => (f === 'yyyy-MM' ? TODAY.slice(0, 7) : TODAY),
      getUuid: () => { uuid++; return (uuid.toString(16).padStart(8, '0') + '-aaaa-4bbb-8ccc-' + uuid.toString(16).padStart(12, '0')); },
    },
    UrlFetchApp: {
      fetch: (url: string, o: any) => {
        if (url.startsWith('https://graph.facebook.com/')) {
          assert.ok(url.includes('/v26.0/111/messages')); assert.equal(o.headers.Authorization, 'Bearer wa');
          const p = JSON.parse(o.payload); sent.push({ to: p.to, body: p.text.body });
          return { getResponseCode: () => 200, getContentText: () => '{}' };
        }
        if (url === 'https://api.anthropic.com/v1/messages') {
          const body = JSON.parse(o.payload); llmCalls.push(body);
          const input = env.llm ? env.llm(body) : null;
          if (!input) return { getResponseCode: () => 500, getContentText: () => 'error' };
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ content: [{ type: 'tool_use', name: 'registrar', input }] }) };
        }
        throw new Error('URL inesperada ' + url);
      },
    },
  };
  vm.createContext(env);
  vm.runInContext(src + '\n;globalThis.__bot = { doGet, doPost, setup, parseAmounts_, summarize_, fmtMoney_, countryFromPhone_, countryFromText_, categoryFromText_, ruleParse_, checkMovements_, CATEGORIES, COUNTRIES };', env);
  const bot = env.__bot;
  bot.setup();
  let n = 0;
  const say = (from: string, text: string | null, extra: any = {}) => {
    sent.length = 0;
    const msg = text === null ? { from, id: 'w' + ++n, type: 'audio' } : { from, id: extra.id || 'w' + ++n, type: 'text', text: { body: text } };
    const payload = { entry: [{ changes: [{ value: { metadata: { phone_number_id: extra.phoneId || '111' }, contacts: [{ wa_id: from, profile: { name: 'Ana María' } }], messages: [msg] } }] }] };
    const r = bot.doPost({ parameter: { k: extra.k ?? 'secreto' }, postData: { contents: JSON.stringify(payload) } });
    return { r, replies: sent.map((s) => s.body), all: sent.slice() };
  };
  return { bot, sheets, sent, say, props, llmCalls, env };
}

const dumpIdx = process.argv.indexOf('--dump');

// ---- 0. Mismas categorías y países en el bot y en el sitio ----
{
  const { bot } = makeEnv();
  assert.deepEqual(JSON.parse(JSON.stringify(bot.CATEGORIES.map((c: any) => [c.id, c.tipo, c.name]))), BOT_CATEGORIES.map((c) => [c.id, c.tipo, c.name]));
  assert.deepEqual(JSON.parse(JSON.stringify(bot.COUNTRIES.map((c: any) => [c.id, c.currency]))), COUNTRIES.map((c) => [c.id, c.currency]));
  if (dumpIdx === -1) console.log('✓ Categorías y países idénticos en el bot y en el sitio');
}

// ---- Modo volcado para la validación cruzada en Python ----
if (dumpIdx > -1) {
  const N = Number(process.argv[dumpIdx + 1] || 1500);
  const { bot } = makeEnv();
  let seed = 3;
  const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor((seed / 2147483648) * k); };
  const words = ['almuerzo', 'taxi', 'mercado', 'arriendo', 'luz', 'cine', 'farmacia', 'gasolina', 'cuota tarjeta', 'regalo'];
  const fmtCases = (v: number) => {
    const s = String(v);
    const dots = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const commas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const opts = [s, dots, commas, '$' + dots, '$ ' + commas];
    if (v % 1000 === 0 && v < 1e6) opts.push(v / 1000 + ' mil', v / 1000 + 'k', v / 1000 + ' lucas');
    if (v % 100000 === 0 && v >= 1e6) { const m = String(v / 1e6); opts.push(m.replace('.', ',') + ' millones', m + ' palos', m.replace('.', ',') + 'm'); }
    return opts[rand(opts.length)];
  };
  const amountsCases = Array.from({ length: N }, () => {
    const v = [rand(999) + 1, (rand(900) + 1) * 1000, (rand(90) + 10) * 100000, rand(99999) + 1][rand(4)];
    const expected = [v];
    let text = words[rand(words.length)] + ' ' + fmtCases(v);
    if (rand(3) === 0) { const v2 = rand(500) + 1; expected.push(v2); text += ' y ' + words[rand(words.length)] + ' ' + fmtCases(v2); }
    return { text, expected, amounts: bot.parseAmounts_(text) };
  });
  const summaryCases = Array.from({ length: 400 }, () => {
    const movs = Array.from({ length: rand(40) }, (_, i) => ({ id: 'x' + i, fecha: TODAY, tipo: rand(4) === 0 ? 'ingreso' : 'gasto', monto: Math.round((rand(5e6) + 1) * (rand(2) ? 1 : 0.37)) / 100, categoria: BOT_CATEGORIES[rand(12)].id, descripcion: '' }));
    const g = bot.summarize_(movs), w = summarizeMovements(movs as any);
    return { movs, gas: JSON.parse(JSON.stringify(g)), web: w };
  });
  await new Promise((done) => process.stdout.write(JSON.stringify({ amountsCases, summaryCases }), done));
  process.exit(0);
}

// ---- 1. Lectura de montos ----
{
  const { bot } = makeEnv();
  const cases: [string, number[]][] = [
    ['almuerzo 25 mil', [25000]], ['almuerzo 25.000', [25000]], ['almuerzo $25,000', [25000]], ['taxi 12k', [12000]],
    ['me pagaron 4,5 millones', [4500000]], ['me pagaron 4.5 palos', [4500000]], ['cine 30 lucas', [30000]], ['arriendo 1.650.000', [1650000]],
    ['medio millón en el mercado', [500000]], ['un millón de arriendo', [1000000]], ['café 6.50', [6.5]], ['mercado en el D1 85000', [85000]],
    ['taxi 12.000 y café 6.000', [12000, 6000]], ['reunión a las 3pm, almuerzo 25 mil', [25000]], ['sin monto', []], ['cuota 1.250.000,50', [1250000.5]],
  ];
  for (const [t, v] of cases) assert.deepEqual([...bot.parseAmounts_(t)], v, t);
  console.log('✓ Montos coloquiales: mil, k, lucas, palos, millones, medio millón y separadores de cualquier país');
}

// ---- 2. Formato por país ----
{
  const { bot } = makeEnv();
  const c = (id: string) => bot.COUNTRIES.find((x: any) => x.id === id);
  assert.equal(bot.fmtMoney_(25000, c('CO')), '$ 25.000');
  assert.equal(bot.fmtMoney_(25000, c('MX')), '$25,000');
  assert.equal(bot.fmtMoney_(1250.5, c('ES')), '1.250,50 €');
  assert.equal(bot.fmtMoney_(85.5, c('PE')), 'S/ 85.50');
  assert.equal(bot.fmtMoney_(-37000, c('CO')), '-$ 37.000');
  assert.equal(bot.fmtMoney_(1200, c('GT')), 'Q1,200');
  assert.equal(bot.countryFromPhone_('573001234567').id, 'CO');
  assert.equal(bot.countryFromPhone_('5215512345678').id, 'MX');
  assert.equal(bot.countryFromPhone_('50255551234').id, 'GT');
  assert.equal(bot.countryFromPhone_('18095551234').id, 'DO');
  assert.equal(bot.countryFromPhone_('13055551234').id, 'US');
  assert.equal(bot.countryFromText_('Perú').id, 'PE'); assert.equal(bot.countryFromText_('rep. dominicana').id, 'DO');
  assert.equal(bot.categoryFromText_('restaurantes').id, 'comida'); assert.equal(bot.categoryFromText_('era mercado').id, 'mercado');
  assert.equal(bot.categoryFromText_('taxi').id, 'transporte'); assert.equal(bot.categoryFromText_('resumen'), null);
  console.log('✓ Formato de montos, país por prefijo telefónico y categorías por nombre');
}

// ---- 3. Conversación completa con reglas (sin IA) ----
{
  const { say, sheets, bot } = makeEnv();
  const CO = '573001234567';
  let x = say(CO, 'hola');
  assert.ok(x.replies[0].includes('¡Hola, Ana!') && x.replies[0].includes('COP (Colombia)') && x.replies[0].includes('almuerzo 25 mil'));
  assert.equal(x.replies.length, 1, 'un solo saludo');
  x = say(CO, 'almuerzo 25 mil y taxi 12.000');
  assert.ok(x.replies[0].includes('Restaurantes y domicilios · $ 25.000') && x.replies[0].includes('Transporte · $ 12.000'), x.replies[0]);
  assert.equal(sheets.Movimientos.length, 3);
  x = say(CO, 'era mercado');
  assert.equal(x.replies[0], 'Corregido: Mercado.');
  assert.equal(sheets.Movimientos[2][6], 'mercado');
  x = say(CO, 'me pagaron la quincena 2,1 millones');
  assert.ok(x.replies[0].includes('Ingreso · Salario · $ 2.100.000'), x.replies[0]);
  x = say(CO, 'resumen');
  assert.ok(x.replies[0].includes('Ingresos: $ 2.100.000') && x.replies[0].includes('Gastos: $ 37.000') && x.replies[0].includes('Excedente: $ 2.063.000') && x.replies[0].includes('tasa de ahorro 98%'), x.replies[0]);
  assert.ok(x.replies[0].includes('https://pulso.test/movimientos/?t='));
  x = say(CO, '¿Cuánto llevo en restaurantes?');
  assert.equal(x.replies[0], 'Restaurantes y domicilios en noviembre 2026: $ 25.000 en 1 movimiento.');
  x = say(CO, 'borrar');
  assert.ok(x.replies[0].startsWith('Eliminado: Salario · $ 2.100.000'));
  assert.equal(sheets.Movimientos.length, 3);
  x = say(CO, 'gasté plata');
  assert.ok(x.replies[0].includes('No encontré un monto'));
  x = say(CO, null);
  assert.ok(x.replies[0].includes('solo mensajes de texto'));
  // Mensaje repetido por Meta: no se registra dos veces
  say(CO, 'pan 3.000', { id: 'repetido' }); const rows = sheets.Movimientos.length;
  x = say(CO, 'pan 3.000', { id: 'repetido' }); assert.equal(sheets.Movimientos.length, rows); assert.equal(x.replies.length, 0);
  // Sitio: movimientos del mes con el enlace personal
  const token = sheets.Usuarios[1][4];
  const web = bot.doGet({ parameter: { action: 'movimientos', t: token } });
  assert.equal(web.ok, true); assert.equal(web.usuario.moneda, 'COP'); assert.equal(web.mes, '2026-11');
  assert.deepEqual(web.movimientos.map((m: any) => [m.categoria, m.monto]), [['comida', 25000], ['mercado', 12000], ['otros', 3000]]);
  assert.equal(bot.doGet({ parameter: { action: 'movimientos', t: 'x'.repeat(32) } }).ok, false);
  assert.equal(bot.doGet({ parameter: { action: 'movimientos', t: '<script>' } }).ok, false);
  // Nuevo enlace: el anterior deja de funcionar
  x = say(CO, 'nuevo enlace');
  assert.equal(bot.doGet({ parameter: { action: 'movimientos', t: token } }).ok, false);
  // Borrado total en dos pasos
  x = say(CO, 'borrar mis datos'); assert.ok(x.replies[0].includes('CONFIRMAR BORRADO'));
  x = say(CO, 'CONFIRMAR BORRADO'); assert.ok(x.replies[0].startsWith('Listo: borramos'));
  assert.equal(sheets.Movimientos.length, 1); assert.equal(sheets.Usuarios.length, 1);
  console.log('✓ Conversación sin IA: registra, corrige, resume, consulta, borra, ignora repetidos y borra todos los datos');
}

// ---- 4. Con IA: se usa la herramienta y nunca se aceptan montos inventados ----
{
  const { say, sheets, llmCalls, env } = makeEnv({ ANTHROPIC_API_KEY: 'sk-test' });
  const MX = '5215512345678';
  say(MX, 'hola');
  env.llm = () => ({ intencion: 'movimientos', movimientos: [
    { tipo: 'gasto', monto: 180, categoria: 'comida', descripcion: 'Tacos', fecha: '' },
    { tipo: 'gasto', monto: 99999, categoria: 'transporte', descripcion: 'Inventado', fecha: '' },
  ] });
  let x = say(MX, 'tacos 180 y uber 95');
  const body = llmCalls.at(-1);
  assert.equal(body.model, 'claude-haiku-4-5'); assert.deepEqual(body.tool_choice, { type: 'tool', name: 'registrar' });
  assert.ok(body.system.includes('México (moneda MXN)') && body.system.includes(TODAY));
  assert.ok(x.replies[0].includes('Tacos') && x.replies[0].includes('$180') && !x.replies[0].includes('Inventado'), x.replies[0]);
  assert.equal(sheets.Movimientos.length, 2);
  // Un solo monto mal leído se corrige con el que de verdad aparece en el texto; fecha "ayer" se respeta
  env.llm = () => ({ intencion: 'movimientos', movimientos: [{ tipo: 'gasto', monto: 1500, categoria: 'mercado', descripcion: 'Súper', fecha: '2026-11-03' }] });
  x = say(MX, 'ayer súper 1.050');
  assert.ok(x.replies[0].includes('$1,050') && x.replies[0].includes('(2026-11-03)'), x.replies[0]);
  // Categoría incoherente con el tipo se corrige; fecha absurda pasa a hoy
  env.llm = () => ({ intencion: 'movimientos', movimientos: [{ tipo: 'ingreso', monto: 9000, categoria: 'comida', descripcion: 'pago cliente', fecha: '2020-01-01' }] });
  x = say(MX, 'me pagó un cliente 9000');
  assert.ok(x.replies[0].includes('Ingreso · Otros ingresos · $9,000 — Pago cliente') && !x.replies[0].includes('2020'), x.replies[0]);
  // Respuesta de la IA para mensajes sin monto
  env.llm = () => ({ intencion: 'otro', respuesta: '¿Cuánto pagaste por el gimnasio?' });
  x = say(MX, 'pagué el gimnasio');
  assert.equal(x.replies[0], '¿Cuánto pagaste por el gimnasio?');
  // Si la IA falla, entran las reglas
  env.llm = null;
  x = say(MX, 'gasolina 650');
  assert.ok(x.replies[0].includes('Transporte · $650'));
  assert.equal(sheets.Movimientos.at(-1)[11], 'reglas');
  console.log('✓ Con IA: herramienta forzada, montos verificados contra el texto, fechas y categorías saneadas, respaldo con reglas');
}

// ---- 5. Seguridad, beta, país y límites ----
{
  const { say, sheets, props, bot } = makeEnv({ BETA_NUMEROS: '573001112233', MAX_MENSAJES_DIA: '3' });
  const users = () => (sheets.Usuarios || [['encabezado']]).length;
  let x = say('573001112233', 'mercado 10 mil', { k: 'otra' });
  assert.equal(x.r.ok, false); assert.equal(users(), 1, 'sin la clave del relevo no entra nada');
  x = say('573001112233', 'mercado 10 mil', { phoneId: '999' });
  assert.equal(users(), 1, 'avisos de otro número de WhatsApp se ignoran');
  x = say('573009999999', 'mercado 10 mil');
  assert.equal(x.replies.length, 0); assert.equal(users(), 1, 'fuera de la beta no se registra');
  x = say('573001112233', 'mercado 10 mil');
  assert.ok(x.replies.some((r: string) => r.includes('¡Hola')) && x.replies.some((r: string) => r.includes('Mercado · $ 10.000')), 'el primer mensaje con monto se registra');
  x = say('573001112233', 'soy de Perú');
  assert.ok(x.replies[0].includes('Perú, en PEN'));
  x = say('573001112233', 'mercado 85.50');
  assert.ok(x.replies[0].includes('S/ 85.50'), x.replies[0]);
  x = say('573001112233', 'pan 3');
  assert.ok(x.replies[0].includes('máximo de mensajes'));
  x = say('573001112233', 'pan 4');
  assert.equal(x.replies.length, 0);
  assert.equal(props.RELAY_SECRET, 'secreto');
  assert.equal(typeof bot.doGet({ parameter: {} }).text, 'string');
  console.log('✓ Seguridad: clave del relevo, número propio, lista beta, cambio de país y límite diario');
}

// ---- 6. Totales: el bot y el sitio calculan igual ----
{
  const { bot } = makeEnv();
  const movs = [
    { tipo: 'ingreso', monto: 2100000, categoria: 'salario' }, { tipo: 'gasto', monto: 25000, categoria: 'comida' },
    { tipo: 'gasto', monto: 12000.5, categoria: 'transporte' }, { tipo: 'gasto', monto: 0.1, categoria: 'comida' }, { tipo: 'gasto', monto: 0.2, categoria: 'comida' },
  ];
  const g = JSON.parse(JSON.stringify(bot.summarize_(movs))), w = summarizeMovements(movs as any);
  assert.deepEqual(g, w);
  assert.equal(g.porCategoria.comida, 25000.3); assert.equal(g.excedente, 2062999.2);
  console.log('✓ Totales del mes idénticos en el bot y en el sitio');
}
