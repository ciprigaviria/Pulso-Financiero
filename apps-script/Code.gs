/**
 * Pulso Financiero — backend en Google Apps Script (archivo único, autocontenido).
 *
 * Qué hace:
 *  1. Recibe los correos de quienes piden su resumen gratis y se lo envía.
 *  2. Recibe el aviso de pago de Lemon Squeezy, verifica el pedido con su API,
 *     busca la clave de licencia y envía el enlace al tablero + el informe PDF.
 *  3. Valida claves de licencia para el tablero (GET ?action=licencia&key=...), incluidos
 *     los códigos de cortesía (membresías gratis) que creas con crearCodigoCortesia().
 *  4. Guarda inscripciones a la beta y comentarios del tablero.
 *  5. Crea la base de datos (Google Sheets).
 *
 * Puesta en marcha: ver README.md, paso 3. Resumen:
 *  - Pega este archivo y appsscript.json en un proyecto nuevo de Apps Script
 *    (con la cuenta de Google de la marca).
 *  - Ejecuta setup() una vez y autoriza los permisos.
 *  - En Configuración del proyecto > Propiedades del script, completa:
 *      LS_API_KEY, LS_STORE_ID, SITE_URL, CHECKOUT_ANUAL, BRAND_NAME, REPLY_TO
 *      y, si quieres, LS_PRODUCT_ID (para aceptar solo licencias de ese producto).
 *  - Implementa como aplicación web (ejecutar como: yo; acceso: cualquier persona).
 *  - Ejecuta probarInforme() para recibir un informe de ejemplo en tu correo.
 *
 * IMPORTANTE: las reglas de puntaje (sección 2) son copia de src/lib/scoring.js.
 * Si cambias una, cambia la otra y corre `npm test`.
 */

/* ============================================================
 * 1. CONFIGURACIÓN
 * ============================================================ */

const DEFAULTS = {
  BRAND_NAME: 'Pulso Financiero',
  SITE_URL: 'https://tudominio.com',
  CHECKOUT_ANUAL: '',
  REPLY_TO: '',
  PREMIUM_NAME: 'Pulso Premium',
  PRICE_MONTHLY: 'USD 4,99',
  PRICE_ANNUAL: 'USD 44,99',
  TRIAL_DAYS: '7',
  LEADS_PER_EMAIL_PER_DAY: '2'
};

function cfg_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  return Object.assign({}, DEFAULTS, p);
}

/* ============================================================
 * 2. REGLAS DE PUNTAJE (copia de assets/js/scoring.js)
 * ============================================================ */

const PROFILE = [
  {"id":"edad","text":"¿Cuál es tu rango de edad?","options":["18 a 25","26 a 35","36 a 45","46 a 55","56 o más"]},
  {"id":"ingreso","text":"¿Cómo recibes tus ingresos?","options":["Salario fijo","Independiente o por proyectos","Negocio propio","Una mezcla","Pensión"]},
  {"id":"dependientes","text":"¿Alguien depende económicamente de ti?","options":["Sí","No"]}
];

const AREAS = [
  {"id":"gastar","name":"Gastar"},
  {"id":"ahorrar","name":"Ahorrar"},
  {"id":"deber","name":"Deber"},
  {"id":"proteger","name":"Proteger"},
  {"id":"planear","name":"Planear"}
];

