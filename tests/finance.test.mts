// Pruebas del motor del tablero. Uso: npx tsx tests/finance.test.mts [--dump N]
import assert from 'node:assert/strict';
import * as F from '../src/lib/finance.js';

let seed = 11;
const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k; };

function randomCase() {
  const debts = Array.from({ length: rand(4) }, (_, i) => ({ id: 'd' + i, name: 'Deuda ' + i, balance: 200 + rand(20000), rate: rand(45) / 10, min: 20 + rand(900) }));
  const income = rand(10) === 0 ? 0 : 500 + rand(8000);
  const expenses = F.DEFAULT_EXPENSES.map(e => ({ ...e, amount: rand(3) === 0 ? 0 : rand(1500) }));
  return { currency: 'USD', income, savings: rand(15000), emergencyTargetMonths: 3 + rand(4), extraDebtPayment: rand(2) ? rand(600) : 0, expenses, debts };
}

const dump = process.argv.indexOf('--dump');
if (dump > -1) {
  const N = Number(process.argv[dump + 1] || 500);
  const out = Array.from({ length: N }, () => {
    const d = randomCase(), s = F.summarize(d);
    const p0 = F.payoff(d.debts, 0, 'avalancha'), p1 = F.payoff(d.debts, d.extraDebtPayment, 'avalancha'), p2 = F.payoff(d.debts, d.extraDebtPayment, 'bola');
    return { data: d, margin: s.margin, savingsRate: s.savingsRate, essentials: s.essentials, emergencyMonths: s.emergencyMonths, debtLoad: s.debtLoad,
      p0: [p0.feasible, p0.months, p0.totalInterest], p1: [p1.feasible, p1.months, p1.totalInterest], p2: [p2.feasible, p2.months, p2.totalInterest],
      recs: F.recommendations(d).map(r => r.id) };
  });
  await new Promise(done => process.stdout.write(JSON.stringify(out), done));
  process.exit(0);
}

// 1. Caso a mano: una deuda de 1.000 al 2% mensual, cuota 100.
{
  const p = F.payoff([{ id: 'a', name: 'A', balance: 1000, rate: 2, min: 100 }], 0);
  // Fórmula cerrada: n = -ln(1 - r·B/P) / ln(1+r) = 11,27 → 12 cuotas (la última parcial).
  // Saldo tras 11 cuotas = B(1+r)^11 - P((1+r)^11 - 1)/r = 26,50; cuota 12 = 26,50 × 1,02 = 27,03.
  // Interés total = 11 × 100 + 27,03 - 1.000 = 127,03.
  const r = 0.02, B11 = 1000 * 1.02 ** 11 - 100 * (1.02 ** 11 - 1) / r;
  assert.equal(p.feasible, true); assert.equal(p.months, 12);
  assert.ok(Math.abs(p.totalInterest - (1100 + B11 * 1.02 - 1000)) < 1e-6, 'interés ' + p.totalInterest);
}
// 2. Cuota que no cubre intereses → no se paga nunca.
assert.equal(F.payoff([{ id: 'a', name: 'A', balance: 10000, rate: 3, min: 200 }], 0).feasible, false);
// 3. Pagar extra nunca empeora: menos meses y menos interés.
for (let i = 0; i < 3000; i++) {
  const d = randomCase(); if (!d.debts.length) continue;
  const a = F.payoff(d.debts, 0), b = F.payoff(d.debts, 300);
  if (a.feasible) { assert.ok(b.feasible); assert.ok(b.months! <= a.months!); assert.ok(b.totalInterest <= a.totalInterest + 1e-6); }
  const av = F.payoff(d.debts, 300, 'avalancha'), sn = F.payoff(d.debts, 300, 'bola');
  if (av.feasible && sn.feasible) assert.ok(av.totalInterest <= sn.totalInterest + 1e-6, 'avalancha debe pagar menos interés');
}
// 4. Resumen consistente.
for (let i = 0; i < 3000; i++) {
  const d = randomCase(), s = F.summarize(d);
  assert.ok(Math.abs(s.income - s.outflow - s.margin) < 1e-6);
  assert.ok(Math.abs(s.byType.esencial + s.byType.importante + s.byType.prescindible - s.expensesTotal) < 1e-6);
  const r = F.recommendations(d);
  assert.ok(r.length >= 1);
  for (let k = 1; k < r.length; k++) assert.ok(r[k - 1].priority <= r[k].priority);
  r.forEach(x => assert.ok(!/NaN|undefined|Infinity/.test(x.title + x.detail), JSON.stringify(x)));
}
// 5. Datos vacíos no rompen nada.
const e = F.emptyData('COP');
assert.equal(F.summarize(e).margin, 0); assert.equal(F.recommendations(e)[0].id, 'sin_ingreso');
console.log('✓ Motor del tablero: deudas, resumen y recomendaciones consistentes en 6.000 casos');
