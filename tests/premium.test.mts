// Pruebas del motor Premium. Uso: npx tsx tests/premium.test.mts [--dump N]
import assert from 'node:assert/strict';
import { budgetStatus, goalPlan, fixedPayments, toFinanceData, savingsTips, cleanPerfil, emptyPerfil, monthsBetween } from '../src/lib/premium.ts';
import { realRate, TASAS } from '../src/data/tasas.ts';
import { BOT_CATEGORIES } from '../src/lib/bot-categories.ts';
import * as F from '../src/lib/finance.js';

let seed = 5;
const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor((seed / 2147483648) * k); };
const gastoCats = BOT_CATEGORIES.filter(c => c.tipo === 'gasto').map(c => c.id);
const randMovs = () => Array.from({ length: rand(45) }, (_, i) => ({ id: 'm' + i, fecha: `2026-11-${String(1 + rand(28)).padStart(2, '0')}`, tipo: rand(5) === 0 ? 'ingreso' as const : 'gasto' as const, monto: (rand(200000) + 1) / 100, categoria: gastoCats[rand(gastoCats.length)], descripcion: ['Netflix', 'Arriendo', 'Almuerzo', 'Gym mensual', 'Taxi'][rand(5)] }));
const randBudget = () => Object.fromEntries(gastoCats.filter(() => rand(2)).map(c => [c, (rand(80000) + 1) / 10]));

const dump = process.argv.indexOf('--dump');
if (dump > -1) {
  const N = Number(process.argv[dump + 1] || 600);
  const out = Array.from({ length: N }, () => {
    const movs = randMovs(), pres = randBudget();
    const meta = { id: 'g', nombre: 'Meta', monto: rand(5000000) / 100, ahorrado: rand(5000000) / 100, fecha: rand(4) ? `${2026 + rand(3)}-${String(1 + rand(12)).padStart(2, '0')}` : '' };
    const pagos = Array.from({ length: rand(5) }, (_, i) => ({ id: 'f' + i, nombre: ['Netflix', 'Arriendo', 'Gym', 'Plan celular'][rand(4)], monto: rand(100000) / 100, dia: 1 + rand(28), categoria: 'ocio' }));
    const today = `2026-${String(1 + rand(12)).padStart(2, '0')}-${String(1 + rand(28)).padStart(2, '0')}`;
    const nom = rand(2000) / 100, inf = rand(1500) / 100;
    return { movs, pres, meta, pagos, today, nom, inf, budget: budgetStatus(movs, pres), goal: goalPlan(meta, today.slice(0, 7)), fixed: fixedPayments(pagos, movs, today), real: realRate(nom, inf) };
  });
  await new Promise(done => process.stdout.write(JSON.stringify(out), done));
  process.exit(0);
}

