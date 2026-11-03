// Todo lo que la persona guarda vive en su navegador (localStorage). Nada se envía a un servidor.
import { config } from "@/config"
import type { FinanceData } from "@/lib/finance"

const K = { test: "pulso_test_v1", data: "pulso_tablero_v1", license: "pulso_licencia_v1", checks: "pulso_plan_v1" }

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null") as T } catch { return null }
}
function write(key: string, v: unknown) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)) } catch { /* sin almacenamiento */ }
}

export type SavedTest = { code: string; pais: string; at?: string }
export const store = {
  getTest: () => read<SavedTest>(K.test),
  setTest: (t: SavedTest | null) => write(K.test, t),
  getData: () => read<FinanceData>(K.data),
  setData: (d: FinanceData | null) => write(K.data, d),
  getLicense: () => read<{ key: string; at: string }>(K.license),
  setLicense: (l: { key: string; at: string } | null) => write(K.license, l),
  getChecks: () => read<Record<string, boolean>>(K.checks) || {},
  setChecks: (c: Record<string, boolean>) => write(K.checks, c),
  clearAll: () => Object.values(K).forEach((k) => write(k, null)),
}

/** Enlace de compra con las respuestas del test (y el correo, si lo hay). */
export function checkoutUrl(t: SavedTest | null, email?: string) {
  if (!config.checkoutPersonal) return ""
  let url = config.checkoutPersonal
  const add = (k: string, v: string) => { url += (url.includes("?") ? "&" : "?") + encodeURIComponent(k) + "=" + encodeURIComponent(v) }
  if (t?.code) add("checkout[custom][r]", t.code)
  if (t?.pais) add("checkout[custom][pais]", t.pais)
  if (email) add("checkout[email]", email)
  return url
}

/** Valida una clave de licencia de Lemon Squeezy a través de Apps Script. */
export async function validateLicense(key: string): Promise<{ ok: boolean; message?: string }> {
  if (!config.appsScriptUrl) return { ok: false, message: "La validación de claves aún no está configurada." }
  try {
    const res = await fetch(config.appsScriptUrl + "?action=licencia&key=" + encodeURIComponent(key.trim()))
    const j = await res.json()
    return j.ok ? { ok: true } : { ok: false, message: j.error || "La clave no es válida." }
  } catch {
    return { ok: false, message: "No pudimos verificar la clave. Revisa tu conexión e intenta de nuevo." }
  }
}

/** Envía un formulario (resumen, beta o comentario) a Apps Script. */
export async function sendForm(body: Record<string, unknown>) {
  if (!config.appsScriptUrl) throw new Error("not-configured")
  await fetch(config.appsScriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
}

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  colombia: "COP", guatemala: "GTQ", mexico: "MXN", "méxico": "MXN", peru: "PEN", "perú": "PEN", chile: "CLP", argentina: "ARS",
  honduras: "HNL", "costa rica": "CRC", "república dominicana": "DOP", "republica dominicana": "DOP", bolivia: "BOB", paraguay: "PYG",
  uruguay: "UYU", "españa": "EUR", espana: "EUR", ecuador: "USD", "el salvador": "USD", panamá: "USD", panama: "USD", "estados unidos": "USD",
  nicaragua: "NIO", venezuela: "USD", brasil: "BRL",
}
export const CURRENCIES = ["COP", "GTQ", "MXN", "PEN", "CLP", "ARS", "USD", "EUR", "HNL", "CRC", "DOP", "BOB", "PYG", "UYU", "NIO", "BRL"]
export function currencyFor(pais?: string) {
  return CURRENCY_BY_COUNTRY[(pais || "").trim().toLowerCase()] || "USD"
}

export function moneyFormatter(currency: string) {
  const full = new Intl.NumberFormat("es", { style: "currency", currency, maximumFractionDigits: 0 })
  const compact = new Intl.NumberFormat("es", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 })
  return {
    full: (n: number) => full.format(Math.round(n)),
    compact: (n: number) => (Math.abs(n) >= 100000 ? compact.format(n) : full.format(Math.round(n))),
  }
}

/** Reemplaza los {m:123} de las recomendaciones por montos con formato. */
export function withMoney(text: string, fmt: (n: number) => string) {
  return text.replace(/\{m:(-?\d+)\}/g, (_, v) => fmt(Number(v)))
}
