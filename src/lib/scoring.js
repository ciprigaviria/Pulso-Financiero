/*
 * Pulso Financiero — reglas de la prueba de salud financiera personal (v2).
 * Basado en el FinHealth Score (Financial Health Network), adaptado a Latinoamérica.
 *
 * IMPORTANTE: apps-script/Code.gs tiene una copia de estas mismas reglas y textos.
 * Si cambias preguntas, puntos, banderas, hallazgos o acciones aquí, cámbialos también allá
 * y corre `npm test` para comprobar que coinciden.
 */
// Módulo ESM: lo usa el sitio (React) y las pruebas (tests/scoring.test.mts).
// El país es una respuesta abierta (texto). Las demás preguntas de perfil son de opción.
const COUNTRY = { id: 'pais', text: '¿En qué país vives?', placeholder: 'Escribe tu país' };

const PROFILE = [
  { id: 'edad', text: '¿Cuál es tu rango de edad?',
    options: ['18 a 25', '26 a 35', '36 a 45', '46 a 55', '56 o más'] },
  { id: 'ingreso', text: '¿Cómo recibes tus ingresos?',
    options: ['Salario fijo', 'Independiente o por proyectos', 'Negocio propio', 'Una mezcla', 'Pensión'] },
  { id: 'dependientes', text: '¿Alguien depende económicamente de ti?',
    options: ['Sí', 'No'] }
];

const AREAS = [
  { id: 'gastar', name: 'Gastar', short: 'Cómo manejas lo que entra y sale' },
  { id: 'ahorrar', name: 'Ahorrar', short: 'Tu colchón para imprevistos' },
  { id: 'deber', name: 'Deber', short: 'Qué tan sanas son tus deudas' },
  { id: 'proteger', name: 'Proteger', short: 'Qué te cubre si algo sale mal' },
  { id: 'planear', name: 'Planear', short: 'Tu futuro y tus metas' }
];

