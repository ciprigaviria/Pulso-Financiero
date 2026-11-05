// Pruebas del bot de WhatsApp (apps-script-bot/Bot.gs) con servicios de Google, Meta y Anthropic simulados.
// Uso: npx tsx tests/bot.test.mts [--dump N]
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { BOT_CATEGORIES, summarizeMovements } from '../src/lib/bot-categories.ts';
import { COUNTRIES } from '../src/lib/money.ts';

const src = readFileSync(new URL('../apps-script-bot/Bot.gs', import.meta.url), 'utf8');
const TODAY = '2026-11-04';

const blob = (data: string): any => { const b: any = { data, name: '', type: '' }; b.setName = (n: string) => { b.name = n; return b; }; b.setContentType = (t: string) => { b.type = t; return b; }; return b; };

/** Simula SlidesApp y DriveApp: guarda los textos y figuras de cada hoja para revisar el dibujo. */
function slidesMock(env: any) {
  const state: any = { decks: [] as any[], trashed: [] as string[] };
  const el = (kind: string, page: any, extra: any = {}) => {
    const fill = { setSolidFill: (c: string, a?: number) => { e.fill = c; e.alpha = a; return fill; }, setTransparent: () => { e.fill = null; } };
    const line = { getLineFill: () => fill, setWeight: (w: number) => { e.weight = w; return line; }, setTransparent: () => line, setDashStyle: () => { e.dash = true; } };
    const style: any = { setFontFamily: () => style, setFontSize: (n: number) => { e.size = n; return style; }, setForegroundColor: (c: string) => { e.color = c; return style; }, setBold: (b: boolean) => { e.bold = b; return style; } };
    const para: any = { setSpaceAbove: () => para, setSpaceBelow: () => para, setLineSpacing: () => para, setParagraphAlignment: (a: string) => { e.align = a; return para; } };
    const e: any = { kind, ...extra, getFill: () => fill, getBorder: () => line, getLineFill: () => fill, setWeight: line.setWeight, setDashStyle: line.setDashStyle,
      getText: () => ({ getTextStyle: () => style, getParagraphStyle: () => para }), setContentAlignment: () => e, remove: () => { page.els.splice(page.els.indexOf(e), 1); } };
    page.els.push(e); return e;
  };
  const slide = (id: string) => {
    const page: any = { id, els: [], bg: null };
    Object.assign(page, {
      getObjectId: () => id, getPageElements: () => page.els.slice(), getBackground: () => ({ setSolidFill: (c: string) => { page.bg = c; } }),
      insertShape: (t: string, x: number, y: number, w: number, h: number) => { if ([x, y, w, h].some((v) => !Number.isFinite(v))) throw new Error('figura sin medidas'); return el('shape', page, { t, x, y, w, h }); },
      insertTextBox: (text: string, x: number, y: number, w: number, h: number) => { if ([x, y, w, h].some((v) => !Number.isFinite(v))) throw new Error('texto sin medidas'); return el('text', page, { text, x, y, w, h }); },
      insertLine: (_c: string, x1: number, y1: number, x2: number, y2: number) => { if ([x1, y1, x2, y2].some((v) => !Number.isFinite(v))) throw new Error('línea sin medidas'); return el('line', page, { x1, y1, x2, y2 }); },
    });
    return page;
  };
  env.SlidesApp = {
    openById: (id: string) => { const deck = state.decks.find((d: any) => d.id === id); return deck.api; },
    create: (name: string) => {
      if (env.slidesFail) throw new Error('Slides no disponible');
      const deck: any = { id: 'deck' + (state.decks.length + 1), name, slides: [slide('p1')], closed: false };
      deck.slides[0].els.push({ kind: 'placeholder', remove() { deck.slides[0].els.shift(); } });
      state.decks.push(deck);
      return deck.api = { getId: () => deck.id, getSlides: () => deck.slides, appendSlide: () => { const s = slide('p' + (deck.slides.length + 1)); deck.slides.push(s); return s; }, saveAndClose: () => { deck.closed = true; } };
    },
    ShapeType: { RECTANGLE: 'RECTANGLE', ROUND_RECTANGLE: 'ROUND_RECTANGLE', ELLIPSE: 'ELLIPSE' }, LineCategory: { STRAIGHT: 'STRAIGHT' }, DashStyle: { DASH: 'DASH' },
    ParagraphAlignment: { START: 'START', CENTER: 'CENTER', END: 'END' }, ContentAlignment: { TOP: 'TOP', MIDDLE: 'MIDDLE' }, PredefinedLayout: { BLANK: 'BLANK' },
  };
  state.trashed = env.trashed;
  env.Slides = { Presentations: { create: (o: any) => ({ presentationId: env.SlidesApp.create(o.title).getId() }), Pages: { getThumbnail: (p: string, pg: string, o: any) => { assert.deepEqual(JSON.parse(JSON.stringify(o)), { 'thumbnailProperties.thumbnailSize': 'LARGE', 'thumbnailProperties.mimeType': 'PNG' }); return { contentUrl: 'https://thumb.test/' + p + '/' + pg }; } } } };
  env.ScriptApp = { getOAuthToken: () => 'token-google' };
  return state;
}