// Opciones de mejor a peor; points[i] e insights[i] corresponden a la opción i.
const QUESTIONS = [
  {"n":1,"area":"gastar","points":[100,75,50,25,0],"insights":["Gastaste mucho menos de lo que ganas: tienes margen real para ahorrar e invertir.","Gastas un poco menos de lo que ganas. Ese margen es tu motor de ahorro: protégelo.","Gastas casi todo lo que ganas: cualquier imprevisto te obliga a endeudarte.","Gastas más de lo que ganas. La diferencia la estás pagando con deuda o con ahorros que se agotan.","Gastas mucho más de lo que ganas: cada mes tu situación se vuelve más difícil de revertir."]},
  {"n":2,"area":"gastar","points":[100,60,40,20,0],"insights":["Pagas todas tus cuentas a tiempo: cero intereses de mora.","Casi siempre pagas a tiempo, pero los pocos atrasos ya te cuestan intereses.","Parte de tus pagos se atrasa y esos recargos se suman mes a mes.","Muchos pagos se atrasan: pagas intereses de mora y arriesgas tu historial de crédito.","La mayoría de tus pagos se atrasa: tu historial de crédito está en riesgo."]},
  {"n":3,"area":"gastar","points":[100,70,40,0],"insights":["Llevas un presupuesto y lo revisas: sabes a dónde va tu dinero.","Tienes presupuesto, pero sin revisarlo pierde su poder.","Solo tienes una idea general de tus gastos: los gastos pequeños se te escapan.","No llevas registro de tus gastos: es difícil mejorar lo que no mides."]},
  {"n":4,"area":"ahorrar","points":[100,75,50,25,0],"insights":["Tu fondo de emergencia cubre 6 meses o más de gastos: estás protegido ante un golpe fuerte.","Tu fondo de emergencia cubre de 3 a 5 meses de gastos: estás dentro del rango recomendado.","Si hoy dejaras de recibir ingresos, tu dinero alcanzaría para 1 o 2 meses. Lo recomendado son de 3 a 6.","Si hoy dejaras de recibir ingresos, tu dinero alcanzaría para pocas semanas. Lo recomendado son de 3 a 6 meses.","Si hoy dejaras de recibir ingresos, no tendrías ni una semana de margen."]},
  {"n":5,"area":"ahorrar","points":[100,75,50,20,0],"insights":["Ahorras 20% o más de tu ingreso: un ritmo excelente.","Ahorras entre 10% y 19% de tu ingreso: vas en un rango saludable.","Ahorras menos del 10% de tu ingreso: a ese ritmo tus metas tardarán años.","Ahorras solo de vez en cuando: sin un hábito fijo, el ahorro depende de que sobre.","No estás ahorrando cada mes: todo lo que ganas se va."]},
  {"n":6,"area":"deber","points":[100,85,40,0],"insights":["No tienes deudas: todo tu ingreso trabaja para ti.","Tus deudas son manejables.","Tus deudas ya superan un poco lo que puedes manejar: es el momento de ordenarlas antes de que crezcan.","Tus deudas superan con creces lo que puedes pagar: necesitas un plan de salida."]},
  {"n":7,"area":"deber","points":[100,100,50,20,0],"insights":["No dependes de la tarjeta de crédito.","Usas la tarjeta sin pagar intereses.","Pagas más del mínimo, pero mientras no pagues el total los intereses siguen corriendo.","Pagar solo el mínimo hace que lo que compras te cueste mucho más y tarde años en pagarse.","Atrasarte con la tarjeta suma intereses de mora y daña tu historial."]},
  {"n":8,"area":"deber","points":[100,75,50,25,0],"insights":["Tu historial de crédito es excelente: accedes a mejores tasas.","Tu historial de crédito es bueno.","Tu historial de crédito es regular: probablemente pagas tasas más altas.","Tienes reportes negativos: tus créditos te salen más caros o te los niegan.","No conoces tu historial de crédito: revisarlo te dice cuánto te prestan y a qué tasa."]},
  {"n":9,"area":"proteger","points":[100,75,50,25,0],"insights":["Un gasto médico grande lo cubre tu seguro.","Ante un gasto médico grande dependes del sistema público y de tus ahorros.","Ante un gasto médico grande dependes solo del sistema público.","Un gasto médico grande lo pagarías con deuda.","No sabrías cómo pagar un gasto médico grande: es uno de tus mayores riesgos."]},
  {"n":10,"area":"proteger","points":[100,100,60,30,0],"insights":["Si te pasara algo grave, los tuyos quedarían protegidos.","Nadie depende de ti y tu salud está cubierta.","Tienes un seguro, pero no sabes si alcanza: revisarlo puede evitar una sorpresa.","Ante un evento grave solo cuentas con lo que da el empleo o la ley.","Si te pasara algo grave, no tienes ninguna protección."]},
  {"n":11,"area":"planear","points":[100,75,40,0],"insights":["Ahorras para tu retiro más allá de lo obligatorio.","Para tu retiro solo cuentas con la pensión obligatoria.","Ahorras para tu retiro de forma irregular.","No estás ahorrando para tu retiro."]},
  {"n":12,"area":"planear","points":[100,65,35,15,0],"insights":["Tienes metas con monto, fecha y plan.","Tienes metas, pero sin un plan de ahorro es difícil cumplirlas.","Tienes ideas, pero sin monto ni fecha no se vuelven realidad.","Has pensado poco en tus metas financieras.","No tienes metas financieras definidas."]}
];

const FLAGS = [
  {"id":"gasta_mas","q":1,"minIndex":3,"name":"Gastas más de lo que ganas","action":"Identifica 3 gastos prescindibles y elimínalos durante 30 días."},
  {"id":"atrasos","q":2,"minIndex":3,"name":"Atrasos frecuentes en tus pagos","action":"Pon recordatorios o pagos automáticos para cada cuenta fija."},
  {"id":"sin_colchon","q":4,"minIndex":4,"name":"No tienes fondo de emergencia","action":"Construye un fondo de reserva inicial equivalente a 1 semana de gastos antes que cualquier otra meta."},
  {"id":"deuda_inmanejable","q":6,"minIndex":3,"name":"Tus deudas superan lo que puedes manejar","action":"Habla con tus acreedores para reestructurar antes de caer en mora."},
  {"id":"tarjeta_limite","q":7,"minIndex":3,"name":"Tu tarjeta de crédito te está costando caro","action":"Deja de usar la tarjeta y paga más del mínimo cada mes hasta saldarla."}
];

const LEVELS = [
  {"id":"sana","min":80,"name":"Sana","color":"verde","message":"Tus finanzas aguantan un golpe y avanzan hacia tus metas."},
  {"id":"estable","min":60,"name":"Estable con alertas","color":"amarillo","message":"Vas bien, pero hay áreas que te pueden frenar."},
  {"id":"riesgo","min":40,"name":"En riesgo","color":"naranja","message":"Un imprevisto te puede desestabilizar."},
  {"id":"vulnerable","min":0,"name":"Vulnerable","color":"rojo","message":"Necesitas un plan de choque cuanto antes."}
];

const FLAG_CAP = 59;

const AREA_MSG = {
  gastar: { verde: 'Gastas con control y pagas a tiempo.', amarillo: 'Tu gasto está justo; un registro mensual te daría margen.', rojo: 'Tus gastos están por encima de lo que tu ingreso aguanta.' },
  ahorrar: { verde: 'Tienes un fondo de emergencia sólido.', amarillo: 'Tu fondo de emergencia existe, pero se agotaría rápido.', rojo: 'Cualquier imprevisto te obligaría a endeudarte.' },
  deber: { verde: 'Tus deudas están bajo control.', amarillo: 'Tus deudas son manejables, pero te restan margen.', rojo: 'Tus deudas te están ahogando el flujo.' },
  proteger: { verde: 'Estás bien cubierto ante un golpe fuerte.', amarillo: 'Tienes protección, pero con huecos.', rojo: 'Un problema de salud o un accidente te pegaría duro.' },
  planear: { verde: 'Tienes rumbo y estás ahorrando para él.', amarillo: 'Tienes ideas, pero falta convertirlas en plan.', rojo: 'Tu futuro financiero está sin plan.' }
};

function round_(x) { return Math.floor(x + 0.5); }
function areaColor_(s) { return s >= 80 ? 'verde' : s >= 50 ? 'amarillo' : 'rojo'; }

