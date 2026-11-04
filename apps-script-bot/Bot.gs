/**
 * Pulso Financiero — Bot de WhatsApp (piloto). Archivo único y autocontenido de Google Apps Script.
 *
 * Qué hace:
 *  1. Recibe los mensajes de WhatsApp (a través del relevo de Cloudflare, ver relay/worker.js).
 *  2. Entiende gastos e ingresos escritos como la gente escribe ("almuerzo 25 mil", "me pagaron 4,5 palos")
 *     con IA (Claude) y, si la IA no está disponible, con reglas propias.
 *  3. Lee fotos de recibos con IA y anota el total.
 *  4. Responde con una confirmación, resúmenes del mes y el enlace personal al tablero.
 *  5. Guarda todo en una hoja de cálculo y entrega los movimientos al sitio (GET ?action=tablero).
 *  6. Liga cada número a una suscripción: "activar CÓDIGO" (el correo de bienvenida trae el botón).
 *     Si la suscripción termina, el tablero queda en modo consulta DIAS_CONSULTA días y luego se borran los datos.
 *  7. Envía cada lunes el resumen de la semana (plantilla de Meta o mensaje normal si la persona escribió en las últimas 24 h).
 *
 * Puesta en marcha: ver README.md, sección "Bot de WhatsApp".
 * Propiedades del script: WA_TOKEN, WA_PHONE_NUMBER_ID, RELAY_SECRET, ANTHROPIC_API_KEY,
 * y opcionales SITE_URL, PAGOS_URL (activa el cobro), BETA_NUMEROS, CONTACTO, RENOVAR_URL, DIAS_CONSULTA,
 * WA_PLANTILLA_RESUMEN, WA_PLANTILLA_IDIOMA, RESUMEN_HORA, LLM_MODEL, GRAPH_VERSION, MAX_MENSAJES_DIA, MAX_FOTOS_DIA.
 * Ejecuta instalarTareas() una vez para la revisión de suscripciones y el resumen semanal.
 *
 * Las categorías (sección 2) deben coincidir con src/lib/bot-categories.ts; `npm test` lo verifica.
 */

/* ============================================================
 * 1. CONFIGURACIÓN
 * ============================================================ */

const BOT_DEFAULTS = {
  BRAND_NAME: 'Pulso Financiero',
  SITE_URL: 'https://tudominio.com',
  GRAPH_VERSION: 'v26.0',
  LLM_MODEL: 'claude-haiku-4-5',
  MAX_MENSAJES_DIA: '60',
  MAX_FOTOS_DIA: '15',
  BETA_NUMEROS: '',
  PAGOS_URL: '',
  RENOVAR_URL: '',
  CONTACTO: '',
  DIAS_CONSULTA: '90',
  WA_PLANTILLA_RESUMEN: '',
  WA_PLANTILLA_IDIOMA: 'es',
  RESUMEN_HORA: '9',
  PREMIUM_NAME: 'Pulso Premium'
};

function cfg_() {
  return Object.assign({}, BOT_DEFAULTS, PropertiesService.getScriptProperties().getProperties());
}

/* ============================================================
 * 2. PAÍSES Y CATEGORÍAS
 * ============================================================ */

