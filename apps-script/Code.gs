/**
 * Pulso Financiero — backend en Google Apps Script (archivo único, autocontenido).
 *
 * Qué hace:
 *  1. Recibe los correos de quienes piden su resumen gratis y se lo envía.
 *  2. Recibe el aviso de pago de Lemon Squeezy, verifica el pedido con su API,
 *     genera el informe PDF personalizado y lo envía con el archivo de presupuesto.
 *  3. Crea la base de datos (Google Sheets) y la plantilla de presupuesto.
 *
 * Puesta en marcha: ver README.md, paso 3. Resumen:
 *  - Pega este archivo y appsscript.json en un proyecto nuevo de Apps Script
 *    (con la cuenta de Google de la marca).
 *  - Ejecuta setup() una vez y autoriza los permisos.
 *  - En Configuración del proyecto > Propiedades del script, completa:
 *      LS_API_KEY, LS_STORE_ID, SITE_URL, CHECKOUT_PERSONAL, BRAND_NAME, REPLY_TO
 *  - Implementa como aplicación web (ejecutar como: yo; acceso: cualquier persona).
 *  - Ejecuta probarInforme() para recibir un informe de ejemplo en tu correo.
 *
 * IMPORTANTE: las reglas de puntaje (sección 2) son copia de assets/js/scoring.js.
 * Si cambias una, cambia la otra y corre `node tests/scoring.test.mjs`.
 */

/* ============================================================
 * 1. CONFIGURACIÓN
 * ============================================================ */

const DEFAULTS = {
  BRAND_NAME: 'Pulso Financiero',
  SITE_URL: 'https://tudominio.com',
  CHECKOUT_PERSONAL: '',
  REPLY_TO: '',
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
  { id: 'pais', text: '¿En qué país vives?', options: ['Colombia', 'Guatemala', 'México', 'Otro país de Latinoamérica', 'Otro'] },
  { id: 'edad', text: '¿Cuál es tu rango de edad?', options: ['18 a 25', '26 a 35', '36 a 45', '46 a 55', '56 o más'] },
  { id: 'ingreso', text: '¿Cómo recibes tus ingresos?', options: ['Salario fijo', 'Independiente o por proyectos', 'Negocio propio', 'Una mezcla', 'Pensión'] },
  { id: 'dependientes', text: '¿Alguien depende económicamente de ti?', options: ['Sí', 'No'] }
];

const AREAS = [
  { id: 'gastar', name: 'Gastar' },
  { id: 'ahorrar', name: 'Ahorrar' },
  { id: 'deber', name: 'Deber' },
  { id: 'proteger', name: 'Proteger' },
  { id: 'planear', name: 'Planear' }
];

const QUESTIONS = [
  { n: 1, area: 'gastar', points: [100, 75, 50, 25, 0] },
  { n: 2, area: 'gastar', points: [100, 60, 40, 20, 0] },
  { n: 3, area: 'gastar', points: [100, 70, 40, 0] },
  { n: 4, area: 'ahorrar', points: [100, 75, 50, 25, 0] },
  { n: 5, area: 'ahorrar', points: [100, 75, 50, 20, 0] },
  { n: 6, area: 'deber', points: [100, 85, 40, 0] },
  { n: 7, area: 'deber', points: [100, 100, 50, 20, 0] },
  { n: 8, area: 'deber', points: [100, 75, 50, 25, 0] },
  { n: 9, area: 'proteger', points: [100, 75, 50, 25, 0] },
  { n: 10, area: 'proteger', points: [100, 100, 60, 30, 0] },
  { n: 11, area: 'planear', points: [100, 75, 40, 0] },
  { n: 12, area: 'planear', points: [100, 65, 35, 15, 0] }
];

const FLAGS = [
  { id: 'gasta_mas', q: 1, minIndex: 3, name: 'Gastas más de lo que ganas' },
  { id: 'atrasos', q: 2, minIndex: 3, name: 'Atrasos frecuentes en tus pagos' },
  { id: 'sin_colchon', q: 4, minIndex: 4, name: 'No tienes colchón para imprevistos' },
  { id: 'deuda_inmanejable', q: 6, minIndex: 3, name: 'Tus deudas superan lo que puedes manejar' },
  { id: 'tarjeta_limite', q: 7, minIndex: 3, name: 'Tu tarjeta de crédito te está costando caro' }
];

