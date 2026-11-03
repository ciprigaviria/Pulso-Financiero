import type { FinanceData } from './finance'
export const FX_PER_USD: Record<string, number>
export function nice(x: number): number
export function sampleData(currency?: string, locale?: string): FinanceData
export const SAMPLE: { label: string; testCode: string; data: FinanceData }
export const PERSONAS: { name: string; who: string; code: string; finding: string; next: string }[]
