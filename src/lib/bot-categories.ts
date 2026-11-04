// Categorías del bot de WhatsApp. Deben coincidir con CATEGORIES en apps-script-bot/Bot.gs (npm test lo verifica).
export type BotCategory = { id: string; tipo: "gasto" | "ingreso"; name: string; color: string }

export const BOT_CATEGORIES: BotCategory[] = [
  { id: "vivienda", tipo: "gasto", name: "Vivienda", color: "#1fb37a" },
  { id: "mercado", tipo: "gasto", name: "Mercado", color: "#14a37f" },
  { id: "servicios", tipo: "gasto", name: "Servicios básicos", color: "#46e8a8" },
  { id: "transporte", tipo: "gasto", name: "Transporte", color: "#5cf2b8" },
  { id: "salud", tipo: "gasto", name: "Salud y seguros", color: "#2f6fd6" },
  { id: "educacion", tipo: "gasto", name: "Educación", color: "#5b8def" },
  { id: "conectividad", tipo: "gasto", name: "Celular e internet", color: "#8fb2f5" },
  { id: "comida", tipo: "gasto", name: "Restaurantes y domicilios", color: "#f2c14e" },
  { id: "compras", tipo: "gasto", name: "Ropa y compras", color: "#e0742a" },
  { id: "ocio", tipo: "gasto", name: "Entretenimiento y suscripciones", color: "#f39a6b" },
  { id: "deudas", tipo: "gasto", name: "Pago de deudas", color: "#ff5d5d" },
  { id: "otros", tipo: "gasto", name: "Otros gastos", color: "#9aa5a1" },
  { id: "salario", tipo: "ingreso", name: "Salario", color: "#1fb37a" },
  { id: "independiente", tipo: "ingreso", name: "Honorarios y ventas", color: "#14a37f" },
  { id: "otros_ingresos", tipo: "ingreso", name: "Otros ingresos", color: "#5cf2b8" },
]

export const botCategory = (id: string) => BOT_CATEGORIES.find((c) => c.id === id) || BOT_CATEGORIES.find((c) => c.id === "otros")!

export type Movement = { id: string; fecha: string; tipo: "gasto" | "ingreso"; monto: number; categoria: string; descripcion: string }

/** Totales del mes. Misma lógica que summarize_ en Bot.gs; ambas se validan en Python. */
export function summarizeMovements(movs: Movement[]) {
  let ingresos = 0, gastos = 0
  const porCategoria: Record<string, number> = {}
  for (const m of movs) {
    if (m.tipo === "ingreso") ingresos += m.monto
    else { gastos += m.monto; porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.monto }
  }
  const r2 = (x: number) => Math.round(x * 100) / 100
  ingresos = r2(ingresos); gastos = r2(gastos)
  for (const k of Object.keys(porCategoria)) porCategoria[k] = r2(porCategoria[k])
  const excedente = r2(ingresos - gastos)
  return { ingresos, gastos, excedente, tasaAhorro: ingresos > 0 ? excedente / ingresos : 0, porCategoria, n: movs.length }
}

/** Gasto acumulado día a día del mes (para la curva). */
export function cumulativeByDay(movs: Movement[], month: string) {
  const [y, m] = month.split("-").map(Number)
  const days = new Date(y, m, 0).getDate()
  const daily = Array(days).fill(0)
  for (const x of movs) if (x.tipo === "gasto" && x.fecha.startsWith(month)) daily[Number(x.fecha.slice(8, 10)) - 1] += x.monto
  let acc = 0
  return daily.map((v) => (acc += v))
}

/** Ejemplo ficticio para ver la página sin bot: un mes de movimientos en dólares. */
export function sampleMovements(month: string, k = 1): Movement[] {
  const plan: [number, Movement["tipo"], string, number, string][] = [
    [1, "ingreso", "salario", 800, "Quincena"], [1, "gasto", "vivienda", 420, "Arriendo"], [2, "gasto", "mercado", 64, "Supermercado"],
    [3, "gasto", "comida", 9, "Almuerzo"], [4, "gasto", "transporte", 6, "Taxi"], [5, "gasto", "servicios", 38, "Luz y agua"],
    [6, "gasto", "ocio", 12, "Netflix y Spotify"], [7, "gasto", "comida", 23, "Pizza"], [8, "gasto", "mercado", 41, "Tienda"],
    [9, "gasto", "deudas", 72, "Cuota tarjeta"], [10, "gasto", "transporte", 25, "Gasolina"], [11, "gasto", "comida", 11, "Almuerzo"],
    [12, "gasto", "conectividad", 36, "Plan celular"], [13, "gasto", "compras", 48, "Tenis"], [14, "gasto", "salud", 18, "Farmacia"],
    [15, "ingreso", "salario", 800, "Quincena"], [15, "ingreso", "independiente", 150, "Diseño para cliente"], [16, "gasto", "mercado", 72, "Supermercado"],
    [17, "gasto", "comida", 15, "Domicilio"], [18, "gasto", "ocio", 30, "Cine y cena"], [19, "gasto", "transporte", 7, "Uber"],
  ]
  const nice = (x: number) => { const s = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / s) * s }
  return plan.map(([d, tipo, categoria, monto, descripcion], i) => ({
    id: "e" + i, fecha: `${month}-${String(d).padStart(2, "0")}`, tipo, categoria, monto: nice(monto * k), descripcion,
  }))
}