const LEVELS = [
  { id: 'sana', min: 80, name: 'Sana', color: 'verde', message: 'Tus finanzas aguantan un golpe y avanzan hacia tus metas.' },
  { id: 'estable', min: 60, name: 'Estable con alertas', color: 'amarillo', message: 'Vas bien, pero hay áreas que te pueden frenar.' },
  { id: 'riesgo', min: 40, name: 'En riesgo', color: 'naranja', message: 'Un imprevisto te puede desestabilizar.' },
  { id: 'vulnerable', min: 0, name: 'Vulnerable', color: 'rojo', message: 'Necesitas un plan de choque cuanto antes.' }
];

const FLAG_CAP = 59;

const AREA_MSG = {
  gastar: { verde: 'Gastas con control y pagas a tiempo.', amarillo: 'Tu gasto está justo; un registro mensual te daría margen.', rojo: 'Tus gastos están por encima de lo que tu ingreso aguanta.' },
  ahorrar: { verde: 'Tienes un colchón sólido.', amarillo: 'Tu colchón existe, pero se agotaría rápido.', rojo: 'Cualquier imprevisto te obligaría a endeudarte.' },
  deber: { verde: 'Tus deudas están bajo control.', amarillo: 'Tus deudas son manejables, pero te restan margen.', rojo: 'Tus deudas te están ahogando el flujo.' },
  proteger: { verde: 'Estás bien cubierto ante un golpe fuerte.', amarillo: 'Tienes protección, pero con huecos.', rojo: 'Un problema de salud o un accidente te pegaría duro.' },
  planear: { verde: 'Tienes rumbo y estás ahorrando para él.', amarillo: 'Tienes ideas, pero falta convertirlas en plan.', rojo: 'Tu futuro financiero está sin plan.' }
};

function round_(x) { return Math.floor(x + 0.5); }
function areaColor_(s) { return s >= 80 ? 'verde' : s >= 50 ? 'amarillo' : 'rojo'; }

function decode_(str) {
  if (!/^\d{16}$/.test(str || '')) throw new Error('Código de respuestas inválido');
  const d = String(str).split('').map(Number);
  const res = { profile: d.slice(0, 4), q: d.slice(4) };
  res.profile.forEach((v, i) => { if (v >= PROFILE[i].options.length) throw new Error('Perfil inválido'); });
  return res;
}

function score_(answers) {
  const q = answers.q;
  const sums = {}, counts = {};
  QUESTIONS.forEach((question, i) => {
    const idx = q[i];
    if (!(idx >= 0 && idx < question.points.length)) throw new Error('Respuesta inválida en la pregunta ' + question.n);
    sums[question.area] = (sums[question.area] || 0) + question.points[idx];
    counts[question.area] = (counts[question.area] || 0) + 1;
  });
  const areas = AREAS.map(a => {
    const s = sums[a.id] / counts[a.id];
    const color = areaColor_(s);
    return { id: a.id, name: a.name, score: round_(s), raw: s, color: color, message: AREA_MSG[a.id][color] };
  });
  const total = round_(areas.reduce((acc, a) => acc + a.raw, 0) / areas.length);
  const flags = FLAGS.filter(f => q[f.q - 1] >= f.minIndex).map(f => ({ id: f.id, name: f.name }));
  const levelScore = flags.length ? Math.min(total, FLAG_CAP) : total;
  const level = LEVELS.filter(l => levelScore >= l.min)[0];
  return { total: total, level: level, areas: areas, flags: flags };
}

/* ============================================================
 * 3. CONTENIDO DEL INFORME (editable)
 * ============================================================ */