// sep: separador de miles; dec: decimales a mostrar si el monto no es entero.
const COUNTRIES = [
  { id: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', sep: '.', dec: 0, tz: 'America/Argentina/Buenos_Aires', prefix: ['54'] },
  { id: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs ', sep: '.', dec: 2, tz: 'America/La_Paz', prefix: ['591'] },
  { id: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', sep: '.', dec: 0, tz: 'America/Santiago', prefix: ['56'] },
  { id: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', sep: '.', dec: 0, tz: 'America/Bogota', prefix: ['57'] },
  { id: 'CR', name: 'Costa Rica', currency: 'CRC', symbol: '₡', sep: '.', dec: 0, tz: 'America/Costa_Rica', prefix: ['506'] },
  { id: 'EC', name: 'Ecuador', currency: 'USD', symbol: '$', sep: '.', dec: 2, tz: 'America/Guayaquil', prefix: ['593'] },
  { id: 'SV', name: 'El Salvador', currency: 'USD', symbol: '$', sep: ',', dec: 2, tz: 'America/El_Salvador', prefix: ['503'], aliases: ['salvador'] },
  { id: 'ES', name: 'España', currency: 'EUR', symbol: '€', sep: '.', dec: 2, tz: 'Europe/Madrid', prefix: ['34'], suffix: true },
  { id: 'US', name: 'Estados Unidos', currency: 'USD', symbol: '$', sep: ',', dec: 2, tz: 'America/New_York', prefix: ['1'], aliases: ['eeuu', 'usa', 'eua'] },
  { id: 'GT', name: 'Guatemala', currency: 'GTQ', symbol: 'Q', sep: ',', dec: 2, tz: 'America/Guatemala', prefix: ['502'] },
  { id: 'HN', name: 'Honduras', currency: 'HNL', symbol: 'L ', sep: ',', dec: 2, tz: 'America/Tegucigalpa', prefix: ['504'] },
  { id: 'MX', name: 'México', currency: 'MXN', symbol: '$', sep: ',', dec: 2, tz: 'America/Mexico_City', prefix: ['52'] },
  { id: 'NI', name: 'Nicaragua', currency: 'NIO', symbol: 'C$', sep: ',', dec: 2, tz: 'America/Managua', prefix: ['505'] },
  { id: 'PA', name: 'Panamá', currency: 'USD', symbol: '$', sep: ',', dec: 2, tz: 'America/Panama', prefix: ['507'] },
  { id: 'PY', name: 'Paraguay', currency: 'PYG', symbol: '₲', sep: '.', dec: 0, tz: 'America/Asuncion', prefix: ['595'] },
  { id: 'PE', name: 'Perú', currency: 'PEN', symbol: 'S/ ', sep: ',', dec: 2, tz: 'America/Lima', prefix: ['51'] },
  { id: 'PR', name: 'Puerto Rico', currency: 'USD', symbol: '$', sep: ',', dec: 2, tz: 'America/Puerto_Rico', prefix: ['1787', '1939'] },
  { id: 'DO', name: 'República Dominicana', currency: 'DOP', symbol: 'RD$', sep: ',', dec: 2, tz: 'America/Santo_Domingo', prefix: ['1809', '1829', '1849'], aliases: ['rep dominicana', 'dominicana', 'rd'] },
  { id: 'UY', name: 'Uruguay', currency: 'UYU', symbol: '$', sep: '.', dec: 0, tz: 'America/Montevideo', prefix: ['598'] },
  { id: 'VE', name: 'Venezuela', currency: 'USD', symbol: '$', sep: '.', dec: 2, tz: 'America/Caracas', prefix: ['58'] }
];

// Categorías: las de gasto coinciden con el tablero (src/lib/finance.js); "deudas" son pagos a créditos y tarjetas.
const CATEGORIES = [
  { id: 'vivienda', tipo: 'gasto', name: 'Vivienda', words: ['arriendo', 'alquiler', 'renta', 'hipoteca', 'administracion', 'condominio'] },
  { id: 'mercado', tipo: 'gasto', name: 'Mercado', words: ['mercado', 'supermercado', 'super', 'despensa', 'tienda', 'verduras', 'carniceria', 'panaderia', 'abarrotes'] },
  { id: 'servicios', tipo: 'gasto', name: 'Servicios básicos', words: ['luz', 'agua', 'gas', 'energia', 'servicios', 'recibo'] },
  { id: 'transporte', tipo: 'gasto', name: 'Transporte', words: ['taxi', 'uber', 'didi', 'cabify', 'bus', 'buseta', 'metro', 'transmilenio', 'gasolina', 'nafta', 'combustible', 'parqueadero', 'estacionamiento', 'peaje', 'pasaje', 'moto', 'transporte'] },
  { id: 'salud', tipo: 'gasto', name: 'Salud y seguros', words: ['farmacia', 'drogueria', 'medico', 'medicina', 'medicamento', 'consulta', 'eps', 'seguro', 'odontologo', 'dentista', 'laboratorio'] },
  { id: 'educacion', tipo: 'gasto', name: 'Educación', words: ['colegio', 'universidad', 'matricula', 'curso', 'libros', 'pension escolar', 'utiles', 'educacion'] },
  { id: 'conectividad', tipo: 'gasto', name: 'Celular e internet', words: ['celular', 'internet', 'plan', 'recarga', 'datos', 'telefono', 'wifi'] },
  { id: 'comida', tipo: 'gasto', name: 'Restaurantes y domicilios', words: ['almuerzo', 'desayuno', 'cena', 'comida', 'restaurante', 'rappi', 'domicilio', 'pedidosya', 'ubereats', 'cafe', 'pizza', 'hamburguesa', 'corrientazo', 'onces', 'helado'] },
  { id: 'compras', tipo: 'gasto', name: 'Ropa y compras', words: ['ropa', 'zapatos', 'tenis', 'camisa', 'compras', 'amazon', 'mercadolibre', 'regalo', 'centro comercial'] },
  { id: 'ocio', tipo: 'gasto', name: 'Entretenimiento y suscripciones', words: ['cine', 'netflix', 'spotify', 'disney', 'hbo', 'suscripcion', 'fiesta', 'rumba', 'cerveza', 'trago', 'concierto', 'juego', 'viaje', 'paseo', 'gimnasio', 'gym'] },
  { id: 'deudas', tipo: 'gasto', name: 'Pago de deudas', words: ['tarjeta', 'cuota', 'credito', 'prestamo', 'abono', 'deuda'] },
  { id: 'otros', tipo: 'gasto', name: 'Otros gastos', words: [] },
  { id: 'salario', tipo: 'ingreso', name: 'Salario', words: ['sueldo', 'salario', 'nomina', 'quincena', 'prima', 'aguinaldo'] },
  { id: 'independiente', tipo: 'ingreso', name: 'Honorarios y ventas', words: ['honorarios', 'venta', 'vendi', 'cliente', 'factura', 'freelance', 'proyecto', 'negocio'] },
  { id: 'otros_ingresos', tipo: 'ingreso', name: 'Otros ingresos', words: ['regalaron', 'devolucion', 'reembolso', 'intereses', 'arriendo recibido'] }
];

const INCOME_WORDS = ['me pagaron', 'me consignaron', 'me depositaron', 'me transfirieron', 'recibi', 'cobre', 'ingreso', 'ingresaron', 'gane', 'sueldo', 'salario', 'quincena', 'nomina', 'vendi', 'me llego', 'me cayo', 'aguinaldo', 'prima', 'honorarios'];

function norm_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ$., ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function countryFromText_(text) {
  const t = norm_(text).replace(/[$.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  for (const c of COUNTRIES) {
    const names = [norm_(c.name)].concat((c.aliases || []).map(norm_));
    if (names.indexOf(t) > -1) return c;
  }
  for (const c of COUNTRIES) {
    const names = [norm_(c.name)].concat((c.aliases || []).filter(a => a.length > 3).map(norm_));
    if (names.some(n => (' ' + t + ' ').indexOf(' ' + n + ' ') > -1)) return c;
  }
  return null;
}

/** País probable según el prefijo del número de WhatsApp (el más largo que coincida). */
function countryFromPhone_(waId) {
  let best = null, len = 0;
  COUNTRIES.forEach(c => c.prefix.forEach(p => { if (String(waId).indexOf(p) === 0 && p.length > len) { best = c; len = p.length; } }));
  return best;
}

const countryById_ = id => COUNTRIES.filter(c => c.id === id)[0] || null;
const categoryById_ = id => CATEGORIES.filter(c => c.id === id)[0] || null;

/** Categoría por nombre o palabra clave exacta (para correcciones como "transporte" o "era mercado"). */
const GENERIC_WORDS = ['pago', 'otros', 'gastos', 'ingresos', 'basicos'];
function categoryFromText_(text) {
  const t = norm_(text).replace(/[$.,]/g, ' ').replace(/^(no )?(era|es|fue|en|de|cambia a|cambialo a|categoria) /, '').replace(/^(el|la|los|las) /, '').trim();
  if (!t) return null;
  const forms = [t, t.replace(/es$/, ''), t.replace(/s$/, '')];
  for (const c of CATEGORIES) if (norm_(c.name) === t || c.id === t.replace(/ /g, '_')) return c;
  for (const c of CATEGORIES) if (forms.some(f => c.words.indexOf(f) > -1)) return c;
  for (const c of CATEGORIES) {
    const nameWords = norm_(c.name).split(' ').filter(w => w.length > 3 && GENERIC_WORDS.indexOf(w) === -1);
    if (forms.some(f => nameWords.indexOf(f) > -1)) return c;
  }
  return null;
}

/* ============================================================
 * 3. LECTURA DE MONTOS Y REGLAS DE RESPALDO
 * ============================================================ */

const MULTIPLIERS = [
  { re: /^(millones|millon|palos|palo|melones|melon|mill|mm|m)$/, k: 1e6 },
  { re: /^(mil|lucas|luca|k|lks)$/, k: 1e3 }
];

/** Número escrito con cualquier separador: "1.650.000", "1,650,000", "4,5", "4.5", "25.000,50". */
function parseNumber_(s) {
  s = String(s).replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  const decimals = last > -1 ? s.length - last - 1 : 0;
  if (last > -1 && decimals !== 3) return Number(s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1));
  return Number(s.replace(/[.,]/g, ''));
}

/**
 * Montos que aparecen en un texto, con multiplicadores coloquiales:
 * "25 mil" → 25000 · "25k" → 25000 · "4,5 millones" → 4500000 · "2 palos" → 2000000 · "medio millón" → 500000.
 */
function parseAmounts_(text) {
  const t = norm_(text);
  const out = [];
  if (/\bmedio (millon|palo)\b/.test(t)) out.push(500000);
  if (/\b(un|1) (millon|palo)\b/.test(t) && !/\d[\d.,]* (millon|palo)/.test(t)) out.push(1000000);
  const re = /(?<![a-z\d])\$?\s?(\d[\d.,]*\d|\d)\s?([a-z]+)?/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    let n = parseNumber_(m[1]);
    if (!isFinite(n)) continue;
    const word = m[2] || '';
    let used = false;
    for (const x of MULTIPLIERS) if (x.re.test(word)) { n *= x.k; used = true; break; }
    if (!used && /^(am|pm|h|hrs|horas|min|minutos|dias|meses|anos|de|del|x)$/.test(word) && n < 100) continue;
    out.push(Math.round(n * 100) / 100);
  }
  return out;
}

const words_ = text => ' ' + norm_(text).replace(/[$.,]/g, ' ').replace(/\s+/g, ' ') + ' ';

function detectTipo_(text) {
  const t = words_(text);
  return INCOME_WORDS.some(w => t.indexOf(' ' + w + ' ') > -1) ? 'ingreso' : 'gasto';
}

function guessCategory_(text, tipo) {
  const t = words_(text);
  for (const c of CATEGORIES) {
    if (c.tipo !== tipo) continue;
    if (c.words.some(w => t.indexOf(' ' + w + ' ') > -1)) return c.id;
  }
  return tipo === 'ingreso' ? 'otros_ingresos' : 'otros';
}

/** Respaldo sin IA: una línea (o tramo separado por " y ", ";") con monto = un movimiento. */
function ruleParse_(text) {
  const parts = String(text).split(/\n|;| y (?=[^\d]*\d)|, (?=[^\d]*\d)/i).map(s => s.trim()).filter(Boolean);
  const movs = [];
  parts.forEach(p => {
    const amounts = parseAmounts_(p);
    if (!amounts.length) return;
    const tipo = detectTipo_(p);
    const desc = p.replace(/\$?\s?\d[\d.,]*\s?(millones|millon|palos|palo|mil|lucas|luca|k)?/gi, ' ').replace(/\s+/g, ' ').trim();
    movs.push({ tipo: tipo, monto: Math.max.apply(null, amounts), categoria: guessCategory_(p, tipo), descripcion: capitalize_(desc || (tipo === 'ingreso' ? 'Ingreso' : 'Gasto')).slice(0, 60), fecha: '' });
  });
  return movs;
}

function capitalize_(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

/* ============================================================
 * 4. INTELIGENCIA ARTIFICIAL (Claude)
 * ============================================================ */

function llmTool_() {
  return {
    name: 'registrar',
    description: 'Registra lo que la persona escribió en su asistente de finanzas personales.',
    input_schema: {
      type: 'object',
      properties: {
        intencion: { type: 'string', enum: ['movimientos', 'resumen', 'consulta', 'borrar_ultimo', 'ayuda', 'otro'] },
        movimientos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
              monto: { type: 'number', description: 'Monto en la moneda local, sin símbolos. "25 mil" = 25000; "4,5 palos" = 4500000.' },
              categoria: { type: 'string', enum: CATEGORIES.map(c => c.id) },
              descripcion: { type: 'string', description: 'Descripción corta, máximo 6 palabras, con mayúscula inicial.' },
              fecha: { type: 'string', description: 'YYYY-MM-DD solo si el mensaje indica otro día (ayer, el lunes). Si no, cadena vacía.' }
            },
            required: ['tipo', 'monto', 'categoria', 'descripcion']
          }
        },
        categoria_consulta: { type: 'string', description: 'Para intencion=consulta: id de la categoría preguntada, o vacío para el total.' },
        respuesta: { type: 'string', description: 'Solo para intencion=otro: respuesta breve y amable en español (máximo 2 frases).' }
      },
      required: ['intencion']
    }
  };
}

function llmSystem_(today, country) {
  return [
    'Eres el asistente de registro de ' + 'Pulso Financiero' + ', una herramienta de finanzas personales para hispanohablantes.',
    'La persona vive en ' + country.name + ' (moneda ' + country.currency + '). Hoy es ' + today + '.',
    'Tu único trabajo es interpretar el mensaje y llamar a la herramienta "registrar". No des asesoría financiera.',
    'Reglas:',
    '- Un mensaje puede traer varios movimientos ("almuerzo 25 mil y taxi 12 mil" son dos gastos).',
    '- Montos coloquiales: "mil", "k", "lucas" = miles; "palo", "melón", "millón" = millones. Usa exactamente el monto escrito; no inventes montos.',
    '- Son ingresos: sueldo, salario, quincena, nómina, "me pagaron", "me consignaron", ventas, honorarios. Lo demás con monto es gasto.',
    '- Pagos de tarjeta de crédito, cuotas o abonos a préstamos van en la categoría "deudas".',
    '- Categorías: ' + CATEGORIES.map(c => c.id + ' (' + c.tipo + ': ' + c.name + ')').join('; ') + '.',
    '- Si el mensaje pide un resumen o "cómo voy", intencion=resumen. Si pregunta cuánto lleva en algo, intencion=consulta.',
    '- Si quiere deshacer o borrar lo último, intencion=borrar_ultimo. Si saluda o pide ayuda, intencion=ayuda.',
    '- Si menciona un gasto sin monto, intencion=otro y en "respuesta" pide el monto.'
  ].join('\n');
}

function llmParse_(text, today, country, c) {
  return llmCall_(llmSystem_(today, country), String(text).slice(0, 1000), c);
}

/** Lee la foto de un recibo: un solo gasto con el total pagado. */
function llmReceipt_(img, caption, today, country, c) {
  const system = llmSystem_(today, country) + '\n' + [
    '- Ahora recibes la FOTO de un recibo, factura o comprobante de pago. Registra UN solo gasto con el TOTAL pagado',
    '  (no subtotales ni impuestos por separado). Descripción: el comercio o lo comprado. Fecha: la del recibo si se lee y es de los últimos dos meses.',
    '- Si la foto no es un recibo o no se lee el total, intencion=otro y en "respuesta" pide que escriba el gasto.',
    '- Si el texto que acompaña la foto trae un monto, usa ese monto.'
  ].join('\n');
  const content = [
    { type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } },
    { type: 'text', text: caption ? 'Texto que acompaña la foto: ' + caption : 'Foto de un recibo.' }
  ];
  return llmCall_(system, content, c);
}

function llmCall_(system, content, c) {
  if (!c.ANTHROPIC_API_KEY) return null;
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': c.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: c.LLM_MODEL,
      max_tokens: 700,
      system: system,
      tools: [llmTool_()],
      tool_choice: { type: 'tool', name: 'registrar' },
      messages: [{ role: 'user', content: content }]
    }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) { logError_(new Error('IA respondió ' + resp.getResponseCode()), resp.getContentText().slice(0, 500)); return null; }
  const block = (JSON.parse(resp.getContentText()).content || []).filter(b => b.type === 'tool_use')[0];
  return block ? block.input : null;
}

