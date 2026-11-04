// Motor del tablero Premium: presupuesto con cumplimiento, metas, pagos fijos y recomendaciones de ahorro.
// Las cuentas que deciden (presupuesto, metas, pagos fijos) se validan en Python: tests/validate_premium.py.
import { BOT_CATEGORIES, summarizeMovements, type Movement } from "@/lib/bot-categories"
import { DEFAULT_EXPENSES, type Debt, type FinanceData } from "@/lib/finance"
import { TASAS } from "@/data/tasas"

export type Meta = { id: string; nombre: string; monto: number; ahorrado: number; fecha: string } // fecha YYYY-MM o ""
export type PagoFijo = { id: string; nombre: string; monto: number; dia: number; categoria: string }
export type Perfil = {
  presupuestos: Record<string, number>
  metas: Meta[]
  deudas: Debt[]
  pagosFijos: PagoFijo[]
  ahorros: number
  mesesFondo: number
}

export const emptyPerfil = (): Perfil => ({ presupuestos: {}, metas: [], deudas: [], pagosFijos: [], ahorros: 0, mesesFondo: 3 })

const r2 = (x: number) => Math.round(x * 100) / 100

/** Umbrales de alerta del presupuesto (también en Bot.gs). */
export const BUDGET_WARN = 0.8

export type BudgetRow = { categoria: string; gastado: number; presupuesto: number; pct: number; restante: number; estado: "ok" | "alerta" | "excedido" }

/**
 * Presupuesto del mes: por categoría con presupuesto, cuánto se gastó, el % usado y el estado.
 * Cumplimiento = categorías dentro de su presupuesto / categorías presupuestadas.
 */
export function budgetStatus(movs: Movement[], presupuestos: Record<string, number>) {
  const s = summarizeMovements(movs)
  const rows: BudgetRow[] = Object.entries(presupuestos)
    .filter(([, v]) => v > 0)
    .map(([categoria, presupuesto]) => {
      const gastado = s.porCategoria[categoria] || 0
      const pct = gastado / presupuesto
      return { categoria, gastado, presupuesto, pct, restante: r2(presupuesto - gastado), estado: pct > 1 ? "excedido" : pct >= BUDGET_WARN ? "alerta" : "ok" } as BudgetRow
    })
    .sort((a, b) => b.pct - a.pct)
  const presupuestado = r2(rows.reduce((a, r) => a + r.presupuesto, 0))
  const gastadoEnPresupuesto = r2(rows.reduce((a, r) => a + r.gastado, 0))
  const dentro = rows.filter((r) => r.estado !== "excedido").length
  return { rows, presupuestado, gastadoEnPresupuesto, cumplimiento: rows.length ? dentro / rows.length : null, usoTotal: presupuestado > 0 ? gastadoEnPresupuesto / presupuestado : null }
}

/** Meses completos entre dos "YYYY-MM" (mínimo 1). */
export function monthsBetween(fromYm: string, toYm: string) {
  const [y1, m1] = fromYm.split("-").map(Number)
  const [y2, m2] = toYm.split("-").map(Number)
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1))
}

/** Avance de una meta y cuánto apartar al mes para llegar a tiempo. */
export function goalPlan(meta: Meta, currentYm: string) {
  const faltante = Math.max(0, r2(meta.monto - meta.ahorrado))
  const avance = meta.monto > 0 ? Math.min(1, meta.ahorrado / meta.monto) : 0
  const meses = /^\d{4}-\d{2}$/.test(meta.fecha) ? monthsBetween(currentYm, meta.fecha) : null
  return { faltante, avance, meses, aporteMensual: meses ? Math.ceil(faltante / meses) : null, vencida: meses !== null && meta.fecha < currentYm && faltante > 0 }
}

/** Pagos fijos: próxima fecha, días que faltan, si ya se registró este mes y costo anual. */
export function fixedPayments(pagos: PagoFijo[], movs: Movement[], today: string) {
  const [y, m, d] = today.split("-").map(Number)
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const month = today.slice(0, 7)
  const rows = pagos.map((p) => {
    const dia = Math.min(Math.max(1, Math.round(p.dia)), 28)
    const pagado = movs.some((x) => x.tipo === "gasto" && x.fecha.startsWith(month) && norm(x.descripcion).includes(norm(p.nombre).split(" ")[0]))
    const next = dia >= d ? new Date(Date.UTC(y, m - 1, dia)) : new Date(Date.UTC(y, m, dia))
    const dias = Math.round((next.getTime() - Date.UTC(y, m - 1, d)) / 864e5)
    return { ...p, dia, pagado, diasParaCobro: pagado ? null : dias, proximo: next.toISOString().slice(0, 10) }
  }).sort((a, b) => (a.diasParaCobro ?? 99) - (b.diasParaCobro ?? 99))
  return { rows, mensual: r2(pagos.reduce((a, p) => a + p.monto, 0)), anual: r2(pagos.reduce((a, p) => a + p.monto, 0) * 12) }
}

