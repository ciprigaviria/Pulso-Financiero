"use client"

// "Plan para tu excedente": asignación sugerida del excedente mensual según la etapa financiera,
// instrumentos por objetivo (tipos de producto, no entidades) y un simulador de interés compuesto.
import * as React from "react"
import { Info, PiggyBank, TrendingUp } from "lucide-react"
import * as F from "@/lib/finance"
import type { BucketId, FinanceData, Summary } from "@/lib/finance"
import { BentoCard, LineChart, Segmented, type TipRef } from "./charts"
import { formatInput, parseAmount, type Fmt } from "@/lib/money"
import { cn } from "@/lib/utils"

const COLORS: Record<BucketId, string> = { colchon: "#1fb37a", deudas: "#ff5d5d", metas: "#f2c14e", largo: "#3d6fd6" }

const STAGE: Record<F.SurplusPlan["stage"], { label: string; step: number }> = {
  sin_margen: { label: "Prioridad: generar excedente", step: 0 },
  colchon_minimo: { label: "Etapa 1 de 4 · Fondo de reserva inicial", step: 1 },
  deudas_caras: { label: "Etapa 2 de 4 · Reducción de deuda de alto costo", step: 2 },
  colchon: { label: "Etapa 3 de 4 · Fondo de emergencia completo", step: 3 },
  crecer: { label: "Etapa 4 de 4 · Crecimiento patrimonial", step: 4 },
}

const PLAZOS = [12, 36, 60]