/**
 * Revisa lo que propone la IA contra los montos que de verdad aparecen en el texto:
 * si la IA da un monto que no está escrito, se corrige o se descarta. La IA nunca inventa cifras.
 */
function checkMovements_(movs, text, today) {
  const found = parseAmounts_(text);
  const near = (a, b) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.001);
  const out = [];
  (movs || []).forEach((m, i) => {
    let monto = Number(m.monto);
    if (found.length && !found.some(f => near(monto, f))) {
      if (movs.length === 1 && found.length === 1) monto = found[0];
      else return;
    }
    if (!(monto > 0) || monto > 1e12) return;
    const cat = categoryById_(m.categoria);
    const tipo = m.tipo === 'ingreso' ? 'ingreso' : 'gasto';
    const categoria = cat && cat.tipo === tipo ? cat.id : (tipo === 'ingreso' ? 'otros_ingresos' : 'otros');
    out.push({ tipo: tipo, monto: monto, categoria: categoria, descripcion: capitalize_(String(m.descripcion || '').trim() || categoryById_(categoria).name).slice(0, 60), fecha: validDate_(m.fecha, today) });
  });
  return out;
}

/** Acepta fechas de los últimos 62 días; cualquier otra cosa se vuelve "hoy". */
function validDate_(d, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return today;
  const diff = (new Date(today + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 864e5;
  return diff >= 0 && diff <= 62 ? d : today;
}

/* ============================================================
 * 5. ENTRADAS WEB
 * ============================================================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'movimientos' || p.action === 'tablero') {
    try { return json_(movementsFor_(p.t, p.mes)); }
    catch (err) { logError_(err, 'movimientos'); return json_({ ok: false, error: 'No pudimos leer tus movimientos.' }); }
  }
  return ContentService.createTextOutput('Pulso Financiero (bot): servicio activo.');
}

function doPost(e) {
  const c = cfg_();
  const p = (e && e.parameter) || {};
  // Guardar el perfil desde el tablero (se autentica con el enlace personal, no con el relevo)
  let early = null;
  try { early = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { early = null; }
  if (early && early.action === 'perfil') {
    try { return json_(savePerfilFromWeb_(early.t, early.perfil)); }
    catch (err) { logError_(err, 'perfil'); return json_({ ok: false, error: 'No pudimos guardar. Intenta de nuevo.' }); }
  }
  if (!c.RELAY_SECRET || p.k !== c.RELAY_SECRET) return json_({ ok: false, error: 'No autorizado' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const results = [];
    (body.entry || []).forEach(entry => (entry.changes || []).forEach(ch => {
      const v = ch.value || {};
      if (c.WA_PHONE_NUMBER_ID && v.metadata && String(v.metadata.phone_number_id) !== String(c.WA_PHONE_NUMBER_ID)) return;
      const names = {};
      (v.contacts || []).forEach(x => { names[x.wa_id] = x.profile && x.profile.name; });
      (v.messages || []).forEach(m => results.push(handleMessage_(m, names[m.from] || '', c)));
    }));
    return json_({ ok: true, handled: results.length });
  } catch (err) {
    logError_(err, e && e.postData ? e.postData.contents : '');
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
 * 6. CONVERSACIÓN
 * ============================================================ */

const HELP = [
  'Escríbeme tus gastos e ingresos como se los dirías a un amigo:',
  '• almuerzo 25 mil',
  '• taxi 12.000 y café 6.000',
  '• me pagaron la quincena 2,1 millones',
  '',
  'También puedes escribir:',
  '• *resumen* — cómo vas este mes',
  '• *cuánto llevo en restaurantes*',
  '• *borrar* — elimina lo último que anotaste',
  '• *tablero* — tu enlace personal con gráficos',
  '• También puedes mandarme la *foto de un recibo*',
  '• *resumen no* — dejar de recibir el resumen de los lunes',
  '• *borrar mis datos* — elimina toda tu información'
].join('\n');

function handleMessage_(m, profileName, c) {
  const from = String(m.from || '');
  const cache = CacheService.getScriptCache();
  if (!from || !m.id) return 'sin datos';
  if (cache.get('msg_' + m.id) || movementWithMsg_(m.id)) return 'duplicado';
  cache.put('msg_' + m.id, '1', 21600);

  const raw = m.type === 'text' ? String((m.text && m.text.body) || '').trim() : '';
  const gated = gated_(c), beta = isBeta_(from, c);

  // Activación de la suscripción: "activar CÓDIGO" (el código lleva al menos un dígito)
  const act = raw.match(/^activar\s+((?=[A-Za-z-]*\d)[A-Za-z0-9-]{8,80})$/i);
  if (gated && act) return activate_(from, act[1], profileName, c);

  if (!gated && String(c.BETA_NUMEROS || '').trim() && !beta) return 'fuera de la beta';

  let user = getUser_(from);
  if (!user) {
    if (gated && !beta) { noticeOnce_(from, 'invitar', inviteText_(c), c); return 'sin suscripción'; }
    const guess = countryFromPhone_(from);
    user = createUser_(from, profileName, guess);
    send_(from, welcomeText_(profileName, guess, c), c);
    if (!guess || m.type !== 'text' || !parseAmounts_(norm_(raw)).length) return 'bienvenida';
  }
  if (!countUsage_(user, c)) return 'límite diario';
  const access = accessOf_(user, c);
  const readOnly = access === 'vencida' || access === 'ninguna';

  if (m.type !== 'text' && m.type !== 'image') {
    send_(from, 'Entiendo mensajes de texto y fotos de recibos. Escríbeme el gasto, por ejemplo: "mercado 85 mil".', c);
    return 'no es texto';
  }
  const text = raw;
  const t = norm_(text);
  const country = countryById_(user.pais) || countryFromPhone_(from) || countryById_('US');
  const today = Utilities.formatDate(new Date(), country.tz, 'yyyy-MM-dd');

  // Borrado total en dos pasos
  if (user.estado === 'confirmar_borrado') {
    if (t === 'confirmar borrado') { deleteUserData_(from); send_(from, 'Listo: borramos todos tus datos. Si vuelves a escribir, empezamos de cero.', c); return 'borrado total'; }
    updateUser_(from, { estado: 'activo' });
  }
  if (/^(borrar|eliminar) (mis|todos mis) datos$/.test(t)) {
    updateUser_(from, { estado: 'confirmar_borrado' });
    send_(from, 'Esto elimina todos tus movimientos y tu enlace. Para confirmar, escribe: CONFIRMAR BORRADO', c);
    return 'pide confirmación';
  }

  // Suscripción terminada (o número sin suscripción): solo consulta
  if (readOnly) {
    if (/^(tablero|mi tablero|link|enlace|mi enlace|graficos|grafica)$/.test(t)) { send_(from, 'Tu tablero (modo consulta):\n' + userLink_(user, c), c); return 'enlace (consulta)'; }
    if (/^(resumen|balance|como voy|como vamos|mi mes)$/.test(t)) { send_(from, summaryText_(from, country, today, c), c); return 'resumen (consulta)'; }
    noticeOnce_(from, 'consulta', readOnlyText_(user, access, c), c);
    return 'solo consulta';
  }

  if (m.type === 'image') return handlePhoto_(m, user, country, today, c);

  // Resumen semanal: activar o desactivar
  if (/^(resumen no|no (quiero|mas) (el )?resumen(es)?( semanal(es)?)?|cancelar resumen|desactivar resumen|sin resumen)$/.test(t)) {
    updateUser_(from, { resumen_semanal: 'no' });
    send_(from, 'Listo, ya no te enviaré el resumen de los lunes. Si lo quieres de vuelta, escribe *resumen si*.', c); return 'resumen semanal: no';
  }
  if (/^(resumen si|activar resumen|quiero (el )?resumen( semanal)?)$/.test(t)) {
    updateUser_(from, { resumen_semanal: 'si' });
    send_(from, 'Listo: cada lunes te enviaré el resumen de tu semana.', c); return 'resumen semanal: sí';
  }

  // Cambio de país
  const asCountry = text.length <= 30 && !parseAmounts_(text).length ? countryFromText_(text.replace(/^(soy de|vivo en|pais|país)\s+/i, '')) : null;
  if (asCountry) {
    updateUser_(from, { pais: asCountry.id, moneda: asCountry.currency });
    send_(from, 'Perfecto: ' + asCountry.name + ', en ' + asCountry.currency + '. Ya puedes escribirme tus gastos e ingresos.', c);
    return 'país';
  }

  // Comandos directos (sin IA)
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|ayuda|menu|\?|info|como funciona)$/.test(t)) { send_(from, HELP, c); return 'ayuda'; }
  if (/^(resumen|balance|como voy|como vamos|mi mes)$/.test(t)) { send_(from, summaryText_(from, country, today, c), c); return 'resumen'; }
  if (/^(tablero|mi tablero|link|enlace|mi enlace|graficos|grafica)$/.test(t)) { send_(from, 'Tu tablero de movimientos:\n' + userLink_(user, c), c); return 'enlace'; }
  if (/^(nuevo enlace|cambiar enlace|nuevo link)$/.test(t)) {
    const token = newToken_(); updateUser_(from, { token: token }); user.token = token;
    send_(from, 'Listo, tu enlace anterior dejó de funcionar. El nuevo es:\n' + userLink_(user, c), c); return 'nuevo enlace';
  }
  if (/^(borrar|deshacer|eliminar|borrar ultimo|borra eso|elimina eso|eliminar ultimo)$/.test(t)) { send_(from, undoLast_(from, country), c); return 'borrar'; }

  // Corrección de categoría del último movimiento ("transporte", "era mercado")
  const asCat = text.length <= 30 && !parseAmounts_(text).length ? categoryFromText_(text) : null;
  if (asCat && user.ultimo_mov_id && Date.now() - new Date(user.ultimo_mov_ts).getTime() < 30 * 60000) {
    const ok = recategorize_(from, user.ultimo_mov_id, asCat);
    send_(from, ok ? 'Corregido: ' + asCat.name + '.' : 'No encontré tu último movimiento.', c);
    return 'corrección';
  }

  // Consulta directa: "cuánto llevo en X"
  const q = t.match(/^cuanto (llevo|gaste|he gastado|va|van|voy)( en| de)? (.+?)\??$/);
  if (q) {
    const cat = categoryFromText_(q[3]);
    if (cat) { send_(from, categoryText_(from, cat, country, today), c); return 'consulta'; }
  }

  // Interpretación: IA con verificación de montos; si no hay IA, reglas.
  let parsed = null, source = 'ia';
  try { parsed = llmParse_(text, today, country, c); } catch (err) { logError_(err, 'IA'); }
  if (!parsed) { source = 'reglas'; parsed = { intencion: 'movimientos', movimientos: ruleParse_(text) }; }

  if (parsed.intencion === 'resumen') { send_(from, summaryText_(from, country, today, c), c); return 'resumen'; }
  if (parsed.intencion === 'ayuda') { send_(from, HELP, c); return 'ayuda'; }
  if (parsed.intencion === 'borrar_ultimo') { send_(from, undoLast_(from, country), c); return 'borrar'; }
  if (parsed.intencion === 'consulta') {
    const cat = categoryById_(parsed.categoria_consulta);
    send_(from, cat ? categoryText_(from, cat, country, today) : summaryText_(from, country, today, c), c);
    return 'consulta';
  }

  const perfil = getPerfil_(from);
  const movs = applyLearned_(checkMovements_(parsed.movimientos, text, today), perfil);
  if (!movs.length) {
    send_(from, parsed.intencion === 'otro' && parsed.respuesta ? parsed.respuesta : 'No encontré un monto en tu mensaje. Escríbelo así: "almuerzo 25 mil" o "me pagaron 1,5 millones". Escribe *ayuda* para ver ejemplos.', c);
    return 'sin monto';
  }
  const saved = saveMovements_(from, movs, country, text, m.id, source);
  updateUser_(from, { ultimo_mov_id: saved[saved.length - 1].id, ultimo_mov_ts: new Date().toISOString() });
  send_(from, confirmText_(saved, country, today) + budgetText_(from, saved, perfil, country, today), c);
  return 'registrado ' + saved.length;
}

