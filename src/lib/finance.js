/*
 * Pulso Financiero — motor del tablero personal.
 * Funciones puras: reciben los números que la persona escribe (y que solo viven en su navegador)
 * y devuelven indicadores, plan de deudas, proyección, recomendaciones y el plan para lo que sobra.
 *
 * Validado contra una reimplementación independiente en Python: tests/validate_finance.py.
 */

export const EXPENSE_TYPES = ['esencial', 'importante', 'prescindible'];

export const DEFAULT_EXPENSES = [
  { id: 'vivienda', name: 'Vivienda', type: 'esencial' },
  { id: 'mercado', name: 'Mercado', type: 'esencial' },
  { id: 'servicios', name: 'Servicios básicos (luz, agua, gas)', type: 'esencial' },
  { id: 'transporte', name: 'Transporte', type: 'esencial' },
  { id: 'salud', name: 'Salud y seguros', type: 'esencial' },
  { id: 'educacion', name: 'Educación', type: 'importante' },
  { id: 'conectividad', name: 'Celular e internet', type: 'importante' },
  { id: 'comida', name: 'Restaurantes y comida a domicilio', type: 'prescindible' },
  { id: 'compras', name: 'Ropa y compras', type: 'prescindible' },
  { id: 'ocio', name: 'Entretenimiento y suscripciones', type: 'prescindible' },
  { id: 'otros', name: 'Otros', type: 'importante' },
];

// Referencias generales usadas en las recomendaciones (no son reglas personales).
export const REF = {
  savingsRate: 0.10,     // ahorrar al menos 10% del ingreso
  debtLoad: 0.30,        // cuotas de deuda por debajo de 30% del ingreso
  housing: 0.35,         // vivienda por debajo de 35% del ingreso
  wants: 0.30,           // gastos discrecionales por debajo de 30% (regla 50/30/20)
};

const n = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);

export function emptyData(currency = 'USD', locale, country) {
  return {
    currency,
    ...(locale ? { locale } : {}),
    ...(country ? { country } : {}),
    income: 0,
    savings: 0,
    emergencyTargetMonths: 3,
    extraDebtPayment: 0,
    expenses: DEFAULT_EXPENSES.map((e) => ({ ...e, amount: 0 })),
    debts: [],
  };
}

/** Indicadores del mes. */
export function summarize(data) {
  const income = n(data.income);
  const expenses = (data.expenses || []).map((e) => ({ ...e, amount: n(e.amount) }));
  const debts = (data.debts || []).map((d) => ({ ...d, balance: n(d.balance), rate: n(d.rate), min: n(d.min) })).filter((d) => d.balance > 0);
  const expensesTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const debtPayments = debts.reduce((a, d) => a + Math.min(d.min, d.balance), 0);
  const byType = { esencial: 0, importante: 0, prescindible: 0 };
  expenses.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + e.amount; });
  const outflow = expensesTotal + debtPayments;
  const margin = income - outflow;
  const essentials = byType.esencial + debtPayments;
  const savings = n(data.savings);
  const targetMonths = n(data.emergencyTargetMonths) || 3;
  const emergencyTarget = essentials * targetMonths;
  const housing = expenses.filter((e) => e.id === 'vivienda').reduce((a, e) => a + e.amount, 0);
  return {
    income, expensesTotal, debtPayments, outflow, margin,
    savingsRate: income > 0 ? margin / income : 0,
    essentials, savings,
    emergencyMonths: essentials > 0 ? savings / essentials : null,
    emergencyTarget, emergencyGap: Math.max(0, emergencyTarget - savings), targetMonths,
    debtLoad: income > 0 ? debtPayments / income : 0,
    totalDebt: debts.reduce((a, d) => a + d.balance, 0),
    byType,
    wantsShare: income > 0 ? byType.prescindible / income : 0,
    housingShare: income > 0 ? housing / income : 0,
    categories: expenses.filter((e) => e.amount > 0).map((e) => ({ id: e.id, name: e.name, type: e.type, amount: e.amount, share: income > 0 ? e.amount / income : 0 })),
    debts,
  };
}

/**
 * Simula el pago de deudas mes a mes.
 * Presupuesto mensual fijo = suma de cuotas mínimas iniciales + pago extra. Cada mes se cobran intereses,
 * se paga el mínimo de cada deuda activa y lo que sobra va a la deuda prioritaria:
 * avalancha = mayor tasa primero; bola de nieve = menor saldo primero.
 */