/** Convierte el mes registrado + el perfil en los datos del motor del tablero (plan del excedente, deudas…). */
export function toFinanceData(movs: Movement[], perfil: Perfil, currency: string, locale?: string, country?: string): FinanceData {
  const s = summarizeMovements(movs)
  return {
    currency, locale, country,
    income: s.ingresos,
    savings: perfil.ahorros,
    emergencyTargetMonths: perfil.mesesFondo || 3,
    extraDebtPayment: 0,
    // "deudas" no es un gasto del tablero: son las cuotas, que el motor toma de la lista de deudas
    expenses: DEFAULT_EXPENSES.map((e) => ({ ...e, amount: s.porCategoria[e.id] || 0 })),
    debts: perfil.deudas,
  }
}

export type Tip = { id: string; title: string; detail: string; source?: { nombre: string; url: string } }

/** Recomendaciones de ahorro con las cifras del mes; enlazan la guía oficial del país cuando la hay. */
export function savingsTips(movs: Movement[], perfil: Perfil, pais: string, fmt: (n: number) => string): Tip[] {
  const s = summarizeMovements(movs)
  const guia = TASAS[pais]?.guia
  const out: Tip[] = []
  const b = budgetStatus(movs, perfil.presupuestos)
  for (const r of b.rows.filter((x) => x.estado === "excedido").slice(0, 2)) {
    out.push({ id: "excedido_" + r.categoria, title: `Te pasaste en ${catName(r.categoria)}`, detail: `Llevas ${fmt(r.gastado)} de ${fmt(r.presupuesto)}. Para el resto del mes, pausa los gastos de esta categoría o mueve presupuesto desde otra.` })
  }
  const discretionary = ["comida", "compras", "ocio"].reduce((a, k) => a + (s.porCategoria[k] || 0), 0)
  if (s.ingresos > 0 && discretionary / s.ingresos > 0.3) {
    out.push({ id: "discrecional", title: "Tus gastos discrecionales superan el 30 % del ingreso", detail: `Restaurantes, compras y entretenimiento suman ${fmt(discretionary)}. Bajarlos un 20 % libera ${fmt(discretionary * 0.2)} al mes.`, source: guia })
  }
  if (s.ingresos > 0 && s.tasaAhorro < 0.1) {
    out.push({ id: "tasa_ahorro", title: "Págate primero", detail: `Tu tasa de ahorro va en ${Math.round(s.tasaAhorro * 100)} %. Programa una transferencia automática del 10 % (${fmt(s.ingresos * 0.1)}) el día que recibes tu ingreso.`, source: guia })
  }
  const subs = perfil.pagosFijos.filter((p) => p.categoria === "ocio" || p.categoria === "conectividad")
  if (subs.length >= 2) {
    const anual = subs.reduce((a, p) => a + p.monto, 0) * 12
    out.push({ id: "suscripciones", title: "Revisa tus suscripciones", detail: `Tus suscripciones y planes suman ${fmt(anual)} al año. Cancela las que no usaste el último mes.` })
  }
  const essentials = ["vivienda", "mercado", "servicios", "transporte", "salud"].reduce((a, k) => a + (s.porCategoria[k] || 0), 0) + perfil.deudas.reduce((a, d) => a + d.min, 0)
  if (essentials > 0 && perfil.ahorros < essentials * (perfil.mesesFondo || 3)) {
    out.push({ id: "fondo", title: "Completa tu fondo de emergencia", detail: `Tu meta es ${fmt(essentials * (perfil.mesesFondo || 3))} (${perfil.mesesFondo || 3} meses de gastos esenciales). Guárdalo en una cuenta separada y de retiro inmediato.`, source: guia })
  }
  if (!out.length && s.excedente > 0) out.push({ id: "bien", title: "Vas bien este mes", detail: `Tienes ${fmt(s.excedente)} de excedente. Asígnalo a una meta antes de que se diluya en gasto.`, source: guia })
  return out
}

