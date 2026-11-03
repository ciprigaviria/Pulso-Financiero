/*
 * Pulso Financiero — reglas de la prueba de salud financiera personal (v1).
 * Basado en el FinHealth Score (Financial Health Network), adaptado a Latinoamérica.
 *
 * IMPORTANTE: apps-script/Code.gs tiene una copia de estas mismas reglas.
 * Si cambias preguntas, puntos o banderas aquí, cámbialos también allá
 * y corre `node tests/scoring.test.mjs` para comprobar que coinciden.
 */
(function (root) {
  'use strict';

  var PROFILE = [
    { id: 'pais', text: '¿En qué país vives?',
      options: ['Colombia', 'Guatemala', 'México', 'Otro país de Latinoamérica', 'Otro'] },
    { id: 'edad', text: '¿Cuál es tu rango de edad?',
      options: ['18 a 25', '26 a 35', '36 a 45', '46 a 55', '56 o más'] },
    { id: 'ingreso', text: '¿Cómo recibes tus ingresos?',
      options: ['Salario fijo', 'Independiente o por proyectos', 'Negocio propio', 'Una mezcla', 'Pensión'] },
    { id: 'dependientes', text: '¿Alguien depende económicamente de ti?',
      options: ['Sí', 'No'] }
  ];

  var AREAS = [
    { id: 'gastar', name: 'Gastar', short: 'Cómo manejas lo que entra y sale' },
    { id: 'ahorrar', name: 'Ahorrar', short: 'Tu colchón para imprevistos' },
    { id: 'deber', name: 'Deber', short: 'Qué tan sanas son tus deudas' },
    { id: 'proteger', name: 'Proteger', short: 'Qué te cubre si algo sale mal' },
    { id: 'planear', name: 'Planear', short: 'Tu futuro y tus metas' }
  ];

  // Opciones ordenadas de mejor a peor; points[i] corresponde a options[i].
  var QUESTIONS = [
    { n: 1, area: 'gastar', text: 'En los últimos 12 meses, comparado con lo que ganas, ¿cuánto gastaste?',
      options: ['Mucho menos', 'Un poco menos', 'Más o menos lo mismo', 'Un poco más', 'Mucho más'],
      points: [100, 75, 50, 25, 0] },
    { n: 2, area: 'gastar', text: 'En los últimos 12 meses, ¿cómo pagaste tus cuentas (servicios, arriendo, cuotas)?',
      options: ['Todas a tiempo', 'Casi todas a tiempo', 'La mayoría a tiempo', 'Algunas a tiempo', 'Muy pocas a tiempo'],
      points: [100, 60, 40, 20, 0] },
    { n: 3, area: 'gastar', text: '¿Llevas un registro o presupuesto de tus gastos?',
      options: ['Sí, y lo reviso cada mes', 'Sí, pero lo reviso poco', 'Solo tengo una idea general', 'No'],
      points: [100, 70, 40, 0] },
    { n: 4, area: 'ahorrar', text: 'Si hoy dejaras de recibir ingresos, ¿cuánto tiempo cubrirías tus gastos con dinero disponible, sin pedir prestado?',
      options: ['6 meses o más', '3 a 5 meses', '1 a 2 meses', '1 a 3 semanas', 'Menos de 1 semana'],
      points: [100, 75, 50, 25, 0] },
    { n: 5, area: 'ahorrar', text: '¿Qué parte de tus ingresos ahorras cada mes?',
      options: ['20% o más', '10% a 19%', '1% a 9%', 'Ahorro de vez en cuando', 'Nada'],
      points: [100, 75, 50, 20, 0] },
    { n: 6, area: 'deber', text: 'Hoy, ¿qué tan manejables son tus deudas?',
      options: ['No tengo deudas', 'Manejables', 'Un poco más de lo que puedo manejar', 'Mucho más de lo que puedo manejar'],
      points: [100, 85, 40, 0] },
    { n: 7, area: 'deber', text: 'Si usas tarjeta de crédito, ¿cómo la pagas normalmente?',
      options: ['No uso tarjeta de crédito', 'Pago el total cada mes', 'Pago más del mínimo', 'Pago el mínimo', 'Me atraso'],
      points: [100, 100, 50, 20, 0] },
    { n: 8, area: 'deber', text: '¿Cómo está tu historial en las centrales de riesgo (buró de crédito)?',
      options: ['Excelente, sin reportes', 'Bueno', 'Regular', 'Tengo reportes negativos', 'No lo sé'],
      points: [100, 75, 50, 25, 0] },
    { n: 9, area: 'proteger', text: 'Si tuvieras un gasto médico grande, ¿cómo lo pagarías?',
      options: ['Mi seguro o plan complementario lo cubre', 'El sistema público y mis ahorros', 'Solo el sistema público', 'Con deuda', 'No sabría cómo'],
      points: [100, 75, 50, 25, 0] },
    { n: 10, area: 'proteger', text: 'Si te pasara algo grave (accidente, invalidez o muerte), ¿qué tan protegidos quedarían tú y los tuyos?',
      options: ['Tengo seguro de vida o invalidez suficiente', 'Nadie depende de mí y estoy cubierto en salud', 'Tengo un seguro, pero no sé si alcanza', 'Solo lo que da el empleo o la ley', 'Ninguna protección'],
      points: [100, 100, 60, 30, 0] },
    { n: 11, area: 'planear', text: '¿Estás ahorrando para tu retiro?',
      options: ['Pensión obligatoria más ahorro voluntario', 'Solo la pensión obligatoria', 'De forma irregular', 'No'],
      points: [100, 75, 40, 0] },
    { n: 12, area: 'planear', text: '¿Tienes metas financieras con monto y fecha (casa, estudio, retiro)?',
      options: ['Sí, escritas y con plan de ahorro', 'Sí, pero sin plan', 'Ideas, sin monto ni fecha', 'He pensado poco en eso', 'No'],
      points: [100, 65, 35, 15, 0] }
  ];

  // Bandera roja: pregunta n, se activa si el índice elegido >= minIndex.
  var FLAGS = [
    { id: 'gasta_mas', q: 1, minIndex: 3, name: 'Gastas más de lo que ganas' },
    { id: 'atrasos', q: 2, minIndex: 3, name: 'Atrasos frecuentes en tus pagos' },
    { id: 'sin_colchon', q: 4, minIndex: 4, name: 'No tienes colchón para imprevistos' },
    { id: 'deuda_inmanejable', q: 6, minIndex: 3, name: 'Tus deudas superan lo que puedes manejar' },
    { id: 'tarjeta_limite', q: 7, minIndex: 3, name: 'Tu tarjeta de crédito te está costando caro' }
  ];

  var LEVELS = [
    { id: 'sana', min: 80, name: 'Sana', color: 'verde',
      message: 'Tus finanzas aguantan un golpe y avanzan hacia tus metas.' },
    { id: 'estable', min: 60, name: 'Estable con alertas', color: 'amarillo',
      message: 'Vas bien, pero hay áreas que te pueden frenar.' },
    { id: 'riesgo', min: 40, name: 'En riesgo', color: 'naranja',
      message: 'Un imprevisto te puede desestabilizar.' },
    { id: 'vulnerable', min: 0, name: 'Vulnerable', color: 'rojo',
      message: 'Necesitas un plan de choque cuanto antes.' }
  ];

  var FLAG_CAP = 59; // con alguna bandera roja, el nivel no pasa de "En riesgo"

  // Mensaje corto por área y color (lo que se ve gratis).
  var AREA_MSG = {
    gastar: { verde: 'Gastas con control y pagas a tiempo.', amarillo: 'Tu gasto está justo; un registro mensual te daría margen.', rojo: 'Tus gastos están por encima de lo que tu ingreso aguanta.' },
    ahorrar: { verde: 'Tienes un colchón sólido.', amarillo: 'Tu colchón existe, pero se agotaría rápido.', rojo: 'Cualquier imprevisto te obligaría a endeudarte.' },
    deber: { verde: 'Tus deudas están bajo control.', amarillo: 'Tus deudas son manejables, pero te restan margen.', rojo: 'Tus deudas te están ahogando el flujo.' },
    proteger: { verde: 'Estás bien cubierto ante un golpe fuerte.', amarillo: 'Tienes protección, pero con huecos.', rojo: 'Un problema de salud o un accidente te pegaría duro.' },
    planear: { verde: 'Tienes rumbo y estás ahorrando para él.', amarillo: 'Tienes ideas, pero falta convertirlas en plan.', rojo: 'Tu futuro financiero está sin plan.' }
  };

  function round(x) { return Math.floor(x + 0.5); }

  function areaColor(score) {
    return score >= 80 ? 'verde' : score >= 50 ? 'amarillo' : 'rojo';
  }

  // answers: { profile: [4 índices], q: [12 índices] }
  function score(answers) {
    var q = answers.q;
    if (!q || q.length !== QUESTIONS.length) throw new Error('Se esperaban 12 respuestas');
    var sums = {}, counts = {};
    QUESTIONS.forEach(function (question, i) {
      var idx = q[i];
      if (!(idx >= 0 && idx < question.points.length)) throw new Error('Respuesta inválida en la pregunta ' + question.n);
      sums[question.area] = (sums[question.area] || 0) + question.points[idx];
      counts[question.area] = (counts[question.area] || 0) + 1;
    });
    var areas = AREAS.map(function (a) {
      var s = sums[a.id] / counts[a.id];
      var color = areaColor(s);
      return { id: a.id, name: a.name, score: round(s), raw: s, color: color, message: AREA_MSG[a.id][color] };
    });
    var rawTotal = areas.reduce(function (acc, a) { return acc + a.raw; }, 0) / areas.length;
    var total = round(rawTotal);
    var flags = FLAGS.filter(function (f) { return q[f.q - 1] >= f.minIndex; })
      .map(function (f) { return { id: f.id, name: f.name }; });
    var levelScore = flags.length ? Math.min(total, FLAG_CAP) : total;
    var level = LEVELS.filter(function (l) { return levelScore >= l.min; })[0];
    return { total: total, level: level, areas: areas, flags: flags };
  }

  // Codificación compacta de respuestas: 4 dígitos de perfil + 12 de preguntas.
  function encode(answers) { return answers.profile.join('') + answers.q.join(''); }
  function decode(str) {
    if (!/^\d{16}$/.test(str || '')) throw new Error('Código de respuestas inválido');
    var d = str.split('').map(Number);
    return { profile: d.slice(0, 4), q: d.slice(4) };
  }

  var api = { PROFILE: PROFILE, AREAS: AREAS, QUESTIONS: QUESTIONS, FLAGS: FLAGS, LEVELS: LEVELS,
    score: score, encode: encode, decode: decode, areaColor: areaColor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PulsoScoring = api;
})(typeof window !== 'undefined' ? window : this);