export function payoff(debtsIn, extra = 0, method = 'avalancha', maxMonths = 600) {
  const debts = (debtsIn || []).map((d) => ({ id: d.id, name: d.name, balance: n(d.balance), rate: n(d.rate) / 100, min: n(d.min) })).filter((d) => d.balance > 0);
  const budget = debts.reduce((a, d) => a + d.min, 0) + n(extra);
  const payoffMonth = {};
  const series = [debts.reduce((a, d) => a + d.balance, 0)];
  let totalInterest = 0;
  let month = 0;
  const order = () => debts.filter((d) => d.balance > 1e-9).sort((a, b) =>
    method === 'bola' ? a.balance - b.balance || b.rate - a.rate : b.rate - a.rate || a.balance - b.balance);
  while (debts.some((d) => d.balance > 1e-9) && month < maxMonths) {
    month += 1;
    let available = budget;
    debts.forEach((d) => {
      if (d.balance <= 1e-9) return;
      const interest = d.balance * d.rate;
      d.balance += interest;
      totalInterest += interest;
    });
    debts.forEach((d) => {
      if (d.balance <= 1e-9) return;
      const pay = Math.min(d.min, d.balance, available);
      d.balance -= pay;
      available -= pay;
    });
    for (const d of order()) {
      if (available <= 1e-9) break;
      const pay = Math.min(d.balance, available);
      d.balance -= pay;
      available -= pay;
    }
    debts.forEach((d) => { if (d.balance <= 1e-9 && payoffMonth[d.id] === undefined) { d.balance = 0; payoffMonth[d.id] = month; } });
    series.push(debts.reduce((a, d) => a + d.balance, 0));
  }
  const feasible = debts.every((d) => d.balance <= 1e-9);
  return { feasible, months: feasible ? month : null, totalInterest, payoffMonth, series, budget };
}

/** Saldo de ahorro proyectado mes a mes. */
export function projection(start, monthly, months = 12) {
  return Array.from({ length: months + 1 }, (_, m) => n(start) + monthly * m);
}