export const catName = (id: string) => BOT_CATEGORIES.find((c) => c.id === id)?.name || id

/** Limpia un perfil recibido (del servidor o del formulario). */
export function cleanPerfil(p: Partial<Perfil> | null | undefined): Perfil {
  const n = (x: unknown) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0)
  const txt = (x: unknown, max = 40) => String(x ?? "").replace(/[<>]/g, "").trim().slice(0, max)
  const base = emptyPerfil()
  if (!p) return base
  const presupuestos: Record<string, number> = {}
  for (const c of BOT_CATEGORIES) if (c.tipo === "gasto" && n(p.presupuestos?.[c.id]) > 0) presupuestos[c.id] = n(p.presupuestos?.[c.id])
  return {
    presupuestos,
    metas: (p.metas || []).slice(0, 12).map((m, i) => ({ id: txt(m.id, 20) || "g" + i, nombre: txt(m.nombre) || "Meta", monto: n(m.monto), ahorrado: n(m.ahorrado), fecha: /^\d{4}-\d{2}$/.test(String(m.fecha)) ? String(m.fecha) : "" })),
    deudas: (p.deudas || []).slice(0, 12).map((d, i) => ({ id: txt(d.id, 20) || "d" + i, name: txt(d.name) || "Deuda", balance: n(d.balance), rate: Math.min(20, n(d.rate)), min: n(d.min) })),
    pagosFijos: (p.pagosFijos || []).slice(0, 30).map((x, i) => ({ id: txt(x.id, 20) || "f" + i, nombre: txt(x.nombre) || "Pago", monto: n(x.monto), dia: Math.min(28, Math.max(1, Math.round(n(x.dia)) || 1)), categoria: BOT_CATEGORIES.some((c) => c.id === x.categoria) ? String(x.categoria) : "otros" })),
    ahorros: n(p.ahorros),
    mesesFondo: [3, 4, 5, 6].includes(Number(p.mesesFondo)) ? Number(p.mesesFondo) : 3,
  }
}

/* ---------------- Gráfica del resumen: periodos, variables y participación por categoría ---------------- */

/** Un mes del histórico: ingresos y gasto por categoría (lo arma Bot.gs con monthlyHistory_). */
export type MesHist = { mes: string; ingresos: number; porCategoria: Record<string, number> }
export type Vista = "diario" | "mensual" | "anual"

/** Agrupa movimientos por mes. Misma lógica que monthlyHistory_ en Bot.gs (npm test compara ambas). */
export function monthlyHistory(movs: Movement[]): MesHist[] {
  const by: Record<string, Movement[]> = {}
  for (const m of movs) (by[m.fecha.slice(0, 7)] ||= []).push(m)
  return Object.keys(by).sort().map((mes) => { const s = summarizeMovements(by[mes]); return { mes, ingresos: s.ingresos, porCategoria: s.porCategoria } })
}

/** Diferencia exacta en meses entre dos "YYYY-MM" (puede ser 0 o negativa). */
const monthDiff = (a: string, b: string) => { const [y1, m1] = a.split("-").map(Number); const [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1) }