function makeEnv(extraProps: Record<string, string> = {}) {
  const sheets: Record<string, any[][]> = {};
  const sent: { to: string; body: string }[] = [];
  const llmCalls: any[] = [];
  const pagosCalls: string[] = [];
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
    uploads: [] as any[],
    trashed: [] as string[],
    mediaFail: false,
    media: {} as Record<string, { mime: string; size: number }>,
    pagos: (_k: string): any => ({ ok: false, estado: 'invalida' }),
    hour: '10',
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...props }), getProperty: (k: string) => props[k], setProperty: (k: string, v: string) => { props[k] = v; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n: string) => (sheets[n] ? sheet(n) : null), insertSheet: (n: string) => { sheets[n] = []; return sheet(n); } }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache[k] || null, put: (k: string, v: string) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    ContentService: { createTextOutput: (t: string) => ({ setMimeType: () => JSON.parse(t), text: t }), MimeType: { JSON: 'json' } },
    Utilities: {
      formatDate: (_d: Date, _tz: string, f: string) => (f === 'yyyy-MM' ? (env.today || TODAY).slice(0, 7) : f === 'H' ? env.hour : (env.today || TODAY)),
      base64Encode: (b: number[]) => Buffer.from(b).toString('base64'),
      sleep() {},
      getUuid: () => { uuid++; return (uuid.toString(16).padStart(8, '0') + '-aaaa-4bbb-8ccc-' + uuid.toString(16).padStart(12, '0')); },
    },
    UrlFetchApp: {
      fetch: (url: string, o: any) => {
        if (url.startsWith('https://graph.facebook.com/') && url.endsWith('/messages')) {
          assert.ok(url.includes('/v26.0/111/messages')); assert.equal(o.headers.Authorization, 'Bearer wa');
          const p = JSON.parse(o.payload);
          sent.push({ to: p.to, body: p.type === 'template' ? 'PLANTILLA ' + p.template.name + ': ' + p.template.components[0].parameters.map((x: any) => x.text).join(' | ') : p.type === 'image' ? 'IMAGEN ' + p.image.id + ': ' + p.image.caption : p.type === 'document' ? 'DOCUMENTO ' + p.document.id + ' ' + p.document.filename + ': ' + p.document.caption : p.text.body });
          return { getResponseCode: () => 200, getContentText: () => '{}' };
        }
        if (url === 'https://graph.facebook.com/v26.0/111/media') {
          assert.equal(o.headers.Authorization, 'Bearer wa'); assert.equal(o.payload.messaging_product, 'whatsapp');
          if (env.mediaFail) return { getResponseCode: () => 400, getContentText: () => '{"error":{}}' };
          env.uploads.push({ type: o.payload.type, blob: o.payload.file });
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id: 'up' + env.uploads.length }) };
        }
        const drv = url.match(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/(\w+)(\/export\?mimeType=application%2Fpdf)?$/);
        if (drv) {
          assert.equal(o.headers.Authorization, 'Bearer token-google');
          if (drv[2]) return { getResponseCode: () => 200, getBlob: () => blob('pdf:' + drv[1]) };
          assert.equal(o.method, 'patch'); assert.deepEqual(JSON.parse(o.payload), { trashed: true }); env.trashed.push(drv[1]);
          return { getResponseCode: () => 200, getContentText: () => '{}' };
        }
        if (url.startsWith('https://thumb.test/')) return { getResponseCode: () => 200, getBlob: () => blob('png:' + url) };
        const media = url.match(/^https:\/\/graph\.facebook\.com\/v26\.0\/(\d+)$/);
        if (media) {
          assert.equal(o.headers.Authorization, 'Bearer wa');
          const m = env.media[media[1]];
          if (!m) return { getResponseCode: () => 404, getContentText: () => '{}' };
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ url: 'https://media.test/' + media[1], mime_type: m.mime, file_size: m.size }) };
        }
        if (url.startsWith('https://media.test/')) {
          assert.equal(o.headers.Authorization, 'Bearer wa');
          return { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => [1, 2, 3] }) };
        }
        if (url.startsWith('https://pagos.test/exec?action=licencia&key=')) {
          pagosCalls.push(decodeURIComponent(url.split('key=')[1]));
          const r = env.pagos(decodeURIComponent(url.split('key=')[1]));
          if (r === 'caido') return { getResponseCode: () => 500, getContentText: () => 'error' };
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
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
  vm.runInContext(src + '\n;globalThis.__bot = { doGet, cardData_, doPost, setup, cleanPerfil_, monthlyHistory_, weekStats_, monthBudget_, weeklyParams_, fillTemplate_, WEEKLY_TEMPLATE, tareasProgramadas, parseAmounts_, summarize_, fmtMoney_, countryFromPhone_, countryFromText_, categoryFromText_, ruleParse_, checkMovements_, CATEGORIES, COUNTRIES };', env);
  const bot = env.__bot;
  bot.setup();
  let n = 0;
  const say = (from: string, text: string | null, extra: any = {}) => {
    sent.length = 0;
    const msg = extra.image ? { from, id: 'w' + ++n, type: 'image', image: extra.image } : text === null ? { from, id: 'w' + ++n, type: 'audio' } : { from, id: extra.id || 'w' + ++n, type: 'text', text: { body: text } };
    const payload = { entry: [{ changes: [{ value: { metadata: { phone_number_id: extra.phoneId || '111' }, contacts: [{ wa_id: from, profile: { name: 'Ana María' } }], messages: [msg] } }] }] };
    const r = bot.doPost({ parameter: { k: extra.k ?? 'secreto' }, postData: { contents: JSON.stringify(payload) } });
    return { r, replies: sent.map((s) => s.body), all: sent.slice() };
  };
  return { bot, sheets, sent, say, props, llmCalls, pagosCalls, env };
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
  const day = (k: number) => new Date(Date.UTC(2026, 8, 15 + k)).toISOString().slice(0, 10);
  const weekCases = Array.from({ length: 400 }, () => {
    const movs = Array.from({ length: rand(60) }, () => ({ fecha: day(rand(90)), tipo: rand(5) === 0 ? 'ingreso' : 'gasto', monto: (rand(2e6) + 1) / 100, categoria: BOT_CATEGORIES[rand(12)].id }));
    const today = day(14 + rand(76));
    const pres = Object.fromEntries(BOT_CATEGORIES.slice(0, 12).filter(() => rand(3) === 0).map((c) => [c.id, (rand(5e5) + 1) / 100]));
    return { movs, today, pres, week: JSON.parse(JSON.stringify(bot.weekStats_(movs, today))), budget: JSON.parse(JSON.stringify(bot.monthBudget_(movs, { presupuestos: pres }, today))) };
  });
  const cardCases = Array.from({ length: 300 }, () => {
    const movs = Array.from({ length: rand(50) }, (_, i) => ({ id: 'c' + i, fecha: day(rand(80)), tipo: rand(5) === 0 ? 'ingreso' : 'gasto', monto: (rand(3e6) + 1) / 100, categoria: BOT_CATEGORIES[rand(12)].id, descripcion: 'd' + i }));
    const today = day(20 + rand(60));
    const pres = Object.fromEntries(BOT_CATEGORIES.slice(0, 12).filter(() => rand(3) === 0).map((c) => [c.id, rand(4) === 0 ? 0 : (rand(4e5) + 1) / 100]));
    return { movs, today, pres, card: JSON.parse(JSON.stringify(bot.cardData_(movs, { presupuestos: pres }, today))) };
  });
  await new Promise((done) => process.stdout.write(JSON.stringify({ amountsCases, summaryCases, weekCases, cardCases }), done));
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
  assert.ok(x.replies[0].includes('https://pulso.test/tablero/?t='));
  x = say(CO, '¿Cuánto llevo en restaurantes?');
  assert.equal(x.replies[0], 'Restaurantes y domicilios en noviembre 2026: $ 25.000 en 1 movimiento.');
  x = say(CO, 'borrar');
  assert.ok(x.replies[0].startsWith('Eliminado: Salario · $ 2.100.000'));
  assert.equal(sheets.Movimientos.length, 3);
  x = say(CO, 'gasté plata');
  assert.ok(x.replies[0].includes('No encontré un monto'));
  x = say(CO, null);
  assert.ok(x.replies[0].includes('Entiendo mensajes de texto y fotos de recibos'));
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

// ---- 7. Perfil desde el tablero, avisos de presupuesto y aprendizaje ----
{
  const { say, sheets, bot } = makeEnv();
  const CO = '573001234567';
  say(CO, 'hola');
  const token = sheets.Usuarios[1][4];
  const web = (perfil: any, t = token) => bot.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'perfil', t, perfil }) } });
  assert.equal(web({ presupuestos: { comida: 100000 } }, 'x'.repeat(32)).ok, false, 'enlace inválido no guarda');
  const r = web({ presupuestos: { comida: 100000, salario: 5, transporte: -3 }, metas: [{ nombre: '<i>Viaje</i>', monto: 900000, ahorrado: 300000, fecha: '2027-05' }], deudas: [{ name: 'TC', balance: 1e6, rate: 2.4, min: 80000 }], pagosFijos: [{ nombre: 'Netflix', monto: 45000, dia: 40, categoria: 'ocio' }], ahorros: 500000, mesesFondo: 4 });
  assert.equal(r.ok, true);
  let g = bot.doGet({ parameter: { action: 'tablero', t: token } });
  assert.deepEqual(g.perfil.presupuestos, { comida: 100000 });
  assert.equal(g.perfil.metas[0].nombre, 'iViaje/i'); assert.equal(g.perfil.pagosFijos[0].dia, 28); assert.equal(g.perfil.mesesFondo, 4);
  assert.equal(g.hoy, TODAY);
  // Mismas reglas de limpieza que el sitio
  // Aviso de presupuesto al registrar
  let x = say(CO, 'almuerzo 50 mil');
  assert.ok(x.replies[0].includes('Presupuesto de Restaurantes y domicilios: vas en el 50% (te quedan $ 50.000)'), x.replies[0]);
  x = say(CO, 'cena 35 mil');
  assert.ok(x.replies[0].includes('⚠ Vas en el 85% de tu presupuesto de Restaurantes y domicilios. Te quedan $ 15.000.'), x.replies[0]);
  x = say(CO, 'pizza 30 mil');
  assert.ok(x.replies[0].includes('⚠ Te pasaste en Restaurantes y domicilios por $ 15.000 (115% del presupuesto).'), x.replies[0]);
  g = bot.doGet({ parameter: { action: 'tablero', t: token } });
  assert.deepEqual(g.historico, [{ mes: TODAY.slice(0, 7), ingresos: 0, porCategoria: { comida: 115000 } }]);
  // Aprende de una corrección: "rappi" mal clasificado → mercado; la próxima vez ya va a mercado
  x = say(CO, 'gastos varios 20 mil');
  x = say(CO, 'mercado');
  assert.equal(x.replies[0], 'Corregido: Mercado.');
  x = say(CO, 'varios 15 mil');
  assert.ok(x.replies[0].includes('Mercado · $ 15.000'), x.replies[0]);
  // Guardar desde el tablero conserva lo aprendido
  web({ presupuestos: { comida: 200000 } });
  x = say(CO, 'varios 5 mil');
  assert.ok(x.replies[0].includes('Mercado · $ 5.000'), x.replies[0]);
  // Borrar mis datos elimina también el perfil
  say(CO, 'borrar mis datos'); say(CO, 'CONFIRMAR BORRADO');
  assert.equal(sheets.Perfiles.length, 1);
  console.log('✓ Perfil desde el tablero, avisos de presupuesto al 50/85/115 %, aprendizaje de correcciones y borrado completo');
}

