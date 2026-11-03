"use client"

// "Mis movimientos": lo que la persona registró por WhatsApp, mes a mes.
// Lee los datos de Apps Script con el enlace personal (?t=…) que entrega el bot.
// Con ?ejemplo muestra un mes ficticio para conocer la página sin el bot.
import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowDownRight, ArrowUpRight, LayoutDashboard, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BentoCard, CountUp, LineChart, Tooltip, type TipApi } from "@/components/dashboard/charts"
import { CountryPicker } from "@/components/site/country-picker"
import { BOT_CATEGORIES, botCategory, cumulativeByDay, sampleMovements, summarizeMovements, type Movement } from "@/lib/bot-categories"
import { DEFAULT_EXPENSES, emptyData, type FinanceData } from "@/lib/finance"
import { countryById, moneyFormatter, type Fmt } from "@/lib/money"
import { FX_PER_USD } from "@/lib/sample"
import { store } from "@/lib/store"
import { useVisitorCountry } from "@/lib/use-country"
import { config } from "@/config"
import { cn } from "@/lib/utils"

type Payload = { usuario: { nombre: string; pais: string; moneda: string }; mes: string; meses: string[]; movimientos: Movement[] }
type State = { mode: "loading" } | { mode: "empty" } | { mode: "error"; message: string } | { mode: "ready"; demo: boolean; data: Payload }

const TOKEN_KEY = "pulso_bot_token_v1"
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
const saveToken = (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* sin almacenamiento */ } }

async function fetchMovements(token: string, mes?: string): Promise<Payload> {
  if (!config.botScriptUrl) throw new Error("El bot aún no está conectado a esta página.")
  const url = `${config.botScriptUrl}?action=movimientos&t=${encodeURIComponent(token)}${mes ? "&mes=" + mes : ""}`
  const j = await (await fetch(url)).json()
  if (!j.ok) throw new Error(j.error || "No pudimos leer tus movimientos.")
  return j as Payload
}

export function MovementsApp() {
  const [state, setState] = React.useState<State>({ mode: "loading" })
  const [token, setToken] = React.useState<string | null>(null)
  const visitor = useVisitorCountry()

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has("ejemplo")) { setState({ mode: "ready", demo: true, data: { usuario: { nombre: "", pais: "", moneda: "" }, mes: thisMonth(), meses: [thisMonth()], movimientos: [] } }); return }
    const t = params.get("t")
    if (t) { saveToken(t); window.history.replaceState(null, "", window.location.pathname) }
    const tok = t || readToken()
    if (!tok) { setState({ mode: "empty" }); return }
    setToken(tok)
    fetchMovements(tok).then((data) => setState({ mode: "ready", demo: false, data })).catch((e) => setState({ mode: "error", message: e.message }))
  }, [])

  const changeMonth = (mes: string) => {
    if (!token || state.mode !== "ready") return
    fetchMovements(token, mes).then((data) => setState({ mode: "ready", demo: false, data })).catch((e) => setState({ mode: "error", message: e.message }))
  }

  if (state.mode === "loading") return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Cargando tus movimientos…</div>
  if (state.mode === "empty" || state.mode === "error") {
    return (
      <Shell title="Mis movimientos" subtitle="Lo que registras por WhatsApp, organizado y graficado.">
        {state.mode === "error" && <p className="mb-4 rounded-2xl border border-rojo/30 bg-rojo/5 p-4 text-sm">{state.message}</p>}
        <HowTo />
        <div className="mt-4"><Button asChild variant="outline"><Link href="/movimientos?ejemplo">Ver un mes de ejemplo <ArrowRight /></Link></Button></div>
      </Shell>
    )
  }

  // Ejemplo: mismo mes ficticio en la moneda del visitante
  const demo = state.demo
  const currency = demo ? (FX_PER_USD[visitor.currency] ? visitor.currency : "USD") : state.data.usuario.moneda
  const locale = demo ? (FX_PER_USD[visitor.currency] ? visitor.locale : "es-US") : countryById(state.data.usuario.pais)?.locale
  const data: Payload = demo ? { ...state.data, usuario: { nombre: "", pais: visitor.id, moneda: currency }, movimientos: sampleMovements(state.data.mes, FX_PER_USD[currency] || 1) } : state.data
  return <MonthView key={currency + data.mes} data={data} fmt={moneyFormatter(currency, locale)} demo={demo} onMonth={changeMonth} />
}

