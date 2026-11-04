"use client"

// Tablero Premium: lo que la persona registra por WhatsApp + su perfil (presupuestos, metas, deudas,
// pagos fijos y ahorros), con recomendaciones y el comparador de tasas de su país.
// Se abre con el enlace personal del asistente (?t=…). Con ?ejemplo muestra datos ficticios.
import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, CalendarCheck, Check, ExternalLink, Info, Landmark, LayoutDashboard, Lightbulb, ListChecks, Plus, Save, Target, Trash2, UserRound, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarChart, BentoCard, CountUp, Donut, LineChart, Segmented, Tooltip, type TipApi } from "@/components/dashboard/charts"
import { DebtPlanCard } from "@/components/dashboard/dashboard-view"
import { SurplusCard } from "@/components/dashboard/surplus-card"
import { CountryPicker } from "@/components/site/country-picker"
import { BOT_CATEGORIES, botCategory, sampleMovements, summarizeMovements, type Movement } from "@/lib/bot-categories"
import * as F from "@/lib/finance"
import { countryById, formatInput, moneyFormatter, parseAmount, withMoney, type Fmt } from "@/lib/money"
import { budgetStatus, catName, categoryShares, cleanPerfil, emptyPerfil, fixedPayments, goalPlan, periodCategories, sampleHistory, savingsTips, spendSeries, toFinanceData, type MesHist, type Perfil, type Vista } from "@/lib/premium"
import { FX_PER_USD } from "@/lib/sample"
import { realRate, TASAS, TASAS_REVISADAS } from "@/data/tasas"
import { useVisitorCountry } from "@/lib/use-country"
import { config } from "@/config"
import { cn } from "@/lib/utils"

type Payload = { usuario: { nombre: string; pais: string; moneda: string }; mes: string; meses: string[]; hoy?: string; movimientos: Movement[]; historico?: MesHist[]; perfil?: Perfil; acceso?: Acceso }
const TOKEN_KEY = "pulso_bot_token_v1"
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const GASTO_CATS = BOT_CATEGORIES.filter((c) => c.tipo === "gasto" && c.id !== "deudas")
const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "metas", label: "Metas", icon: Target },
  { id: "plan", label: "Plan", icon: CalendarCheck },
  { id: "recomendaciones", label: "Recomendaciones", icon: Lightbulb },
  { id: "tasas", label: "Tasas", icon: Landmark },
  { id: "movimientos", label: "Movimientos", icon: ListChecks },
  { id: "datos", label: "Mis datos", icon: UserRound },
] as const
type TabId = (typeof TABS)[number]["id"]

export function readBotToken() { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
function saveBotToken(t: string) { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* sin almacenamiento */ } }

async function fetchBoard(token: string, mes?: string): Promise<Payload> {
  if (!config.botScriptUrl) throw new Error("El asistente aún no está conectado a esta página.")
  const j = await (await fetch(`${config.botScriptUrl}?action=tablero&t=${encodeURIComponent(token)}${mes ? "&mes=" + mes : ""}`)).json()
  if (!j.ok) throw new Error(j.error || "No pudimos leer tu tablero.")
  return j as Payload
}
async function postPerfil(token: string, perfil: Perfil) {
  const body = JSON.stringify({ action: "perfil", t: token, perfil })
  try {
    const j = await (await fetch(config.botScriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body })).json()
    if (!j.ok) throw new Error(j.error || "No pudimos guardar.")
  } catch (e) {
    if (e instanceof TypeError) { await fetch(config.botScriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body }); return }
    throw e
  }
}

function demoPerfil(k: number): Perfil {
  const m = (usd: number) => { const x = usd * k; const s = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / s) * s }
  const y = new Date().getFullYear()
  return {
    presupuestos: { mercado: m(200), comida: m(60), transporte: m(80), ocio: m(40), compras: m(60), servicios: m(60) },
    metas: [
      { id: "g1", nombre: "Fondo de emergencia", monto: m(3600), ahorrado: m(1180), fecha: "" },
      { id: "g2", nombre: "Viaje de fin de año", monto: m(900), ahorrado: m(620), fecha: `${y}-12` },
      { id: "g3", nombre: "Computador nuevo", monto: m(700), ahorrado: m(240), fecha: `${y + 1}-04` },
    ],
    deudas: [
      { id: "tc", name: "Tarjeta de crédito", balance: m(1100), rate: 2.4, min: m(72) },
      { id: "libre", name: "Crédito de consumo", balance: m(2500), rate: 1.6, min: m(108) },
    ],
    pagosFijos: [
      { id: "f1", nombre: "Arriendo", monto: m(420), dia: 1, categoria: "vivienda" },
      { id: "f2", nombre: "Netflix", monto: m(12), dia: 6, categoria: "ocio" },
      { id: "f3", nombre: "Plan celular", monto: m(36), dia: 12, categoria: "conectividad" },
      { id: "f4", nombre: "Gimnasio", monto: m(28), dia: 20, categoria: "ocio" },
    ],
    ahorros: m(1180), mesesFondo: 4,
  }
}

/** Estado de la suscripción que envía el bot: activa/libre, o consulta (vencida/ninguna) con sus fechas. */
type Acceso = { estado: "activa" | "libre" | "vencida" | "ninguna"; vence: string; hasta: string; renovar: string }
const longDate = (iso: string) => (iso ? `${Number(iso.slice(8, 10))} de ${MONTHS[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}` : "")

type Loaded = { mode: "loading" } | { mode: "error"; message: string } | { mode: "ready"; demo: boolean; data: Payload; token: string | null }