// ---- 8. El bot y el sitio limpian el perfil igual ----
{
  const { bot } = makeEnv();
  const { cleanPerfil } = await import('../src/lib/premium.ts');
  const samples = [
    { presupuestos: { comida: 100, salario: 50, ocio: '20', xx: 3 }, metas: [{ nombre: 'x'.repeat(80), monto: '10', ahorrado: -1, fecha: '2027-01' }], deudas: [{ name: 'A', balance: 1, rate: 50, min: 'x' }], pagosFijos: [{ nombre: 'N', monto: 1, dia: 0, categoria: 'zzz' }], ahorros: '5', mesesFondo: '6' },
    {}, { metas: Array.from({ length: 20 }, (_, i) => ({ nombre: 'm' + i, monto: i })) },
  ];
  for (const p of samples) assert.deepEqual(JSON.parse(JSON.stringify(bot.cleanPerfil_(p))), cleanPerfil(p as any));
  console.log('✓ Limpieza del perfil idéntica en el bot y en el sitio');
}

// ---- 9. Histórico mensual del tablero: el bot y el sitio agrupan igual ----
{
  const { bot } = makeEnv();
  const { monthlyHistory } = await import('../src/lib/premium.ts');
  const gastoCats = BOT_CATEGORIES.map((c) => c.id);
  let sd = 9; const rnd = (k: number) => { sd = (sd * 1103515245 + 12345) % 2147483648; return Math.floor((sd / 2147483648) * k); };
  for (let t = 0; t < 200; t++) {
    const movs = Array.from({ length: rnd(80) }, (_, i) => ({ id: 'm' + i, fecha: `${2024 + rnd(3)}-${String(1 + rnd(12)).padStart(2, '0')}-${String(1 + rnd(28)).padStart(2, '0')}`, tipo: rnd(4) ? 'gasto' : 'ingreso', monto: (rnd(9000000) + 1) / 100, categoria: gastoCats[rnd(gastoCats.length)], descripcion: 'x' }));
    assert.deepEqual(JSON.parse(JSON.stringify(bot.monthlyHistory_(movs))), monthlyHistory(movs as any));
  }
  const g = bot.doGet({ parameter: { action: 'tablero', t: 'no-existe' } });
  assert.equal(g.ok, false);
  console.log('✓ Histórico mensual idéntico en el bot y en el sitio (200 casos)');
}

