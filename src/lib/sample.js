/*
 * Perfiles de EJEMPLO con datos ficticios. Se muestran siempre marcados como ilustrativos:
 * no son clientes ni testimonios.
 */
import { DEFAULT_EXPENSES } from './finance.js';

const amounts = (o) => DEFAULT_EXPENSES.map((e) => ({ ...e, amount: o[e.id] || 0 }));

export const SAMPLE = {
  label: 'Perfil de ejemplo: independiente de 31 años con una persona a cargo',
  testCode: '110' + '111122111122', // respuestas ficticias del test
  pais: 'Colombia',
  data: {
    currency: 'COP',
    income: 6200000,
    savings: 3100000,
    emergencyTargetMonths: 4,
    extraDebtPayment: 300000,
    expenses: amounts({ vivienda: 1650000, mercado: 950000, servicios: 310000, transporte: 380000, salud: 260000, educacion: 0, conectividad: 140000, comida: 520000, compras: 340000, ocio: 230000, otros: 180000 }),
    debts: [
      { id: 'tc', name: 'Tarjeta de crédito', balance: 4300000, rate: 2.4, min: 280000 },
      { id: 'libre', name: 'Crédito de libre inversión', balance: 9800000, rate: 1.6, min: 420000 },
    ],
  },
};

export const PERSONAS = [
  { name: 'Perfil A', who: 'Asalariada, 27 años, sin personas a cargo', code: '000' + '111111211121', finding: 'Gasta menos de lo que gana, pero no tiene metas definidas ni ahorro para el retiro.', next: 'Escribir 3 metas con monto y fecha y automatizar el ahorro el día de pago.' },
  { name: 'Perfil B', who: 'Independiente, 34 años, dos hijos', code: '110' + '221332232133', finding: 'Paga solo el mínimo de la tarjeta y su colchón no llega a un mes.', next: 'Congelar la tarjeta, pagar primero la deuda más cara y juntar una semana de gastos.' },
  { name: 'Perfil C', who: 'Dueño de negocio, 45 años', code: '200' + '100101111011', finding: 'Finanzas sanas en casi todo, con un hueco en protección ante un evento grave.', next: 'Cotizar un seguro de vida a término y separar las cuentas del negocio.' },
];
