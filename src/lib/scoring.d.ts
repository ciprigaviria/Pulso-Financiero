// Tipos de src/lib/scoring.js (las reglas viven en JavaScript para compartirlas con las pruebas).
export type Color = 'verde' | 'amarillo' | 'rojo';
export type LevelColor = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export interface Level { id: 'sana' | 'estable' | 'riesgo' | 'vulnerable'; min: number; name: string; color: LevelColor; message: string }
export interface Area { id: string; name: string; short: string }
export interface Question { n: number; area: string; text: string; options: string[]; points: number[]; insights: string[] }
export interface ProfileQuestion { id: string; text: string; options: string[] }
export interface Flag { id: string; q: number; minIndex: number; name: string; action: string }

export interface AreaResult {
  id: string; name: string; score: number; raw: number; color: Color;
  message: string; insight: string; bestInsight: string;
}
export interface Week { title: string; actions: string[] }
export interface Result {
  total: number;
  level: Level;
  areas: AreaResult[];
  flags: { id: string; name: string; action: string }[];
  weakest: AreaResult;
  strongest: AreaResult;
  potential: { area: string; from: number; to: number; level: Level } | null;
  plan: Week[];
}
export interface Answers { profile: number[]; q: number[] }

export const COUNTRY: { id: string; text: string; placeholder: string };
export const PROFILE: ProfileQuestion[];
export const AREAS: Area[];
export const QUESTIONS: Question[];
export const FLAGS: Flag[];
export const LEVELS: Level[];
export const AREA_ACTIONS: Record<string, string[]>;
export function score(answers: Answers): Result;
export function buildPlan(areas: AreaResult[], flags: Result['flags']): Week[];
export function encode(answers: Answers): string;
export function decode(code: string): Answers;
export function areaColor(score: number): Color;
export function cleanCountry(s: unknown): string;