/* ---------- Fotos de recibos ---------- */

function handlePhoto_(m, user, country, today, c) {
  const from = String(user.wa_id);
  if (!c.ANTHROPIC_API_KEY || !c.WA_TOKEN) { send_(from, 'Por ahora no puedo leer fotos. Escríbeme el gasto, por ejemplo: "mercado 85 mil".', c); return 'foto sin IA'; }
  const day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const prev = String(user.fotos_hoy || '').split('|');
  const count = prev[0] === day ? Number(prev[1]) + 1 : 1;
  updateUser_(from, { fotos_hoy: day + '|' + count });
  if (count > Number(c.MAX_FOTOS_DIA)) {
    if (count === Number(c.MAX_FOTOS_DIA) + 1) send_(from, 'Llegaste al máximo de fotos de hoy. Puedes seguir escribiendo tus gastos.', c);
    return 'límite de fotos';
  }
  let img = null;
  try { img = downloadMedia_(m.image && m.image.id, c); } catch (err) { logError_(err, 'foto'); }
  if (!img || img.error) {
    send_(from, img && img.error === 'peso' ? 'La foto es muy pesada para leerla. Envíala de nuevo (WhatsApp la comprime) o escríbeme el gasto.' : 'No pude abrir la foto. Envíala de nuevo o escríbeme el gasto, por ejemplo: "mercado 85 mil".', c);
    return 'foto: no se pudo abrir';
  }
  const caption = String((m.image && m.image.caption) || '').trim().slice(0, 300);
  let parsed = null;
  try { parsed = llmReceipt_(img, caption, today, country, c); } catch (err) { logError_(err, 'IA foto'); }
  // Si la foto trae un texto con monto, el monto debe coincidir con lo escrito; si no, se acepta lo que lee la IA.
  const movs = applyLearned_(checkMovements_(((parsed && parsed.movimientos) || []).slice(0, 1).map(x => Object.assign({}, x, { tipo: 'gasto' })), caption, today), getPerfil_(from));
  if (!movs.length) {
    send_(from, parsed && parsed.intencion === 'otro' && parsed.respuesta ? parsed.respuesta : 'No encontré el total en la foto. Escríbeme el gasto, por ejemplo: "mercado 85 mil".', c);
    return 'foto sin monto';
  }
  const saved = saveMovements_(from, movs, country, '[foto] ' + caption, m.id, 'foto');
  updateUser_(from, { ultimo_mov_id: saved[0].id, ultimo_mov_ts: new Date().toISOString() });
  send_(from, 'Leí tu recibo:\n' + confirmText_(saved, country, today) + budgetText_(from, saved, getPerfil_(from), country, today), c);
  return 'foto registrada';
}

/** Descarga una imagen de WhatsApp: primero pide su enlace temporal y luego el archivo (ambos con el token). */
function downloadMedia_(id, c) {
  if (!/^\d{5,30}$/.test(String(id || ''))) return null;
  const auth = { Authorization: 'Bearer ' + c.WA_TOKEN };
  const meta = UrlFetchApp.fetch('https://graph.facebook.com/' + c.GRAPH_VERSION + '/' + id, { headers: auth, muteHttpExceptions: true });
  if (meta.getResponseCode() !== 200) throw new Error('WhatsApp respondió ' + meta.getResponseCode() + ' al pedir la foto');
  const info = JSON.parse(meta.getContentText());
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(info.mime_type) === -1) return { error: 'tipo' };
  if (Number(info.file_size) > 3.7e6) return { error: 'peso' };
  const file = UrlFetchApp.fetch(info.url, { headers: auth, muteHttpExceptions: true });
  if (file.getResponseCode() !== 200) throw new Error('WhatsApp respondió ' + file.getResponseCode() + ' al descargar la foto');
  return { mime: info.mime_type, data: Utilities.base64Encode(file.getBlob().getBytes()) };
}

/* ---------- Suscripción: activación, acceso y modo consulta ---------- */

/** Con PAGOS_URL configurado, el bot solo registra para números con suscripción activa (o en BETA_NUMEROS). */
function gated_(c) { return !!String(c.PAGOS_URL || '').trim(); }
function isBeta_(waId, c) { return String(c.BETA_NUMEROS || '').split(/[\s,;]+/).filter(Boolean).indexOf(String(waId)) > -1; }
function renewUrl_(c) { return c.RENOVAR_URL || String(c.SITE_URL).replace(/\/$/, '') + '/#precios'; }
function contact_(c) { return c.CONTACTO ? ' (' + c.CONTACTO + ')' : ''; }

