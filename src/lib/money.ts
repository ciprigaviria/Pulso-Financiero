// Países, monedas y formato de cifras. El tablero muestra los montos en la moneda y con los
// separadores del país de cada persona (no solo pesos colombianos).

export type Country = { id: string; name: string; currency: string; locale: string; aliases?: string[] }

export const COUNTRIES: Country[] = [
  { id: "AR", name: "Argentina", currency: "ARS", locale: "es-AR" },
  { id: "BO", name: "Bolivia", currency: "BOB", locale: "es-BO" },
  { id: "CL", name: "Chile", currency: "CLP", locale: "es-CL" },
  { id: "CO", name: "Colombia", currency: "COP", locale: "es-CO" },
  { id: "CR", name: "Costa Rica", currency: "CRC", locale: "es-CR" },
  { id: "EC", name: "Ecuador", currency: "USD", locale: "es-EC" },
  { id: "SV", name: "El Salvador", currency: "USD", locale: "es-SV", aliases: ["salvador"] },
  { id: "ES", name: "España", currency: "EUR", locale: "es-ES" },
  { id: "US", name: "Estados Unidos", currency: "USD", locale: "es-US", aliases: ["eeuu", "ee uu", "usa", "eua", "estados unidos de america", "united states"] },
  { id: "GT", name: "Guatemala", currency: "GTQ", locale: "es-GT" },
  { id: "HN", name: "Honduras", currency: "HNL", locale: "es-HN" },
  { id: "MX", name: "México", currency: "MXN", locale: "es-MX", aliases: ["mejico"] },
  { id: "NI", name: "Nicaragua", currency: "NIO", locale: "es-NI" },
  { id: "PA", name: "Panamá", currency: "USD", locale: "es-PA" },
  { id: "PY", name: "Paraguay", currency: "PYG", locale: "es-PY" },
  { id: "PE", name: "Perú", currency: "PEN", locale: "es-PE" },
  { id: "PR", name: "Puerto Rico", currency: "USD", locale: "es-PR" },
  { id: "DO", name: "República Dominicana", currency: "DOP", locale: "es-DO", aliases: ["rep dominicana", "rd", "dominicana", "republica dominicana"] },
  { id: "UY", name: "Uruguay", currency: "UYU", locale: "es-UY" },
  { id: "VE", name: "Venezuela", currency: "USD", locale: "es-VE" },
]

/** País por defecto cuando no sabemos de dónde es la persona. */
export const DEFAULT_COUNTRY: Country = { id: "XX", name: "Otro país", currency: "USD", locale: "es-US" }

export const CURRENCIES = Array.from(new Set(COUNTRIES.map((c) => c.currency)))

const LOCALE_BY_CURRENCY: Record<string, string> = Object.fromEntries(
  COUNTRIES.filter((c) => c.currency !== "USD").map((c) => [c.currency, c.locale]).concat([["USD", "es-US"]]),
)

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()

/** Reconoce el país escrito a mano en el test ("mexico", "Rep. Dominicana", "Bogotá, Colombia"…). */
export function countryFromText(text?: string | null): Country | null {
  const t = norm(text || "")
  if (!t) return null
  for (const c of COUNTRIES) {
    const names = [norm(c.name), ...(c.aliases || []).map(norm)]
    if (names.some((n) => t === n)) return c
  }
  for (const c of COUNTRIES) {
    const names = [norm(c.name), ...(c.aliases || []).filter((a) => a.length > 3).map(norm)]
    if (names.some((n) => ` ${t} `.includes(` ${n} `))) return c
  }
  return null
}

export const countryById = (id?: string | null) => COUNTRIES.find((c) => c.id === id) || null

/** País según el idioma del navegador (es-MX → México). */
export function countryFromNavigator(): Country | null {
  if (typeof navigator === "undefined") return null
  for (const lang of navigator.languages || [navigator.language]) {
    const region = (lang || "").split("-")[1]?.toUpperCase()
    const c = countryById(region)
    if (c) return c
  }
  return null
}

export function currencyFor(pais?: string | null) {
  return (countryFromText(pais) || DEFAULT_COUNTRY).currency
}

export function localeFor(currency: string, locale?: string) {
  return locale || LOCALE_BY_CURRENCY[currency] || "es"
}

export function decimalSeparator(locale: string) {
  return new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value || ","
}

export type Fmt = {
  currency: string
  locale: string
  dec: string
  full: (n: number) => string
  compact: (n: number) => string
  num: (n: number, digits?: number) => string
}

export function moneyFormatter(currency: string, locale?: string): Fmt {
  const loc = localeFor(currency, locale)
  const full = new Intl.NumberFormat(loc, { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0, minimumFractionDigits: 0 })
  const compact = new Intl.NumberFormat(loc, { style: "currency", currency, currencyDisplay: "narrowSymbol", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 })
  return {
    currency,
    locale: loc,
    dec: decimalSeparator(loc),
    full: (n) => full.format(Math.round(n)),
    compact: (n) => (Math.abs(n) >= 1_000_000 ? compact.format(n) : full.format(Math.round(n))),
    num: (n, digits = 1) => new Intl.NumberFormat(loc, { maximumFractionDigits: digits }).format(n),
  }
}

/**
 * Lee un número escrito con cualquier separador: "1.650.000", "1,650,000", "1 650 000" → 1650000;
 * "2,4" o "2.4" → 2.4; "1.650.000,50" o "1,650,000.50" → 1650000.5.
 * Un separador seguido de exactamente 3 dígitos se toma como separador de miles.
 */
export function parseAmount(t: string) {
  const s = String(t || "").replace(/[^\d.,]/g, "")
  if (!s) return 0
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","))
  const decimals = last > -1 ? s.length - last - 1 : 0
  if (last > -1 && decimals !== 3) return Number(s.slice(0, last).replace(/[.,]/g, "") + "." + s.slice(last + 1)) || 0
  return Number(s.replace(/[.,]/g, "")) || 0
}

/** Escribe un número en el formato del país, para mostrarlo dentro de un campo editable. */
export function formatInput(n: number, locale: string) {
  return n ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n) : ""
}

/** Reemplaza {m:123} por un monto y {d:1.5} por un número, con el formato del país. */
export function withMoney(text: string, fmt: Pick<Fmt, "full" | "num">) {
  return text
    .replace(/\{m:(-?[\d.]+)\}/g, (_, v) => fmt.full(Number(v)))
    .replace(/\{d:(-?[\d.]+)\}/g, (_, v) => fmt.num(Number(v), 2))
}