function MonthView({ data, fmt, demo, onMonth }: { data: Payload; fmt: Fmt; demo: boolean; onMonth: (m: string) => void }) {
  const tip = React.useRef<TipApi | null>(null)
  const s = summarizeMovements(data.movimientos)
  const curve = cumulativeByDay(data.movimientos, data.mes)
  const today = thisMonth() === data.mes ? new Date().getDate() : curve.length
  const shown = demo ? curve : curve.slice(0, Math.max(1, today))
  const labels = shown.map((_, i) => `${i + 1} ${MONTHS[Number(data.mes.slice(5, 7)) - 1].slice(0, 3)}`)
  const cats = Object.entries(s.porCategoria).sort((a, b) => b[1] - a[1])
  const byDay = groupByDay(data.movimientos)

  return (
    <Shell
      title={data.usuario.nombre ? `Hola, ${data.usuario.nombre}` : "Mis movimientos"}
      subtitle={`Registrados por WhatsApp · ${monthName(data.mes)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {demo ? <CountryPicker /> : data.meses.length > 1 && (
            <select aria-label="Mes" value={data.mes} onChange={(e) => onMonth(e.target.value)} className="rounded-full border bg-card px-3 py-2 text-sm font-semibold">
              {data.meses.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          )}
          <ToBoard data={data} demo={demo} s={s} />
        </div>
      }
    >
      {demo && (
        <div className="mb-5 rounded-2xl border border-amarillo/40 bg-amarillo/10 px-4 py-3 text-sm">
          <b>Ejemplo ilustrativo con datos ficticios.</b> Así se ve tu mes cuando registras tus gastos e ingresos por WhatsApp.
        </div>
      )}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Ingresos" value={<CountUp value={s.ingresos} format={fmt.compact} />} note={`${data.movimientos.filter((m) => m.tipo === "ingreso").length} registros`} />
          <Kpi label="Gastos" value={<CountUp value={s.gastos} format={fmt.compact} />} note={`${data.movimientos.filter((m) => m.tipo === "gasto").length} registros`} />
          <Kpi label="Excedente" value={<CountUp value={s.excedente} format={fmt.compact} />} note="Ingresos menos gastos"
            icon={s.excedente >= 0 ? <ArrowUpRight className="size-5 text-verde" /> : <ArrowDownRight className="size-5 text-rojo" />} />
          <Kpi label="Tasa de ahorro" value={<CountUp value={s.tasaAhorro * 100} format={(n) => Math.round(n) + "%"} />} note="Referencia: 10% o más" />
        </div>

        <BentoCard className="col-span-12 lg:col-span-7">
          <h2 className="text-[17px] font-bold tracking-tight">Gasto acumulado del mes</h2>
          <p className="text-sm text-muted-foreground">Cómo crece tu gasto día a día.</p>
          <div className="mt-4">
            {s.gastos > 0 ? <LineChart tip={tip} labels={labels} format={fmt.compact} height={230} series={[{ name: "Gasto acumulado", values: shown, color: "var(--primary)" }]} />
              : <div className="grid h-48 place-items-center text-sm text-muted-foreground">Aún no hay gastos este mes</div>}
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-5">
          <h2 className="text-[17px] font-bold tracking-tight">Distribución de tus gastos</h2>
          <ul className="mt-4 grid gap-3">
            {cats.length ? cats.map(([id, v]) => {
              const c = botCategory(id)
              return (
                <li key={id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold"><i className="size-2.5 rounded-[3px]" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-num font-bold">{fmt.full(v)} <span className="text-xs font-semibold text-muted-foreground">{Math.round((v / s.gastos) * 100)}%</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(v / cats[0][1]) * 100}%`, background: c.color }} /></div>
                </li>
              )
            }) : <li className="text-sm text-muted-foreground">Sin gastos registrados.</li>}
          </ul>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-7">
          <h2 className="text-[17px] font-bold tracking-tight">Movimientos</h2>
          <div className="mt-3 grid gap-4">
            {byDay.length ? byDay.map(([day, list]) => (
              <div key={day}>
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{Number(day.slice(8, 10))} de {MONTHS[Number(day.slice(5, 7)) - 1]}</div>
                <ul className="divide-y rounded-2xl border">
                  {list.map((m) => {
                    const c = botCategory(m.categoria)
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                          <span className="min-w-0"><span className="block truncate font-semibold">{m.descripcion || c.name}</span><span className="block text-xs text-muted-foreground">{c.name}</span></span>
                        </span>
                        <span className={cn("shrink-0 font-num font-bold", m.tipo === "ingreso" && "text-verde")}>{m.tipo === "ingreso" ? "+" : "−"}{fmt.full(m.monto)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aún no hay movimientos este mes.</p>}
          </div>
        </BentoCard>

        <div className="col-span-12 lg:col-span-5"><HowTo /></div>
      </div>
      <Tooltip api={tip} />
    </Shell>
  )
}

function groupByDay(movs: Movement[]) {
  const map = new Map<string, Movement[]>()
  movs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((m) => map.set(m.fecha, [...(map.get(m.fecha) || []), m]))
  return [...map.entries()]
}

/** Pasa el mes al tablero completo: ingresos y gastos por categoría. Conserva ahorros y deudas ya escritos. */
function ToBoard({ data, demo, s }: { data: Payload; demo: boolean; s: ReturnType<typeof summarizeMovements> }) {
  if (demo) return null
  const go = () => {
    const c = countryById(data.usuario.pais)
    const prev = store.getData()
    const base: FinanceData = prev || emptyData(data.usuario.moneda, c?.locale, c?.id)
    const next: FinanceData = {
      ...base, currency: data.usuario.moneda, locale: c?.locale, country: c?.id,
      income: s.ingresos,
      expenses: DEFAULT_EXPENSES.map((e) => ({ ...e, amount: s.porCategoria[e.id] || 0, type: base.expenses.find((x) => x.id === e.id)?.type || e.type })),
    }
    store.setData(next)
    window.location.href = window.location.pathname.replace(/movimientos\/?$/, "tablero/")
  }
  return <Button size="sm" onClick={go} title="Usa los ingresos y gastos de este mes en tu tablero completo"><LayoutDashboard /> Llevar a mi tablero</Button>
}

function Kpi({ label, value, note, icon }: { label: string; value: React.ReactNode; note: string; icon?: React.ReactNode }) {
  return (
    <BentoCard className="p-5">
      <div className="text-[13px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-2.5 flex items-center gap-2 font-num text-3xl font-bold leading-none tracking-tight">{value}{icon}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </BentoCard>
  )
}

function HowTo() {
  const wa = config.botWhatsapp ? `https://wa.me/${config.botWhatsapp}?text=${encodeURIComponent("Hola")}` : ""
  return (
    <BentoCard className="h-full">
      <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><MessageCircle className="size-5 text-primary" />Registra por WhatsApp</h2>
      <p className="mt-1 text-sm text-muted-foreground">Escríbele al asistente como le escribirías a un amigo:</p>
      <ul className="mt-3 grid gap-2 text-sm">
        {["almuerzo 25 mil", "taxi 12.000 y café 6.000", "me pagaron la quincena 2,1 millones", "resumen", "cuánto llevo en restaurantes", "borrar"].map((t) => (
          <li key={t} className="w-fit rounded-2xl rounded-bl-sm bg-[#dcf8c6] px-3 py-1.5 text-[#0f1a17]">{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Categorías: {BOT_CATEGORIES.filter((c) => c.tipo === "gasto").map((c) => c.name).join(", ")}.</p>
      {wa ? <Button asChild className="mt-4"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Abrir WhatsApp</a></Button>
        : <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">El asistente está en beta cerrada. Inscríbete en la beta desde la página de inicio.</p>}
    </BentoCard>
  )
}

function Shell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