/** Pregunta al backend de pagos (apps-script/Code.gs) el estado de una clave: activa, vencida o invalida. */
function licenseStatus_(key, c) {
  const url = String(c.PAGOS_URL).trim();
  const resp = UrlFetchApp.fetch(url + (url.indexOf('?') > -1 ? '&' : '?') + 'action=licencia&key=' + encodeURIComponent(key), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('Pagos respondió ' + resp.getResponseCode());
  const j = JSON.parse(resp.getContentText());
  if (j.ok) return 'activa';
  if (j.estado === 'vencida' || j.estado === 'invalida') return j.estado;
  throw new Error('Pagos no pudo validar la clave: ' + (j.error || 'sin detalle'));
}

/**
 * Acceso del número: libre (sin cobro configurado o beta), activa, vencida o ninguna (sin suscripción).
 * La clave se revisa como máximo cada 12 horas; si el servicio de pagos falla, se conserva el último estado.
 */
function accessOf_(user, c, force) {
  if (!gated_(c) || isBeta_(user.wa_id, c)) return 'libre';
  if (!user.licencia) return user.acceso === 'vencida' ? 'vencida' : 'ninguna';
  const fresh = user.acceso_revisado && Date.now() - new Date(user.acceso_revisado).getTime() < 12 * 3600e3;
  if (fresh && !force && user.acceso) return user.acceso;
  let st;
  try { st = licenseStatus_(user.licencia, c); } catch (err) { logError_(err, 'licencia ' + user.wa_id); return user.acceso || 'activa'; }
  user._revisada = true;
  const estado = st === 'activa' ? 'activa' : 'vencida';
  const patch = { acceso: estado, acceso_revisado: new Date().toISOString() };
  if (estado === 'vencida' && (user.acceso !== 'vencida' || !user.vence)) patch.vence = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  if (estado === 'activa') patch.vence = '';
  updateUser_(user.wa_id, patch);
  Object.assign(user, patch);
  return estado;
}

/** Último día de consulta: fecha de vencimiento + DIAS_CONSULTA. */
function consultaHasta_(user, c) {
  if (!user.vence) return '';
  const d = new Date(String(user.vence).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(c.DIAS_CONSULTA || 90));
  return d.toISOString().slice(0, 10);
}

function dateLong_(iso) { return iso ? Number(iso.slice(8, 10)) + ' de ' + MONTHS[Number(iso.slice(5, 7)) - 1] + ' de ' + iso.slice(0, 4) : ''; }

function activate_(from, key, profileName, c) {
  let st;
  try { st = licenseStatus_(key, c); } catch (err) { logError_(err, 'activar'); send_(from, 'No pude revisar tu código en este momento. Intenta de nuevo en unos minutos.', c); return 'activar: error'; }
  if (st !== 'activa') {
    send_(from, st === 'vencida'
      ? 'Ese código es de una suscripción que ya terminó. Puedes renovarla aquí: ' + renewUrl_(c) + '\nLuego escríbeme *activar* con tu nuevo código.'
      : 'No reconozco ese código. Cópialo tal como aparece en tu correo de bienvenida' + (c.CONTACTO ? ' o escríbenos a ' + c.CONTACTO : '') + '.', c);
    return 'activar: ' + st;
  }
  const other = rowsToObjects_(usersSheet_().getDataRange().getValues(), USER_COLS)
    .filter(u => String(u.licencia).toUpperCase() === key.toUpperCase() && String(u.wa_id) !== String(from))[0];
  if (other) {
    send_(from, 'Ese código ya está activo en otro número de WhatsApp. Si cambiaste de número, escríbenos' + (c.CONTACTO ? ' a ' + c.CONTACTO : ' respondiendo el correo de bienvenida') + ' y lo pasamos a este.', c);
    return 'activar: en otro número';
  }
  const patch = { licencia: key, acceso: 'activa', acceso_revisado: new Date().toISOString(), vence: '' };
  const user = getUser_(from);
  if (!user) {
    const guess = countryFromPhone_(from);
    createUser_(from, profileName, guess);
    updateUser_(from, patch);
    send_(from, '✓ Tu suscripción a ' + c.PREMIUM_NAME + ' quedó activa en este número.\n\n' + welcomeText_(profileName, guess, c), c);
    return 'activado';
  }
  updateUser_(from, patch);
  send_(from, '✓ Tu suscripción a ' + c.PREMIUM_NAME + ' quedó activa' + (user.acceso === 'vencida' || user.acceso === 'ninguna' ? ' de nuevo. Tus registros siguen aquí.' : '.') + ' Escríbeme tus gastos cuando quieras.', c);
  return 'activado';
}

function welcomeText_(profileName, guess, c) {
  return '¡Hola' + (profileName ? ', ' + String(profileName).split(' ')[0] : '') + '! Soy el asistente de ' + c.BRAND_NAME + '. ' +
    (guess ? 'Registraré tus cifras en ' + guess.currency + ' (' + guess.name + '). Si vives en otro país, escríbeme su nombre.\n\n' : 'Para usar la moneda correcta, escríbeme tu país.\n\n') +
    HELP + '\n\nCada lunes te enviaré el resumen de tu semana (escribe *resumen no* si no lo quieres).';
}

function inviteText_(c) {
  return '¡Hola! Soy el asistente de ' + c.BRAND_NAME + '. Para registrar tus gastos aquí necesitas ' + c.PREMIUM_NAME + ': ' + renewUrl_(c) +
    '\n\nSi ya te suscribiste, toca el botón *Activar mi WhatsApp* del correo de bienvenida o escríbeme *activar* seguido de tu código.';
}

function readOnlyText_(user, access, c) {
  const link = userLink_(user, c);
  if (access === 'vencida' && user.vence) {
    return 'Tu suscripción a ' + c.PREMIUM_NAME + ' terminó el ' + dateLong_(String(user.vence).slice(0, 10)) + ', así que ya no puedo anotar movimientos. ' +
      'Tu tablero sigue disponible para consulta hasta el ' + dateLong_(consultaHasta_(user, c)) + ': ' + link + '\nDespués borraremos tus datos.\n\n' +
      'Para seguir registrando, renueva aquí: ' + renewUrl_(c) + ' y escríbeme *activar* con tu nuevo código.';
  }
  return 'Para registrar movimientos necesitas ' + c.PREMIUM_NAME + ': ' + renewUrl_(c) + '\nTus registros anteriores siguen en tu tablero: ' + link +
    '\n\nSi ya te suscribiste, escríbeme *activar* seguido de tu código.';
}

/** Envía un aviso como máximo una vez cada 6 horas por número (para no gastar mensajes). */
function noticeOnce_(to, kind, text, c) {
  const cache = CacheService.getScriptCache();
  const k = 'aviso_' + kind + '_' + to;
  if (cache.get(k)) return;
  cache.put(k, '1', 21600);
  send_(to, text, c);
}

/** Cómo va el presupuesto de las categorías que se acaban de registrar (solo si tienen presupuesto). */
function budgetText_(from, saved, perfil, country, today) {
  const month = today.slice(0, 7);
  const cats = saved.filter(x => x.tipo === 'gasto' && Number(perfil.presupuestos[x.categoria]) > 0).map(x => x.categoria).filter((x, i, a) => a.indexOf(x) === i);
  if (!cats.length) return '';
  const spent = summarize_(userMovements_(from).filter(m => m.fecha.slice(0, 7) === month)).porCategoria;
  return '\n\n' + cats.map(id => {
    const budget = Number(perfil.presupuestos[id]), used = spent[id] || 0, pct = used / budget;
    const name = categoryById_(id).name;
    if (pct > 1) return '⚠ Te pasaste en ' + name + ' por ' + fmtMoney_(used - budget, country) + ' (' + Math.round(pct * 100) + '% del presupuesto).';
    if (pct >= BUDGET_WARN) return '⚠ Vas en el ' + Math.round(pct * 100) + '% de tu presupuesto de ' + name + '. Te quedan ' + fmtMoney_(budget - used, country) + '.';
    return 'Presupuesto de ' + name + ': vas en el ' + Math.round(pct * 100) + '% (te quedan ' + fmtMoney_(budget - used, country) + ').';
  }).join('\n');
}

/** Usa lo que el bot aprendió de las correcciones: "uber" → transporte, "netflix" → ocio… */
function applyLearned_(movs, perfil) {
  const learned = perfil.aprendidas || {};
  return movs.map(m => {
    const hit = norm_(m.descripcion).replace(/[$.,]/g, ' ').split(' ').filter(w => learned[w])[0];
    const cat = hit && categoryById_(learned[hit]);
    return cat && cat.tipo === m.tipo ? Object.assign({}, m, { categoria: cat.id }) : m;
  });
}

function confirmText_(saved, country, today) {
  const lines = saved.map(x => '✓ ' + (x.tipo === 'ingreso' ? 'Ingreso' : 'Gasto') + ' · ' + categoryById_(x.categoria).name + ' · ' + fmtMoney_(x.monto, country) +
    (x.descripcion ? ' — ' + x.descripcion : '') + (x.fecha !== today ? ' (' + x.fecha + ')' : ''));
  return lines.join('\n') + '\n\n' + (saved.length === 1 ? '¿Otra categoría? Escríbeme la correcta (ej. "transporte"). Para eliminarlo: *borrar*.' : 'Para eliminar el último: *borrar*.');
}

/* ============================================================
 * 7. RESÚMENES (los mismos cálculos se validan en Python: tests/validate_bot.py)
 * ============================================================ */

/** Totales de un conjunto de movimientos: ingresos, gastos, excedente y gasto por categoría. */
function summarize_(movs) {
  const r = { ingresos: 0, gastos: 0, excedente: 0, tasaAhorro: 0, porCategoria: {}, n: movs.length };
  movs.forEach(m => {
    const v = Number(m.monto) || 0;
    if (m.tipo === 'ingreso') r.ingresos += v;
    else { r.gastos += v; r.porCategoria[m.categoria] = (r.porCategoria[m.categoria] || 0) + v; }
  });
  r.ingresos = round2_(r.ingresos); r.gastos = round2_(r.gastos);
  r.excedente = round2_(r.ingresos - r.gastos);
  r.tasaAhorro = r.ingresos > 0 ? r.excedente / r.ingresos : 0;
  Object.keys(r.porCategoria).forEach(k => { r.porCategoria[k] = round2_(r.porCategoria[k]); });
  return r;
}

/** Histórico por mes (ingresos y gasto por categoría) para las vistas mensual y anual del tablero. */
function monthlyHistory_(movs) {
  const by = {};
  movs.forEach(m => { const k = String(m.fecha).slice(0, 7); (by[k] = by[k] || []).push(m); });
  return Object.keys(by).sort().map(mes => { const s = summarize_(by[mes]); return { mes: mes, ingresos: s.ingresos, porCategoria: s.porCategoria }; });
}

function round2_(x) { return Math.round(x * 100) / 100; }

function summaryText_(from, country, today, c) {
  const month = today.slice(0, 7);
  const s = summarize_(userMovements_(from).filter(m => m.fecha.slice(0, 7) === month));
  if (!s.n) return 'Aún no tienes movimientos este mes. Escríbeme el primero, por ejemplo: "mercado 85 mil".';
  const top = Object.keys(s.porCategoria).sort((a, b) => s.porCategoria[b] - s.porCategoria[a]).slice(0, 3);
  const pct = x => Math.round(x * 100) + '%';
  return [
    '*Tu mes hasta hoy* (' + monthName_(month) + ')',
    'Ingresos: ' + fmtMoney_(s.ingresos, country),
    'Gastos: ' + fmtMoney_(s.gastos, country),
    'Excedente: ' + fmtMoney_(s.excedente, country) + (s.ingresos > 0 ? ' · tasa de ahorro ' + pct(s.tasaAhorro) : ''),
    top.length ? '\nDonde más gastas:\n' + top.map(k => '• ' + categoryById_(k).name + ': ' + fmtMoney_(s.porCategoria[k], country) + (s.gastos > 0 ? ' (' + pct(s.porCategoria[k] / s.gastos) + ')' : '')).join('\n') : '',
    '\nVer gráficos: ' + userLink_(getUser_(from), c)
  ].filter(Boolean).join('\n');
}

function categoryText_(from, cat, country, today) {
  const month = today.slice(0, 7);
  const movs = userMovements_(from).filter(m => m.fecha.slice(0, 7) === month && m.categoria === cat.id);
  const total = round2_(movs.reduce((a, m) => a + Number(m.monto), 0));
  return cat.name + ' en ' + monthName_(month) + ': ' + fmtMoney_(total, country) + ' en ' + movs.length + (movs.length === 1 ? ' movimiento.' : ' movimientos.');
}

/* ---------- Resumen semanal ---------- */

/** Suma días a una fecha YYYY-MM-DD. */
function addDays_(iso, k) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); }