// Opciones ordenadas de mejor a peor; points[i] e insights[i] corresponden a options[i].
const QUESTIONS = [
  { n: 1, area: 'gastar', text: 'En los últimos 12 meses, comparado con lo que ganas, ¿cuánto gastaste?',
    options: ['Mucho menos', 'Un poco menos', 'Más o menos lo mismo', 'Un poco más', 'Mucho más'],
    points: [100, 75, 50, 25, 0],
    insights: ['Gastaste mucho menos de lo que ganas: tienes margen real para ahorrar e invertir.',
      'Gastas un poco menos de lo que ganas. Ese margen es tu motor de ahorro: protégelo.',
      'Gastas casi todo lo que ganas: cualquier imprevisto te obliga a endeudarte.',
      'Gastas más de lo que ganas. La diferencia la estás pagando con deuda o con ahorros que se agotan.',
      'Gastas mucho más de lo que ganas: cada mes tu situación se vuelve más difícil de revertir.'] },
  { n: 2, area: 'gastar', text: 'En los últimos 12 meses, ¿cómo pagaste tus cuentas (servicios, arriendo, cuotas)?',
    options: ['Todas a tiempo', 'Casi todas a tiempo', 'La mayoría a tiempo', 'Algunas a tiempo', 'Muy pocas a tiempo'],
    points: [100, 60, 40, 20, 0],
    insights: ['Pagas todas tus cuentas a tiempo: cero intereses de mora.',
      'Casi siempre pagas a tiempo, pero los pocos atrasos ya te cuestan intereses.',
      'Parte de tus pagos se atrasa y esos recargos se suman mes a mes.',
      'Muchos pagos se atrasan: pagas intereses de mora y arriesgas tu historial de crédito.',
      'La mayoría de tus pagos se atrasa: tu historial de crédito está en riesgo.'] },
  { n: 3, area: 'gastar', text: '¿Llevas un registro o presupuesto de tus gastos?',
    options: ['Sí, y lo reviso cada mes', 'Sí, pero lo reviso poco', 'Solo tengo una idea general', 'No'],
    points: [100, 70, 40, 0],
    insights: ['Llevas un presupuesto y lo revisas: sabes a dónde va tu dinero.',
      'Tienes presupuesto, pero sin revisarlo pierde su poder.',
      'Solo tienes una idea general de tus gastos: los gastos pequeños se te escapan.',
      'No llevas registro de tus gastos: es difícil mejorar lo que no mides.'] },
  { n: 4, area: 'ahorrar', text: 'Si hoy dejaras de recibir ingresos, ¿cuánto tiempo cubrirías tus gastos con dinero disponible, sin pedir prestado?',
    options: ['6 meses o más', '3 a 5 meses', '1 a 2 meses', '1 a 3 semanas', 'Menos de 1 semana'],
    points: [100, 75, 50, 25, 0],
    insights: ['Tu colchón cubre 6 meses o más de gastos: estás protegido ante un golpe fuerte.',
      'Tu colchón cubre de 3 a 5 meses de gastos: estás dentro del rango recomendado.',
      'Si hoy dejaras de recibir ingresos, tu dinero alcanzaría para 1 o 2 meses. Lo recomendado son de 3 a 6.',
      'Si hoy dejaras de recibir ingresos, tu dinero alcanzaría para pocas semanas. Lo recomendado son de 3 a 6 meses.',
      'Si hoy dejaras de recibir ingresos, no tendrías ni una semana de margen.'] },
  { n: 5, area: 'ahorrar', text: '¿Qué parte de tus ingresos ahorras cada mes?',
    options: ['20% o más', '10% a 19%', '1% a 9%', 'De vez en cuando', 'Nada'],
    points: [100, 75, 50, 20, 0],
    insights: ['Ahorras 20% o más de tu ingreso: un ritmo excelente.',
      'Ahorras entre 10% y 19% de tu ingreso: vas en un rango saludable.',
      'Ahorras menos del 10% de tu ingreso: a ese ritmo tus metas tardarán años.',
      'Ahorras solo de vez en cuando: sin un hábito fijo, el ahorro depende de que sobre.',
      'No estás ahorrando cada mes: todo lo que ganas se va.'] },
  { n: 6, area: 'deber', text: 'Hoy, ¿qué tan manejables son tus deudas?',
    options: ['No tengo deudas', 'Manejables', 'Un poco más de lo que puedo manejar', 'Mucho más de lo que puedo manejar'],
    points: [100, 85, 40, 0],
    insights: ['No tienes deudas: todo tu ingreso trabaja para ti.',
      'Tus deudas son manejables.',
      'Tus deudas ya superan un poco lo que puedes manejar: es el momento de ordenarlas antes de que crezcan.',
      'Tus deudas superan con creces lo que puedes pagar: necesitas un plan de salida.'] },
  { n: 7, area: 'deber', text: 'Si usas tarjeta de crédito, ¿cómo la pagas normalmente?',
    options: ['No uso tarjeta de crédito', 'Pago el total cada mes', 'Pago más del mínimo', 'Pago el mínimo', 'Me atraso'],
    points: [100, 100, 50, 20, 0],
    insights: ['No dependes de la tarjeta de crédito.',
      'Usas la tarjeta sin pagar intereses.',
      'Pagas más del mínimo, pero mientras no pagues el total los intereses siguen corriendo.',
      'Pagar solo el mínimo hace que lo que compras te cueste mucho más y tarde años en pagarse.',
      'Atrasarte con la tarjeta suma intereses de mora y daña tu historial.'] },
  { n: 8, area: 'deber', text: '¿Cómo está tu historial en las centrales de riesgo (buró de crédito)?',
    options: ['Excelente, sin reportes', 'Bueno', 'Regular', 'Tengo reportes negativos', 'No lo sé'],
    points: [100, 75, 50, 25, 0],
    insights: ['Tu historial de crédito es excelente: accedes a mejores tasas.',
      'Tu historial de crédito es bueno.',
      'Tu historial de crédito es regular: probablemente pagas tasas más altas.',
      'Tienes reportes negativos: tus créditos te salen más caros o te los niegan.',
      'No conoces tu historial de crédito: revisarlo te dice cuánto te prestan y a qué tasa.'] },
  { n: 9, area: 'proteger', text: 'Si tuvieras un gasto médico grande, ¿cómo lo pagarías?',
    options: ['Mi seguro o plan complementario lo cubre', 'El sistema público y mis ahorros', 'Solo el sistema público', 'Con deuda', 'No sabría cómo'],
    points: [100, 75, 50, 25, 0],
    insights: ['Un gasto médico grande lo cubre tu seguro.',
      'Ante un gasto médico grande dependes del sistema público y de tus ahorros.',
      'Ante un gasto médico grande dependes solo del sistema público.',
      'Un gasto médico grande lo pagarías con deuda.',
      'No sabrías cómo pagar un gasto médico grande: es uno de tus mayores riesgos.'] },
  { n: 10, area: 'proteger', text: 'Si te pasara algo grave (accidente, invalidez o muerte), ¿qué tan protegidos quedarían tú y los tuyos?',
    options: ['Tengo seguro de vida o invalidez suficiente', 'Nadie depende de mí y estoy cubierto en salud', 'Tengo un seguro, pero no sé si alcanza', 'Solo lo que da el empleo o la ley', 'Ninguna protección'],
    points: [100, 100, 60, 30, 0],
    insights: ['Si te pasara algo grave, los tuyos quedarían protegidos.',
      'Nadie depende de ti y tu salud está cubierta.',
      'Tienes un seguro, pero no sabes si alcanza: revisarlo puede evitar una sorpresa.',
      'Ante un evento grave solo cuentas con lo que da el empleo o la ley.',
      'Si te pasara algo grave, no tienes ninguna protección.'] },
  { n: 11, area: 'planear', text: '¿Estás ahorrando para tu retiro?',
    options: ['Pensión obligatoria más ahorro voluntario', 'Solo la pensión obligatoria', 'De forma irregular', 'No'],
    points: [100, 75, 40, 0],
    insights: ['Ahorras para tu retiro más allá de lo obligatorio.',
      'Para tu retiro solo cuentas con la pensión obligatoria.',
      'Ahorras para tu retiro de forma irregular.',
      'No estás ahorrando para tu retiro.'] },
  { n: 12, area: 'planear', text: '¿Tienes metas financieras con monto y fecha (casa, estudio, retiro)?',
    options: ['Sí, escritas y con plan de ahorro', 'Sí, pero sin plan', 'Ideas, sin monto ni fecha', 'He pensado poco en eso', 'No'],
    points: [100, 65, 35, 15, 0],
    insights: ['Tienes metas con monto, fecha y plan.',
      'Tienes metas, pero sin un plan de ahorro es difícil cumplirlas.',
      'Tienes ideas, pero sin monto ni fecha no se vuelven realidad.',
      'Has pensado poco en tus metas financieras.',
      'No tienes metas financieras definidas.'] }
];