function levelFor_(total, hasFlags) {
  const s = hasFlags ? Math.min(total, FLAG_CAP) : total;
  return LEVELS.filter(l => s >= l.min)[0];
}

// Código de 15 dígitos: 3 de perfil + 12 de preguntas. El país viaja aparte, como texto.
function decode_(str) {
  if (!/^\d{15}$/.test(str || '')) throw new Error('Código de respuestas inválido');
  const d = String(str).split('').map(Number);
  const res = { profile: d.slice(0, 3), q: d.slice(3) };
  res.profile.forEach((v, i) => { if (v >= PROFILE[i].options.length) throw new Error('Perfil inválido'); });
  return res;
}

function cleanCountry_(s) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, 40); }

function score_(answers) {
  const q = answers.q;
  const sums = {}, counts = {}, worstQ = {}, bestQ = {};
  QUESTIONS.forEach((question, i) => {
    const idx = q[i];
    if (!(idx >= 0 && idx < question.points.length)) throw new Error('Respuesta inválida en la pregunta ' + question.n);
    const pts = question.points[idx];
    sums[question.area] = (sums[question.area] || 0) + pts;
    counts[question.area] = (counts[question.area] || 0) + 1;
    if (!worstQ[question.area] || pts < worstQ[question.area].pts) worstQ[question.area] = { pts: pts, text: question.insights[idx] };
    if (!bestQ[question.area] || pts > bestQ[question.area].pts) bestQ[question.area] = { pts: pts, text: question.insights[idx] };
  });
  const areas = AREAS.map(a => {
    const s = sums[a.id] / counts[a.id];
    const color = areaColor_(s);
    return { id: a.id, name: a.name, score: round_(s), raw: s, color: color, message: AREA_MSG[a.id][color], insight: worstQ[a.id].text, bestInsight: bestQ[a.id].text };
  });
  const total = round_(areas.reduce((acc, a) => acc + a.raw, 0) / areas.length);
  const flags = FLAGS.filter(f => q[f.q - 1] >= f.minIndex).map(f => ({ id: f.id, name: f.name, action: f.action }));
  const level = levelFor_(total, flags.length > 0);
  const sorted = areas.slice().sort((a, b) => a.raw - b.raw);
  const weakest = sorted[0], strongest = sorted[sorted.length - 1];
  let potential = null;
  if (weakest.raw < 80) {
    const newTotal = round_(areas.reduce((acc, a) => acc + (a.id === weakest.id ? 80 : a.raw), 0) / areas.length);
    potential = { area: weakest.name, from: total, to: newTotal, level: levelFor_(newTotal, false) };
  }
  return { total: total, level: level, areas: areas, flags: flags, weakest: weakest, strongest: strongest, potential: potential };
}

/* ============================================================
 * 3. CONTENIDO DEL INFORME (editable)
 * ============================================================ */

const AREA_DETAIL = {
  gastar: {
    why: 'Gastar menos de lo que ganas es la base de todo lo demás: sin ese margen no hay ahorro ni forma de pagar deudas.',
    actions: [
      'Anota todos tus gastos durante 2 semanas y pásalos a tu tablero.',
      'Clasifica cada gasto como esencial, importante o prescindible, y recorta primero los prescindibles.',
      'Programa el pago automático de tus cuentas fijas para el día en que recibes tu ingreso.',
      'Ponte un tope semanal para gastos variables (comida fuera, compras, salidas).'
    ]
  },
  ahorrar: {
    why: 'Un fondo de emergencia de 3 a 6 meses de gastos esenciales evita que un imprevisto se convierta en deuda.',
    actions: [
      'Mira en tu tablero cuánto te falta para tu fondo de emergencia.',
      'Abre una cuenta de ahorro separada, solo para emergencias.',
      'Programa un ahorro automático el día de pago, aunque sea el 5% de tu ingreso.',
      'Lleva a tu fondo cualquier ingreso extra: primas, bonos o devoluciones.'
    ]
  },
  deber: {
    why: 'Las deudas caras se comen el ingreso que podrías ahorrar; ordenarlas libera dinero cada mes.',
    actions: [
      'Registra todas tus deudas con saldo, tasa y cuota en tu tablero.',
      'Paga el mínimo en todas y pon todo lo extra en la de tasa más alta (método avalancha).',
      'Consulta tu historial en las centrales de riesgo y pide corregir cualquier error.',
      'Si una cuota no te alcanza, llama al banco antes de atrasarte y pide un acuerdo de pago.'
    ]
  },
  proteger: {
    why: 'Un problema de salud o un accidente puede borrar años de ahorro si no tienes cobertura.',
    actions: [
      'Revisa qué cubren exactamente tu sistema de salud y tu empleo.',
      'Si alguien depende de ti, cotiza un seguro de vida a término; suele costar menos de lo que crees.',
      'Evalúa un plan complementario de salud si tu presupuesto lo permite.',
      'Guarda en un solo lugar tus pólizas y cómo reclamarlas, y cuéntale a alguien de confianza.'
    ]
  },
  planear: {
    why: 'Las metas con monto y fecha convierten el ahorro en un hábito con propósito.',
    actions: [
      'Escribe 3 metas con monto y fecha.',
      'Divide cada meta entre los meses que faltan: ese es tu ahorro mensual para ella.',
      'Revisa tu fondo de pensión: semanas o meses cotizados y proyección.',
      'Empieza un ahorro voluntario para el retiro, aunque sea pequeño.'
    ]
  }
};

const FLAG_DETAIL = {
  gasta_mas: { why: 'Gastar más de lo que ganas se paga con deuda o con ahorros que se agotan. Es la alerta más urgente.' },
  atrasos: { why: 'Los atrasos generan intereses de mora y pueden reportarte en las centrales de riesgo.' },
  sin_colchon: { why: 'Sin dinero disponible, cualquier imprevisto termina en deuda cara.' },
  deuda_inmanejable: { why: 'Si tus deudas superan lo que puedes pagar, cada mes empeora por los intereses.' },
  tarjeta_limite: { why: 'Pagar solo el mínimo hace que una compra se pague durante años con intereses altos.' }
};