/**
 * Cifras de la última semana completa (lunes a domingo antes de hoy) y de la anterior.
 * Validado en Python (tests/validate_bot.py).
 */
function weekStats_(movs, today) {
  const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = lunes
  const hasta = addDays_(today, -dow - 1), desde = addDays_(hasta, -6);
  const prevDesde = addDays_(desde, -7), prevHasta = addDays_(desde, -1);
  const g = movs.filter(m => m.tipo === 'gasto');
  const week = g.filter(m => m.fecha >= desde && m.fecha <= hasta);
  const prev = g.filter(m => m.fecha >= prevDesde && m.fecha <= prevHasta);
  const porCategoria = {};
  week.forEach(m => { porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + Number(m.monto); });
  const gasto = round2_(week.reduce((a, m) => a + Number(m.monto), 0));
  const anterior = round2_(prev.reduce((a, m) => a + Number(m.monto), 0));
  const top = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a] || (a < b ? -1 : 1))[0] || null;
  return { desde: desde, hasta: hasta, gasto: gasto, n: week.length, anterior: anterior, cambio: anterior > 0 ? (gasto - anterior) / anterior : null,
    top: top ? { categoria: top, monto: round2_(porCategoria[top]) } : null };
}

/** Presupuesto del mes en curso: categorías excedidas y en alerta (≥ 80 %). */
function monthBudget_(movs, perfil, today) {
  const pres = perfil.presupuestos || {};
  const ids = Object.keys(pres).filter(k => Number(pres[k]) > 0);
  const spent = summarize_(movs.filter(m => String(m.fecha).slice(0, 7) === today.slice(0, 7))).porCategoria;
  return { definido: ids.length > 0, excedidas: ids.filter(k => (spent[k] || 0) > Number(pres[k])), alerta: ids.filter(k => (spent[k] || 0) <= Number(pres[k]) && (spent[k] || 0) / Number(pres[k]) >= BUDGET_WARN) };
}

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const shortDate_ = iso => Number(iso.slice(8, 10)) + ' ' + SHORT_MONTHS[Number(iso.slice(5, 7)) - 1];
const joinNames_ = ids => { const n = ids.map(k => categoryById_(k).name); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0]; };

/**
 * Texto del resumen semanal. Es el mismo de la plantilla de Meta (README): los {{n}} se llenan con weeklyParams_.
 * Meta no acepta saltos de línea dentro de los parámetros, por eso cada uno es una frase corta.
 */
const WEEKLY_TEMPLATE = 'Hola {{1}}, este es tu resumen de la semana del {{2}}: gastaste {{3}} en {{4}} registros. Frente a la semana anterior: {{5}}. Donde más gastaste: {{6}}. Presupuesto del mes: {{7}}. Escribe *tablero* para ver el detalle o *resumen no* si no quieres recibir este mensaje.';

function weeklyParams_(user, st, bud, country) {
  const pctTxt = x => Math.round(Math.abs(x) * 100) + ' %';
  return [
    String(user.nombre || '').split(' ')[0] || 'de nuevo',
    shortDate_(st.desde) + ' al ' + shortDate_(st.hasta),
    fmtMoney_(st.gasto, country),
    String(st.n),
    st.cambio === null ? 'sin gastos para comparar' : Math.abs(st.cambio) < 0.005 ? 'igual' : pctTxt(st.cambio) + (st.cambio > 0 ? ' más' : ' menos'),
    st.top ? categoryById_(st.top.categoria).name + ' (' + fmtMoney_(st.top.monto, country) + ')' : 'sin gastos',
    !bud.definido ? 'aún no lo defines; puedes hacerlo en tu tablero' : bud.excedidas.length ? 'te pasaste en ' + joinNames_(bud.excedidas)
      : bud.alerta.length ? 'vas por encima del 80 % en ' + joinNames_(bud.alerta) : 'todo dentro de lo planeado'
  ];
}

function fillTemplate_(tpl, params) { return tpl.replace(/\{\{(\d+)\}\}/g, (_, i) => params[Number(i) - 1]); }

function sendTemplate_(to, name, lang, params, c) {
  if (!c.WA_TOKEN || !c.WA_PHONE_NUMBER_ID) { console.log('[sin WhatsApp] plantilla ' + name + ' → ' + to + ': ' + params.join(' | ')); return true; }
  const resp = UrlFetchApp.fetch('https://graph.facebook.com/' + c.GRAPH_VERSION + '/' + c.WA_PHONE_NUMBER_ID + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + c.WA_TOKEN },
    payload: JSON.stringify({ messaging_product: 'whatsapp', to: String(to), type: 'template',
      template: { name: name, language: { code: lang }, components: [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p).replace(/\s+/g, ' ').slice(0, 200) })) }] } }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) { logError_(new Error('Plantilla respondió ' + resp.getResponseCode()), resp.getContentText().slice(0, 500)); return false; }
  return true;
}

/**
 * Envía el resumen de la semana anterior a quien tenga acceso y no lo haya desactivado.
 * Se ejecuta cada hora (instalarTareas) y actúa de lunes a miércoles desde RESUMEN_HORA, hora local de cada persona;
 * cada semana se envía una sola vez. Si la persona escribió en las últimas 24 h va como mensaje normal (sin costo de plantilla).
 */
function enviarResumenes_(c, deadline) {
  const users = rowsToObjects_(usersSheet_().getDataRange().getValues(), USER_COLS);
  const byUser = {};
  rowsToObjects_(movSheet_().getDataRange().getValues(), MOV_COLS).forEach(m => {
    (byUser[String(m.wa_id)] = byUser[String(m.wa_id)] || []).push({ fecha: String(m.fecha), tipo: m.tipo, monto: Number(m.monto), categoria: m.categoria });
  });
  let sent = 0;
  users.forEach(u => {
    if (Date.now() > deadline || String(u.resumen_semanal) === 'no') return;
    const country = countryById_(u.pais) || countryFromPhone_(u.wa_id) || countryById_('US');
    const today = Utilities.formatDate(new Date(), country.tz, 'yyyy-MM-dd');
    const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const hour = Number(Utilities.formatDate(new Date(), country.tz, 'H'));
    if (dow > 2 || (dow === 0 && hour < Number(c.RESUMEN_HORA))) return;
    const movs = byUser[String(u.wa_id)] || [];
    const st = weekStats_(movs, today);
    if (String(u.resumen_enviado) === st.desde) return;
    const access = accessOf_(u, c);
    if (u._revisada) Utilities.sleep(1100); // límite de la API de licencias: 60 por minuto
    if (access !== 'activa' && access !== 'libre') return;
    // Sin movimientos en las últimas dos semanas no se envía nada (y no se cobra)
    if (!movs.some(m => m.fecha >= addDays_(st.hasta, -13) && m.fecha <= today)) { updateUser_(u.wa_id, { resumen_enviado: st.desde }); return; }
    const params = weeklyParams_(u, st, monthBudget_(movs, getPerfil_(u.wa_id), today), country);
    const recent = u.ultimo_msg_ts && Date.now() - new Date(u.ultimo_msg_ts).getTime() < 23.5 * 3600e3;
    let ok = false;
    if (recent) { send_(u.wa_id, fillTemplate_(WEEKLY_TEMPLATE, params), c); ok = true; }
    else if (c.WA_PLANTILLA_RESUMEN) ok = sendTemplate_(u.wa_id, c.WA_PLANTILLA_RESUMEN, c.WA_PLANTILLA_IDIOMA || 'es', params, c);
    if (ok || !c.WA_PLANTILLA_RESUMEN) updateUser_(u.wa_id, { resumen_enviado: st.desde });
    if (ok) sent++;
  });
  return sent;
}

/**
 * Revisa las suscripciones que no se han revisado en 12 horas y borra los datos de quienes llevan
 * más de DIAS_CONSULTA días con la suscripción terminada.
 */