// Utilidades para leer y escribir columnas de la hoja Usuarios en las pruebas
const userRow = (sheets: any, waId: string) => sheets.Usuarios.find((r: any[]) => String(r[0]) === waId);
const getU = (sheets: any, waId: string, k: string) => userRow(sheets, waId)?.[sheets.Usuarios[0].indexOf(k)];
const setU = (sheets: any, waId: string, k: string, v: any) => { userRow(sheets, waId)[sheets.Usuarios[0].indexOf(k)] = v; };

// ---- 10. Suscripción: activación con código, acceso, modo consulta y borrado a los 90 días ----
{
  const { say, sheets, bot, env, pagosCalls } = makeEnv({ PAGOS_URL: 'https://pagos.test/exec', CONTACTO: 'hola@pulso.test' });
  const A = '573001112233', B = '573004445566';
  const KEY = 'AB12CD34-EF56-7890-AAAA-BBBBCCCCDDDD', KEY2 = 'NEW12345-0000-1111';
  const st: Record<string, any> = { [KEY]: { ok: true, estado: 'activa' } };
  env.pagos = (k: string) => st[k] ?? { ok: false, estado: 'invalida' };

  let x = say(A, 'almuerzo 25 mil');
  assert.ok(x.replies[0].includes('necesitas Pulso Premium: https://pulso.test/#precios'), x.replies[0]);
  assert.equal(sheets.Usuarios.length, 1, 'sin suscripción no se crea el usuario');
  x = say(A, 'taxi 10 mil'); assert.equal(x.replies.length, 0, 'la invitación no se repite');
  x = say(A, 'activar ZZZZ9999ZZZZ'); assert.ok(x.replies[0].includes('No reconozco ese código') && x.replies[0].includes('hola@pulso.test'));
  x = say(A, 'activar resumenes'); assert.equal(pagosCalls.at(-1), 'ZZZZ9999ZZZZ', 'una palabra sin dígitos no es un código');

  x = say(A, 'activar ' + KEY);
  assert.ok(x.replies[0].startsWith('✓ Tu suscripción a Pulso Premium quedó activa en este número.'), x.replies[0]);
  assert.ok(x.replies[0].includes('Cada lunes te enviaré el resumen'));
  assert.equal(getU(sheets, A, 'licencia'), KEY); assert.equal(getU(sheets, A, 'acceso'), 'activa');
  x = say(A, 'almuerzo 25 mil'); assert.ok(x.replies[0].startsWith('✓ Gasto'), x.replies[0]);
  const calls = pagosCalls.length;
  say(A, 'taxi 12 mil'); assert.equal(pagosCalls.length, calls, 'no revisa la clave en cada mensaje');
  x = say(B, 'activar ' + KEY); assert.ok(x.replies[0].includes('ya está activo en otro número'));
  assert.equal(userRow(sheets, B), undefined);

  const token = getU(sheets, A, 'token');
  let g = bot.doGet({ parameter: { action: 'tablero', t: token } });
  assert.equal(g.acceso.estado, 'activa');

  // La suscripción termina: a las 12 h de la última revisión se consulta otra vez y queda en modo consulta
  st[KEY] = { ok: false, estado: 'vencida' }; setU(sheets, A, 'acceso_revisado', '2026-11-01T00:00:00.000Z');
  x = say(A, 'mercado 50 mil');
  assert.ok(x.replies[0].includes('terminó el 4 de noviembre de 2026') && x.replies[0].includes('hasta el 2 de febrero de 2027'), x.replies[0]);
  const nMovs = sheets.Movimientos.length; assert.equal(nMovs, 3);
  x = say(A, 'pan 5 mil'); assert.equal(x.replies.length, 0); assert.equal(sheets.Movimientos.length, nMovs, 'en consulta no registra');
  x = say(A, 'tablero'); assert.ok(x.replies[0].includes('modo consulta'));
  x = say(A, 'resumen'); assert.ok(x.replies[0].includes('Tu mes hasta hoy'));
  g = bot.doGet({ parameter: { action: 'tablero', t: token } });
  assert.deepEqual([g.acceso.estado, g.acceso.vence, g.acceso.hasta], ['vencida', '2026-11-04', '2027-02-02']);
  const web = bot.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'perfil', t: token, perfil: { presupuestos: { comida: 1 } } }) } });
  assert.equal(web.ok, false); assert.ok(web.error.includes('modo consulta'));

  // Renueva con un código nuevo: vuelve a registrar y conserva sus datos
  st[KEY2] = { ok: true, estado: 'activa' };
  x = say(A, 'activar ' + KEY2); assert.ok(x.replies[0].includes('de nuevo. Tus registros siguen aquí'), x.replies[0]);
  x = say(A, 'mercado 50 mil'); assert.ok(x.replies[0].startsWith('✓ Gasto'));
  // Si el servicio de pagos falla, se conserva el acceso (no se bloquea a quien pagó)
  st[KEY2] = 'caido'; setU(sheets, A, 'acceso_revisado', '2026-11-01T00:00:00.000Z');
  x = say(A, 'pan 3 mil'); assert.ok(x.replies[0].startsWith('✓ Gasto'));

  // Tarea programada: detecta el vencimiento y borra los datos pasados los 90 días
  st[KEY2] = { ok: false, estado: 'vencida' }; setU(sheets, A, 'acceso_revisado', '2026-11-01T00:00:00.000Z');
  env.today = '2027-01-10';
  bot.tareasProgramadas();
  assert.equal(getU(sheets, A, 'acceso'), 'vencida'); assert.equal(getU(sheets, A, 'vence'), '2027-01-10');
  setU(sheets, A, 'vence', '2026-10-01');
  bot.tareasProgramadas();
  assert.equal(userRow(sheets, A), undefined, 'datos borrados tras 90 días en consulta');
  assert.equal(sheets.Movimientos.length, 1);
  env.today = undefined;

  // Los números de la beta usan el bot sin suscripción
  const beta = makeEnv({ PAGOS_URL: 'https://pagos.test/exec', BETA_NUMEROS: '573009990000' });
  x = beta.say('573009990000', 'hola'); assert.ok(x.replies[0].includes('Soy el asistente'));
  x = beta.say('573009990000', 'almuerzo 25 mil'); assert.ok(x.replies[0].startsWith('✓ Gasto'));
  assert.equal(beta.pagosCalls.length, 0);
  console.log('✓ Suscripción: invitación, activación con código, un número por código, modo consulta, renovación y borrado a los 90 días');
}