const WEEK_TITLES = ['Semana 1: lo más urgente', 'Semana 2: ordenar', 'Semana 3: construir', 'Semana 4: consolidar'];

// Plan de 30 días: primero las alertas, luego las áreas más débiles, 2 acciones por semana.
function buildPlan_(res) {
  const items = res.flags.map(f => f.action);
  const weak = res.areas.filter(a => a.color !== 'verde').sort((a, b) => a.raw - b.raw);
  for (let round = 0; round < 4 && items.length < 8; round++) {
    weak.forEach(a => {
      const act = AREA_DETAIL[a.id].actions[round];
      if (act && items.length < 8 && items.indexOf(act) < 0) items.push(act);
    });
  }
  const strong = res.areas.filter(a => a.color === 'verde');
  strong.forEach(a => { if (items.length < 8) items.push('Mantén tu fortaleza en "' + a.name + '": revísala una vez al mes.'); });
  while (items.length < 8) items.push('Revisa tu presupuesto del mes y ajusta lo que se desvió.');
  return WEEK_TITLES.map((t, i) => ({ title: t, actions: items.slice(i * 2, i * 2 + 2) }));
}

/* ============================================================
 * 4. ENTRADAS WEB
 * ============================================================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'licencia') {
    try { return json_(validateLicense_(p.key, cfg_())); }
    catch (err) { logError_(err, 'licencia'); return json_({ ok: false, error: 'No pudimos validar la clave. Intenta de nuevo en un momento.' }); }
  }
  return ContentService.createTextOutput('Pulso Financiero: servicio activo.');
}

/* ---------- Licencias del tablero ---------- */

function validateLicense_(key, c) {
  key = String(key || '').trim();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(key)) return { ok: false, error: 'La clave no tiene el formato correcto.' };
  if (courtesyCodes_(c).indexOf(key.toUpperCase()) > -1) return { ok: true, courtesy: true };
  const cache = CacheService.getScriptCache();
  const hit = cache.get('lic_' + key);
  if (hit) return JSON.parse(hit);

  const resp = UrlFetchApp.fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'post',
    headers: { Accept: 'application/json' },
    payload: { license_key: key },
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  let data = {};
  try { data = JSON.parse(resp.getContentText()); } catch (err) { data = {}; }
  if (code >= 500) throw new Error('Lemon Squeezy respondió ' + code + ' al validar una licencia');

  const meta = data.meta || {};
  const lk = data.license_key || {};
  let out;
  if (!data.valid) out = { ok: false, error: 'La clave no es válida o fue desactivada.' };
  else if (c.LS_STORE_ID && String(meta.store_id) !== String(c.LS_STORE_ID)) out = { ok: false, error: 'La clave no es de esta tienda.' };
  else if (c.LS_PRODUCT_ID && String(meta.product_id) !== String(c.LS_PRODUCT_ID)) out = { ok: false, error: 'La clave es de otro producto.' };
  else if (lk.status && ['active', 'inactive'].indexOf(lk.status) === -1) out = { ok: false, error: 'La clave está ' + lk.status + '.' };
  else out = { ok: true };
  cache.put('lic_' + key, JSON.stringify(out), out.ok ? 21600 : 300);
  return out;
}

/* ---------- Códigos de cortesía (membresías gratis) ---------- */