/** Recomendaciones concretas, ordenadas por prioridad (1 = más urgente). */
export function recommendations(data, s = summarize(data)) {
  const out = [];
  const pct = (x) => Math.round(x * 100);
  if (s.income <= 0) return [{ id: 'sin_ingreso', priority: 1, level: 'alta', title: 'Registra tu ingreso mensual', detail: 'Sin tu ingreso no podemos calcular tu excedente, tu tasa de ahorro ni tu nivel de endeudamiento.' }];

  if (s.margin < 0) {
    out.push({ id: 'margen_negativo', priority: 1, level: 'alta',
      title: 'Tu flujo de caja mensual es negativo',
      detail: `Cada mes egresan ${'{m:' + Math.round(-s.margin) + '}'} más de lo que ingresa. Tus gastos discrecionales suman ${'{m:' + Math.round(s.byType.prescindible) + '}'}: es el primer rubro a ajustar.`,
      metric: -s.margin });
  }

  if (s.debts.length) {
    const base = payoff(s.debts, 0, 'avalancha');
    const extra = n(data.extraDebtPayment) || Math.max(0, Math.round(s.margin * 0.5));
    const withExtra = payoff(s.debts, extra, 'avalancha');
    const top = s.debts.slice().sort((a, b) => b.rate - a.rate || a.balance - b.balance)[0];
    if (!base.feasible) {
      out.push({ id: 'deuda_no_baja', priority: 1, level: 'alta', title: 'Tus pagos mínimos no reducen el saldo',
        detail: `Los intereses absorben las cuotas. Prioriza ${top.name} (${'{d:' + top.rate + '}'}% mensual) y solicita a tu banco una reestructuración o una consolidación de deudas.` });
    } else if (extra > 0 && withExtra.feasible) {
      const saved = Math.max(0, base.totalInterest - withExtra.totalInterest);
      out.push({ id: 'plan_deudas', priority: s.debtLoad > REF.debtLoad ? 2 : 3, level: s.debtLoad > REF.debtLoad ? 'alta' : 'media',
        title: `Prioriza ${top.name}`,
        detail: `Es la de mayor tasa (${'{d:' + top.rate + '}'}% mensual). Con un abono extra a capital de ${'{m:' + Math.round(extra) + '}'} al mes quedas libre de deudas en ${withExtra.months} meses en lugar de ${base.months} y te ahorras ${'{m:' + Math.round(saved) + '}'} en intereses.`,
        metric: saved });
    }
    if (s.debtLoad > REF.debtLoad) {
      out.push({ id: 'carga_deuda', priority: 2, level: 'alta', title: `Tu nivel de endeudamiento es ${pct(s.debtLoad)}%`,
        detail: `Tus cuotas comprometen ${pct(s.debtLoad)}% de tu ingreso; la referencia es menos de ${pct(REF.debtLoad)}%. Evita nuevas deudas hasta ubicarte por debajo de ese nivel.`, metric: s.debtLoad });
    }
  }

  if (s.emergencyMonths !== null && s.emergencyMonths < s.targetMonths) {
    const months = s.margin > 0 ? Math.ceil(s.emergencyGap / s.margin) : null;
    out.push({ id: 'colchon', priority: s.emergencyMonths < 1 ? 1 : 2, level: s.emergencyMonths < 1 ? 'alta' : 'media',
      title: `Tu fondo de emergencia cubre ${'{d:' + Math.round(s.emergencyMonths * 10) / 10 + '}'} meses`,
      detail: `Te faltan ${'{m:' + Math.round(s.emergencyGap) + '}'} para cubrir ${s.targetMonths} meses de gastos esenciales.` +
        (months ? ` Destinando todo tu excedente lo completas en ${months} ${months === 1 ? 'mes' : 'meses'}.` : ' Primero necesitas generar excedente mensual.'),
      metric: s.emergencyGap });
  }

  if (s.margin >= 0 && s.savingsRate < REF.savingsRate) {
    const need = Math.round(REF.savingsRate * s.income - s.margin);
    const share = s.byType.prescindible > 0 ? Math.min(100, Math.round((need / s.byType.prescindible) * 100)) : null;
    out.push({ id: 'tasa_ahorro', priority: 3, level: 'media', title: `Tu tasa de ahorro es ${pct(s.savingsRate)}%`,
      detail: `Para llegar a ${pct(REF.savingsRate)}% necesitas liberar ${'{m:' + need + '}'} al mes` + (share !== null ? `, equivalente al ${share}% de tus gastos discrecionales.` : '.'),
      metric: need });
  }

  if (s.wantsShare > REF.wants) {
    out.push({ id: 'prescindibles', priority: 3, level: 'media', title: `Tus gastos discrecionales son ${pct(s.wantsShare)}% de tu ingreso`,
      detail: `La regla 50/30/20 sugiere no superar ${pct(REF.wants)}%. Revisa suscripciones y comida a domicilio: suelen ser los rubros más fáciles de ajustar.`, metric: s.wantsShare });
  }
  if (s.housingShare > REF.housing) {
    out.push({ id: 'vivienda', priority: 4, level: 'baja', title: `Tu vivienda representa ${pct(s.housingShare)}% de tu ingreso`,
      detail: `Lo recomendable es menos de ${pct(REF.housing)}%. No es urgente, pero considéralo en tu próxima renovación o mudanza.`, metric: s.housingShare });
  }

  if (!out.length) {
    out.push({ id: 'bien', priority: 5, level: 'baja', title: 'Tus indicadores están en orden',
      detail: `Tu excedente es de ${'{m:' + Math.round(s.margin) + '}'} al mes. Asígnalo a un objetivo concreto (retiro, vivienda o educación) para que no se diluya en gasto.` });
  }
  return out.sort((a, b) => a.priority - b.priority);
}

/* ------------------------------------------------------------------
 * Qué hacer con lo que te sobra
 * ------------------------------------------------------------------ */

// Una deuda con tasa efectiva anual mayor a esto se considera de alto costo: abonarle "rinde" más
// que cualquier ahorro de bajo riesgo.
export const EXPENSIVE_DEBT_EA = 0.15;

/** Tasa efectiva anual (0,268 = 26,8%) a partir de una tasa mensual en porcentaje (2 = 2%). */
export function effectiveAnnual(monthlyPct) {
  return Math.pow(1 + n(monthlyPct) / 100, 12) - 1;
}

