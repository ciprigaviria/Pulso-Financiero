/*
 * Pulso Financiero — motor del tablero personal.
 * Funciones puras: reciben los números que la persona escribe (y que solo viven en su navegador)
 * y devuelven indicadores, plan de deudas, proyección y recomendaciones.
 *
 * Validado contra una reimplementación independiente en Python: tests/validate_finance.py.
 */

export const EXPENSE_TYPES = ['esencial', 'importante', 'prescindible'];

export const DEFAULT_EXPENSES = [
  { id: 'vivienda', name: 'Vivienda', type: 'esencial' },
  { id: 'mercado', name: 'Mercado', type: 'esencial' },
  { id: 'servicios', name: 'Servicios públicos', type: 'esencial' },
  { id: 'transporte', name: 'Transporte', type: 'esencial' },
  { id: 'salud', name: 'Salud y seguros', type: 'esencial' },
  { id: 'educacion', name: 'Educación', type: 'importante' },
  { id: 'conectividad', name: 'Celular e internet', type: 'importante' },
  { id: 'comida', name: 'Comida fuera y domicilios', type: 'prescindible' },
  { id: 'compras', name: 'Ropa y compras', type: 'prescindible' },
  { id: 'ocio', name: 'Entretenimiento y suscripciones', type: 'prescindible' },
  { id: 'otros', name: 'Otros', type: 'importante' },
];

// Referencias generales usadas en las recomendaciones (no son reglas personales).
export const REF = {
  savingsRate: 0.10,     // ahorrar al menos 10% del ingreso
  debtLoad: 0.30,        // cuotas de deuda por debajo de 30% del ingreso
  housing: 0.35,         // vivienda por debajo de 35% del ingreso
  wants: 0.30,           // gastos prescindibles por debajo de 30% (regla 50/30/20)
};

const n = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);

export function emptyData(currency = 'USD') {
  return {
    currency,
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
  if (s.income <= 0) return [{ id: 'sin_ingreso', priority: 1, level: 'alta', title: 'Escribe tu ingreso mensual', detail: 'Sin tu ingreso no podemos calcular tu margen, tu tasa de ahorro ni tu carga de deudas.' }];

  if (s.margin < 0) {
    out.push({ id: 'margen_negativo', priority: 1, level: 'alta',
      title: 'Gastas más de lo que ganas',
      detail: `Cada mes salen ${'{m:' + Math.round(-s.margin) + '}'} más de lo que entra. Tus gastos prescindibles suman ${'{m:' + Math.round(s.byType.prescindible) + '}'}: es el primer lugar para recortar.`,
      metric: -s.margin });
  }

  if (s.debts.length) {
    const base = payoff(s.debts, 0, 'avalancha');
    const extra = n(data.extraDebtPayment) || Math.max(0, Math.round(s.margin * 0.5));
    const withExtra = payoff(s.debts, extra, 'avalancha');
    const top = s.debts.slice().sort((a, b) => b.rate - a.rate || a.balance - b.balance)[0];
    if (!base.feasible) {
      out.push({ id: 'deuda_no_baja', priority: 1, level: 'alta', title: 'Con las cuotas mínimas tus deudas no bajan',
        detail: `Los intereses se comen las cuotas. Prioriza ${top.name} (${top.rate}% mensual) y habla con tu banco para reestructurar.` });
    } else if (extra > 0 && withExtra.feasible) {
      const saved = Math.max(0, base.totalInterest - withExtra.totalInterest);
      out.push({ id: 'plan_deudas', priority: s.debtLoad > REF.debtLoad ? 2 : 3, level: s.debtLoad > REF.debtLoad ? 'alta' : 'media',
        title: `Paga primero ${top.name}`,
        detail: `Es la de mayor tasa (${top.rate}% mensual). Con ${'{m:' + Math.round(extra) + '}'} extra al mes quedas libre de deudas en ${withExtra.months} meses en vez de ${base.months} y te ahorras ${'{m:' + Math.round(saved) + '}'} en intereses.`,
        metric: saved });
    }
    if (s.debtLoad > REF.debtLoad) {
      out.push({ id: 'carga_deuda', priority: 2, level: 'alta', title: `Tus cuotas se llevan ${pct(s.debtLoad)}% de tu ingreso`,
        detail: `La referencia es menos de ${pct(REF.debtLoad)}%. No tomes deudas nuevas hasta bajar de ese nivel.`, metric: s.debtLoad });
    }
  }

  if (s.emergencyMonths !== null && s.emergencyMonths < s.targetMonths) {
    const months = s.margin > 0 ? Math.ceil(s.emergencyGap / s.margin) : null;
    out.push({ id: 'colchon', priority: s.emergencyMonths < 1 ? 1 : 2, level: s.emergencyMonths < 1 ? 'alta' : 'media',
      title: `Tu colchón cubre ${s.emergencyMonths.toFixed(1).replace('.', ',')} meses`,
      detail: `Te faltan ${'{m:' + Math.round(s.emergencyGap) + '}'} para cubrir ${s.targetMonths} meses de gastos esenciales.` +
        (months ? ` Ahorrando todo tu margen actual lo completas en ${months} ${months === 1 ? 'mes' : 'meses'}.` : ' Primero necesitas que te sobre dinero cada mes.'),
      metric: s.emergencyGap });
  }

  if (s.margin >= 0 && s.savingsRate < REF.savingsRate) {
    const need = Math.round(REF.savingsRate * s.income - s.margin);
    const share = s.byType.prescindible > 0 ? Math.min(100, Math.round((need / s.byType.prescindible) * 100)) : null;
    out.push({ id: 'tasa_ahorro', priority: 3, level: 'media', title: `Ahorras ${pct(s.savingsRate)}% de tu ingreso`,
      detail: `Para llegar a ${pct(REF.savingsRate)}% necesitas liberar ${'{m:' + need + '}'} al mes` + (share !== null ? `, un ${share}% de tus gastos prescindibles.` : '.'),
      metric: need });
  }

  if (s.wantsShare > REF.wants) {
    out.push({ id: 'prescindibles', priority: 3, level: 'media', title: `Tus gastos prescindibles son ${pct(s.wantsShare)}% de tu ingreso`,
      detail: `La referencia 50/30/20 sugiere no pasar de ${pct(REF.wants)}%. Revisa suscripciones y domicilios: suelen ser lo más fácil de recortar.`, metric: s.wantsShare });
  }
  if (s.housingShare > REF.housing) {
    out.push({ id: 'vivienda', priority: 4, level: 'baja', title: `Tu vivienda se lleva ${pct(s.housingShare)}% de tu ingreso`,
      detail: `Lo recomendable es menos de ${pct(REF.housing)}%. No es urgente, pero tenlo en cuenta en tu próxima renovación o mudanza.`, metric: s.housingShare });
  }

  if (!out.length) {
    out.push({ id: 'bien', priority: 5, level: 'baja', title: 'Tus números están sanos',
      detail: `Te sobran ${'{m:' + Math.round(s.margin) + '}'} al mes. Asígnalos a una meta concreta (retiro, vivienda o estudio) para que no se diluyan.` });
  }
  return out.sort((a, b) => a.priority - b.priority);
}