export function PremiumApp() {
  const [state, setState] = React.useState<Loaded>({ mode: "loading" })
  const visitor = useVisitorCountry()

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has("ejemplo")) {
      const ym = todayIso().slice(0, 7)
      // En el ejemplo, "hoy" es el día 20 del mes para que el mes ficticio se vea completo
      setState({ mode: "ready", demo: true, token: null, data: { usuario: { nombre: "", pais: "", moneda: "" }, mes: ym, meses: [ym], hoy: `${ym}-20`, movimientos: [] } })
      return
    }
    const t = params.get("t")
    if (t) { saveBotToken(t); window.history.replaceState(null, "", window.location.pathname) }
    const tok = t || readBotToken()
    if (!tok) { setState({ mode: "error", message: "Abre tu tablero con el enlace que te da el asistente (escríbele “tablero”)." }); return }
    fetchBoard(tok).then((data) => setState({ mode: "ready", demo: false, data, token: tok })).catch((e) => setState({ mode: "error", message: e.message }))
  }, [])

  if (state.mode === "loading") return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Cargando tu tablero…</div>
  if (state.mode === "error") {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Tu tablero Premium</h1>
        <p className="mt-3 text-ink-2">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/#precios">Ver planes</Link></Button>
          <Button asChild variant="outline"><Link href="/prueba-personal">Hacer mi diagnóstico gratis</Link></Button>
        </div>
      </div>
    )
  }

  const demo = state.demo
  const cur = demo ? (FX_PER_USD[visitor.currency] ? visitor.currency : "USD") : state.data.usuario.moneda
  const k = FX_PER_USD[cur] || 1
  const pais = demo ? visitor.id : state.data.usuario.pais
  const locale = demo ? (FX_PER_USD[visitor.currency] ? visitor.locale : "es-US") : countryById(pais)?.locale
  const data: Payload = demo
    ? { ...state.data, usuario: { nombre: "", pais, moneda: cur }, movimientos: sampleMovements(state.data.mes, k), historico: sampleHistory(state.data.mes, sampleMovements(state.data.mes, k)), perfil: demoPerfil(k) }
    : state.data
  const reload = (mes: string) => { if (state.token) fetchBoard(state.token, mes).then((d) => setState({ ...state, data: d })).catch((e) => setState({ mode: "error", message: e.message })) }
  return <Board key={cur + data.mes} data={data} pais={pais} fmt={moneyFormatter(cur, locale)} demo={demo} token={state.token} onMonth={reload} />
}

function Board({ data, pais, fmt, demo, token, onMonth }: { data: Payload; pais: string; fmt: Fmt; demo: boolean; token: string | null; onMonth: (m: string) => void }) {
  const tip = React.useRef<TipApi | null>(null)
  const [tab, setTab] = React.useState<TabId>("resumen")
  const [perfil, setPerfil] = React.useState<Perfil>(cleanPerfil(data.perfil || emptyPerfil()))
  const [dirty, setDirty] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null)
  const update = (p: Perfil) => { setPerfil(p); setDirty(true); setSaveMsg(null) }
  const consulta = !demo && (data.acceso?.estado === "vencida" || data.acceso?.estado === "ninguna")
  const save = async () => {
    if (consulta) { setSaveMsg("Tu tablero está en modo consulta: renueva tu suscripción para guardar cambios."); return }
    if (demo || !token) { setDirty(false); setSaveMsg("En el ejemplo los cambios no se guardan."); return }
    setSaveMsg("Guardando…")
    try { await postPerfil(token, cleanPerfil(perfil)); setDirty(false); setSaveMsg("Guardado ✓") } catch (e) { setSaveMsg((e as Error).message) }
  }

  const today = data.hoy || todayIso()
  const movs = data.movimientos
  const s = summarizeMovements(movs)
  const budget = budgetStatus(movs, perfil.presupuestos)
  const fixed = fixedPayments(perfil.pagosFijos, movs, today)
  const fd = toFinanceData(movs, perfil, fmt.currency, fmt.locale, pais)
  const fs = F.summarize(fd)
  const tips = savingsTips(movs, perfil, pais, fmt.full)
  const recs = F.recommendations(fd, fs)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{config.premiumName}</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{data.usuario.nombre ? `Hola, ${data.usuario.nombre}` : "Tu tablero"}</h1>
          <p className="mt-1 text-muted-foreground">Registrado por WhatsApp · {monthName(data.mes)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {demo ? <CountryPicker /> : data.meses.length > 1 && (
            <select aria-label="Mes" value={data.mes} onChange={(e) => onMonth(e.target.value)} className="rounded-full border bg-card px-3 py-2 text-sm font-semibold">
              {data.meses.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          )}
        </div>
      </div>
      {consulta && data.acceso && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rojo/30 bg-rojo/[0.06] px-4 py-3 text-sm">
          <p className="min-w-0 flex-1">
            <b>Tu tablero está en modo consulta.</b>{" "}
            {data.acceso.estado === "vencida" && data.acceso.vence
              ? <>Tu suscripción terminó el {longDate(data.acceso.vence)}. Puedes ver tus datos hasta el {longDate(data.acceso.hasta)}; después los borraremos. Para seguir registrando, renueva y escríbele al asistente <b>activar</b> con tu nuevo código.</>
              : <>Para registrar movimientos y guardar cambios necesitas una suscripción activa.</>}
          </p>
          <Button asChild size="sm"><a href={data.acceso.renovar || "/#precios"}>Renovar</a></Button>
        </div>
      )}
      {demo && <div className="mb-5 rounded-2xl border border-amarillo/40 bg-amarillo/10 px-4 py-3 text-sm"><b>Ejemplo ilustrativo con datos ficticios.</b> Puedes tocar todo; los cambios no se guardan.</div>}

      <nav className="sticky top-16 z-20 -mx-4 mb-6 overflow-x-auto border-b bg-background/90 px-4 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:rounded-2xl sm:border sm:px-1.5 [&::-webkit-scrollbar]:hidden" aria-label="Secciones del tablero">
        <div className="flex gap-1 py-1.5">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors", tab === t.id ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_var(--glow)]" : "text-ink-2 hover:bg-muted")}>
              <t.icon className="size-4" />{t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "resumen" && <Resumen s={s} movs={movs} mes={data.mes} today={today} hist={data.historico || []} presupuestos={perfil.presupuestos} budget={budget} fixed={fixed} tips={tips} fmt={fmt} tip={tip} go={setTab} />}
      {tab === "presupuesto" && <Presupuesto perfil={perfil} update={update} budget={budget} s={s} fmt={fmt} />}
      {tab === "metas" && <Metas perfil={perfil} update={update} mes={today.slice(0, 7)} fmt={fmt} excedente={s.excedente} />}
      {tab === "plan" && (
        <div className="grid grid-cols-12 gap-4">
          <SurplusCard key={fmt.currency} data={fd} s={fs} fmt={fmt} tip={tip} />
          <DebtPlanCard data={fd} s={fs} fmt={fmt} tip={tip} className="col-span-12" />
          <p className="col-span-12 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />El plan usa tus ingresos y gastos registrados este mes; para las deudas toma los pagos mínimos de Mis datos, por eso el excedente puede diferir un poco del Resumen.</p>
          {!perfil.deudas.length && <p className="col-span-12 text-sm text-muted-foreground">Agrega tus deudas en <button className="font-semibold text-primary underline" onClick={() => setTab("datos")}>Mis datos</button> para ver tu plan de desendeudamiento.</p>}
        </div>
      )}
      {tab === "recomendaciones" && <Recomendaciones tips={tips} recs={recs} fmt={fmt} pais={pais} />}
      {tab === "tasas" && <Tasas pais={pais} fmt={fmt} />}
      {tab === "movimientos" && <Movimientos movs={movs} fmt={fmt} />}
      {tab === "datos" && <Datos perfil={perfil} update={update} fmt={fmt} />}

      {(dirty || saveMsg) && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[min(560px,calc(100%-2rem))] items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-popover px-4 py-3 text-sm text-foreground shadow-[0_20px_60px_-20px_var(--glow)]">
          <span>{saveMsg || "Tienes cambios sin guardar."}</span>
          {dirty && <Button size="sm" variant="white" className="rounded-lg" onClick={save}><Save /> Guardar</Button>}
        </div>
      )}
      <Tooltip api={tip} />
    </div>
  )
}