/** Códigos que desbloquean el tablero sin pago: propiedad CODIGOS_CORTESIA, separados por coma. */
function courtesyCodes_(c) {
  return String(c.CODIGOS_CORTESIA || '').split(/[\s,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
}

/**
 * Crea un código de cortesía nuevo (para ti, para la beta o para un aliado) y lo deja activo.
 * Ejecútalo desde el editor; el código y el enlace directo aparecen en el registro y en la hoja "Cortesías".
 * Para revocar un código, bórralo de la propiedad CODIGOS_CORTESIA.
 */
function crearCodigoCortesia(nota) {
  const c = cfg_();
  const raw = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  const code = 'PULSO-' + raw.slice(0, 4) + '-' + raw.slice(4, 8);
  const list = courtesyCodes_(c).concat([code]);
  PropertiesService.getScriptProperties().setProperty('CODIGOS_CORTESIA', list.join(','));
  const link = boardLink_(c, code);
  sheet_('Cortesías', ['Fecha', 'Código', 'Nota', 'Enlace']).appendRow([new Date(), code, typeof nota === 'string' ? nota : 'Cortesía', link]);
  console.log('Código de cortesía: ' + code + '\nEnlace directo: ' + link);
  return code;
}

/** Busca la clave de licencia de un pedido. Lemon Squeezy la crea unos segundos después del pago. */
function fetchLicenseKey_(orderId, c) {
  for (let i = 0; i < 4; i++) {
    const resp = UrlFetchApp.fetch('https://api.lemonsqueezy.com/v1/license-keys?filter[order_id]=' + encodeURIComponent(orderId), {
      headers: { Accept: 'application/vnd.api+json', Authorization: 'Bearer ' + c.LS_API_KEY },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() === 200) {
      const list = JSON.parse(resp.getContentText()).data || [];
      if (list.length && list[0].attributes && list[0].attributes.key) return list[0].attributes.key;
    }
    if (i < 3) Utilities.sleep(2500);
  }
  return '';
}

function boardLink_(c, key) {
  return String(c.SITE_URL).replace(/\/$/, '') + '/tablero/' + (key ? '?licencia=' + encodeURIComponent(key) : '');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const src = e && e.parameter && e.parameter.src;
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    let out;
    if (src === 'ls') out = handleOrder_(body);
    else if (body.type === 'lead') out = handleLead_(body);
    else if (body.type === 'beta') out = handleBeta_(body);
    else if (body.type === 'feedback') out = handleFeedback_(body);
    else out = { ok: false, error: 'Solicitud desconocida' };
    return json_(out);
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

/* ---------- Resumen gratis ---------- */

function handleLead_(body) {
  const c = cfg_();
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Correo inválido' };
  if (body.consent !== true) return { ok: false, error: 'Sin autorización' };
  const res = score_(decode_(body.r));

  const sh = db_().getSheetByName('Leads');
  const limit = Number(c.LEADS_PER_EMAIL_PER_DAY);
  const since = Date.now() - 24 * 3600 * 1000;
  const recent = sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[1]).toLowerCase() === email && new Date(r[0]).getTime() > since).length;
  const pais = cleanCountry_(body.pais);
  sh.appendRow([new Date(), email, "'" + body.r, res.total, res.level.name, body.test || 'personal', 'Sí', pais]);
  if (recent >= limit) return { ok: true, throttled: true };
  if (MailApp.getRemainingDailyQuota() < 5) { logError_(new Error('Cuota de correo casi agotada'), email); return { ok: true, queued: false }; }

  const buy = checkoutLink_(c.CHECKOUT_ANUAL, body.r, email, pais);
  MailApp.sendEmail({
    to: email,
    subject: 'Tu resultado: ' + res.total + ' de 100 (' + res.level.name + ')',
    htmlBody: leadEmailHtml_(res, buy, c),
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
  return { ok: true };
}

function checkoutLink_(base, code, email, pais) {
  if (!base) return '';
  let url = base + (base.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent('checkout[custom][r]') + '=' + code;
  if (pais) url += '&' + encodeURIComponent('checkout[custom][pais]') + '=' + encodeURIComponent(pais);
  if (email) url += '&' + encodeURIComponent('checkout[email]') + '=' + encodeURIComponent(email);
  return url;
}

/* ---------- Beta y comentarios ---------- */

function sheet_(name, header) {
  const ss = db_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

function handleBeta_(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Correo inválido' };
  if (body.consent !== true) return { ok: false, error: 'Sin autorización' };
  const sh = sheet_('Beta', ['Fecha', 'Correo', 'Autorizó', 'Estado']);
  const exists = sh.getDataRange().getValues().slice(1).some(r => String(r[1]).toLowerCase() === email);
  if (exists) return { ok: true, duplicate: true };
  sh.appendRow([new Date(), email, 'Sí', 'Pendiente']);
  return { ok: true };
}

function handleFeedback_(body) {
  const text = String(body.text || '').replace(/[<>]/g, '').trim().slice(0, 1500);
  if (text.length < 3) return { ok: false, error: 'Comentario vacío' };
  const name = String(body.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
  const sh = sheet_('Comentarios', ['Fecha', 'Nombre', 'Comentario', 'Autoriza publicar', 'Revisado']);
  sh.appendRow([new Date(), name, text, body.publish === true ? 'Sí' : 'No', '']);
  return { ok: true };
}

/* ---------- Pedido pagado (webhook de Lemon Squeezy) ---------- */

function handleOrder_(payload) {
  const c = cfg_();
  const event = payload && payload.meta && payload.meta.event_name;
  if (event !== 'order_created') return { ok: true, ignored: event || 'sin evento' };
  const orderId = String(payload.data && payload.data.id || '');
  if (!orderId) throw new Error('Webhook sin id de pedido');

  // No confiamos en el webhook: confirmamos el pedido directamente con la API.
  const order = fetchOrder_(orderId, c);
  const a = order.attributes;
  if (String(a.store_id) !== String(c.LS_STORE_ID)) throw new Error('El pedido ' + orderId + ' no es de esta tienda');
  if (a.status !== 'paid') return { ok: true, ignored: 'estado ' + a.status };

  const sh = db_().getSheetByName('Pedidos');
  const done = sh.getDataRange().getValues().slice(1).some(r => String(r[1]) === orderId && r[7] === 'Enviado');
  if (done) return { ok: true, duplicate: true };

  const custom = (payload.meta && payload.meta.custom_data) || {};
  const email = a.user_email;
  const name = a.user_name || '';
  let res = null;
  try { res = score_(decode_(custom.r)); } catch (err) { res = null; }

  const pais = cleanCountry_(custom.pais);
  const key = fetchLicenseKey_(orderId, c);
  if (!key) logError_(new Error('Pedido sin clave de licencia: activa "Generate license keys" en el producto'), orderId);
  if (res) sendPackage_(email, name, custom.r, pais, res, c, key);
  else sendPackageWithoutTest_(email, name, c, key);

  sh.appendRow([new Date(), orderId, email, name, custom.r ? "'" + custom.r : '', res ? res.total : '', res ? res.level.name : 'Sin test', 'Enviado', pais, key ? 'Sí' : 'No']);
  return { ok: true };
}

function fetchOrder_(orderId, c) {
  if (!c.LS_API_KEY) throw new Error('Falta LS_API_KEY en las propiedades del script');
  const resp = UrlFetchApp.fetch('https://api.lemonsqueezy.com/v1/orders/' + encodeURIComponent(orderId), {
    headers: { Accept: 'application/vnd.api+json', Authorization: 'Bearer ' + c.LS_API_KEY },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) throw new Error('Lemon Squeezy respondió ' + resp.getResponseCode() + ' para el pedido ' + orderId);
  return JSON.parse(resp.getContentText()).data;
}

/* ============================================================
 * 5. ENVÍO DEL PAQUETE
 * ============================================================ */

function sendPackage_(email, name, code, pais, res, c, key) {
  const answers = decode_(code);
  const pdf = Utilities.newBlob(reportHtml_(res, answers, name, c, pais, key), 'text/html', 'informe.html')
    .getAs('application/pdf').setName('Informe de salud financiera - ' + c.BRAND_NAME + '.pdf');
  MailApp.sendEmail({
    to: email,
    subject: 'Bienvenido a ' + c.PREMIUM_NAME,
    htmlBody: packageEmailHtml_(name, res, c, key),
    attachments: [pdf],
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
}

function sendPackageWithoutTest_(email, name, c, key) {
  MailApp.sendEmail({
    to: email,
    subject: 'Bienvenido a ' + c.PREMIUM_NAME + ': falta un paso',
    htmlBody: packageEmailHtml_(name, null, c, key),
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
}

/* ============================================================
 * 6. HTML DE CORREOS E INFORME
 * ============================================================ */

const HEX = { verde: '#1f9d6b', amarillo: '#d9a21b', naranja: '#e0742a', rojo: '#d6453d', brand: '#0e7c66', ink: '#0f1a17', ink2: '#44514c', soft: '#eef2ef', line: '#dfe5e1' };

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function barHtml_(score, color) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>' +
    '<td width="' + Math.max(score, 1) + '%" style="background:' + HEX[color] + ';height:10px;font-size:1px">&nbsp;</td>' +
    (score < 100 ? '<td style="background:' + HEX.soft + ';height:10px;font-size:1px">&nbsp;</td>' : '') +
    '</tr></table>';
}

function areasTable_(res) {
  return '<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">' +
    res.areas.map(a =>
      '<tr><td width="90" style="font-weight:bold;border-bottom:1px solid ' + HEX.line + '">' + esc_(a.name) + '</td>' +
      '<td style="border-bottom:1px solid ' + HEX.line + '">' + barHtml_(a.score, a.color) +
      '<div style="color:' + HEX.ink2 + ';font-size:13px;margin-top:4px">' + esc_(a.message) + '</div></td>' +
      '<td width="40" align="right" style="font-weight:bold;color:' + HEX[a.color] + ';border-bottom:1px solid ' + HEX.line + '">' + a.score + '</td></tr>'
    ).join('') + '</table>';
}

function shell_(inner, c) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;color:' + HEX.ink + ';max-width:600px;margin:0 auto;line-height:1.5">' +
    '<div style="font-weight:bold;font-size:18px;color:' + HEX.brand + ';margin-bottom:16px">' + esc_(c.BRAND_NAME) + '</div>' +
    inner +
    '<p style="font-size:12px;color:#7a8782;margin-top:32px">Herramienta educativa; no es asesoría financiera. ' +
    'Si no quieres recibir más correos, responde a este mensaje con la palabra BAJA.</p></div>';
}

function leadEmailHtml_(res, buy, c) {
  const flag = res.flags[0];
  return shell_(
    '<h1 style="font-size:24px;margin:0 0 4px">Tu puntaje: ' + res.total + ' de 100</h1>' +
    '<div style="display:inline-block;background:' + HEX[res.level.color] + ';color:#fff;font-weight:bold;padding:4px 12px;border-radius:999px;margin:6px 0 10px">' + esc_(res.level.name) + '</div>' +
    '<p style="color:' + HEX.ink2 + '">' + esc_(res.level.message) + '</p>' +
    (flag ? '<p style="background:#fbebeb;border:1px solid #f0c4c1;padding:12px;border-radius:8px"><b style="color:' + HEX.rojo + '">Alerta:</b> ' + esc_(flag.name) + '.</p>' : '') +
    '<h2 style="font-size:16px;margin-top:24px">Lo que revelan tus respuestas</h2>' +
    '<ul style="padding-left:18px;color:' + HEX.ink + '">' + res.areas.filter(x => x.color !== 'verde').sort((x, y) => x.raw - y.raw).slice(0, 3)
      .map(x => '<li style="margin-bottom:6px"><b>' + esc_(x.name) + ':</b> ' + esc_(x.insight) + '</li>').join('') + '</ul>' +
    (res.potential ? '<p style="background:' + HEX.soft + ';padding:12px;border-radius:8px"><b>Tu potencial: de ' + res.potential.from + ' a ' + res.potential.to + '.</b> Si llevas ' + esc_(res.potential.area) + ' a verde, tu puntaje sube a ' + res.potential.to + '.</p>' : '') +
    '<h2 style="font-size:16px;margin-top:24px">Tu semáforo por área</h2>' + areasTable_(res) +
    (buy ? '<div style="margin-top:28px;padding:20px;border:2px solid ' + HEX.brand + ';border-radius:12px">' +
      '<b style="font-size:16px">Convierte este diagnóstico en un plan que se cumple</b>' +
      '<p style="color:' + HEX.ink2 + ';margin:8px 0 14px">Con ' + esc_(c.PREMIUM_NAME) + ' escribes tus gastos por WhatsApp ("almuerzo 25 mil") y tu tablero te muestra cada día cuánto te queda, cómo vas con tu presupuesto y qué hacer con tu dinero, con recomendaciones de ahorro e inversión.</p>' +
      '<p style="margin:0 0 14px"><b style="font-size:22px">' + esc_(c.PRICE_ANNUAL) + '</b> al año · o ' + esc_(c.PRICE_MONTHLY) + ' al mes' + (Number(c.TRIAL_DAYS) > 0 ? ' · <b>' + esc_(c.TRIAL_DAYS) + ' días gratis</b>, cancela cuando quieras' : '') + '</p>' +
      '<a href="' + esc_(buy) + '" style="background:' + HEX.brand + ';color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;display:inline-block">' + (Number(c.TRIAL_DAYS) > 0 ? 'Empezar mi prueba gratis' : 'Suscribirme') + '</a>' +
      '<p style="font-size:13px;margin:12px 0 0"><a href="' + esc_(String(c.SITE_URL).replace(/\/$/, '') + '/#precios') + '" style="color:' + HEX.brand + '">Ver planes y qué incluye</a></p></div>' : ''),
    c);
}

function keyBoxHtml_(c, key) {
  if (!key) {
    return '<p style="background:#fff4e5;border:1px solid #f2d3a6;padding:12px;border-radius:8px">Tu clave de acceso se está generando. Si no te llega en un correo aparte en los próximos minutos, responde a este mensaje y te la enviamos.</p>';
  }
  return '<div style="margin:18px 0;padding:18px;border:2px solid ' + HEX.brand + ';border-radius:12px">' +
    '<a href="' + esc_(boardLink_(c, key)) + '" style="background:' + HEX.brand + ';color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;display:inline-block">Abrir mi tablero</a>' +
    '<p style="margin:14px 0 4px;font-size:13px;color:' + HEX.ink2 + '">Tu clave de acceso (guárdala para entrar desde otro dispositivo):</p>' +
    '<div style="font-family:Menlo,Consolas,monospace;font-size:15px;font-weight:bold;background:' + HEX.soft + ';padding:10px 12px;border-radius:8px;word-break:break-all">' + esc_(key) + '</div></div>';
}

function packageEmailHtml_(name, res, c, key) {
  const hello = name ? 'Hola, ' + esc_(name.split(' ')[0]) + ':' : 'Hola:';
  const privacy = '<p style="font-size:13px;color:' + HEX.ink2 + '">Tus cifras (ingresos, gastos, deudas) se guardan solo en tu navegador; nosotros no las vemos. Para usarlas en otro dispositivo, usa el botón "Respaldo" del tablero.</p>';
  const body = res
    ? '<p>' + hello + '</p><p>Bienvenido a ' + esc_(c.PREMIUM_NAME) + '. Tu acceso ya está activo:</p>' + keyBoxHtml_(c, key) +
      '<p><b>Cómo empezar:</b> abre el tablero, escribe tus ingresos, gastos y deudas del mes (unos 10 minutos) y mira tus recomendaciones. Después, sigue la semana 1 de tu plan.</p>' +
      '<p>Adjuntamos además tu <b>informe en PDF</b> con tu puntaje (' + res.total + ' de 100, ' + esc_(res.level.name) + '), tu semáforo y el plan de 30 días.</p>' +
      privacy + '<p>Si tienes dudas, responde a este correo.</p>'
    : '<p>' + hello + '</p><p>Bienvenido a ' + esc_(c.PREMIUM_NAME) + '. Tu acceso ya está activo:</p>' + keyBoxHtml_(c, key) +
      '<p>No recibimos tus respuestas del test, así que falta un paso: <a href="' + esc_(c.SITE_URL) + '/prueba-personal/" style="color:' + HEX.brand + ';font-weight:bold">haz el test aquí</a> (5 minutos) para que el tablero muestre tu radar y tu plan. Si quieres el informe en PDF, responde a este correo con tu puntaje.</p>' +
      privacy;
  return shell_(body, c);
}

function reportHtml_(res, answers, name, c, pais, key) {
  const date = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy');
  const plan = buildPlan_(res);
  const prof = [pais || 'País no indicado'].concat(PROFILE.map((p, i) => p.options[answers.profile[i]])).map(esc_).join(' · ');
  const h2 = 'style="font-size:18px;color:' + HEX.brand + ';margin:28px 0 8px;border-bottom:2px solid ' + HEX.soft + ';padding-bottom:6px"';

  const flagsHtml = res.flags.length
    ? res.flags.map(f => '<div style="background:#fbebeb;border-left:4px solid ' + HEX.rojo + ';padding:10px 14px;margin:8px 0">' +
        '<b style="color:' + HEX.rojo + '">' + esc_(f.name) + '</b><br>' + esc_(FLAG_DETAIL[f.id].why) +
        '<br><b>Qué hacer primero:</b> ' + esc_(f.action) + '</div>').join('')
    : '<p>No tienes alertas rojas. Buen punto de partida.</p>';

  const areasDetail = res.areas.map(a => {
    const d = AREA_DETAIL[a.id];
    const acts = a.color === 'verde' ? d.actions.slice(0, 1) : d.actions.slice(0, 3);
    return '<div style="margin:14px 0;padding:12px 14px;border:1px solid ' + HEX.line + ';border-radius:8px">' +
      '<b style="font-size:15px">' + esc_(a.name) + '</b> <span style="color:' + HEX[a.color] + ';font-weight:bold">' + a.score + '/100</span>' +
      '<div style="color:' + HEX.ink2 + ';margin:4px 0">' + esc_(a.message) + ' ' + esc_(d.why) + '</div>' +
      '<div style="font-size:13px"><b>' + (a.color === 'verde' ? 'Para mantenerlo:' : 'Qué hacer:') + '</b><ul style="margin:4px 0 0 18px;padding:0">' +
      acts.map(x => '<li>' + esc_(x) + '</li>').join('') + '</ul></div></div>';
  }).join('');

  const insightsHtml = res.areas.slice().sort((x, y) => x.raw - y.raw).map(a =>
    '<tr><td width="90" valign="top" style="font-weight:bold;border-bottom:1px solid ' + HEX.line + ';color:' + HEX[a.color] + '">' + esc_(a.name) + '</td>' +
    '<td style="border-bottom:1px solid ' + HEX.line + '">' + esc_(a.insight) + '</td></tr>').join('');

  const potentialHtml = res.potential
    ? '<div style="background:' + HEX.soft + ';padding:12px 14px;margin-top:12px"><b>Tu potencial: de ' + res.potential.from + ' a ' + res.potential.to + '.</b> ' +
      'Si llevas ' + esc_(res.potential.area) + ' a verde, tu puntaje subiría a ' + res.potential.to + ' (' + esc_(res.potential.level.name) + ')' +
      (res.flags.length ? ', siempre que resuelvas también tus alertas' : '') + '. El plan de 30 días empieza por ahí.</div>'
    : '';

  const planHtml = '<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px">' +
    plan.map(w => '<tr><td width="150" valign="top" style="font-weight:bold;border-bottom:1px solid ' + HEX.line + '">' + esc_(w.title) + '</td>' +
      '<td style="border-bottom:1px solid ' + HEX.line + '">' + w.actions.map(x => '☐ ' + esc_(x)).join('<br>') + '</td></tr>').join('') +
    '</table>';

  return '<html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;color:' + HEX.ink + ';font-size:13px;line-height:1.45">' +
    '<div style="font-weight:bold;color:' + HEX.brand + ';font-size:16px">' + esc_(c.BRAND_NAME) + '</div>' +
    '<h1 style="font-size:26px;margin:10px 0 2px">Tu informe de salud financiera</h1>' +
    '<div style="color:' + HEX.ink2 + '">' + (name ? esc_(name) + ' · ' : '') + date + '</div>' +
    '<div style="color:' + HEX.ink2 + ';font-size:12px;margin-top:2px">Perfil: ' + prof + '</div>' +

    '<table width="100%" cellpadding="14" cellspacing="0" style="margin:18px 0;background:' + HEX.soft + ';border-collapse:collapse"><tr>' +
    '<td width="140" align="center" style="font-size:48px;font-weight:bold;color:' + HEX[res.level.color] + '">' + res.total + '<div style="font-size:12px;color:' + HEX.ink2 + '">de 100</div></td>' +
    '<td><div style="font-size:20px;font-weight:bold;color:' + HEX[res.level.color] + '">' + esc_(res.level.name) + '</div>' +
    '<div>' + esc_(res.level.message) + '</div>' +
    '<div style="font-size:12px;color:' + HEX.ink2 + ';margin-top:6px">Escala: 80-100 Sana · 60-79 Estable con alertas · 40-59 En riesgo · 0-39 Vulnerable</div></td></tr></table>' +

    '<h2 ' + h2 + '>Tu semáforo por área</h2>' + areasTable_(res) + potentialHtml +
    '<h2 ' + h2 + '>Lo que revelan tus respuestas</h2>' +
    '<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px">' + insightsHtml + '</table>' +
    '<h2 ' + h2 + '>Alertas</h2>' + flagsHtml +
    '<h2 ' + h2 + '>Tu resultado, área por área</h2>' + areasDetail +
    '<h2 ' + h2 + '>Tu plan de 30 días</h2>' +
    '<p>Dos acciones por semana, empezando por lo más urgente. Marca cada una cuando la termines.</p>' + planHtml +
    '<h2 ' + h2 + '>Tu tablero</h2>' +
    '<p>Abre tu tablero en <a href="' + esc_(boardLink_(c, key)) + '" style="color:' + HEX.brand + '">' + esc_(boardLink_(c)) + '</a> y escribe tus ingresos, gastos y deudas del mes. Verás cuánto te queda, en qué se va tu dinero, cuándo completas tu fondo de emergencia y en qué orden pagar tus deudas. Actualízalo una vez al mes y repite este test en 3 meses para medir tu avance.</p>' +
    '<p style="font-size:11px;color:#7a8782;margin-top:28px">Este informe es una herramienta educativa basada en tus respuestas y en una adaptación del FinHealth Score de la Financial Health Network. No es asesoría financiera, legal ni tributaria personalizada.</p>' +
    '</body></html>';
}

/* ============================================================
 * 7. BASE DE DATOS Y UTILIDADES
 * ============================================================ */

function db_() {
  const id = cfg_().DB_ID;
  if (!id) throw new Error('Falta DB_ID: ejecuta setup() primero');
  return SpreadsheetApp.openById(id);
}

function logError_(err, detail) {
  console.error(err && err.stack || err, detail);
  try {
    db_().getSheetByName('Errores').appendRow([new Date(), String(err && err.message || err), String(detail || '').slice(0, 2000)]);
  } catch (e) { /* sin base de datos todavía */ }
}

/** Ejecútalo una vez. Crea la base de datos si no existe. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const c = cfg_();
  Object.keys(DEFAULTS).forEach(k => { if (!props.getProperty(k)) props.setProperty(k, DEFAULTS[k]); });
  ['LS_API_KEY', 'LS_STORE_ID', 'LS_PRODUCT_ID', 'CODIGOS_CORTESIA'].forEach(k => { if (!props.getProperty(k)) props.setProperty(k, ''); });

  if (!c.DB_ID) {
    const ss = SpreadsheetApp.create(c.BRAND_NAME + ' — Base de datos');
    const leads = ss.getSheets()[0].setName('Leads');
    leads.appendRow(['Fecha', 'Correo', 'Código', 'Puntaje', 'Nivel', 'Test', 'Autorizó', 'País']);
    ss.insertSheet('Pedidos').appendRow(['Fecha', 'Pedido', 'Correo', 'Nombre', 'Código', 'Puntaje', 'Nivel', 'Estado', 'País', 'Clave enviada']);
    ss.insertSheet('Beta').appendRow(['Fecha', 'Correo', 'Autorizó', 'Estado']);
    ss.insertSheet('Comentarios').appendRow(['Fecha', 'Nombre', 'Comentario', 'Autoriza publicar', 'Revisado']);
    ss.insertSheet('Cortesías').appendRow(['Fecha', 'Código', 'Nota', 'Enlace']);
    ss.insertSheet('Errores').appendRow(['Fecha', 'Mensaje', 'Detalle']);
    ss.getSheets().forEach(s => s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold'));
    props.setProperty('DB_ID', ss.getId());
    console.log('Base de datos creada: ' + ss.getUrl());
  }
  console.log('Listo. Ahora completa LS_API_KEY, LS_STORE_ID, SITE_URL y CHECKOUT_ANUAL en Propiedades del script.');
}

/** Envía a tu propio correo un informe de ejemplo, sin pasar por el pago. */
function probarInforme() {
  const c = cfg_();
  const me = Session.getEffectiveUser().getEmail();
  const code = '110' + '101111121112'; // 3 de perfil + 12 respuestas de ejemplo
  sendPackage_(me, 'Persona de prueba', code, 'Colombia', score_(decode_(code)), c, 'CLAVE-DE-PRUEBA-0000');
  console.log('Informe de prueba enviado a ' + me);
}