/** Dónde poner el dinero según para cuándo lo necesitas. Son tipos de producto, no entidades. */
export const BUCKETS = [
  { id: 'colchon', name: 'Fondo de emergencia', when: 'Liquidez para imprevistos', products: ['Cuenta de ahorro de alto rendimiento', 'Subcuenta de ahorro en un banco digital', 'Cuenta remunerada'],
    risk: 'Muy bajo', access: 'Inmediata', tip: 'Mantenlo separado de tu cuenta del día a día y con retiro inmediato.' },
  { id: 'deudas', name: 'Deuda de alto costo', when: 'Prioridad inmediata', products: ['Abono extraordinario a capital de la deuda con mayor tasa'],
    risk: 'Ninguno', access: 'No aplica', tip: 'Indica a tu banco que el abono se aplique a capital y no a cuotas futuras.' },
  { id: 'metas', name: 'Metas de mediano plazo', when: '6 meses a 3 años: viaje, estudios, cuota inicial', products: ['Depósito a plazo fijo (CDT, plazo fijo o depósito a plazo)', 'Fondo de inversión de renta fija o del mercado monetario'],
    risk: 'Bajo', access: 'Al vencimiento o en pocos días', tip: 'Elige un plazo que coincida con la fecha de tu meta: retirar antes puede costarte los intereses.' },
  { id: 'largo', name: 'Inversión de largo plazo', when: 'Más de 3 años: retiro, independencia financiera', products: ['Fondo de inversión diversificado o indexado', 'Plan de pensión voluntaria (con beneficio tributario en algunos países)'],
    risk: 'Moderado: fluctúa en el corto plazo', access: 'En días; idealmente no retirar', tip: 'Aporta de forma constante cada mes, sin intentar adivinar el mercado.' },
];

/**
 * Reparte lo que sobra cada mes según la etapa en que está la persona:
 *  1. sin_margen      — no sobra nada: primero recortar.
 *  2. colchon_minimo  — ahorros por debajo de 1 mes de gastos esenciales: 100% al colchón.
 *  3. deudas_caras    — hay deudas con tasa anual > 15%: 70% a deudas, 30% a colchón (o metas si ya está completo).
 *  4. colchon         — falta completar el colchón: 70% colchón, 30% metas.
 *  5. crecer          — todo en orden: 50% metas, 50% largo plazo.
 */
export function surplusPlan(data, s = summarize(data)) {
  const margin = Math.max(0, Math.round(s.margin));
  const expensive = s.debts
    .map((d) => ({ id: d.id, name: d.name, rate: d.rate, balance: d.balance, ea: effectiveAnnual(d.rate) }))
    .filter((d) => d.ea > EXPENSIVE_DEBT_EA)
    .sort((a, b) => b.rate - a.rate || a.balance - b.balance);

  let stage, weights;
  if (margin <= 0) { stage = 'sin_margen'; weights = {}; }
  else if (s.essentials > 0 && s.savings < s.essentials) { stage = 'colchon_minimo'; weights = { colchon: 1 }; }
  else if (expensive.length) { stage = 'deudas_caras'; weights = s.emergencyGap > 0 ? { deudas: 0.7, colchon: 0.3 } : { deudas: 0.7, metas: 0.3 }; }
  else if (s.emergencyGap > 0) { stage = 'colchon'; weights = { colchon: 0.7, metas: 0.3 }; }
  else { stage = 'crecer'; weights = { metas: 0.5, largo: 0.5 }; }

  const ids = BUCKETS.map((b) => b.id).filter((id) => weights[id]);
  let assigned = 0;
  const split = ids.map((id, i) => {
    const amount = i === ids.length - 1 ? margin - assigned : Math.round(margin * weights[id]);
    assigned += amount;
    return { id, pct: weights[id], amount };
  });
  const amountOf = (id) => (split.find((x) => x.id === id) || { amount: 0 }).amount;

  let milestone = null;
  if (stage === 'colchon_minimo') {
    milestone = { id: 'un_mes', months: Math.ceil((s.essentials - s.savings) / margin) };
  } else if (stage === 'deudas_caras') {
    const p = payoff(s.debts, amountOf('deudas'), 'avalancha');
    milestone = { id: 'sin_deudas_caras', months: p.feasible ? Math.max(...expensive.map((d) => p.payoffMonth[d.id] || 0)) : null };
  } else if (stage === 'colchon') {
    milestone = { id: 'colchon_completo', months: Math.ceil(s.emergencyGap / amountOf('colchon')) };
  }
  return { stage, margin, split, expensive, milestone };
}

/**
 * Crecimiento de un ahorro con aporte mensual y tasa efectiva anual (en %), con capitalización mensual.
 * Saldo del mes m = saldo anterior × (1 + i) + aporte, con i = (1 + EA)^(1/12) − 1.
 */
export function growth(start, monthly, annualPct, months = 12) {
  const i = Math.pow(1 + n(annualPct) / 100, 1 / 12) - 1;
  const series = [n(start)];
  for (let m = 1; m <= months; m++) series.push(series[m - 1] * (1 + i) + n(monthly));
  const total = series[months];
  const contributed = n(start) + n(monthly) * months;
  return { series, total, contributed, interest: total - contributed };
}