function revisarSuscripciones_(c, deadline) {
  if (!gated_(c)) return { revisadas: 0, borradas: 0 };
  const today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  let revisadas = 0, borradas = 0;
  rowsToObjects_(usersSheet_().getDataRange().getValues(), USER_COLS).forEach(u => {
    if (Date.now() > deadline || isBeta_(u.wa_id, c)) return;
    const access = accessOf_(u, c);
    if (u._revisada) { revisadas++; Utilities.sleep(1100); }
    if (access === 'vencida' && u.vence && consultaHasta_(u, c) < today) {
      deleteUserData_(u.wa_id);
      borradas++;
      console.log('Datos borrados: suscripción terminada el ' + String(u.vence).slice(0, 10));
    }
  });
  return { revisadas: revisadas, borradas: borradas };
}

/** Tarea de cada hora (instalarTareas): revisa suscripciones y envía los resúmenes semanales. */
function tareasProgramadas() {
  const c = cfg_();
  const deadline = Date.now() + 4.5 * 60000; // Apps Script corta a los 6 minutos
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const r = revisarSuscripciones_(c, deadline);
    const n = enviarResumenes_(c, deadline);
    console.log('Suscripciones revisadas: ' + r.revisadas + ' · datos borrados: ' + r.borradas + ' · resúmenes enviados: ' + n);
  } catch (err) { logError_(err, 'tareas programadas'); }
  finally { lock.releaseLock(); }
}

/** Ejecútalo una vez: programa tareasProgramadas() cada hora. */
function instalarTareas() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'tareasProgramadas').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tareasProgramadas').timeBased().everyHours(1).create();
  console.log('Listo: la revisión de suscripciones y el resumen semanal corren cada hora.');
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function monthName_(ym) { return MONTHS[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4); }

/** Monto con el formato del país: $ 25.000 (CO) · $25,000 (MX) · 1.250,50 € (ES). */
function fmtMoney_(n, country) {
  const neg = n < 0;
  let v = Math.abs(Number(n) || 0);
  const decimals = country.dec && Math.round(v * 100) % 100 !== 0 ? 2 : 0;
  const fixed = v.toFixed(decimals).split('.');
  const intPart = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, country.sep);
  const num = intPart + (decimals ? (country.sep === '.' ? ',' : '.') + fixed[1] : '');
  const body = country.suffix ? num + ' ' + country.symbol : country.symbol + (country.symbol.length === 1 && country.sep === '.' ? ' ' : '') + num;
  return (neg ? '-' : '') + body.replace(/\s+/g, ' ').trim();
}

/* ============================================================
 * 8. DATOS (Google Sheets)
 * ============================================================ */

const USER_COLS = ['wa_id', 'nombre', 'pais', 'moneda', 'token', 'estado', 'creado', 'ultimo_mov_id', 'ultimo_mov_ts', 'mensajes_hoy', 'fecha_conteo',
  'licencia', 'acceso', 'acceso_revisado', 'vence', 'resumen_semanal', 'resumen_enviado', 'ultimo_msg_ts', 'fotos_hoy'];
const MOV_COLS = ['id', 'wa_id', 'fecha', 'tipo', 'monto', 'moneda', 'categoria', 'descripcion', 'texto', 'msg_id', 'creado', 'fuente'];

function db_() {
  const id = cfg_().DB_ID;
  if (!id) throw new Error('Falta DB_ID: ejecuta setup() primero');
  return SpreadsheetApp.openById(id);
}
function sheet_(name, header) {
  const ss = db_();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); }
  return sh;
}
/** La hoja Usuarios de versiones anteriores recibe las columnas nuevas al final. */
function usersSheet_() {
  const sh = sheet_('Usuarios', USER_COLS);
  const n = sh.getLastColumn();
  for (let j = n; j < USER_COLS.length; j++) sh.getRange(1, j + 1).setValue(USER_COLS[j]);
  return sh;
}
const movSheet_ = () => sheet_('Movimientos', MOV_COLS);

function rowsToObjects_(values, cols) {
  return values.slice(1).map((r, i) => { const o = { _row: i + 2 }; cols.forEach((k, j) => { o[k] = r[j]; }); return o; });
}

function getUser_(waId) {
  return rowsToObjects_(usersSheet_().getDataRange().getValues(), USER_COLS).filter(u => String(u.wa_id) === String(waId))[0] || null;
}
function getUserByToken_(token) {
  if (!/^[A-Za-z0-9]{20,64}$/.test(String(token || ''))) return null;
  return rowsToObjects_(usersSheet_().getDataRange().getValues(), USER_COLS).filter(u => u.token === token)[0] || null;
}

function createUser_(waId, name, country) {
  const u = { wa_id: String(waId), nombre: String(name || '').slice(0, 60), pais: country ? country.id : '', moneda: country ? country.currency : '', token: newToken_(), estado: 'activo', creado: new Date().toISOString(), ultimo_mov_id: '', ultimo_mov_ts: '', mensajes_hoy: 0, fecha_conteo: '',
    licencia: '', acceso: '', acceso_revisado: '', vence: '', resumen_semanal: 'si', resumen_enviado: '', ultimo_msg_ts: '', fotos_hoy: '' };
  usersSheet_().appendRow(USER_COLS.map(k => (['wa_id', 'token'].indexOf(k) > -1 ? "'" + u[k] : u[k])));
  return u;
}

function updateUser_(waId, patch) {
  const sh = usersSheet_();
  const u = getUser_(waId);
  if (!u) return;
  // Los textos que parecen fechas o números se guardan con apóstrofo para que la hoja no los convierta.
  const asText = ['token', 'fecha_conteo', 'ultimo_mov_id', 'pais', 'moneda', 'estado', 'licencia', 'acceso', 'acceso_revisado', 'vence', 'resumen_semanal', 'resumen_enviado', 'ultimo_msg_ts', 'fotos_hoy'];
  Object.keys(patch).forEach(k => {
    const j = USER_COLS.indexOf(k);
    if (j > -1) sh.getRange(u._row, j + 1).setValue(asText.indexOf(k) > -1 && patch[k] !== '' ? "'" + patch[k] : patch[k]);
  });
}

/** Cuenta los mensajes del día; devuelve false si se pasó del máximo (control de costos). */
function countUsage_(user, c) {
  const today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const n = user.fecha_conteo === today ? Number(user.mensajes_hoy) + 1 : 1;
  updateUser_(user.wa_id, { mensajes_hoy: n, fecha_conteo: today, ultimo_msg_ts: new Date().toISOString() });
  if (n > Number(c.MAX_MENSAJES_DIA)) {
    if (n === Number(c.MAX_MENSAJES_DIA) + 1) send_(user.wa_id, 'Llegaste al máximo de mensajes de hoy. Mañana seguimos.', c);
    return false;
  }
  return true;
}

function newToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32); }

function userLink_(user, c) { return String(c.SITE_URL).replace(/\/$/, '') + '/tablero/?t=' + user.token; }

function userMovements_(waId) {
  return rowsToObjects_(movSheet_().getDataRange().getValues(), MOV_COLS)
    .filter(m => String(m.wa_id) === String(waId))
    .map(m => ({ id: String(m.id), fecha: String(m.fecha), tipo: m.tipo, monto: Number(m.monto), moneda: m.moneda, categoria: m.categoria, descripcion: m.descripcion, _row: m._row }));
}

function movementWithMsg_(msgId) {
  return rowsToObjects_(movSheet_().getDataRange().getValues(), MOV_COLS).some(m => String(m.msg_id) === String(msgId));
}

function saveMovements_(waId, movs, country, text, msgId, source) {
  const sh = movSheet_();
  const now = new Date().toISOString();
  return movs.map((m, i) => {
    const row = { id: 'm' + Utilities.getUuid().replace(/-/g, '').slice(0, 9) + i, wa_id: "'" + waId, fecha: "'" + m.fecha, tipo: m.tipo, monto: m.monto, moneda: country.currency, categoria: m.categoria, descripcion: m.descripcion, texto: String(text).slice(0, 300), msg_id: msgId, creado: now, fuente: source };
    sh.appendRow(MOV_COLS.map(k => row[k]));
    return Object.assign({}, m, { id: row.id });
  });
}

function undoLast_(waId, country) {
  const movs = userMovements_(waId);
  if (!movs.length) return 'No tienes movimientos para borrar.';
  const last = movs[movs.length - 1];
  movSheet_().deleteRow(last._row);
  updateUser_(waId, { ultimo_mov_id: '', ultimo_mov_ts: '' });
  return 'Eliminado: ' + categoryById_(last.categoria).name + ' · ' + fmtMoney_(last.monto, country) + '.';
}

function recategorize_(waId, movId, cat) {
  const m = userMovements_(waId).filter(x => x.id === String(movId))[0];
  if (!m) return false;
  const sh = movSheet_();
  sh.getRange(m._row, MOV_COLS.indexOf('categoria') + 1).setValue(cat.id);
  if (cat.tipo !== m.tipo) sh.getRange(m._row, MOV_COLS.indexOf('tipo') + 1).setValue(cat.tipo);
  // Aprende: las palabras con significado de la descripción (hasta 3) quedan asociadas a la categoría corregida.
  const words = norm_(m.descripcion).replace(/[$.,\d]/g, ' ').split(' ').filter(w => w.length > 2 && STOP_WORDS.indexOf(w) === -1).slice(0, 3);
  if (words.length) {
    const perfil = getPerfil_(waId);
    perfil.aprendidas = perfil.aprendidas || {};
    words.forEach(w => { perfil.aprendidas[w] = cat.id; });
    const keys = Object.keys(perfil.aprendidas);
    if (keys.length > 150) delete perfil.aprendidas[keys[0]];
    savePerfil_(waId, perfil);
  }
  return true;
}