// 1. Presupuesto
{
  const movs = [
    { id: 'a', fecha: '2026-11-02', tipo: 'gasto' as const, monto: 87, categoria: 'comida', descripcion: 'Almuerzo' },
    { id: 'b', fecha: '2026-11-03', tipo: 'gasto' as const, monto: 130, categoria: 'ocio', descripcion: 'Cine' },
    { id: 'c', fecha: '2026-11-03', tipo: 'gasto' as const, monto: 20, categoria: 'transporte', descripcion: 'Taxi' },
    { id: 'd', fecha: '2026-11-04', tipo: 'ingreso' as const, monto: 1000, categoria: 'salario', descripcion: 'Quincena' },
  ];
  const b = budgetStatus(movs, { comida: 100, ocio: 100, transporte: 100, mercado: 0 });
  assert.deepEqual(b.rows.map(r => [r.categoria, r.estado]), [['ocio', 'excedido'], ['comida', 'alerta'], ['transporte', 'ok']]);
  assert.equal(b.presupuestado, 300); assert.equal(b.gastadoEnPresupuesto, 237);
  assert.equal(b.cumplimiento, 2 / 3); assert.equal(b.rows[0].restante, -30);
  assert.equal(budgetStatus(movs, {}).cumplimiento, null);
}
// 2. Metas
{
  assert.equal(monthsBetween('2026-11', '2027-05'), 6); assert.equal(monthsBetween('2026-11', '2026-11'), 1);
  const g = goalPlan({ id: 'g', nombre: 'Viaje', monto: 900, ahorrado: 300, fecha: '2027-05' }, '2026-11');
  assert.equal(g.faltante, 600); assert.equal(g.aporteMensual, 100); assert.equal(Math.round(g.avance * 100), 33);
  assert.equal(goalPlan({ id: 'g', nombre: 'x', monto: 100, ahorrado: 10, fecha: '' }, '2026-11').aporteMensual, null);
  assert.equal(goalPlan({ id: 'g', nombre: 'x', monto: 100, ahorrado: 10, fecha: '2026-01' }, '2026-11').vencida, true);
}
// 3. Pagos fijos
{
  const movs = [{ id: 'a', fecha: '2026-11-02', tipo: 'gasto' as const, monto: 12, categoria: 'ocio', descripcion: 'Netflix noviembre' }];
  const f = fixedPayments([
    { id: '1', nombre: 'Netflix', monto: 12, dia: 2, categoria: 'ocio' },
    { id: '2', nombre: 'Arriendo', monto: 400, dia: 5, categoria: 'vivienda' },
    { id: '3', nombre: 'Gimnasio', monto: 30, dia: 1, categoria: 'ocio' },
  ], movs, '2026-11-04');
  assert.deepEqual(f.rows.map(r => [r.nombre, r.pagado, r.diasParaCobro]), [['Arriendo', false, 1], ['Gimnasio', false, 27], ['Netflix', true, null]]);
  assert.equal(f.mensual, 442); assert.equal(f.anual, 5304);
}
// 4. Tasa real, perfil y conversión al motor del tablero
{
  assert.ok(Math.abs(realRate(10, 5) - 4.7619) < 1e-3);
  for (const [id, t] of Object.entries(TASAS)) for (const d of [t.inflacion, t.tasaPolitica, t.referenciaAhorro]) if (d) assert.ok(d.valor > 0 && d.url.startsWith('https://') && d.fuente && d.periodo, id);
  const p = cleanPerfil({ presupuestos: { comida: 100, salario: 50, xx: 3 } as any, metas: [{ id: '', nombre: '<b>Viaje</b>', monto: -5, ahorrado: 10, fecha: '2027-13x' } as any], deudas: [{ id: 'd', name: 'TC', balance: 100, rate: 99, min: 10 }], mesesFondo: 9, ahorros: -1 } as any);
  assert.deepEqual(p.presupuestos, { comida: 100 }); assert.equal(p.metas[0].nombre, 'bViaje/b'); assert.equal(p.metas[0].monto, 0); assert.equal(p.metas[0].fecha, '');
  assert.equal(p.deudas[0].rate, 20); assert.equal(p.mesesFondo, 3); assert.equal(p.ahorros, 0);
  const movs = randMovs();
  const fd = toFinanceData(movs, { ...emptyPerfil(), ahorros: 500, deudas: [{ id: 'd', name: 'TC', balance: 1000, rate: 2, min: 50 }] }, 'COP', 'es-CO', 'CO');
  const s = F.summarize(fd);
  assert.ok(Number.isFinite(s.margin)); assert.equal(fd.expenses.length, F.DEFAULT_EXPENSES.length);
  for (let i = 0; i < 500; i++) {
    const tips = savingsTips(randMovs(), { ...emptyPerfil(), presupuestos: randBudget(), ahorros: rand(1000) }, ['CO', 'MX', 'AR'][rand(3)], (n) => '$' + Math.round(n));
    tips.forEach(t => assert.ok(!/NaN|undefined|Infinity/.test(t.title + t.detail)));
  }
}
console.log('✓ Motor Premium: presupuesto y cumplimiento, metas, pagos fijos, tasa real, perfil y recomendaciones');
