/*
 * Perfiles de EJEMPLO con datos ficticios. Se muestran siempre marcados como ilustrativos:
 * no son clientes ni testimonios.
 */
import { DEFAULT_EXPENSES } from './finance.js';

const amounts = (o) => DEFAULT_EXPENSES.map((e) => ({ ...e, amount: o[e.id] || 0 }));

// Montos base en dólares. Para otras monedas se convierten con un tipo de cambio aproximado
// (noviembre de 2026) y se redondean: son datos ficticios, solo para ilustrar.
export const FX_PER_USD = {
  USD: 1, COP: 3900, MXN: 18.5, ARS: 1450, CLP: 990, PEN: 3.45, GTQ: 7.7, HNL: 26, CRC: 505,
  DOP: 63, BOB: 6.9, PYG: 7300, UYU: 40, NIO: 36.6, EUR: 0.87,
};

const BASE = {
  income: 1600, savings: 1180, extraDebtPayment: 77,
  expenses: { vivienda: 420, mercado: 245, servicios: 80, transporte: 98, salud: 67, educacion: 0, conectividad: 36, comida: 133, compras: 87, ocio: 59, otros: 46 },
  debts: [
    { id: 'tc', name: 'Tarjeta de crédito', balance: 1100, rate: 2.4, min: 72 },
    { id: 'libre', name: 'Crédito de consumo', balance: 2500, rate: 1.6, min: 108 },
  ],
};

/** Redondea a 3 cifras significativas: 6.243.120 → 6.240.000; 245 → 245. */
export function nice(x) {
  if (!x) return 0;
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 2));
  return Math.round(x / step) * step;
}

/** Datos del perfil de ejemplo en la moneda pedida (si no la conocemos, en dólares). */
export function sampleData(currency = 'USD', locale) {
  const cur = FX_PER_USD[currency] ? currency : 'USD';
  const k = FX_PER_USD[cur];
  const m = (x) => nice(x * k);
  return {
    currency: cur,
    ...(locale && cur === currency ? { locale } : {}),
    income: m(BASE.income),
    savings: m(BASE.savings),
    emergencyTargetMonths: 4,
    extraDebtPayment: m(BASE.extraDebtPayment),
    expenses: amounts(Object.fromEntries(Object.entries(BASE.expenses).map(([id, v]) => [id, m(v)]))),
    debts: BASE.debts.map((d) => ({ ...d, balance: m(d.balance), min: m(d.min) })),
  };
}

export const SAMPLE = {
  label: 'Perfil de ejemplo: independiente de 31 años con una persona a cargo',
  testCode: '110' + '111122111122', // respuestas ficticias del test
  data: sampleData('USD'),
};

export const PERSONAS = [
  { name: 'Perfil A', who: 'Asalariada, 27 años, sin personas a cargo', code: '000' + '111111211121', finding: 'Gasta menos de lo que gana, pero no tiene metas definidas ni ahorro para el retiro.', next: 'Escribir 3 metas con monto y fecha y automatizar el ahorro el día de pago.' },
  { name: 'Perfil B', who: 'Independiente, 34 años, dos hijos', code: '110' + '221332232133', finding: 'Paga solo el mínimo de la tarjeta y su fondo de emergencia no cubre un mes.', next: 'Suspender el uso de la tarjeta, priorizar la deuda de mayor tasa y reservar una semana de gastos.' },
  { name: 'Perfil C', who: 'Dueño de negocio, 45 años', code: '200' + '100101111011', finding: 'Finanzas sanas en casi todo, con un hueco en protección ante un evento grave.', next: 'Cotizar un seguro de vida a término y separar las cuentas del negocio.' },
];