// ---- 11. Fotos de recibos ----
{
  const { say, sheets, env, llmCalls } = makeEnv({ ANTHROPIC_API_KEY: 'k', MAX_FOTOS_DIA: '2' });
  const P = '573007778899';
  say(P, 'hola');
  env.media['123456'] = { mime: 'image/jpeg', size: 200000 };
  env.llm = (body: any) => Array.isArray(body.messages[0].content) && body.messages[0].content[0].type === 'image'
    ? { intencion: 'movimientos', movimientos: [{ tipo: 'gasto', monto: 84500, categoria: 'mercado', descripcion: 'Supermercado', fecha: '2026-11-02' }, { tipo: 'gasto', monto: 1, categoria: 'otros', descripcion: 'x' }] }
    : null;
  let x = say(P, null, { image: { id: '123456' } });
  assert.ok(x.replies[0].startsWith('Leí tu recibo:\n✓ Gasto · Mercado · $ 84.500 — Supermercado (2026-11-02)'), x.replies[0]);
  assert.equal(sheets.Movimientos.length, 2, 'una foto = un gasto');
  assert.equal(sheets.Movimientos[1][11], 'foto');
  assert.equal(llmCalls.at(-1).messages[0].content[0].source.data, Buffer.from([1, 2, 3]).toString('base64'));
  assert.ok(llmCalls.at(-1).system.includes('TOTAL pagado'));
  x = say(P, null, { image: { id: '123456', caption: 'mercado 90 mil' } });
  assert.ok(x.replies[0].includes('$ 90.000'), 'el monto escrito en el texto manda');
  x = say(P, null, { image: { id: '123456' } }); assert.ok(x.replies[0].includes('máximo de fotos'));
  x = say(P, null, { image: { id: '123456' } }); assert.equal(x.replies.length, 0);

  const e2 = makeEnv({ ANTHROPIC_API_KEY: 'k' });
  e2.say(P, 'hola');
  e2.env.media['777777'] = { mime: 'image/jpeg', size: 5e6 };
  x = e2.say(P, null, { image: { id: '777777' } }); assert.ok(x.replies[0].includes('muy pesada'));
  e2.env.media['888888'] = { mime: 'image/png', size: 1000 };
  e2.env.llm = () => ({ intencion: 'otro', respuesta: 'No veo un recibo en la foto. Escríbeme el gasto.' });
  x = e2.say(P, null, { image: { id: '888888' } }); assert.equal(x.replies[0], 'No veo un recibo en la foto. Escríbeme el gasto.');
  x = e2.say(P, null, { image: { id: '999999' } }); assert.ok(x.replies[0].includes('No pude abrir la foto'));
  const e3 = makeEnv({}); e3.say(P, 'hola');
  x = e3.say(P, null, { image: { id: '123456' } }); assert.ok(x.replies[0].includes('no puedo leer fotos'));
  console.log('✓ Fotos de recibos: descarga segura, total leído por la IA, el monto escrito manda, límite diario y errores claros');
}