const AREA_DETAIL = {
  gastar: {
    why: 'Gastar menos de lo que ganas es la base de todo lo demás: sin ese margen no hay ahorro ni forma de pagar deudas.',
    actions: [
      'Anota todos tus gastos durante 2 semanas en la hoja "Presupuesto" de tu archivo.',
      'Clasifica cada gasto como esencial, importante o prescindible, y recorta primero los prescindibles.',
      'Programa el pago automático de tus cuentas fijas para el día en que recibes tu ingreso.',
      'Ponte un tope semanal para gastos variables (comida fuera, compras, salidas).'
    ]
  },
  ahorrar: {
    why: 'Un colchón de 3 a 6 meses de gastos esenciales evita que un imprevisto se convierta en deuda.',
    actions: [
      'Calcula tu meta de fondo de emergencia en la hoja "Fondo de emergencia".',
      'Abre una cuenta de ahorro separada, solo para emergencias.',
      'Programa un ahorro automático el día de pago, aunque sea el 5% de tu ingreso.',
      'Lleva a tu fondo cualquier ingreso extra: primas, bonos o devoluciones.'
    ]
  },
  deber: {
    why: 'Las deudas caras se comen el ingreso que podrías ahorrar; ordenarlas libera dinero cada mes.',
    actions: [
      'Lista todas tus deudas con saldo, tasa y cuota en la hoja "Deudas".',
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
      'Escribe 3 metas con monto y fecha en la hoja "Metas" de tu archivo.',
      'Mira en el archivo cuánto debes ahorrar cada mes para cada meta.',
      'Revisa tu fondo de pensión: semanas o meses cotizados y proyección.',
      'Empieza un ahorro voluntario para el retiro, aunque sea pequeño.'
    ]
  }
};

const FLAG_DETAIL = {
  gasta_mas: { why: 'Gastar más de lo que ganas se paga con deuda o con ahorros que se agotan. Es la alerta más urgente.', action: 'Identifica 3 gastos prescindibles y elimínalos durante 30 días.' },
  atrasos: { why: 'Los atrasos generan intereses de mora y pueden reportarte en las centrales de riesgo.', action: 'Pon recordatorios o pagos automáticos para cada cuenta fija.' },
  sin_colchon: { why: 'Sin dinero disponible, cualquier imprevisto termina en deuda cara.', action: 'Junta tu primer colchón equivalente a 1 semana de gastos antes que cualquier otra meta.' },
  deuda_inmanejable: { why: 'Si tus deudas superan lo que puedes pagar, cada mes empeora por los intereses.', action: 'Habla con tus acreedores para reestructurar antes de caer en mora.' },
  tarjeta_limite: { why: 'Pagar solo el mínimo hace que una compra se pague durante años con intereses altos.', action: 'Deja de usar la tarjeta y paga más del mínimo cada mes hasta saldarla.' }
};

const WEEK_TITLES = ['Semana 1: lo más urgente', 'Semana 2: ordenar', 'Semana 3: construir', 'Semana 4: consolidar'];