/** Suma k meses a un "YYYY-MM". */
export function addMonths(ym: string, k: number) {
  const [y, m] = ym.split("-").map(Number)
  const t = y * 12 + (m - 1) + k
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`
}

/** Gasto por categoría de cada mes; el mes cargado manda sobre el histórico (es la versión más fresca). */
function mergedHistory(movs: Movement[], mes: string, hist: MesHist[]) {
  const map: Record<string, Record<string, number>> = {}
  for (const h of hist) map[h.mes] = h.porCategoria
  if (movs.length || !map[mes]) map[mes] = summarizeMovements(movs).porCategoria
  return map
}

/** Gasto por categoría del periodo que muestra la gráfica: el mes, los últimos 12 meses o el año del mes elegido. */
export function periodCategories(vista: Vista, movs: Movement[], mes: string, hist: MesHist[]) {
  if (vista === "diario") return summarizeMovements(movs).porCategoria
  const map = mergedHistory(movs, mes, hist)
  const keys = Object.keys(map).filter((k) => (vista === "anual" ? k.startsWith(mes.slice(0, 4)) : k > addMonths(mes, -12) && k <= mes))
  const out: Record<string, number> = {}
  for (const k of keys) for (const [c, v] of Object.entries(map[k])) out[c] = r2((out[c] || 0) + v)
  return out
}

/**
 * Serie de gasto para la gráfica del resumen.
 * - diario: gasto acumulado día a día del mes (hasta hoy); el presupuesto es el ritmo lineal del mes.
 * - mensual: gasto de cada mes, últimos 12 meses hasta el mes elegido; presupuesto mensual fijo.
 * - anual: gasto de cada año; presupuesto = presupuesto mensual × meses registrados de ese año.
 * cat = "todo" o el id de una categoría. Con presupuesto y "todo", solo cuentan las categorías presupuestadas
 * (comparar todo el gasto contra un presupuesto parcial sería engañoso).
 */
export function spendSeries(o: { vista: Vista; cat: string; conPresupuesto: boolean; movs: Movement[]; mes: string; today: string; hist: MesHist[]; presupuestos: Record<string, number> }) {
  const budgeted = Object.keys(o.presupuestos).filter((k) => o.presupuestos[k] > 0)
  const B = r2(o.cat === "todo" ? budgeted.reduce((a, k) => a + o.presupuestos[k], 0) : o.presupuestos[o.cat] || 0)
  const compare = o.conPresupuesto && B > 0
  const inc = (c: string) => (o.cat === "todo" ? !compare || budgeted.includes(c) : c === o.cat)
  const pick = (pc: Record<string, number>) => r2(Object.entries(pc).filter(([c]) => inc(c)).reduce((a, [, v]) => a + v, 0))

  if (o.vista === "diario") {
    const [y, m] = o.mes.split("-").map(Number)
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const shown = o.today.startsWith(o.mes) ? Number(o.today.slice(8, 10)) : days
    const daily: number[] = Array(days).fill(0)
    for (const x of o.movs) if (x.tipo === "gasto" && x.fecha.startsWith(o.mes) && inc(x.categoria)) daily[Number(x.fecha.slice(8, 10)) - 1] += x.monto
    let acc = 0
    const gasto = daily.map((v) => r2((acc += v))).slice(0, shown)
    return { keys: gasto.map((_, i) => `${o.mes}-${String(i + 1).padStart(2, "0")}`), gasto, presupuesto: compare ? gasto.map((_, i) => r2((B * (i + 1)) / days)) : null, B, compare }
  }

  const map = mergedHistory(o.movs, o.mes, o.hist)
  const months = Object.keys(map).sort()
  const first = months[0], last = months[months.length - 1]

  if (o.vista === "mensual") {
    const n = Math.max(1, Math.min(12, monthDiff(first, o.mes) + 1))
    const keys = Array.from({ length: n }, (_, i) => addMonths(o.mes, i - n + 1))
    const gasto = keys.map((k) => pick(map[k] || {}))
    return { keys, gasto, presupuesto: compare ? keys.map(() => B) : null, B, compare }
  }

  const years: string[] = []
  for (let yy = Number(first.slice(0, 4)); yy <= Number(last.slice(0, 4)); yy++) years.push(String(yy))
  const gasto = years.map((yy) => r2(months.filter((k) => k.startsWith(yy)).reduce((a, k) => a + pick(map[k]), 0)))
  const presupuesto = compare ? years.map((yy) => {
    const from = first > `${yy}-01` ? first : `${yy}-01`, to = last < `${yy}-12` ? last : `${yy}-12`
    return r2(B * (monthDiff(from, to) + 1))
  }) : null
  return { keys: years, gasto, presupuesto, B, compare }
}

/** Participación de cada categoría en el gasto (para la torta). Los % suman 1. */
export function categoryShares(porCategoria: Record<string, number>) {
  const items = Object.entries(porCategoria).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const total = r2(items.reduce((a, [, v]) => a + v, 0))
  return { total, items: items.map(([id, monto]) => ({ id, monto, pct: total > 0 ? monto / total : 0 })) }
}

/** Histórico ficticio del ejemplo: 17 meses anteriores con variaciones por categoría. */
export function sampleHistory(mes: string, movs: Movement[]): MesHist[] {
  const base = summarizeMovements(movs)
  return Array.from({ length: 17 }, (_, i) => {
    const m = addMonths(mes, i - 17)
    const porCategoria: Record<string, number> = {}
    Object.entries(base.porCategoria).forEach(([c, v], j) => { porCategoria[c] = Math.round(v * (0.8 + ((i * 7 + j * 5) % 9) * 0.06)) })
    if (Number(m.slice(5, 7)) === 12) porCategoria.compras = Math.round((porCategoria.compras || 0) * 2.4)
    return { mes: m, ingresos: base.ingresos, porCategoria }
  })
}