// Bandera roja: pregunta n, se activa si el índice elegido >= minIndex.
const FLAGS = [
  { id: 'gasta_mas', q: 1, minIndex: 3, name: 'Gastas más de lo que ganas',
    action: 'Identifica 3 gastos prescindibles y elimínalos durante 30 días.' },
  { id: 'atrasos', q: 2, minIndex: 3, name: 'Atrasos frecuentes en tus pagos',
    action: 'Pon recordatorios o pagos automáticos para cada cuenta fija.' },
  { id: 'sin_colchon', q: 4, minIndex: 4, name: 'No tienes colchón para imprevistos',
    action: 'Junta tu primer colchón equivalente a 1 semana de gastos antes que cualquier otra meta.' },
  { id: 'deuda_inmanejable', q: 6, minIndex: 3, name: 'Tus deudas superan lo que puedes manejar',
    action: 'Habla con tus acreedores para reestructurar antes de caer en mora.' },
  { id: 'tarjeta_limite', q: 7, minIndex: 3, name: 'Tu tarjeta de crédito te está costando caro',
    action: 'Deja de usar la tarjeta y paga más del mínimo cada mes hasta saldarla.' }
];

const LEVELS = [
  { id: 'sana', min: 80, name: 'Sana', color: 'verde',
    message: 'Tus finanzas aguantan un golpe y avanzan hacia tus metas.' },
  { id: 'estable', min: 60, name: 'Estable con alertas', color: 'amarillo',
    message: 'Vas bien, pero hay áreas que te pueden frenar.' },
  { id: 'riesgo', min: 40, name: 'En riesgo', color: 'naranja',
    message: 'Un imprevisto te puede desestabilizar.' },
  { id: 'vulnerable', min: 0, name: 'Vulnerable', color: 'rojo',
    message: 'Necesitas un plan de choque cuanto antes.' }
];