// Plan de 30 días: primero las alertas, luego las áreas más débiles, 2 acciones por semana.
function buildPlan_(res) {
  const items = res.flags.map(f => FLAG_DETAIL[f.id].action);
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

function doGet() {
  return ContentService.createTextOutput('Pulso Financiero: servicio activo.');
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
  sh.appendRow([new Date(), email, "'" + body.r, res.total, res.level.name, body.test || 'personal', 'Sí']);
  if (recent >= limit) return { ok: true, throttled: true };
  if (MailApp.getRemainingDailyQuota() < 5) { logError_(new Error('Cuota de correo casi agotada'), email); return { ok: true, queued: false }; }

  const buy = checkoutLink_(c.CHECKOUT_PERSONAL, body.r, email);
  MailApp.sendEmail({
    to: email,
    subject: 'Tu resultado: ' + res.total + ' de 100 (' + res.level.name + ')',
    htmlBody: leadEmailHtml_(res, buy, c),
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
  return { ok: true };
}

function checkoutLink_(base, code, email) {
  if (!base) return '';
  let url = base + (base.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent('checkout[custom][r]') + '=' + code;
  if (email) url += '&' + encodeURIComponent('checkout[email]') + '=' + encodeURIComponent(email);
  return url;
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

  if (res) sendPackage_(email, name, custom.r, res, c);
  else sendPackageWithoutTest_(email, name, c);

  sh.appendRow([new Date(), orderId, email, name, custom.r ? "'" + custom.r : '', res ? res.total : '', res ? res.level.name : 'Sin test', 'Enviado']);
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

function sendPackage_(email, name, code, res, c) {
  const answers = decode_(code);
  const pdf = Utilities.newBlob(reportHtml_(res, answers, name, c), 'text/html', 'informe.html')
    .getAs('application/pdf').setName('Informe de salud financiera - ' + c.BRAND_NAME + '.pdf');
  const attachments = [pdf];
  const xlsx = templateXlsx_(c);
  if (xlsx) attachments.push(xlsx);
  MailApp.sendEmail({
    to: email,
    subject: 'Tu paquete de salud financiera: informe, archivo y plan de 30 días',
    htmlBody: packageEmailHtml_(name, res, c, true),
    attachments: attachments,
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
}

function sendPackageWithoutTest_(email, name, c) {
  const attachments = [];
  const xlsx = templateXlsx_(c);
  if (xlsx) attachments.push(xlsx);
  MailApp.sendEmail({
    to: email,
    subject: 'Tu paquete de salud financiera: falta un paso',
    htmlBody: packageEmailHtml_(name, null, c, false),
    attachments: attachments,
    name: c.BRAND_NAME,
    replyTo: c.REPLY_TO || undefined
  });
}

function templateXlsx_(c) {
  if (!c.TEMPLATE_ID) return null;
  const resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + c.TEMPLATE_ID + '/export?format=xlsx', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) { logError_(new Error('No se pudo exportar la plantilla'), resp.getResponseCode()); return null; }
  return resp.getBlob().setName('Presupuesto y plan de deudas - ' + c.BRAND_NAME + '.xlsx');
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
    '<h2 style="font-size:16px;margin-top:24px">Tu semáforo por área</h2>' + areasTable_(res) +
    (buy ? '<div style="margin-top:28px;padding:20px;border:2px solid ' + HEX.brand + ';border-radius:12px">' +
      '<b style="font-size:16px">¿Quieres saber exactamente qué hacer?</b>' +
      '<p style="color:' + HEX.ink2 + ';margin:8px 0 14px">El Paquete Personal incluye tu informe en PDF, el archivo de presupuesto y plan de deudas, y un plan de acción de 30 días.</p>' +
      '<a href="' + esc_(buy) + '" style="background:' + HEX.brand + ';color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;display:inline-block">Quiero mi paquete</a></div>' : ''),
    c);
}

function packageEmailHtml_(name, res, c, withReport) {
  const hello = name ? 'Hola, ' + esc_(name.split(' ')[0]) + ':' : 'Hola:';
  const body = withReport
    ? '<p>' + hello + '</p><p>Gracias por tu compra. Aquí tienes tu paquete:</p>' +
      '<ul><li><b>Informe en PDF</b> con tu puntaje (' + res.total + ' de 100, ' + esc_(res.level.name) + '), tu semáforo y el plan de 30 días.</li>' +
      '<li><b>Archivo de presupuesto</b> en Excel, con fondo de emergencia, deudas y metas. Para usarlo en Google Sheets, súbelo a tu Google Drive y ábrelo con Hojas de cálculo.</li></ul>' +
      '<p>Empieza por la semana 1 del plan. Si tienes dudas, responde a este correo.</p>'
    : '<p>' + hello + '</p><p>Gracias por tu compra. No recibimos tus respuestas del test, así que adjuntamos tu archivo de presupuesto y te pedimos un paso más:</p>' +
      '<p><a href="' + esc_(c.SITE_URL) + '/prueba-personal.html" style="color:' + HEX.brand + ';font-weight:bold">Haz el test aquí</a> y responde a este correo con tu puntaje; te enviaremos tu informe personalizado.</p>';
  return shell_(body, c);
}

function reportHtml_(res, answers, name, c) {
  const date = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy');
  const plan = buildPlan_(res);
  const prof = PROFILE.map((p, i) => esc_(p.options[answers.profile[i]])).join(' · ');
  const h2 = 'style="font-size:18px;color:' + HEX.brand + ';margin:28px 0 8px;border-bottom:2px solid ' + HEX.soft + ';padding-bottom:6px"';

  const flagsHtml = res.flags.length
    ? res.flags.map(f => '<div style="background:#fbebeb;border-left:4px solid ' + HEX.rojo + ';padding:10px 14px;margin:8px 0">' +
        '<b style="color:' + HEX.rojo + '">' + esc_(f.name) + '</b><br>' + esc_(FLAG_DETAIL[f.id].why) +
        '<br><b>Qué hacer primero:</b> ' + esc_(FLAG_DETAIL[f.id].action) + '</div>').join('')
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

    '<h2 ' + h2 + '>Tu semáforo por área</h2>' + areasTable_(res) +
    '<h2 ' + h2 + '>Alertas</h2>' + flagsHtml +
    '<h2 ' + h2 + '>Tu resultado, área por área</h2>' + areasDetail +
    '<h2 ' + h2 + '>Tu plan de 30 días</h2>' +
    '<p>Dos acciones por semana, empezando por lo más urgente. Marca cada una cuando la termines.</p>' + planHtml +
    '<h2 ' + h2 + '>Cómo usar tu archivo</h2>' +
    '<p>El archivo adjunto tiene cinco hojas: Instrucciones, Presupuesto, Fondo de emergencia, Deudas y Metas. Escribe solo en las celdas amarillas; el resto se calcula solo. Repite este test en 3 meses para medir tu avance.</p>' +
    '<p style="font-size:11px;color:#7a8782;margin-top:28px">Este informe es una herramienta educativa basada en tus respuestas y en una adaptación del FinHealth Score de la Financial Health Network. No es asesoría financiera, legal ni tributaria personalizada.</p>' +
    '</body></html>';
}

/* ============================================================
 * 7. BASE DE DATOS, PLANTILLA Y UTILIDADES
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

/** Ejecútalo una vez. Crea la base de datos y la plantilla si no existen. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  const c = cfg_();
  Object.keys(DEFAULTS).forEach(k => { if (!props.getProperty(k)) props.setProperty(k, DEFAULTS[k]); });
  ['LS_API_KEY', 'LS_STORE_ID'].forEach(k => { if (!props.getProperty(k)) props.setProperty(k, ''); });

  if (!c.DB_ID) {
    const ss = SpreadsheetApp.create(c.BRAND_NAME + ' — Base de datos');
    const leads = ss.getSheets()[0].setName('Leads');
    leads.appendRow(['Fecha', 'Correo', 'Código', 'Puntaje', 'Nivel', 'Test', 'Autorizó']);
    ss.insertSheet('Pedidos').appendRow(['Fecha', 'Pedido', 'Correo', 'Nombre', 'Código', 'Puntaje', 'Nivel', 'Estado']);
    ss.insertSheet('Errores').appendRow(['Fecha', 'Mensaje', 'Detalle']);
    ss.getSheets().forEach(s => s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold'));
    props.setProperty('DB_ID', ss.getId());
    console.log('Base de datos creada: ' + ss.getUrl());
  }
  if (!c.TEMPLATE_ID) {
    const t = crearPlantillaPresupuesto();
    props.setProperty('TEMPLATE_ID', t.getId());
    console.log('Plantilla creada: ' + t.getUrl());
  }
  console.log('Listo. Ahora completa LS_API_KEY, LS_STORE_ID, SITE_URL y CHECKOUT_PERSONAL en Propiedades del script.');
}

/** Envía a tu propio correo un informe de ejemplo, sin pasar por el pago. */
function probarInforme() {
  const c = cfg_();
  const me = Session.getEffectiveUser().getEmail();
  const code = '1110' + '101111121112'; // perfil + 12 respuestas de ejemplo
  sendPackage_(me, 'Persona de prueba', code, score_(decode_(code)), c);
  console.log('Informe de prueba enviado a ' + me);
}

/** Crea el archivo de presupuesto que se adjunta a cada compra. */
function crearPlantillaPresupuesto() {
  const c = cfg_();
  const ss = SpreadsheetApp.create('Presupuesto y plan de deudas - ' + c.BRAND_NAME);
  const input = '#fff4c2', head = '#0e7c66';
  const styleHead = r => r.setBackground(head).setFontColor('#ffffff').setFontWeight('bold');

  // Instrucciones
  const ins = ss.getSheets()[0].setName('Instrucciones');
  ins.getRange('A1').setValue('Tu archivo de presupuesto y plan de deudas').setFontSize(16).setFontWeight('bold');
  ins.getRange('A3:A9').setValues([
    ['1. Escribe solo en las celdas amarillas; lo demás se calcula solo.'],
    ['2. Presupuesto: anota tus ingresos y gastos del mes y clasifica cada gasto.'],
    ['3. Fondo de emergencia: define cuántos meses quieres cubrir y cuánto puedes ahorrar.'],
    ['4. Deudas: lista cada deuda. La columna "Orden" te dice cuál pagar primero (la de tasa más alta).'],
    ['5. Metas: escribe tus metas con monto y fecha y mira cuánto ahorrar cada mes.'],
    ['6. Revisa el archivo una vez al mes, el día que recibes tu ingreso.'],
    ['Herramienta educativa de ' + c.BRAND_NAME + '. No es asesoría financiera.']
  ]);
  ins.setColumnWidth(1, 720);

  // Presupuesto
  const p = ss.insertSheet('Presupuesto');
  p.getRange('A1:E1').setValues([['Concepto', 'Tipo', 'Presupuesto', 'Real', 'Diferencia']]);
  styleHead(p.getRange('A1:E1'));
  p.getRange('A2').setValue('INGRESOS').setFontWeight('bold');
  p.getRange('A3:A5').setValues([['Ingreso principal'], ['Otros ingresos'], ['Ingresos extra']]);
  p.getRange('B3:B5').setValue('Ingreso');
  p.getRange('A6').setValue('Total ingresos').setFontWeight('bold');
  p.getRange('C6').setFormula('=SUM(C3:C5)'); p.getRange('D6').setFormula('=SUM(D3:D5)');
  p.getRange('A8').setValue('GASTOS').setFontWeight('bold');
  const gastos = [['Vivienda (arriendo o cuota)', 'Esencial'], ['Servicios públicos', 'Esencial'], ['Mercado', 'Esencial'], ['Transporte', 'Esencial'],
    ['Salud y seguros', 'Esencial'], ['Educación', 'Importante'], ['Cuotas de deudas', 'Esencial'], ['Celular e internet', 'Importante'],
    ['Comida fuera y domicilios', 'Prescindible'], ['Ropa y compras', 'Prescindible'], ['Entretenimiento y suscripciones', 'Prescindible'], ['Otros', 'Importante']];
  p.getRange(9, 1, gastos.length, 2).setValues(gastos);
  const last = 8 + gastos.length;
  p.getRange(last + 1, 1).setValue('Total gastos').setFontWeight('bold');
  p.getRange(last + 1, 3).setFormula('=SUM(C9:C' + last + ')'); p.getRange(last + 1, 4).setFormula('=SUM(D9:D' + last + ')');
  p.getRange(last + 3, 1).setValue('MARGEN (ingresos - gastos)').setFontWeight('bold');
  p.getRange(last + 3, 3).setFormula('=C6-C' + (last + 1)); p.getRange(last + 3, 4).setFormula('=D6-D' + (last + 1));
  p.getRange(last + 4, 1).setValue('Ahorro como % del ingreso');
  p.getRange(last + 4, 4).setFormula('=IFERROR(D' + (last + 3) + '/D6,0)').setNumberFormat('0%');
  for (let r = 3; r <= last; r++) if (r !== 6 && r !== 7 && r !== 8) p.getRange(r, 5).setFormula('=C' + r + '-D' + r);
  p.getRange('C3:D5').setBackground(input); p.getRange('C9:D' + last).setBackground(input);
  p.getRange('C2:E' + (last + 3)).setNumberFormat('#,##0');
  p.getRange('B9:B' + last).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Esencial', 'Importante', 'Prescindible']).build());
  p.setColumnWidth(1, 260); p.setFrozenRows(1);

  // Fondo de emergencia
  const f = ss.insertSheet('Fondo de emergencia');
  f.getRange('A1:B1').setValues([['Fondo de emergencia', '']]); styleHead(f.getRange('A1:B1'));
  f.getRange('A2:A8').setValues([['Gastos esenciales al mes (del presupuesto)'], ['Meses que quieres cubrir'], ['Meta del fondo'], ['Ahorrado hoy'], ['Te falta'], ['Puedes ahorrar al mes'], ['Meses para lograrlo']]);
  f.getRange('B2').setFormula("=SUMIF(Presupuesto!B9:B" + last + ",\"Esencial\",Presupuesto!D9:D" + last + ")");
  f.getRange('B3').setValue(3).setBackground(input);
  f.getRange('B4').setFormula('=B2*B3');
  f.getRange('B5').setValue(0).setBackground(input);
  f.getRange('B6').setFormula('=MAX(B4-B5,0)');
  f.getRange('B7').setValue(0).setBackground(input);
  f.getRange('B8').setFormula('=IFERROR(ROUNDUP(B6/B7,0),"Define un ahorro mensual")');
  f.getRange('B2:B7').setNumberFormat('#,##0'); f.getRange('B3').setNumberFormat('0');
  f.setColumnWidth(1, 320); f.setColumnWidth(2, 180);

  // Deudas
  const d = ss.insertSheet('Deudas');
  d.getRange('A1:F1').setValues([['Deuda', 'Saldo', 'Tasa mensual', 'Cuota mínima', 'Intereses del mes', 'Orden de pago']]); styleHead(d.getRange('A1:F1'));
  d.getRange('A2:D9').setBackground(input);
  for (let r = 2; r <= 9; r++) {
    d.getRange(r, 5).setFormula('=IF(B' + r + '="","",B' + r + '*C' + r + ')');
    d.getRange(r, 6).setFormula('=IF(C' + r + '="","",RANK(C' + r + ',$C$2:$C$9,0))');
  }
  d.getRange('A11').setValue('Total').setFontWeight('bold');
  d.getRange('B11').setFormula('=SUM(B2:B9)'); d.getRange('D11').setFormula('=SUM(D2:D9)'); d.getRange('E11').setFormula('=SUM(E2:E9)');
  d.getRange('A13').setValue('Método avalancha: paga la cuota mínima de todas y pon cualquier dinero extra en la deuda con orden 1. Cuando la termines, pasa a la 2.');
  d.getRange('B2:B11').setNumberFormat('#,##0'); d.getRange('D2:E11').setNumberFormat('#,##0'); d.getRange('C2:C9').setNumberFormat('0.00%');
  d.setColumnWidth(1, 220);

  // Metas
  const m = ss.insertSheet('Metas');
  m.getRange('A1:G1').setValues([['Meta', 'Monto', 'Fecha', 'Ahorrado', 'Falta', 'Meses restantes', 'Ahorro mensual necesario']]); styleHead(m.getRange('A1:G1'));
  m.getRange('A2:D6').setBackground(input);
  for (let r = 2; r <= 6; r++) {
    m.getRange(r, 5).setFormula('=IF(B' + r + '="","",MAX(B' + r + '-D' + r + ',0))');
    m.getRange(r, 6).setFormula('=IF(C' + r + '="","",MAX(DATEDIF(TODAY(),C' + r + ',"M"),1))');
    m.getRange(r, 7).setFormula('=IF(OR(E' + r + '="",F' + r + '=""),"",E' + r + '/F' + r + ')');
  }
  m.getRange('B2:B6').setNumberFormat('#,##0'); m.getRange('D2:E6').setNumberFormat('#,##0'); m.getRange('G2:G6').setNumberFormat('#,##0');
  m.getRange('C2:C6').setNumberFormat('dd/mm/yyyy');
  m.setColumnWidth(1, 220);

  ss.setActiveSheet(ins);
  return ss;
}