export function SurplusCard({ data, s, fmt, tip }: { data: FinanceData; s: Summary; fmt: Fmt; tip: TipRef }) {
  const plan = React.useMemo(() => F.surplusPlan(data, s), [data, s])
  const amount = (id: BucketId) => plan.split.find((x) => x.id === id)?.amount ?? 0
  const top = plan.expensive[0]
  const pctTxt = (x: number) => fmt.num(x * 100, 1) + "%"

  // Simulador: por defecto, lo que el plan asigna a ahorro (no a deudas); sin excedente, 25% de los gastos discrecionales.
  const suggested = plan.margin > 0 ? plan.margin - amount("deudas") : Math.round(s.byType.prescindible * 0.25)
  const [monthlyTxt, setMonthlyTxt] = React.useState(formatInput(Math.max(0, suggested), fmt.locale))
  const [rateTxt, setRateTxt] = React.useState("8")
  const [plazo, setPlazo] = React.useState(2)
  const monthly = parseAmount(monthlyTxt)
  const rate = Math.min(60, parseAmount(rateTxt))
  const months = PLAZOS[plazo]
  const g = React.useMemo(() => F.growth(0, monthly, rate, months), [monthly, rate, months])
  const flat = React.useMemo(() => F.growth(0, monthly, 0, months), [monthly, months])
  const labels = React.useMemo(() => Array.from({ length: months + 1 }, (_, i) => (i === 0 ? "Hoy" : i % 12 === 0 ? `Año ${i / 12}` : `Mes ${i}`)), [months])

  const milestone = (() => {
    const m = plan.milestone
    if (!m || m.months === null) return null
    const meses = `${m.months} ${m.months === 1 ? "mes" : "meses"}`
    if (m.id === "un_mes") return `En ${meses} tendrás un fondo de reserva equivalente a un mes de gastos esenciales; entonces avanzas a la siguiente etapa.`
    if (m.id === "sin_deudas_caras") return `Con un abono extraordinario de ${fmt.full(amount("deudas"))} al mes, liquidas tu deuda de alto costo en ${meses}.`
    return `Completas tu fondo de emergencia de ${s.targetMonths} meses en ${meses}.`
  })()

  return (
    <BentoCard className="col-span-12 border-primary/30 ring-1 ring-primary/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            <PiggyBank className="size-4" />{STAGE[plan.stage].label}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">Plan para tu excedente</h2>
          <p className="mt-1 text-sm text-ink-2">
            {plan.margin > 0
              ? <>Tu excedente mensual —lo que queda después de gastos y cuotas— es de <b className="font-num text-foreground">{fmt.full(plan.margin)}</b>. Esta es la asignación sugerida para tu etapa financiera.</>
              : <>Hoy tus egresos igualan o superan tus ingresos. El primer paso es generar excedente (revisa tus <b className="text-foreground">Recomendaciones priorizadas</b>). Abajo puedes simular cuánto crecería tu ahorro si liberas una parte.</>}
          </p>
        </div>
        <ol className="flex shrink-0 gap-1.5" aria-label="Etapas">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className={cn("h-1.5 w-8 rounded-full", n <= STAGE[plan.stage].step ? "bg-primary" : "bg-muted")} />
          ))}
        </ol>
      </div>

      {plan.split.length > 0 && (
        <div className="mt-5">
          <div className="flex h-4 overflow-hidden rounded-full">
            {plan.split.map((x) => <div key={x.id} style={{ width: `${x.pct * 100}%`, background: COLORS[x.id] }} title={x.id} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {plan.split.map((x) => (
              <div key={x.id} className="flex items-center gap-2 text-sm">
                <i className="size-2.5 rounded-[3px]" style={{ background: COLORS[x.id] }} />
                <span className="text-ink-2">{F.BUCKETS.find((b) => b.id === x.id)!.name}</span>
                <b className="font-num">{fmt.full(x.amount)}</b>
                <span className="text-xs text-muted-foreground">{Math.round(x.pct * 100)}%</span>
              </div>
            ))}
          </div>
          {milestone && <p className="mt-3 text-sm font-semibold">{milestone}</p>}
        </div>
      )}

      {top && (
        <div className="mt-4 rounded-2xl border border-rojo/25 bg-rojo/5 p-4 text-sm">
          <b>Tu {top.name.toLowerCase()} tiene un costo de {fmt.num(top.rate, 2)}% mensual, equivalente a {pctTxt(top.ea)} efectivo anual.</b>{" "}
          <span className="text-ink-2">Ningún instrumento de bajo riesgo ofrece esa rentabilidad. Cada abono a capital te ahorra intereses a esa tasa: en la práctica, es tu inversión más rentable hoy.</span>
        </div>
      )}

      {/* Instrumentos por objetivo */}
      <h3 className="mt-6 text-[15px] font-bold">Instrumentos sugeridos por objetivo</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {F.BUCKETS.map((b) => {
          const a = amount(b.id)
          const off = plan.split.length > 0 && a === 0
          return (
            <div key={b.id} className={cn("flex flex-col rounded-2xl border p-4", off ? "bg-muted/30" : "bg-card")}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold"><i className="size-2.5 rounded-[3px]" style={{ background: COLORS[b.id] }} />{b.name}</span>
                {off && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Etapa siguiente</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{b.when}</div>
              {a > 0 && <div className="mt-2 font-num text-xl font-bold">{fmt.full(a)}<span className="text-xs font-semibold text-muted-foreground"> /mes</span></div>}
              <ul className="mt-2 grid gap-1 text-sm">
                {b.products.map((p) => <li key={p} className="flex gap-1.5"><span className="text-primary">•</span>{p}</li>)}
              </ul>
              <dl className="mt-auto grid grid-cols-2 gap-2 pt-3 text-xs">
                <div><dt className="text-muted-foreground">Riesgo</dt><dd className="font-semibold">{b.risk}</dd></div>
                <div><dt className="text-muted-foreground">Liquidez</dt><dd className="font-semibold">{b.access}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-ink-2">{b.tip}</p>
            </div>
          )
        })}
      </div>

      {/* Simulador */}
      <div className="mt-6 grid gap-5 rounded-2xl bg-muted/40 p-4 md:p-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><TrendingUp className="size-4 text-primary" />Simulador de interés compuesto</h3>
          <label className="mt-3 block text-sm font-semibold" htmlFor="sim-aporte">Aporte mensual</label>
          <input id="sim-aporte" inputMode="decimal" value={monthlyTxt} onChange={(e) => setMonthlyTxt(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent" />
          <label className="mt-3 block text-sm font-semibold" htmlFor="sim-tasa">Tasa efectiva anual que te ofrecen (%)</label>
          <input id="sim-tasa" inputMode="decimal" value={rateTxt} onChange={(e) => setRateTxt(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent" />
          <p className="mt-1 text-xs text-muted-foreground">Aparece como EA, TEA o TAE en la app o el sitio de tu banco. Escríbela aquí para ver tu proyección.</p>
          <div className="mt-3"><Segmented label="Plazo" items={["1 año", "3 años", "5 años"]} value={plazo} onChange={setPlazo} /></div>
        </div>
        <div>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              ["Saldo final", fmt.compact(g.total), ""],
              ["Rendimientos generados", fmt.compact(g.interest), "text-verde"],
              ["Sin rentabilidad", fmt.compact(flat.total), "text-muted-foreground"],
            ].map(([l, v, c]) => (
              <div key={l} className="flex items-baseline justify-between gap-3 sm:block">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className={cn("font-num text-xl font-bold sm:text-2xl", c)}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <LineChart tip={tip} labels={labels} format={fmt.compact} height={170}
              series={[{ name: `Al ${fmt.num(rate, 2)}% EA`, values: g.series, color: "var(--primary)" }, { name: "Sin rentabilidad", values: flat.series, color: "var(--muted-foreground)", dashed: true }]} />
          </div>
          {top && <p className="mt-2 text-xs text-ink-2">Como referencia: abonar a tu {top.name.toLowerCase()} equivale a una rentabilidad de {pctTxt(top.ea)} efectivo anual.</p>}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Son categorías de instrumentos, no recomendaciones de entidades ni asesoría personalizada. Antes de contratar uno, verifica que la entidad esté vigilada por el supervisor financiero de tu país y que su tasa supere la inflación; de lo contrario, tu dinero pierde poder adquisitivo.
      </p>
    </BentoCard>
  )
}