// ---- 12. Resumen semanal ----
{
  const { say, sheets, bot, env, sent } = makeEnv({ WA_PLANTILLA_RESUMEN: 'resumen_semanal' });
  const W = '573001010101';
  say(W, 'hola');
  say(W, 'ayuda');
  const add = (fecha: string, tipo: string, monto: number, categoria: string) => sheets.Movimientos.push(['m' + fecha + monto, W, fecha, tipo, monto, 'COP', categoria, '', '', 'x' + fecha + monto, '', 'prueba']);
  add('2026-10-27', 'gasto', 80000, 'mercado');
  add('2026-11-03', 'gasto', 100000, 'mercado'); add('2026-11-05', 'gasto', 30000, 'comida'); add('2026-11-08', 'gasto', 20000, 'comida');
  add('2026-11-06', 'ingreso', 500000, 'salario'); add('2026-11-09', 'gasto', 7000, 'transporte');
  const token = getU(sheets, W, 'token');
  bot.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'perfil', t: token, perfil: { presupuestos: { comida: 40000 } } }) } });

  env.today = '2026-11-09'; env.hour = '10';
  sent.length = 0; bot.tareasProgramadas();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, 'Hola Ana, este es tu resumen de la semana del 2 nov al 8 nov: gastaste $ 150.000 en 3 registros. Frente a la semana anterior: 88 % más. Donde más gastaste: Mercado ($ 100.000). Presupuesto del mes: te pasaste en Restaurantes y domicilios. Escribe *tablero* para ver el detalle o *resumen no* si no quieres recibir este mensaje.');
  sent.length = 0; bot.tareasProgramadas(); assert.equal(sent.length, 0, 'una vez por semana');

  // Fuera de la ventana de 24 h: va con la plantilla aprobada por Meta
  setU(sheets, W, 'resumen_enviado', ''); setU(sheets, W, 'ultimo_msg_ts', '2026-11-01T00:00:00.000Z');
  sent.length = 0; bot.tareasProgramadas();
  assert.equal(sent[0].body, 'PLANTILLA resumen_semanal: Ana | 2 nov al 8 nov | $ 150.000 | 3 | 88 % más | Mercado ($ 100.000) | te pasaste en Restaurantes y domicilios');

  // Antes de la hora, después del miércoles, sin movimientos recientes o desactivado: no se envía
  setU(sheets, W, 'resumen_enviado', '');
  env.hour = '7'; sent.length = 0; bot.tareasProgramadas(); assert.equal(sent.length, 0);
  env.hour = '10'; env.today = '2026-11-12'; bot.tareasProgramadas(); assert.equal(sent.length, 0);
  env.today = '2026-12-07'; bot.tareasProgramadas(); assert.equal(sent.length, 0, 'sin movimientos en dos semanas');
  env.today = undefined;
  let x = say(W, 'resumen no'); assert.ok(x.replies[0].includes('ya no te enviaré'));
  setU(sheets, W, 'resumen_enviado', ''); env.today = '2026-11-09'; sent.length = 0; bot.tareasProgramadas(); assert.equal(sent.length, 0);
  env.today = undefined;
  x = say(W, 'resumen si'); assert.ok(x.replies[0].includes('cada lunes'));

  // Cifras: semana sin gastos previos y presupuesto sin definir
  const st = bot.weekStats_([{ fecha: '2026-11-04', tipo: 'gasto', monto: 10, categoria: 'ocio' }], '2026-11-10');
  assert.deepEqual(JSON.parse(JSON.stringify(st)), { desde: '2026-11-02', hasta: '2026-11-08', gasto: 10, n: 1, anterior: 0, cambio: null, top: { categoria: 'ocio', monto: 10 } });
  const p = bot.weeklyParams_({ nombre: '' }, st, { definido: false, excedidas: [], alerta: [] }, bot.COUNTRIES.find((c: any) => c.id === 'MX'));
  assert.deepEqual(JSON.parse(JSON.stringify(p)), ['de nuevo', '2 nov al 8 nov', '$10', '1', 'sin gastos para comparar', 'Entretenimiento y suscripciones ($10)', 'aún no lo defines; puedes hacerlo en tu tablero']);
  assert.ok(!bot.fillTemplate_(bot.WEEKLY_TEMPLATE, p).includes('{{'));
  console.log('✓ Resumen semanal: cifras de la semana, mensaje normal en la ventana de 24 h, plantilla fuera de ella, una vez por semana y opción de no recibirlo');
}