const STOP_WORDS = ['con', 'del', 'para', 'por', 'los', 'las', 'una', 'uno', 'mil', 'pago', 'pagos', 'gasto', 'gastos', 'compra', 'pague', 'gaste', 'ayer', 'hoy', 'otro', 'otros'];

/* ---------- Perfil: presupuestos, metas, deudas, pagos fijos (lo edita la persona en su tablero) ---------- */

const PERFIL_COLS = ['wa_id', 'perfil', 'actualizado'];
const perfilSheet_ = () => sheet_('Perfiles', PERFIL_COLS);
const BUDGET_WARN = 0.8;

function defaultPerfil_() { return { presupuestos: {}, metas: [], deudas: [], pagosFijos: [], ahorros: 0, mesesFondo: 3, aprendidas: {} }; }

function getPerfil_(waId) {
  const row = rowsToObjects_(perfilSheet_().getDataRange().getValues(), PERFIL_COLS).filter(r => String(r.wa_id) === String(waId))[0];
  if (!row) return defaultPerfil_();
  try { return Object.assign(defaultPerfil_(), JSON.parse(row.perfil)); } catch (err) { return defaultPerfil_(); }
}

function savePerfil_(waId, perfil) {
  const sh = perfilSheet_();
  const row = rowsToObjects_(sh.getDataRange().getValues(), PERFIL_COLS).filter(r => String(r.wa_id) === String(waId))[0];
  const json = JSON.stringify(perfil).slice(0, 45000);
  if (row) { sh.getRange(row._row, 2).setValue(json); sh.getRange(row._row, 3).setValue(new Date().toISOString()); }
  else sh.appendRow(["'" + waId, json, new Date().toISOString()]);
}

/** Valida y limpia lo que llega del tablero (mismas reglas que cleanPerfil en src/lib/premium.ts). */
function cleanPerfil_(p) {
  const n = x => (isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
  const txt = (x, max) => String(x == null ? '' : x).replace(/[<>]/g, '').trim().slice(0, max || 40);
  p = p || {};
  const presupuestos = {};
  CATEGORIES.forEach(c => { if (c.tipo === 'gasto' && n((p.presupuestos || {})[c.id]) > 0) presupuestos[c.id] = n(p.presupuestos[c.id]); });
  return {
    presupuestos: presupuestos,
    metas: (p.metas || []).slice(0, 12).map((m, i) => ({ id: txt(m.id, 20) || 'g' + i, nombre: txt(m.nombre) || 'Meta', monto: n(m.monto), ahorrado: n(m.ahorrado), fecha: /^\d{4}-\d{2}$/.test(String(m.fecha)) ? String(m.fecha) : '' })),
    deudas: (p.deudas || []).slice(0, 12).map((d, i) => ({ id: txt(d.id, 20) || 'd' + i, name: txt(d.name) || 'Deuda', balance: n(d.balance), rate: Math.min(20, n(d.rate)), min: n(d.min) })),
    pagosFijos: (p.pagosFijos || []).slice(0, 30).map((x, i) => ({ id: txt(x.id, 20) || 'f' + i, nombre: txt(x.nombre) || 'Pago', monto: n(x.monto), dia: Math.min(28, Math.max(1, Math.round(n(x.dia)) || 1)), categoria: categoryById_(x.categoria) ? x.categoria : 'otros' })),
    ahorros: n(p.ahorros),
    mesesFondo: [3, 4, 5, 6].indexOf(Number(p.mesesFondo)) > -1 ? Number(p.mesesFondo) : 3
  };
}

function savePerfilFromWeb_(token, perfil) {
  const user = getUserByToken_(token);
  if (!user) return { ok: false, error: 'Este enlace no es válido o fue cambiado.' };
  const acc = accessOf_(user, cfg_());
  if (acc === 'vencida' || acc === 'ninguna') return { ok: false, error: 'Tu tablero está en modo consulta: renueva tu suscripción para guardar cambios.' };
  const clean = cleanPerfil_(perfil);
  clean.aprendidas = getPerfil_(user.wa_id).aprendidas || {};
  savePerfil_(user.wa_id, clean);
  return { ok: true };
}

function publicPerfil_(p) {
  return { presupuestos: p.presupuestos, metas: p.metas, deudas: p.deudas, pagosFijos: p.pagosFijos, ahorros: p.ahorros, mesesFondo: p.mesesFondo };
}

function deleteUserData_(waId) {
  const ms = movSheet_();
  userMovements_(waId).map(m => m._row).sort((a, b) => b - a).forEach(r => ms.deleteRow(r));
  const u = getUser_(waId);
  if (u) usersSheet_().deleteRow(u._row);
  const pr = rowsToObjects_(perfilSheet_().getDataRange().getValues(), PERFIL_COLS).filter(r => String(r.wa_id) === String(waId))[0];
  if (pr) perfilSheet_().deleteRow(pr._row);
}

/** Estado de la suscripción para el tablero: activa/libre o consulta (vencida/ninguna) con sus fechas. */
function accessPayload_(user, c) {
  const estado = accessOf_(user, c);
  return { estado: estado, vence: estado === 'vencida' ? String(user.vence || '').slice(0, 10) : '', hasta: estado === 'vencida' ? consultaHasta_(user, c) : '', renovar: renewUrl_(c) };
}

/** Lo que ve el sitio en el tablero. */
function movementsFor_(token, mes) {
  const user = getUserByToken_(token);
  if (!user) return { ok: false, error: 'Este enlace no es válido o fue cambiado. Escribe "tablero" al bot para recibir el actual.' };
  const country = countryById_(user.pais) || countryById_('US');
  const all = userMovements_(user.wa_id);
  const months = all.map(m => m.fecha.slice(0, 7)).filter((x, i, a) => a.indexOf(x) === i).sort().reverse();
  const current = Utilities.formatDate(new Date(), country.tz, 'yyyy-MM');
  const month = /^\d{4}-\d{2}$/.test(String(mes || '')) ? mes : current;
  if (months.indexOf(current) === -1) months.unshift(current);
  return {
    ok: true,
    usuario: { nombre: String(user.nombre || '').split(' ')[0], pais: country.id, moneda: country.currency },
    mes: month, meses: months.slice(0, 24), hoy: Utilities.formatDate(new Date(), country.tz, 'yyyy-MM-dd'),
    perfil: publicPerfil_(getPerfil_(user.wa_id)),
    acceso: accessPayload_(user, cfg_()),
    historico: monthlyHistory_(all).slice(-60),
    movimientos: all.filter(m => m.fecha.slice(0, 7) === month).map(m => ({ id: m.id, fecha: m.fecha, tipo: m.tipo, monto: m.monto, categoria: m.categoria, descripcion: m.descripcion }))
  };
}

/* ============================================================
 * 9. WHATSAPP Y UTILIDADES
 * ============================================================ */

function send_(to, body, c) {
  if (!c.WA_TOKEN || !c.WA_PHONE_NUMBER_ID) { console.log('[sin WhatsApp] → ' + to + ': ' + body); return; }
  const resp = UrlFetchApp.fetch('https://graph.facebook.com/' + c.GRAPH_VERSION + '/' + c.WA_PHONE_NUMBER_ID + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + c.WA_TOKEN },
    payload: JSON.stringify({ messaging_product: 'whatsapp', to: String(to), type: 'text', text: { body: String(body).slice(0, 4000), preview_url: true } }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) logError_(new Error('WhatsApp respondió ' + resp.getResponseCode()), resp.getContentText().slice(0, 500));
}

function logError_(err, detail) {
  console.error(err && err.stack || err, detail);
  try { sheet_('Errores', ['Fecha', 'Mensaje', 'Detalle']).appendRow([new Date(), String(err && err.message || err), String(detail || '').slice(0, 2000)]); } catch (e) { /* sin base de datos */ }
}

/** Ejecútalo una vez: crea la base de datos y deja listas las propiedades. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const c = cfg_();
  Object.keys(BOT_DEFAULTS).forEach(k => { if (!props.getProperty(k)) props.setProperty(k, BOT_DEFAULTS[k]); });
  ['WA_TOKEN', 'WA_PHONE_NUMBER_ID', 'ANTHROPIC_API_KEY'].forEach(k => { if (!props.getProperty(k)) props.setProperty(k, ''); });
  if (!props.getProperty('RELAY_SECRET')) props.setProperty('RELAY_SECRET', newToken_());
  if (!c.DB_ID) {
    const ss = SpreadsheetApp.create(c.BRAND_NAME + ' — Bot de WhatsApp');
    ss.getSheets()[0].setName('Usuarios').appendRow(USER_COLS);
    ss.insertSheet('Movimientos').appendRow(MOV_COLS);
    ss.insertSheet('Perfiles').appendRow(PERFIL_COLS);
    ss.insertSheet('Errores').appendRow(['Fecha', 'Mensaje', 'Detalle']);
    ss.getSheets().forEach(s => s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold'));
    props.setProperty('DB_ID', ss.getId());
    console.log('Base de datos creada: ' + ss.getUrl());
  }
  console.log('Listo. Tu RELAY_SECRET (cópialo en Cloudflare): ' + props.getProperty('RELAY_SECRET'));
}

/** Prueba sin WhatsApp: simula mensajes y muestra en el registro lo que el bot respondería. */
function probarBot() {
  const c = cfg_();
  ['hola', 'almuerzo 25 mil y taxi 12.000', 'me pagaron la quincena 2,1 millones', 'transporte', 'resumen'].forEach((t, i) => {
    handleMessage_({ from: '570000000000', id: 'prueba-' + Date.now() + '-' + i, type: 'text', text: { body: t } }, 'Persona de prueba', Object.assign({}, c, { WA_TOKEN: '' }));
  });
}