const FLAG_CAP = 59; // con alguna bandera roja, el nivel no pasa de "En riesgo"

const AREA_MSG = {
  gastar: { verde: 'Gastas con control y pagas a tiempo.', amarillo: 'Tu gasto está justo; un registro mensual te daría margen.', rojo: 'Tus gastos están por encima de lo que tu ingreso aguanta.' },
  ahorrar: { verde: 'Tienes un colchón sólido.', amarillo: 'Tu colchón existe, pero se agotaría rápido.', rojo: 'Cualquier imprevisto te obligaría a endeudarte.' },
  deber: { verde: 'Tus deudas están bajo control.', amarillo: 'Tus deudas son manejables, pero te restan margen.', rojo: 'Tus deudas te están ahogando el flujo.' },
  proteger: { verde: 'Estás bien cubierto ante un golpe fuerte.', amarillo: 'Tienes protección, pero con huecos.', rojo: 'Un problema de salud o un accidente te pegaría duro.' },
  planear: { verde: 'Tienes rumbo y estás ahorrando para él.', amarillo: 'Tienes ideas, pero falta convertirlas en plan.', rojo: 'Tu futuro financiero está sin plan.' }
};

// Acciones por área, de la más básica a la más avanzada (alimentan el plan de 30 días).
const AREA_ACTIONS = {
  gastar: ['Anota todos tus gastos durante 2 semanas en la hoja "Presupuesto" de tu archivo.',
    'Clasifica cada gasto como esencial, importante o prescindible, y recorta primero los prescindibles.',
    'Programa el pago automático de tus cuentas fijas para el día en que recibes tu ingreso.',
    'Ponte un tope semanal para gastos variables (comida fuera, compras, salidas).'],
  ahorrar: ['Calcula tu meta de fondo de emergencia en la hoja "Fondo de emergencia".',
    'Abre una cuenta de ahorro separada, solo para emergencias.',
    'Programa un ahorro automático el día de pago, aunque sea el 5% de tu ingreso.',
    'Lleva a tu fondo cualquier ingreso extra: primas, bonos o devoluciones.'],
  deber: ['Lista todas tus deudas con saldo, tasa y cuota en la hoja "Deudas".',
    'Paga el mínimo en todas y pon todo lo extra en la de tasa más alta (método avalancha).',
    'Consulta tu historial en las centrales de riesgo y pide corregir cualquier error.',
    'Si una cuota no te alcanza, llama al banco antes de atrasarte y pide un acuerdo de pago.'],
  proteger: ['Revisa qué cubren exactamente tu sistema de salud y tu empleo.',
    'Si alguien depende de ti, cotiza un seguro de vida a término; suele costar menos de lo que crees.',
    'Evalúa un plan complementario de salud si tu presupuesto lo permite.',
    'Guarda en un solo lugar tus pólizas y cómo reclamarlas, y cuéntale a alguien de confianza.'],
  planear: ['Escribe 3 metas con monto y fecha en la hoja "Metas" de tu archivo.',
    'Mira en el archivo cuánto debes ahorrar cada mes para cada meta.',
    'Revisa tu fondo de pensión: semanas o meses cotizados y proyección.',
    'Empieza un ahorro voluntario para el retiro, aunque sea pequeño.']
};

const WEEK_TITLES = ['Semana 1: lo más urgente', 'Semana 2: ordenar', 'Semana 3: construir', 'Semana 4: consolidar'];

function round(x) { return Math.floor(x + 0.5); }

function areaColor(score) {
  return score >= 80 ? 'verde' : score >= 50 ? 'amarillo' : 'rojo';
}

function levelFor(total, hasFlags) {
  const s = hasFlags ? Math.min(total, FLAG_CAP) : total;
  return LEVELS.filter(function (l) { return s >= l.min; })[0];
}

