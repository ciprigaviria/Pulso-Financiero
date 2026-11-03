// Pruebas del motor del tablero. Uso: npx tsx tests/finance.test.mts [--dump N]
import assert from 'node:assert/strict';
import * as F from '../src/lib/finance.js';
import * as M from '../src/lib/money.ts';
import { sampleData, FX_PER_USD, nice } from '../src/lib/sample.js';

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
  const out = Array.from({ length: N }, (_, k) => {
    const d = randomCase();
    // La mitad de los casos con más ingreso y ahorro, para cubrir todas las etapas del reparto del sobrante.
    if (k % 2) { d.income = d.income * 2 + 4000; d.savings += 4000 + rand(20000); }
    if (k % 4 === 1) d.debts.push({ id: 'cara', name: 'Tarjeta', balance: 500 + rand(9000), rate: 1 + rand(30) / 10, min: 50 + rand(400) });
    const s = F.summarize(d);
    const p0 = F.payoff(d.debts, 0, 'avalancha'), p1 = F.payoff(d.debts, d.extraDebtPayment, 'avalancha'), p2 = F.payoff(d.debts, d.extraDebtPayment, 'bola');
    return { data: d, margin: s.margin, savingsRate: s.savingsRate, essentials: s.essentials, emergencyMonths: s.emergencyMonths, debtLoad: s.debtLoad,
      p0: [p0.feasible, p0.months, p0.totalInterest], p1: [p1.feasible, p1.months, p1.totalInterest], p2: [p2.feasible, p2.months, p2.totalInterest],
      recs: F.recommendations(d).map(r => r.id),
      surplus: F.surplusPlan(d), growthRate: d.income % 17, growth: F.growth(d.savings, Math.max(0, s.margin), d.income % 17, 24) };
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

// 6. Qué hacer con lo que sobra.
{
  // Tasa efectiva anual de 2% mensual = 1,02^12 − 1 = 26,82%.
  assert.ok(Math.abs(F.effectiveAnnual(2) - 0.268241795) < 1e-8);
  // Crecimiento: fórmula cerrada FV = S(1+i)^m + P((1+i)^m − 1)/i, con i = 1,12^(1/12) − 1.
  const i = 1.12 ** (1 / 12) - 1, g = F.growth(1000, 100, 12, 24);
  assert.ok(Math.abs(g.total - (1000 * (1 + i) ** 24 + 100 * ((1 + i) ** 24 - 1) / i)) < 1e-6);
  assert.equal(g.contributed, 3400); assert.ok(Math.abs(g.interest - (g.total - 3400)) < 1e-9);
  assert.equal(F.growth(0, 100, 0, 12).total, 1200);
  // A 12% anual en 12 meses, 1.000 se vuelven 1.120 exactos.
  assert.ok(Math.abs(F.growth(1000, 0, 12, 12).total - 1120) < 1e-9);

  const base = { currency: 'USD', income: 3000, savings: 0, emergencyTargetMonths: 3, extraDebtPayment: 0,
    expenses: F.DEFAULT_EXPENSES.map(e => ({ ...e, amount: e.id === 'vivienda' ? 1000 : 0 })), debts: [] as any[] };
  const stage = (over: object) => F.surplusPlan({ ...base, ...over } as any).stage;
  assert.equal(stage({ income: 900 }), 'sin_margen');
  assert.equal(stage({ savings: 500 }), 'colchon_minimo');
  assert.equal(stage({ savings: 1500, debts: [{ id: 'tc', name: 'Tarjeta', balance: 2000, rate: 2.5, min: 100 }] }), 'deudas_caras');
  assert.equal(stage({ savings: 1500, debts: [{ id: 'h', name: 'Hipoteca', balance: 2000, rate: 0.9, min: 100 }] }), 'colchon');
  assert.equal(stage({ savings: 5000 }), 'crecer');
  const p = F.surplusPlan({ ...base, savings: 1500 } as any);
  assert.deepEqual(p.split.map(x => [x.id, x.amount]), [['colchon', 1400], ['metas', 600]]);
  assert.equal(p.milestone!.months, Math.ceil((3000 - 1500) / 1400));

  for (let k = 0; k < 3000; k++) {
    const d = randomCase(), sp = F.surplusPlan(d), sm = F.summarize(d);
    const sum = sp.split.reduce((a, x) => a + x.amount, 0);
    assert.equal(sum, sp.margin, 'el reparto suma el sobrante');
    assert.ok(sp.split.every(x => x.amount >= 0));
    if (sm.margin <= 0) assert.equal(sp.stage, 'sin_margen');
    if (sp.stage === 'deudas_caras') assert.ok(sp.expensive.length > 0 && sp.expensive.every(x => x.ea > F.EXPENSIVE_DEBT_EA));
    if (sp.milestone && sp.milestone.months !== null) assert.ok(Number.isInteger(sp.milestone.months) && sp.milestone.months >= 1);
  }
}
console.log('✓ Motor del tablero: deudas, resumen, recomendaciones y plan del sobrante consistentes en 9.000 casos');

// 7. Monedas y formatos por país.
{
  const cases: [string, number][] = [['1.650.000', 1650000], ['1,650,000', 1650000], ['1 650 000', 1650000], ['2,4', 2.4], ['2.4', 2.4],
    ['1.650.000,50', 1650000.5], ['1,650,000.50', 1650000.5], ['0,5', 0.5], ['', 0], ['abc', 0], ['$ 540.000', 540000]];
  for (const [t, v] of cases) assert.equal(M.parseAmount(t), v, t);
  const names: [string, string | undefined][] = [['mexico', 'MX'], ['México', 'MX'], ['Rep. Dominicana', 'DO'], ['Bogotá, Colombia', 'CO'], ['EEUU', 'US'],
    ['  Perú ', 'PE'], ['españa', 'ES'], ['El Salvador', 'SV'], ['Canadá', undefined], ['', undefined]];
  for (const [t, id] of names) assert.equal(M.countryFromText(t)?.id, id, t);
  assert.equal(M.currencyFor('Guatemala'), 'GTQ'); assert.equal(M.currencyFor('Marte'), 'USD');
  for (const c of [...M.COUNTRIES, M.DEFAULT_COUNTRY]) {
    const fmt = M.moneyFormatter(c.currency, c.locale);
    for (const v of [0, 7, 540000, 6240000, -1250]) {
      const out = fmt.full(v) + fmt.compact(v) + fmt.num(v / 7, 2);
      assert.ok(!/NaN|undefined|Infinity/.test(out), c.id + ' ' + out);
    }
    // Lo que se muestra en un campo se vuelve a leer igual.
    for (const v of [1650000, 2.4, 245, 12.75]) assert.equal(M.parseAmount(M.formatInput(v, c.locale)), v, c.id + ' ' + M.formatInput(v, c.locale));
    assert.equal(M.withMoney('{m:378000} · {d:2.4}%', fmt), fmt.full(378000) + ' · ' + fmt.num(2.4, 2) + '%');
    // El ejemplo en cada moneda conserva la misma historia: excedente positivo y deuda de alto costo.
    const d = sampleData(c.currency, c.locale), sm = F.summarize(d), sp = F.surplusPlan(d, sm);
    assert.equal(d.currency, FX_PER_USD[c.currency] ? c.currency : 'USD');
    assert.ok(sm.margin > 0, c.id); assert.equal(sp.stage, 'deudas_caras', c.id); assert.ok(sp.milestone && sp.milestone.months! > 0);
  }
  assert.equal(nice(6243120), 6240000); assert.equal(nice(245), 245); assert.equal(nice(0), 0);
  // Las recomendaciones ya no traen decimales con formato fijo: usan {d:...}.
  for (let k = 0; k < 500; k++) F.recommendations(randomCase()).forEach(r => assert.ok(!/\d,\d/.test(r.title + r.detail.replace(/\{[md]:[^}]*\}/g, '')), r.title));
}
console.log('✓ Monedas: 21 países, formato local, lectura de cifras y ejemplo coherente en cada moneda');