/* ---------------- Resumen ---------------- */

function Kpi({ label, value, note, icon, tone }: { label: string; value: React.ReactNode; note: string; icon?: React.ReactNode; tone?: "verde" | "amarillo" | "rojo" }) {
  return (
    <BentoCard className="p-5">
      <div className="flex items-center justify-between text-[13px] font-semibold text-muted-foreground">{label}{tone && <span className={cn("size-2.5 rounded-full", tone === "verde" ? "bg-verde" : tone === "amarillo" ? "bg-amarillo" : "bg-rojo")} />}</div>
      <div className="mt-2.5 flex items-center gap-2 font-num text-3xl font-bold leading-none tracking-tight">{value}{icon}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </BentoCard>
  )
}

function Resumen({ s, movs, mes, today, hist, presupuestos, budget, fixed, tips, fmt, tip, go }: {
  s: ReturnType<typeof summarizeMovements>; movs: Movement[]; mes: string; today: string; hist: MesHist[]; presupuestos: Record<string, number>
  budget: ReturnType<typeof budgetStatus>; fixed: ReturnType<typeof fixedPayments>
  tips: ReturnType<typeof savingsTips>; fmt: Fmt; tip: React.MutableRefObject<TipApi | null>; go: (t: TabId) => void
}) {
  const cum = budget.cumplimiento
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ingresos" value={<CountUp value={s.ingresos} format={fmt.compact} />} note="Registrados este mes" />
        <Kpi label="Gastos" value={<CountUp value={s.gastos} format={fmt.compact} />} note={`${movs.filter((m) => m.tipo === "gasto").length} registros`} />
        <Kpi label="Te queda" value={<CountUp value={s.excedente} format={fmt.compact} />} note={s.ingresos > 0 ? `Tasa de ahorro ${Math.round(s.tasaAhorro * 100)}%` : "Registra tus ingresos"} tone={s.excedente < 0 ? "rojo" : s.tasaAhorro < 0.1 ? "amarillo" : "verde"}
          icon={s.excedente >= 0 ? <ArrowUpRight className="size-5 text-verde" /> : <ArrowDownRight className="size-5 text-rojo" />} />
        <Kpi label="Cumplimiento del presupuesto" value={cum === null ? "—" : <CountUp value={cum * 100} format={(n) => Math.round(n) + "%"} />}
          note={cum === null ? "Define tu presupuesto" : `${budget.rows.filter((r) => r.estado !== "excedido").length} de ${budget.rows.length} categorías dentro`} tone={cum === null ? undefined : cum === 1 ? "verde" : cum >= 0.7 ? "amarillo" : "rojo"} />
      </div>

      <SpendChart movs={movs} mes={mes} today={today} hist={hist} presupuestos={presupuestos} fmt={fmt} tip={tip} go={go} />

      <BentoCard className="col-span-12 lg:col-span-5">
        <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold tracking-tight">Presupuesto</h2><button onClick={() => go("presupuesto")} className="text-sm font-semibold text-primary hover:underline">Editar</button></div>
        {budget.rows.length ? (
          <ul className="mt-4 grid gap-3">
            {budget.rows.slice(0, 5).map((r) => <BudgetBar key={r.categoria} r={r} fmt={fmt} />)}
          </ul>
        ) : <EmptyHint text="Define cuánto quieres gastar por categoría y te avisamos por WhatsApp al llegar al 80 %." action="Crear presupuesto" onClick={() => go("presupuesto")} />}
      </BentoCard>

      <BentoCard className="col-span-12 lg:col-span-7">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><Bell className="size-5 text-primary" />Pagos fijos</h2><span className="text-xs text-muted-foreground">{fmt.full(fixed.anual)} al año</span></div>
        {fixed.rows.length ? (
          <ul className="mt-3 grid gap-2">
            {fixed.rows.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm">
                <span><b className="block">{p.nombre}</b><span className="text-xs text-muted-foreground">{catName(p.categoria)} · día {p.dia}</span></span>
                <span className="flex items-center gap-3">
                  {p.pagado ? <span className="rounded-full bg-verde/15 px-2 py-0.5 text-xs font-semibold text-verde">Registrado</span>
                    : <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", (p.diasParaCobro ?? 9) <= 3 ? "bg-amarillo/15 text-amarillo" : "bg-muted text-muted-foreground")}>{p.diasParaCobro === 0 ? "hoy" : `en ${p.diasParaCobro} días`}</span>}
                  <b className="font-num">{fmt.full(p.monto)}</b>
                </span>
              </li>
            ))}
          </ul>
        ) : <EmptyHint text="Agrega tu arriendo, suscripciones y cuotas para ver cuándo se cobran y cuánto suman al año." action="Agregar pagos fijos" onClick={() => go("datos")} />}
      </BentoCard>

      {tips[0] && (
        <BentoCard className="col-span-12 border-primary/30 bg-accent/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Lightbulb className="size-4" />Recomendación del mes</div>
              <p className="mt-1 text-lg font-bold">{tips[0].title}</p><p className="text-sm text-ink-2">{tips[0].detail}</p></div>
            <Button variant="outline" size="sm" onClick={() => go("recomendaciones")}>Ver todas</Button>
          </div>
        </BentoCard>
      )}
    </div>
  )
}