// answers: { profile: [3 índices], q: [12 índices] }
function score(answers) {
  const q = answers.q;
  if (!q || q.length !== QUESTIONS.length) throw new Error('Se esperaban 12 respuestas');
  const sums = {}, counts = {}, worstQ = {}, bestQ = {};
  QUESTIONS.forEach(function (question, i) {
    const idx = q[i];
    if (!(idx >= 0 && idx < question.points.length)) throw new Error('Respuesta inválida en la pregunta ' + question.n);
    const pts = question.points[idx];
    sums[question.area] = (sums[question.area] || 0) + pts;
    counts[question.area] = (counts[question.area] || 0) + 1;
    if (!worstQ[question.area] || pts < worstQ[question.area].pts) worstQ[question.area] = { pts: pts, text: question.insights[idx] };
    if (!bestQ[question.area] || pts > bestQ[question.area].pts) bestQ[question.area] = { pts: pts, text: question.insights[idx] };
  });
  const areas = AREAS.map(function (a) {
    const s = sums[a.id] / counts[a.id];
    const color = areaColor(s);
    return { id: a.id, name: a.name, score: round(s), raw: s, color: color, message: AREA_MSG[a.id][color], insight: worstQ[a.id].text, bestInsight: bestQ[a.id].text };
  });
  const rawTotal = areas.reduce(function (acc, a) { return acc + a.raw; }, 0) / areas.length;
  const total = round(rawTotal);
  const flags = FLAGS.filter(function (f) { return q[f.q - 1] >= f.minIndex; })
    .map(function (f) { return { id: f.id, name: f.name, action: f.action }; });
  const level = levelFor(total, flags.length > 0);

  const sorted = areas.slice().sort(function (a, b) { return a.raw - b.raw; });
  const weakest = sorted[0], strongest = sorted[sorted.length - 1];

  // Potencial: si el área más débil llegara a verde (80), ¿cuánto subiría el puntaje?
  let potential = null;
  if (weakest.raw < 80) {
    const newTotal = round(areas.reduce(function (acc, a) { return acc + (a.id === weakest.id ? 80 : a.raw); }, 0) / areas.length);
    potential = { area: weakest.name, from: total, to: newTotal, level: levelFor(newTotal, false) };
  }

  return { total: total, level: level, areas: areas, flags: flags,
    weakest: weakest, strongest: strongest, potential: potential, plan: buildPlan(areas, flags) };
}

// Plan de 30 días: primero las alertas, luego las áreas más débiles, 2 acciones por semana.
function buildPlan(areas, flags) {
  const items = flags.map(function (f) { return f.action; });
  const weak = areas.filter(function (a) { return a.color !== 'verde'; }).sort(function (a, b) { return a.raw - b.raw; });
  for (let r = 0; r < 4 && items.length < 8; r++) {
    weak.forEach(function (a) {
      const act = AREA_ACTIONS[a.id][r];
      if (act && items.length < 8 && items.indexOf(act) < 0) items.push(act);
    });
  }
  areas.filter(function (a) { return a.color === 'verde'; }).forEach(function (a) {
    if (items.length < 8) items.push('Mantén tu fortaleza en "' + a.name + '": revísala una vez al mes.');
  });
  while (items.length < 8) items.push('Revisa tu presupuesto del mes y ajusta lo que se desvió.');
  return WEEK_TITLES.map(function (t, i) { return { title: t, actions: items.slice(i * 2, i * 2 + 2) }; });
}

// Codificación compacta: 3 dígitos de perfil + 12 de preguntas. El país viaja aparte, como texto.
function encode(answers) { return answers.profile.join('') + answers.q.join(''); }
function decode(str) {
  if (!/^\d{15}$/.test(str || '')) throw new Error('Código de respuestas inválido');
  const d = str.split('').map(Number);
  const res = { profile: d.slice(0, 3), q: d.slice(3) };
  res.profile.forEach(function (v, i) { if (v >= PROFILE[i].options.length) throw new Error('Perfil inválido'); });
  return res;
}
function cleanCountry(s) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, 40); }

export { COUNTRY, PROFILE, AREAS, QUESTIONS, FLAGS, LEVELS, AREA_ACTIONS, score, buildPlan, encode, decode, areaColor, cleanCountry };