// ---- 13. Backend de pagos (apps-script/Code.gs): estado de la clave para el bot y enlace de activación ----
{
  const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  let ls: any = null, status = 200;
  const props: Record<string, string> = { LS_STORE_ID: '9', CODIGOS_CORTESIA: 'PULSO-AAAA-1111', BOT_WHATSAPP: '+57 300 123 4567', SITE_URL: 'https://pulso.test' };
  const cache: Record<string, string> = {};
  const ctx: any = {
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...props }), getProperty: (k: string) => props[k] }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache[k] || null, put: (k: string, v: string) => { cache[k] = v; } }) },
    ContentService: { createTextOutput: (t: string) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 'json' } },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => status, getContentText: () => JSON.stringify(ls) }) },
    SpreadsheetApp: { openById: () => { throw new Error('sin hoja'); } },
  };
  vm.createContext(ctx);
  vm.runInContext(code + '\n;globalThis.__pagos = { doGet, activationLink_, cfg_ };', ctx);
  const P = ctx.__pagos;
  const check = (key: string) => P.doGet({ parameter: { action: 'licencia', key } });
  const lic = (st: string, valid: boolean, store = 9) => ({ valid, license_key: { key: 'k', status: st }, meta: { store_id: store, product_id: 1 } });
  assert.equal(check('pulso-aaaa-1111').estado, 'activa');
  ls = lic('active', true); assert.deepEqual(check('KEY-ACTIVA-1'), { ok: true, estado: 'activa' });
  ls = lic('inactive', true); assert.equal(check('KEY-INACTIVA-1').estado, 'activa');
  ls = lic('expired', false); assert.equal(check('KEY-VENCIDA-1').estado, 'vencida');
  ls = lic('disabled', false); assert.equal(check('KEY-DESACT-1').estado, 'vencida');
  ls = lic('active', true, 5); assert.equal(check('KEY-OTRA-TIENDA').estado, 'invalida');
  ls = { valid: false, error: 'license_key not found.', license_key: null, meta: null }; assert.equal(check('KEY-NO-EXISTE').estado, 'invalida');
  assert.equal(check('x').estado, 'invalida');
  status = 503; assert.equal(check('KEY-CAIDO-001').estado, 'error', 'si Lemon Squeezy falla, el bot conserva el acceso');
  assert.equal(P.activationLink_(P.cfg_(), 'AB12-CD34'), 'https://wa.me/573001234567?text=activar%20AB12-CD34');
  console.log('✓ Pagos: estado activa/vencida/invalida para el bot, error separado y botón de activación por WhatsApp');
}