const VISTAS: { id: Vista; label: string }[] = [{ id: "diario", label: "Diario" }, { id: "mensual", label: "Mensual" }, { id: "anual", label: "Anual" }]
const mon3 = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1].slice(0, 3)

/** Gráfica del resumen (diario / mensual / anual, todo o una categoría, frente a presupuesto) y torta por categoría. */
function SpendChart({ movs, mes, today, hist, presupuestos, fmt, tip, go }: {
  movs: Movement[]; mes: string; today: string; hist: MesHist[]; presupuestos: Record<string, number>; fmt: Fmt; tip: React.MutableRefObject<TipApi | null>; go: (t: TabId) => void
}) {
  const [vi, setVi] = React.useState(0)
  const [cat, setCat] = React.useState("todo")
  const [conPres, setConPres] = React.useState(false)
  const vista = VISTAS[vi].id
  const r = spendSeries({ vista, cat, conPresupuesto: conPres, movs, mes, today, hist, presupuestos })
  const hasBudget = r.B > 0
  const curYm = today.slice(0, 7)

  // Categorías que aparecen en el selector: las que tienen gasto en el histórico o presupuesto
  const used = new Set<string>([...Object.keys(presupuestos), ...hist.flatMap((h) => Object.keys(h.porCategoria)), ...movs.filter((m) => m.tipo === "gasto").map((m) => m.categoria)])
  const opciones = BOT_CATEGORIES.filter((c) => c.tipo === "gasto" && used.has(c.id))
  const color = cat === "todo" ? "var(--primary)" : botCategory(cat).color
  const nombre = cat === "todo" ? (r.compare ? "Gasto en categorías con presupuesto" : "Todos los gastos") : catName(cat)

  const labels = r.keys.map((k) => vista === "diario" ? `${Number(k.slice(8, 10))} ${mon3(k)}` : vista === "mensual" ? `${mon3(k)} ${k.slice(2, 4)}` : k)
  const titles = r.keys.map((k) => vista === "diario" ? `${Number(k.slice(8, 10))} de ${MONTHS[Number(k.slice(5, 7)) - 1]}` : vista === "mensual" ? `${monthName(k)}${k === curYm ? " (en curso)" : ""}` : `${k}${k === curYm.slice(0, 4) ? " (en curso)" : ""}`)
  const titulo = vista === "diario" ? `Gasto acumulado de ${MONTHS[Number(mes.slice(5, 7)) - 1]}` : vista === "mensual" ? "Gasto mes a mes" : "Gasto por año"

  const last = r.gasto[r.gasto.length - 1] || 0
  let resumen: string
  if (r.compare && r.presupuesto) {
    if (vista === "diario") {
      const ritmo = r.presupuesto[r.presupuesto.length - 1]
      resumen = `Llevas ${fmt.full(last)} de ${fmt.full(r.B)} (${Math.round((last / r.B) * 100)} %). A esta altura del mes, el ritmo del presupuesto es ${fmt.full(ritmo)}${last > ritmo ? ": vas por encima." : ": vas dentro."}`
    } else {
      const dentro = r.gasto.filter((g, i) => g <= r.presupuesto![i]).length
      resumen = `${dentro} de ${r.gasto.length} ${vista === "mensual" ? (r.gasto.length === 1 ? "mes" : "meses") : (r.gasto.length === 1 ? "año" : "años")} dentro del presupuesto (${fmt.full(r.B)} al mes${vista === "anual" ? ", proporcional a los meses registrados" : ""}).`
    }
  } else {
    const total = r.gasto.reduce((a, b) => a + b, 0)
    resumen = vista === "diario" ? `Llevas ${fmt.full(last)} este mes.` : vista === "mensual" ? `Promedio de ${fmt.full(total / Math.max(1, r.gasto.length))} al mes en los últimos ${r.gasto.length} ${r.gasto.length === 1 ? "mes" : "meses"}.` : `Total registrado: ${fmt.full(total)}.`
  }

  const per = categoryShares(periodCategories(vista, movs, mes, hist))
  const periodo = vista === "diario" ? monthName(mes) : vista === "mensual" ? "Últimos 12 meses" : `Año ${mes.slice(0, 4)}`
  const pick = (id: string) => setCat((c) => (c === id ? "todo" : id))

  return (
    <>
      <BentoCard className="col-span-12 lg:col-span-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight">{titulo}</h2>
            <p className="text-sm text-muted-foreground">{nombre}</p>
          </div>
          <Segmented items={VISTAS.map((v) => v.label)} value={vi} onChange={setVi} label="Periodo de la gráfica" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="var-grafica">Qué quieres ver</label>
          <select id="var-grafica" value={cat} onChange={(e) => setCat(e.target.value)} className="h-[30px] max-w-full rounded-[10px] border bg-card px-2.5 text-xs font-semibold">
            <option value="todo">Todos los gastos</option>
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" aria-pressed={r.compare} disabled={!hasBudget} onClick={() => setConPres((v) => !v)}
            title={hasBudget ? undefined : "Define un presupuesto para esta categoría"}
            className={cn("inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", r.compare ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted")}>
            {r.compare ? <Check className="size-3.5" /> : <Target className="size-3.5" />}Frente a presupuesto
          </button>
          {!hasBudget && conPres && <button type="button" onClick={() => go("presupuesto")} className="text-xs font-semibold text-primary hover:underline">Crear presupuesto</button>}
        </div>
        <div className="mt-4">
          {r.gasto.some((v) => v > 0) || r.compare ? (
            vista === "diario"
              ? <LineChart key={cat + r.compare} tip={tip} labels={labels} format={fmt.compact} height={230}
                  series={[{ name: nombre, values: r.gasto, color }, ...(r.presupuesto ? [{ name: "Ritmo del presupuesto", values: r.presupuesto, color: "var(--muted-foreground)", dashed: true }] : [])]} />
              : <BarChart key={vista + cat + r.compare} tip={tip} labels={labels} titles={titles} values={r.gasto} budget={r.presupuesto} color={color} name={nombre} format={fmt.compact} height={230} />
          ) : <div className="grid h-48 place-items-center text-sm text-muted-foreground">Sin gastos en este periodo</div>}
        </div>
        <p className="mt-3 text-sm text-ink-2">{resumen}</p>
        {r.compare && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><i className="inline-block h-0 w-4 shrink-0 border-t-2 border-dashed border-foreground" />{vista === "diario" ? "Ritmo del presupuesto: lo que llevarías gastado si repartes el presupuesto por igual en el mes." : "Presupuesto del periodo. En rojo, los periodos en que te pasaste."}{cat === "todo" ? " Solo cuentan las categorías con presupuesto." : ""}</p>}
      </BentoCard>

      <BentoCard className="col-span-12 lg:col-span-5">
        <h2 className="text-[17px] font-bold tracking-tight">A dónde se va tu dinero</h2>
        <p className="text-sm text-muted-foreground">{periodo} · toca una categoría para verla en la gráfica</p>
        {per.items.length ? (
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row xl:items-start">
            <Donut key={vista} items={per.items.map((i) => ({ id: i.id, name: catName(i.id), v: i.monto, color: botCategory(i.id).color }))} format={fmt.full} tip={tip} active={cat === "todo" ? null : cat} onSelect={pick} size={184}
              center={<div><div className="text-[11px] text-muted-foreground">Total</div><div className="font-num text-lg font-bold">{fmt.compact(per.total)}</div></div>} />
            <ul className="flex w-full min-w-0 flex-1 flex-col gap-1">
              {per.items.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => pick(i.id)} aria-pressed={cat === i.id}
                    className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-muted", cat === i.id && "bg-muted")}>
                    <span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: botCategory(i.id).color }} /><span className="truncate" title={catName(i.id)}>{catName(i.id)}</span></span>
                    <span className="shrink-0 font-num"><b>{Math.round(i.pct * 100)}%</b> <span className="text-xs text-muted-foreground">{fmt.compact(i.monto)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">Sin gastos registrados en este periodo.</p>}
      </BentoCard>
    </>
  )
}

function BudgetBar({ r, fmt }: { r: ReturnType<typeof budgetStatus>["rows"][number]; fmt: Fmt }) {
  const color = r.estado === "excedido" ? "var(--rojo)" : r.estado === "alerta" ? "var(--amarillo)" : "var(--verde)"
  return (
    <li>
      <div className="flex justify-between gap-2 text-sm"><span className="font-semibold">{catName(r.categoria)}</span><span className="font-num text-muted-foreground"><b className={r.estado === "excedido" ? "text-rojo" : "text-foreground"}>{fmt.full(r.gastado)}</b> de {fmt.full(r.presupuesto)}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, r.pct * 100)}%`, background: color }} /></div>
      <div className="mt-1 text-[11px] text-muted-foreground">{r.estado === "excedido" ? `Te pasaste por ${fmt.full(-r.restante)}` : `Te quedan ${fmt.full(r.restante)} · ${Math.round(r.pct * 100)}%`}</div>
    </li>
  )
}

function EmptyHint({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="mt-4 rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">{text}<div className="mt-3"><Button size="sm" variant="outline" onClick={onClick}><Plus /> {action}</Button></div></div>
}

/* ---------------- Presupuesto ---------------- */

function MoneyInput({ value, onChange, label, locale, className }: { value: number; onChange: (n: number) => void; label: string; locale: string; className?: string }) {
  const [text, setText] = React.useState(formatInput(value, locale))
  return <input inputMode="decimal" aria-label={label} placeholder="0" value={text} onChange={(e) => { setText(e.target.value); onChange(parseAmount(e.target.value)) }}
    className={cn("w-full rounded-xl border bg-card px-3 py-2 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent", className)} />
}

function Presupuesto({ perfil, update, budget, s, fmt }: { perfil: Perfil; update: (p: Perfil) => void; budget: ReturnType<typeof budgetStatus>; s: ReturnType<typeof summarizeMovements>; fmt: Fmt }) {
  const set = (id: string, v: number) => update({ ...perfil, presupuestos: { ...perfil.presupuestos, [id]: v } })
  const suggest = () => {
    const p: Record<string, number> = {}
    for (const c of GASTO_CATS) { const g = s.porCategoria[c.id] || 0; if (g > 0) p[c.id] = Math.round(g * 0.9) }
    update({ ...perfil, presupuestos: p })
  }
  return (
    <div className="grid grid-cols-12 gap-4">
      <BentoCard className="col-span-12 lg:col-span-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[17px] font-bold tracking-tight">Presupuesto mensual por categoría</h2><p className="text-sm text-muted-foreground">El asistente te avisa por WhatsApp cuando una categoría llega al 80 % y si te pasas.</p></div>
          <Button size="sm" variant="outline" onClick={suggest} title="Propone un 10 % menos de lo que llevas gastado en cada categoría">Sugerir con mis gastos</Button>
        </div>
        <div className="mt-4 grid gap-2.5">
          {GASTO_CATS.map((c) => {
            const row = budget.rows.find((r) => r.categoria === c.id)
            return (
              <div key={c.id} className="grid grid-cols-[1fr_140px] items-center gap-3 sm:grid-cols-[1fr_1.2fr_150px]">
                <span className="flex items-center gap-2 text-sm font-semibold"><i className="size-2.5 rounded-[3px]" style={{ background: c.color }} />{c.name}</span>
                <div className="hidden sm:block">{row ? <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, row.pct * 100)}%`, background: row.estado === "excedido" ? "var(--rojo)" : row.estado === "alerta" ? "var(--amarillo)" : "var(--verde)" }} /></div> : <span className="text-xs text-muted-foreground">{s.porCategoria[c.id] ? `Llevas ${fmt.full(s.porCategoria[c.id])}` : ""}</span>}</div>
                <MoneyInput label={`Presupuesto de ${c.name}`} value={perfil.presupuestos[c.id] || 0} onChange={(v) => set(c.id, v)} locale={fmt.locale} />
              </div>
            )
          })}
        </div>
      </BentoCard>
      <BentoCard className="col-span-12 lg:col-span-4">
        <h2 className="text-[17px] font-bold tracking-tight">Cómo vas</h2>
        <div className="mt-3 grid gap-3">
          <div><div className="text-xs text-muted-foreground">Presupuestado</div><div className="font-num text-2xl font-bold">{fmt.full(budget.presupuestado)}</div></div>
          <div><div className="text-xs text-muted-foreground">Gastado en esas categorías</div><div className="font-num text-2xl font-bold">{fmt.full(budget.gastadoEnPresupuesto)}</div></div>
          <div><div className="text-xs text-muted-foreground">Cumplimiento</div><div className="font-num text-2xl font-bold">{budget.cumplimiento === null ? "—" : Math.round(budget.cumplimiento * 100) + "%"}</div></div>
          {s.ingresos > 0 && budget.presupuestado > s.ingresos && <p className="flex gap-2 rounded-xl bg-rojo/10 p-3 text-xs text-rojo"><AlertTriangle className="size-4 shrink-0" />Tu presupuesto supera tus ingresos del mes.</p>}
        </div>
        <ul className="mt-5 grid gap-3">{budget.rows.slice(0, 4).map((r) => <BudgetBar key={r.categoria} r={r} fmt={fmt} />)}</ul>
      </BentoCard>
    </div>
  )
}

