// Tipos de src/lib/finance.js
export type ExpenseType = 'esencial' | 'importante' | 'prescindible';
export interface Expense { id: string; name: string; type: ExpenseType; amount: number }
export interface Debt { id: string; name: string; balance: number; rate: number; min: number }
export interface FinanceData {
  currency: string; locale?: string; country?: string; income: number; savings: number; emergencyTargetMonths: number; extraDebtPayment: number;
  expenses: Expense[]; debts: Debt[];
}
export interface Summary {
  income: number; expensesTotal: number; debtPayments: number; outflow: number; margin: number; savingsRate: number;
  essentials: number; savings: number; emergencyMonths: number | null; emergencyTarget: number; emergencyGap: number; targetMonths: number;
  debtLoad: number; totalDebt: number; byType: Record<ExpenseType, number>; wantsShare: number; housingShare: number;
  categories: { id: string; name: string; type: ExpenseType; amount: number; share: number }[];
  debts: Debt[];
}
export interface Payoff { feasible: boolean; months: number | null; totalInterest: number; payoffMonth: Record<string, number>; series: number[]; budget: number }
export interface Recommendation { id: string; priority: number; level: 'alta' | 'media' | 'baja'; title: string; detail: string; metric?: number }
export const EXPENSE_TYPES: ExpenseType[];
export const DEFAULT_EXPENSES: Omit<Expense, 'amount'>[];
export const REF: { savingsRate: number; debtLoad: number; housing: number; wants: number };
export function emptyData(currency?: string, locale?: string, country?: string): FinanceData;
export function summarize(data: FinanceData): Summary;
export function payoff(debts: Debt[], extra?: number, method?: 'avalancha' | 'bola', maxMonths?: number): Payoff;
export function projection(start: number, monthly: number, months?: number): number[];
export function recommendations(data: FinanceData, s?: Summary): Recommendation[];
export type BucketId = 'colchon' | 'deudas' | 'metas' | 'largo';
export interface Bucket { id: BucketId; name: string; when: string; products: string[]; risk: string; access: string; tip: string }
export interface SurplusPlan {
  stage: 'sin_margen' | 'colchon_minimo' | 'deudas_caras' | 'colchon' | 'crecer';
  margin: number;
  split: { id: BucketId; pct: number; amount: number }[];
  expensive: { id: string; name: string; rate: number; balance: number; ea: number }[];
  milestone: { id: 'un_mes' | 'sin_deudas_caras' | 'colchon_completo'; months: number | null } | null;
}
export interface Growth { series: number[]; total: number; contributed: number; interest: number }
export const EXPENSIVE_DEBT_EA: number;
export const BUCKETS: Bucket[];
export function effectiveAnnual(monthlyPct: number): number;
export function surplusPlan(data: FinanceData, s?: Summary): SurplusPlan;
export function growth(start: number, monthly: number, annualPct: number, months?: number): Growth;