// ---- 14. Tablero en WhatsApp: imagen + PDF con el mismo estilo del sitio ----
{
  const { say, sheets, bot, env } = makeEnv();
  const slides = slidesMock(env);
  const T = '573002020202';
  say(T, 'hola');
  let x = say(T, 'tablero');
  assert.equal(x.all.length, 1); assert.ok(x.replies[0].includes('Aún no tienes movimientos') && x.replies[0].includes('https://pulso.test/tablero/?t='), x.replies[0]);
  assert.equal(slides.decks.length, 0, 'sin movimientos no se arma la imagen');

  const add = (fecha: string, tipo: string, monto: number, categoria: string, desc = '') => sheets.Movimientos.push(['m' + fecha + monto, T, fecha, tipo, monto, 'COP', categoria, desc, '', 'x' + fecha + monto, '', 'prueba']);
  add('2026-10-30', 'gasto', 999000, 'mercado', 'Mes anterior');
  add('2026-11-01', 'ingreso', 3000000, 'salario', 'Salario'); add('2026-11-01', 'gasto', 1200000, 'vivienda', 'Arriendo');
  add('2026-11-02', 'gasto', 250000, 'comida', 'Domicilios'); add('2026-11-03', 'gasto', 90000, 'transporte', 'Gasolina');
  const token = getU(sheets, T, 'token');
  bot.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'perfil', t: token, perfil: { presupuestos: { comida: 200000, transporte: 100000 } } }) } });

  x = say(T, 'tablero');
  assert.equal(x.all.length, 2, x.replies.join(' || ') + JSON.stringify(sheets.Errores));
  assert.ok(x.replies[0].startsWith('IMAGEN up1: Tu tablero · noviembre 2026') && x.replies[0].includes('https://pulso.test/tablero/?t=' + token), x.replies[0]);
  assert.ok(x.replies[1].startsWith('DOCUMENTO up2 Pulso - Noviembre 2026.pdf'), x.replies[1]);
  assert.deepEqual(env.uploads.map((u: any) => [u.type, u.blob.type]), [['image/png', 'image/png'], ['application/pdf', 'application/pdf']]);
  assert.ok(env.uploads[0].blob.data.startsWith('png:https://thumb.test/deck1/p1'));
  const deck = slides.decks[0];
  assert.ok(deck.closed && slides.trashed.includes('deck1'), 'la presentación temporal se cierra y se borra');
  assert.equal(deck.slides.length, 2);
  const texts = (i: number) => deck.slides[i].els.filter((e: any) => e.kind === 'text').map((e: any) => e.text);
  const t1 = texts(0);
  for (const want of ['$ 3.000.000', '$ 1.540.000', '$ 1.460.000', 'Tasa de ahorro 49 %', '50 %', '1 de 2 categorías dentro', 'Vivienda', '125 % de $ 200.000 · te pasaste', '90 % de $ 100.000', '78 % del gasto'])
    assert.ok(t1.includes(want), 'falta en la imagen: ' + want + ' → ' + t1.join(' | '));
  assert.ok(!t1.some((t: string) => t.includes('999.000')), 'solo el mes en curso');
  assert.equal(deck.slides[0].bg, '#050806');
  const lines = deck.slides[0].els.filter((e: any) => e.kind === 'line' && e.fill === '#2ee59d' && e.weight === 2);
  assert.equal(lines.length, 3, 'línea del gasto acumulado: días 1 a 4');
  const t2 = texts(1);
  assert.ok(t2.includes('1 nov\n1 nov\n2 nov\n3 nov'.split('\n').reverse().join('\n')) || t2.some((t: string) => t.startsWith('3 nov\n2 nov\n1 nov')), t2.join(' | '));
  assert.ok(t2.some((t: string) => t.includes('+$ 3.000.000') && t.includes('−$ 1.200.000')) && t2.some((t: string) => t.includes('Ingreso')));
  assert.ok(t2.includes('Estos son todos tus movimientos del mes.'));

  // Límite diario de imágenes, error al subir y opción de solo enlace
  for (let i = 0; i < 5; i++) say(T, 'tablero');
  x = say(T, 'tablero'); assert.equal(x.all.length, 1); assert.ok(x.replies[0].includes('Hoy ya te envié la imagen 6 veces'), x.replies[0]);
  const { say: say2, sheets: sh2, env: env2 } = makeEnv({ MAX_TABLEROS_DIA: '50' });
  const s2 = slidesMock(env2);
  say2(T, 'hola'); sh2.Movimientos.push(['m1', T, '2026-11-02', 'gasto', 5000, 'COP', 'comida', '', '', 'x1', '', 'prueba']);
  env2.mediaFail = true;
  x = say2(T, 'tablero'); assert.equal(x.all.length, 1); assert.ok(x.replies[0].startsWith('Tu tablero:\nhttps://pulso.test/tablero/?t='), x.replies[0]);
  assert.ok(s2.trashed.includes('deck1'), 'se borra aunque falle el envío');
  assert.ok(sh2.Errores && sh2.Errores.length > 1, 'el error queda registrado');
  env2.mediaFail = false; env2.slidesFail = true;
  x = say2(T, 'tablero'); assert.ok(x.replies[0].startsWith('Tu tablero:\n'));
  const { say: say3, sheets: sh3, env: env3 } = makeEnv({ TABLERO_IMAGEN: 'no' });
  const s3 = slidesMock(env3);
  say3(T, 'hola'); sh3.Movimientos.push(['m1', T, '2026-11-02', 'gasto', 5000, 'COP', 'comida', '', '', 'x1', '', 'prueba']);
  x = say3(T, 'tablero'); assert.ok(x.replies[0].startsWith('Tu tablero:\n')); assert.equal(s3.decks.length, 0);

  // Mes con muchos movimientos y categorías: la hoja 1 muestra 6 y la 2 hasta 22 filas
  const many = Array.from({ length: 30 }, (_, i) => ({ fecha: '2026-11-0' + (1 + (i % 4)), tipo: 'gasto', monto: 1000 + i, categoria: ['vivienda', 'mercado', 'servicios', 'transporte', 'salud', 'educacion', 'conectividad', 'comida'][i % 8], descripcion: 'g' + i }));
  const d = bot.cardData_(many, { presupuestos: {} }, '2026-11-04');
  assert.equal(d.ultimos.length, 22); assert.equal(d.restantes, 8); assert.equal(d.cats.length, 8); assert.equal(d.cumplimiento, null);
  assert.equal(d.ultimos[0].fecha, '2026-11-04'); assert.equal(d.ultimos[0].descripcion, 'g27', 'el más reciente primero');
  console.log('✓ Tablero en WhatsApp: imagen y PDF del mes, mismo estilo del sitio, enlace en el mensaje, archivo temporal borrado, límite diario y respaldo con enlace');
}