/* ---------------- Metas ---------------- */

function Metas({ perfil, update, mes, fmt, excedente }: { perfil: Perfil; update: (p: Perfil) => void; mes: string; fmt: Fmt; excedente: number }) {
  const setMeta = (i: number, patch: Partial<Perfil["metas"][number]>) => update({ ...perfil, metas: perfil.metas.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
  const totalMensual = perfil.metas.reduce((a, m) => a + (goalPlan(m, mes).aporteMensual || 0), 0)
  return (
    <div className="grid gap-4">
      {perfil.metas.length > 0 && (
        <p className={cn("rounded-2xl border p-4 text-sm", totalMensual > excedente ? "border-amarillo/40 bg-amarillo/10" : "bg-card")}>
          Para cumplir tus metas a tiempo necesitas apartar <b className="font-num">{fmt.full(totalMensual)}</b> al mes. Tu excedente de este mes es <b className="font-num">{fmt.full(excedente)}</b>.
          {totalMensual > excedente && " Ajusta las fechas o prioriza una meta."}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perfil.metas.map((m, i) => {
          const g = goalPlan(m, mes)
          return (
            <BentoCard key={m.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <input aria-label="Nombre de la meta" value={m.nombre} onChange={(e) => setMeta(i, { nombre: e.target.value })} className="w-full rounded-lg bg-transparent text-lg font-bold outline-none focus:bg-muted" />
                <button aria-label={`Quitar ${m.nombre}`} onClick={() => update({ ...perfil, metas: perfil.metas.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-rojo"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${g.avance * 100}%` }} /></div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground"><span className="font-num">{Math.round(g.avance * 100)}%</span><span>Faltan <b className="font-num text-foreground">{fmt.full(g.faltante)}</b></span></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                <label className="grid gap-1">Meta<MoneyInput label="Monto de la meta" value={m.monto} onChange={(v) => setMeta(i, { monto: v })} locale={fmt.locale} /></label>
                <label className="grid gap-1">Ahorrado<MoneyInput label="Ahorrado" value={m.ahorrado} onChange={(v) => setMeta(i, { ahorrado: v })} locale={fmt.locale} /></label>
                <label className="col-span-2 grid gap-1">Para cuándo (opcional)<input type="month" value={m.fecha} min={mes} onChange={(e) => setMeta(i, { fecha: e.target.value })} className="rounded-xl border bg-card px-3 py-2" /></label>
              </div>
              <p className="mt-3 text-sm">{g.faltante === 0 ? <span className="font-semibold text-verde">¡Meta cumplida!</span> : g.aporteMensual ? <>Aparta <b className="font-num">{fmt.full(g.aporteMensual)}</b> al mes durante {g.meses} {g.meses === 1 ? "mes" : "meses"}.</> : <span className="text-muted-foreground">Ponle fecha para saber cuánto apartar al mes.</span>}</p>
            </BentoCard>
          )
        })}
        <button onClick={() => update({ ...perfil, metas: [...perfil.metas, { id: "g" + Date.now(), nombre: "Nueva meta", monto: 0, ahorrado: 0, fecha: "" }] })}
          className="grid min-h-48 place-items-center rounded-[18px] border border-dashed text-sm font-semibold text-muted-foreground hover:bg-muted"><span className="flex items-center gap-2"><Plus className="size-4" />Agregar meta</span></button>
      </div>
    </div>
  )
}

/* ---------------- Recomendaciones ---------------- */

function Recomendaciones({ tips, recs, fmt, pais }: { tips: ReturnType<typeof savingsTips>; recs: F.Recommendation[]; fmt: Fmt; pais: string }) {
  const guia = TASAS[pais]?.guia
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BentoCard>
        <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><Wallet className="size-5 text-primary" />Ahorro</h2>
        <ul className="mt-4 grid gap-3">
          {tips.map((t) => (
            <li key={t.id} className="rounded-2xl border p-4">
              <div className="font-bold">{t.title}</div>
              <p className="mt-1 text-sm text-ink-2">{t.detail}</p>
              {t.source && <a href={t.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Guía oficial: {t.source.nombre}<ExternalLink className="size-3" /></a>}
            </li>
          ))}
        </ul>
      </BentoCard>
      <BentoCard>
        <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><Lightbulb className="size-5 text-primary" />Tus finanzas, en orden de prioridad</h2>
        <ol className="mt-4 grid gap-3">
          {recs.slice(0, 6).map((r, i) => (
            <li key={r.id} className={cn("rounded-2xl border border-l-4 p-4", r.level === "alta" ? "border-l-rojo" : r.level === "media" ? "border-l-amarillo" : "border-l-verde")}>
              <div className="flex gap-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-num text-xs font-bold">{i + 1}</span>
                <div><div className="font-bold">{withMoney(r.title, fmt)}</div><p className="mt-1 text-sm text-ink-2">{withMoney(r.detail, fmt)}</p></div></div>
            </li>
          ))}
        </ol>
      </BentoCard>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground lg:col-span-2"><Info className="mt-0.5 size-3.5 shrink-0" />Recomendaciones educativas basadas en tus cifras; no constituyen asesoría personalizada.{guia && <> Más orientación en <a className="font-semibold text-primary hover:underline" href={guia.url} target="_blank" rel="noopener noreferrer">{guia.nombre}</a>.</>}</p>
    </div>
  )
}

/* ---------------- Tasas ---------------- */

function Tasas({ pais, fmt }: { pais: string; fmt: Fmt }) {
  const t = TASAS[pais]
  const [mine, setMine] = React.useState("")
  const rate = parseAmount(mine)
  const inf = t?.inflacion?.valor
  const real = inf !== undefined && rate > 0 ? realRate(rate, inf) : null
  const country = countryById(pais)
  const datos = [t?.inflacion && { label: "Inflación", ...t.inflacion }, t?.tasaPolitica && { label: t.tasaPolitica.nombre, ...t.tasaPolitica }, t?.referenciaAhorro && { label: t.referenciaAhorro.nombre, ...t.referenciaAhorro }].filter(Boolean) as { label: string; valor: number; periodo: string; fuente: string; url: string }[]
  return (
    <div className="grid grid-cols-12 gap-4">
      <BentoCard className="col-span-12 lg:col-span-7">
        <h2 className="text-[17px] font-bold tracking-tight">Referencias de {country?.name || "tu país"}</h2>
        {datos.length ? (
          <ul className="mt-4 grid gap-2.5">
            {datos.map((d) => (
              <li key={d.label} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
                <span><b className="block text-sm">{d.label}</b><span className="text-xs text-muted-foreground">{d.periodo} · <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{d.fuente}</a></span></span>
                <span className="font-num text-xl font-bold">{fmt.num(d.valor, 2)}%</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Aún no tenemos datos verificados de {country?.name || "tu país"}. Los publicamos solo cuando tienen fuente oficial y fecha.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Revisado el {TASAS_REVISADAS.split("-").reverse().join("/")}. Actualizamos estas referencias cada mes.</p>
      </BentoCard>
      <BentoCard className="col-span-12 lg:col-span-5">
        <h2 className="text-[17px] font-bold tracking-tight">¿Tu ahorro le gana a la inflación?</h2>
        <label className="mt-4 block text-sm font-semibold" htmlFor="mi-tasa">Tasa efectiva anual que te paga tu banco (%)</label>
        <input id="mi-tasa" inputMode="decimal" value={mine} onChange={(e) => setMine(e.target.value)} placeholder="Ej. 9,5" className="mt-1 w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num outline-none focus:border-primary focus:ring-4 focus:ring-accent" />
        {real !== null ? (
          <div className={cn("mt-4 rounded-2xl p-4", real > 0 ? "bg-verde/10" : "bg-rojo/10")}>
            <div className="text-xs text-muted-foreground">Rendimiento real</div>
            <div className={cn("font-num text-3xl font-bold", real > 0 ? "text-verde" : "text-rojo")}>{real > 0 ? "+" : ""}{fmt.num(real, 2)}%</div>
            <p className="mt-1 text-sm">{real > 0 ? "Tu dinero crece por encima de la inflación." : "Tu dinero pierde poder de compra: busca una cuenta o depósito con mejor tasa."}</p>
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">{inf === undefined ? "Cuando tengamos la inflación de tu país, aquí verás tu rendimiento real." : "Escribe la tasa para ver tu rendimiento real."}</p>}
        <p className="mt-4 flex gap-1.5 text-xs text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />No recomendamos entidades ni recibimos comisiones. Verifica que tu entidad esté vigilada por el supervisor financiero de tu país.</p>
      </BentoCard>
    </div>
  )
}

/* ---------------- Movimientos ---------------- */

function Movimientos({ movs, fmt }: { movs: Movement[]; fmt: Fmt }) {
  const days = new Map<string, Movement[]>()
  movs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((m) => days.set(m.fecha, [...(days.get(m.fecha) || []), m]))
  return (
    <BentoCard>
      <h2 className="text-[17px] font-bold tracking-tight">Movimientos del mes</h2>
      <p className="text-sm text-muted-foreground">Para corregir o borrar, escríbele al asistente (“borrar”, o el nombre de la categoría correcta).</p>
      <div className="mt-4 grid gap-4">
        {[...days.entries()].map(([day, list]) => (
          <div key={day}>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{Number(day.slice(8, 10))} de {MONTHS[Number(day.slice(5, 7)) - 1]}</div>
            <ul className="divide-y rounded-2xl border">
              {list.map((m) => { const c = botCategory(m.categoria); return (
                <li key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5"><i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} /><span className="min-w-0"><span className="block truncate font-semibold">{m.descripcion || c.name}</span><span className="block text-xs text-muted-foreground">{c.name}</span></span></span>
                  <span className={cn("shrink-0 font-num font-bold", m.tipo === "ingreso" && "text-verde")}>{m.tipo === "ingreso" ? "+" : "−"}{fmt.full(m.monto)}</span>
                </li>
              ) })}
            </ul>
          </div>
        ))}
        {!movs.length && <p className="text-sm text-muted-foreground">Aún no hay movimientos este mes.</p>}
      </div>
    </BentoCard>
  )
}

/* ---------------- Mis datos ---------------- */

function Datos({ perfil, update, fmt }: { perfil: Perfil; update: (p: Perfil) => void; fmt: Fmt }) {
  const setDebt = (i: number, patch: Partial<F.Debt>) => update({ ...perfil, deudas: perfil.deudas.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  const setFix = (i: number, patch: Partial<Perfil["pagosFijos"][number]>) => update({ ...perfil, pagosFijos: perfil.pagosFijos.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  return (
    <div className="grid grid-cols-12 gap-4">
      <BentoCard className="col-span-12 lg:col-span-4">
        <h2 className="text-[17px] font-bold tracking-tight">Ahorro y fondo de emergencia</h2>
        <label className="mt-4 grid gap-1 text-sm font-semibold">Ahorro disponible hoy<MoneyInput label="Ahorro disponible" value={perfil.ahorros} onChange={(v) => update({ ...perfil, ahorros: v })} locale={fmt.locale} /></label>
        <label className="mt-3 grid gap-1 text-sm font-semibold">Meta del fondo de emergencia
          <select value={perfil.mesesFondo} onChange={(e) => update({ ...perfil, mesesFondo: Number(e.target.value) })} className="rounded-xl border bg-card px-3 py-2.5">{[3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} meses de gastos esenciales</option>)}</select>
        </label>
      </BentoCard>
      <BentoCard className="col-span-12 lg:col-span-8">
        <h2 className="text-[17px] font-bold tracking-tight">Deudas</h2>
        <p className="text-sm text-muted-foreground">Saldo, tasa de interés mensual (figura en tu extracto) y pago mínimo.</p>
        <div className="mt-3 grid gap-2">
          {perfil.deudas.map((d, i) => (
            <div key={d.id} className="grid grid-cols-2 gap-2 rounded-2xl border p-3 sm:grid-cols-[1.4fr_1fr_.7fr_1fr_auto] sm:items-end">
              <label className="col-span-2 grid gap-1 text-xs font-semibold sm:col-span-1">Nombre<input value={d.name} onChange={(e) => setDebt(i, { name: e.target.value })} className="rounded-xl border bg-card px-3 py-2 text-sm" /></label>
              <label className="grid gap-1 text-xs font-semibold">Saldo<MoneyInput label="Saldo" value={d.balance} onChange={(v) => setDebt(i, { balance: v })} locale={fmt.locale} /></label>
              <label className="grid gap-1 text-xs font-semibold">% mes<MoneyInput label="Tasa mensual" value={d.rate} onChange={(v) => setDebt(i, { rate: v })} locale={fmt.locale} /></label>
              <label className="grid gap-1 text-xs font-semibold">Pago mínimo<MoneyInput label="Pago mínimo" value={d.min} onChange={(v) => setDebt(i, { min: v })} locale={fmt.locale} /></label>
              <button aria-label={`Quitar ${d.name}`} onClick={() => update({ ...perfil, deudas: perfil.deudas.filter((_, j) => j !== i) })} className="grid size-10 place-items-center justify-self-end rounded-xl text-muted-foreground hover:bg-muted hover:text-rojo"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="justify-self-start" onClick={() => update({ ...perfil, deudas: [...perfil.deudas, { id: "d" + Date.now(), name: "Deuda " + (perfil.deudas.length + 1), balance: 0, rate: 0, min: 0 }] })}><Plus /> Agregar deuda</Button>
        </div>
      </BentoCard>
      <BentoCard className="col-span-12">
        <h2 className="text-[17px] font-bold tracking-tight">Pagos fijos y suscripciones</h2>
        <p className="text-sm text-muted-foreground">Arriendo, servicios, planes y suscripciones. Te mostramos cuándo se cobran y cuánto suman al año.</p>
        <div className="mt-3 grid gap-2">
          {perfil.pagosFijos.map((p, i) => (
            <div key={p.id} className="grid grid-cols-2 gap-2 rounded-2xl border p-3 sm:grid-cols-[1.4fr_1fr_.6fr_1.2fr_auto] sm:items-end">
              <label className="col-span-2 grid gap-1 text-xs font-semibold sm:col-span-1">Nombre<input value={p.nombre} onChange={(e) => setFix(i, { nombre: e.target.value })} className="rounded-xl border bg-card px-3 py-2 text-sm" /></label>
              <label className="grid gap-1 text-xs font-semibold">Monto<MoneyInput label="Monto" value={p.monto} onChange={(v) => setFix(i, { monto: v })} locale={fmt.locale} /></label>
              <label className="grid gap-1 text-xs font-semibold">Día<input type="number" min={1} max={28} value={p.dia} onChange={(e) => setFix(i, { dia: Number(e.target.value) })} className="rounded-xl border bg-card px-3 py-2 text-right text-sm" /></label>
              <label className="grid gap-1 text-xs font-semibold">Categoría<select value={p.categoria} onChange={(e) => setFix(i, { categoria: e.target.value })} className="rounded-xl border bg-card px-2 py-2 text-sm">{BOT_CATEGORIES.filter((c) => c.tipo === "gasto").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <button aria-label={`Quitar ${p.nombre}`} onClick={() => update({ ...perfil, pagosFijos: perfil.pagosFijos.filter((_, j) => j !== i) })} className="grid size-10 place-items-center justify-self-end rounded-xl text-muted-foreground hover:bg-muted hover:text-rojo"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="justify-self-start" onClick={() => update({ ...perfil, pagosFijos: [...perfil.pagosFijos, { id: "f" + Date.now(), nombre: "Pago " + (perfil.pagosFijos.length + 1), monto: 0, dia: 1, categoria: "otros" }] })}><Plus /> Agregar pago fijo</Button>
        </div>
      </BentoCard>
    </div>
  )
}
