"use client"

// Tablero personal: indicadores, qué hacer con lo que sobra, proyección, radar de las 5 áreas, gastos por categoría,
// recomendaciones, plan de deudas, fondo de emergencia y plan de 30 días.
import * as React from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, Lightbulb, ShieldCheck } from "lucide-react"
import * as S from "@/lib/scoring"
import * as F from "@/lib/finance"
import type { FinanceData } from "@/lib/finance"
import { moneyFormatter, withMoney, store } from "@/lib/store"
import { BentoCard, CountUp, LineChart, Radar, Segmented, Tooltip, Treemap, type TipApi, type TreeGroup } from "./charts"
import { cn } from "@/lib/utils"
import { SurplusCard } from "./surplus-card"

const GROUPS: TreeGroup[] = [
  { id: "esencial", name: "Esenciales", color: "#0e7c66", ink: "light" },
  { id: "importante", name: "Importantes", color: "#8fd3bd", ink: "dark" },
  { id: "prescindible", name: "Discrecionales", color: "#f2b84b", ink: "dark" },
  { id: "deuda", name: "Servicio de deuda", color: "#d6453d", ink: "light" },
]

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
function monthLabels(n: number) {
  const now = new Date()
  return Array.from({ length: n + 1 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return i === 0 ? "Hoy" : `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
  })
}

type Tone = "verde" | "amarillo" | "rojo"
const toneBg: Record<Tone, string> = { verde: "bg-verde", amarillo: "bg-amarillo", rojo: "bg-rojo" }

function Kpi({ label, value, tone, note, icon }: { label: string; value: React.ReactNode; tone: Tone; note: string; icon?: React.ReactNode }) {
  return (
    <BentoCard className="p-5">
      <div className="flex items-center justify-between text-[13px] font-semibold text-muted-foreground">
        {label}
        <span className={cn("size-2.5 rounded-full", toneBg[tone])} aria-hidden="true" />
      </div>
      <div className="mt-2.5 flex items-center gap-2 font-num text-3xl font-bold leading-none tracking-tight tabular-nums">{value}{icon}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </BentoCard>
  )
}

export function DashboardView({ data, testCode, readOnly = false, onEditNumbers }: { data: FinanceData; testCode?: string | null; readOnly?: boolean; onEditNumbers?: () => void }) {
  const tip = React.useRef<TipApi | null>(null)
  const fmt = React.useMemo(() => moneyFormatter(data.currency, data.locale), [data.currency, data.locale])
  const s = React.useMemo(() => F.summarize(data), [data])
  const recs = React.useMemo(() => F.recommendations(data, s), [data, s])
  const test = React.useMemo(() => { try { return testCode ? S.score(S.decode(testCode)) : null } catch { return null } }, [testCode])
  const pct = (x: number) => Math.round(x * 100) + "%"

  // Proyección: excedente actual vs. ajustando 25% de los gastos discrecionales
  const cut = s.byType.prescindible * 0.25
  const labels = monthLabels(12)
  const actual = F.projection(s.savings, Math.max(0, s.margin), 12)
  const plan = F.projection(s.savings, Math.max(0, s.margin + cut), 12)

  // Deudas
  const [method, setMethod] = React.useState(0)
  // Mismo pago extra que usa la recomendación: el que escribiste o la mitad de tu margen.
  const maxExtra = Math.max(10, Math.round(Math.max(s.margin, s.income * 0.2)))
  const [extra, setExtra] = React.useState(Math.min(maxExtra, data.extraDebtPayment || Math.max(0, Math.round(s.margin * 0.5))))
  const base = React.useMemo(() => F.payoff(s.debts, 0, "avalancha"), [s.debts])
  const plan2 = React.useMemo(() => F.payoff(s.debts, extra, method ? "bola" : "avalancha"), [s.debts, extra, method])
  const debtLabels = monthLabels(Math.max(1, plan2.series.length - 1))
  const baseSeries = plan2.series.map((_, i) => base.series[Math.min(i, base.series.length - 1)] ?? 0)

  // Plan de 30 días (del test)
  const [checks, setChecks] = React.useState<Record<string, boolean>>({})
  React.useEffect(() => { if (!readOnly) setChecks(store.getChecks()) }, [readOnly])
  const toggle = (k: string) => { if (readOnly) return; const c = { ...checks, [k]: !checks[k] }; setChecks(c); store.setChecks(c) }

  const marginTone: Tone = s.margin < 0 ? "rojo" : s.savingsRate < F.REF.savingsRate ? "amarillo" : "verde"
  const em = s.emergencyMonths
  const emTone: Tone = em === null ? "amarillo" : em < 1 ? "rojo" : em < s.targetMonths ? "amarillo" : "verde"
  const debtTone: Tone = s.debtLoad > F.REF.debtLoad ? "rojo" : s.debtLoad > 0.2 ? "amarillo" : "verde"
  const items = [
    ...s.categories.map((c) => ({ name: c.name, group: c.type, v: c.amount })),
    ...s.debts.map((d) => ({ name: d.name, group: "deuda", v: Math.min(d.min, d.balance) })),
  ]

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Indicadores */}
      <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Excedente mensual" tone={marginTone} value={<CountUp value={s.margin} format={fmt.compact} />}
          icon={s.margin >= 0 ? <ArrowUpRight className="size-5 text-verde" /> : <ArrowDownRight className="size-5 text-rojo" />}
          note={`Lo que queda de ${fmt.compact(s.income)} tras gastos y cuotas`} />
        <Kpi label="Tasa de ahorro" tone={marginTone} value={<CountUp value={s.savingsRate * 100} format={(n) => Math.round(n) + "%"} />} note={`Excedente sobre ingreso · referencia: ${pct(F.REF.savingsRate)} o más`} />
        <Kpi label="Cobertura de emergencia" tone={emTone} value={em === null ? "—" : <CountUp value={em} format={(n) => fmt.num(n, 1) + " meses"} />} note={`Meses de gastos esenciales cubiertos · meta: ${s.targetMonths}`} />
        <Kpi label="Nivel de endeudamiento" tone={debtTone} value={<CountUp value={s.debtLoad * 100} format={(n) => Math.round(n) + "%"} />} note={`Cuotas sobre ingreso · referencia: menos de ${pct(F.REF.debtLoad)}`} />
      </div>

      {/* Qué hacer con lo que sobra */}
      <SurplusCard key={data.currency + (data.locale || "")} data={data} s={s} fmt={fmt} tip={tip} />

      {/* Proyección */}
      <BentoCard className="col-span-12 lg:col-span-7">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">Proyección de ahorro a 12 meses</h2>
            <p className="text-sm text-muted-foreground">Si ajustas 25% de tus gastos discrecionales, acumulas <b className="text-foreground">{fmt.full(cut * 12)}</b> adicionales en un año.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-primary" />Con tu excedente actual</span>
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded border-t-2 border-dashed border-amarillo" />Con el ajuste</span>
          </div>
        </div>
        <div className="mt-4">
          <LineChart tip={tip} labels={labels} format={fmt.compact} height={220}
            series={[{ name: "Excedente actual", values: actual, color: "var(--primary)" }, { name: "Con el ajuste", values: plan, color: "var(--amarillo)", dashed: true }]} />
        </div>
      </BentoCard>

      {/* Radar */}
      <BentoCard className="col-span-12 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">Perfil financiero por áreas</h2>
            <p className="text-sm text-muted-foreground">{test ? <>Puntaje del test: <b className="text-foreground">{test.total}/100</b> · {test.level.name}</> : "Haz el test para ver tu radar."}</p>
          </div>
        </div>
        {test ? <Radar tip={tip} values={test.areas.map((a) => a.score)} axis={test.areas.map((a) => a.name)} size={320} /> : <div className="grid h-60 place-items-center text-sm text-muted-foreground">Sin test todavía</div>}
      </BentoCard>

      {/* Gastos */}
      <BentoCard className="col-span-12 lg:col-span-7">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">Distribución de tus gastos</h2>
            <p className="text-sm text-muted-foreground">{fmt.full(s.outflow)} al mes · {pct(s.income > 0 ? s.outflow / s.income : 0)} de tu ingreso</p>
          </div>
          {!readOnly && onEditNumbers && <button onClick={onEditNumbers} className="text-sm font-semibold text-primary hover:underline">Editar mis cifras</button>}
        </div>
        <div className="my-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {GROUPS.map((g) => <span key={g.id} className="flex items-center gap-1.5"><i className="size-2 rounded-[2px]" style={{ background: g.color }} />{g.name}</span>)}
        </div>
        {items.some((i) => i.v > 0) ? <Treemap tip={tip} items={items} groups={GROUPS} format={fmt.compact} total={s.income} height={300} /> : <div className="grid h-40 place-items-center text-sm text-muted-foreground">Escribe tus gastos para ver el mapa</div>}
      </BentoCard>

      {/* Recomendaciones */}
      <BentoCard className="col-span-12 lg:col-span-5">
        <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><Lightbulb className="size-5 text-primary" />Recomendaciones priorizadas</h2>
        <ol className="mt-4 grid gap-3">
          {recs.slice(0, 5).map((r, i) => (
            <li key={r.id} className={cn("rounded-2xl border border-l-4 p-3.5", r.level === "alta" ? "border-l-rojo" : r.level === "media" ? "border-l-amarillo" : "border-l-verde")}>
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-num text-xs font-bold">{i + 1}</span>
                <div>
                  <div className="font-bold leading-snug">{withMoney(r.title, fmt)}</div>
                  <p className="mt-1 text-sm text-ink-2">{withMoney(r.detail, fmt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />Referencias generales del mercado; no constituyen asesoría personalizada.</p>
      </BentoCard>

      {/* Deudas */}
      <BentoCard className="col-span-12 lg:col-span-7">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">Plan de desendeudamiento</h2>
            <p className="text-sm text-muted-foreground">{s.debts.length ? `${fmt.full(s.totalDebt)} en ${s.debts.length} ${s.debts.length === 1 ? "deuda" : "deudas"}` : "No registraste deudas."}</p>
          </div>
          {s.debts.length > 0 && <Segmented label="Método" items={["Avalancha", "Bola de nieve"]} value={method} onChange={setMethod} />}
        </div>
        {s.debts.length > 0 ? (
          <>
            <p className="mt-3 text-xs text-muted-foreground">{method ? "Bola de nieve: prioriza la deuda de menor saldo; ves resultados más rápido." : "Avalancha: prioriza la deuda de mayor tasa; pagas menos intereses en total."}</p>
            <label className="mt-3 block text-sm font-semibold">
              Abono extra a capital al mes: <span className="font-num">{fmt.full(extra)}</span>
              <input type="range" min={0} max={maxExtra} step={Math.max(1, Math.round(maxExtra / 100))} value={Math.min(extra, maxExtra)} onChange={(e) => setExtra(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary)]" aria-label="Abono extra a capital al mes" />
            </label>
            <div className="my-4 grid grid-cols-3 gap-3">
              <div><div className="text-xs text-muted-foreground">Libre de deudas en</div><div className="font-num text-2xl font-bold">{plan2.feasible ? `${plan2.months} meses` : "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Intereses totales</div><div className="font-num text-2xl font-bold">{fmt.compact(plan2.totalInterest)}</div></div>
              <div><div className="text-xs text-muted-foreground">Intereses que te ahorras</div><div className="font-num text-2xl font-bold text-verde">{base.feasible && plan2.feasible ? fmt.compact(Math.max(0, base.totalInterest - plan2.totalInterest)) : "—"}</div></div>
            </div>
            {!plan2.feasible && <p className="mb-3 flex items-center gap-2 rounded-xl bg-rojo/10 p-3 text-sm text-rojo"><AlertTriangle className="size-4" />Con estos pagos los intereses impiden reducir el saldo. Aumenta el abono extra.</p>}
            {plan2.feasible && <LineChart tip={tip} labels={debtLabels} format={fmt.compact} height={170}
              series={[{ name: "Con tu plan", values: plan2.series, color: "var(--primary)" }, { name: "Solo pagos mínimos", values: baseSeries, color: "var(--muted-foreground)", dashed: true }]} />}
            <ul className="mt-3 grid gap-1.5 text-sm">
              {s.debts.slice().sort((a, b) => (plan2.payoffMonth[a.id] ?? 1e9) - (plan2.payoffMonth[b.id] ?? 1e9)).map((d, i) => (
                <li key={d.id} className="flex justify-between border-t pt-1.5"><span className="text-ink-2">{i + 1}. {d.name} <span className="text-xs text-muted-foreground">({fmt.num(d.rate, 2)}% mensual)</span></span><span className="font-num">{plan2.payoffMonth[d.id] ? `mes ${plan2.payoffMonth[d.id]}` : "—"}</span></li>
              ))}
            </ul>
          </>
        ) : <div className="grid h-40 place-items-center text-sm text-muted-foreground">Agrega tus deudas para ver tu plan de salida.</div>}
      </BentoCard>

      {/* Fondo de emergencia */}
      <BentoCard className="col-span-12 lg:col-span-5">
        <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight"><ShieldCheck className="size-5 text-primary" />Tu fondo de emergencia</h2>
        <p className="text-sm text-muted-foreground">Meta: {s.targetMonths} meses de gastos esenciales ({fmt.full(s.emergencyTarget)})</p>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-[width] duration-1000", toneBg[emTone])} style={{ width: `${Math.min(100, s.emergencyTarget > 0 ? (s.savings / s.emergencyTarget) * 100 : 0)}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-num text-sm"><span>{fmt.full(s.savings)}</span><span className="text-muted-foreground">{fmt.full(s.emergencyTarget)}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div><div className="text-xs text-muted-foreground">Faltante</div><div className="font-num text-2xl font-bold">{fmt.compact(s.emergencyGap)}</div></div>
          <div><div className="text-xs text-muted-foreground">Lo completas en</div><div className="font-num text-2xl font-bold">{s.emergencyGap === 0 ? "¡Listo!" : s.margin > 0 ? `${Math.ceil(s.emergencyGap / s.margin)} meses` : "—"}</div></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Calculado destinando todo tu excedente. Mantén este fondo en una cuenta separada y de liquidez inmediata.</p>
      </BentoCard>

      {/* Plan de 30 días */}
      {test && (
        <BentoCard className="col-span-12">
          <h2 className="text-[17px] font-bold tracking-tight">Tu plan de 30 días</h2>
          <p className="text-sm text-muted-foreground">Ordenado según tus respuestas del test.{!readOnly && " Marca cada acción cuando la termines."}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {test.plan.map((w, wi) => (
              <div key={w.title} className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-primary">{w.title}</div>
                {w.actions.map((a, ai) => {
                  const k = `${wi}-${ai}`
                  return (
                    <button key={k} onClick={() => toggle(k)} disabled={readOnly} className="mb-2 flex w-full items-start gap-2 text-left text-sm disabled:cursor-default">
                      <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", checks[k] ? "text-primary" : "text-muted-foreground/40")} />
                      <span className={cn(checks[k] && "text-muted-foreground line-through")}>{a}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </BentoCard>
      )}
      <Tooltip api={tip} />
    </div>
  )
}
