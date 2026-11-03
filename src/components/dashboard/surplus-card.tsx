"use client"

// "Qué hacer con lo que te sobra": reparto sugerido del sobrante según la etapa de la persona,
// dónde poner cada parte (tipos de producto, no entidades) y un simulador de crecimiento.
import * as React from "react"
import { Info, PiggyBank, TrendingUp } from "lucide-react"
import * as F from "@/lib/finance"
import type { BucketId, FinanceData, Summary } from "@/lib/finance"
import { BentoCard, LineChart, Segmented, type TipRef } from "./charts"
import { parseAmount } from "./numbers-form"
import { withMoney } from "@/lib/store"
import { cn } from "@/lib/utils"

type Fmt = { full: (n: number) => string; compact: (n: number) => string }

const COLORS: Record<BucketId, string> = { colchon: "#0e7c66", deudas: "#d6453d", metas: "#f2b84b", largo: "#3d6fd6" }

const STAGE: Record<F.SurplusPlan["stage"], { label: string; step: number }> = {
  sin_margen: { label: "Primero, liberar dinero", step: 0 },
  colchon_minimo: { label: "Etapa 1 de 4 · Arma tu colchón mínimo", step: 1 },
  deudas_caras: { label: "Etapa 2 de 4 · Sal de tus deudas caras", step: 2 },
  colchon: { label: "Etapa 3 de 4 · Completa tu colchón", step: 3 },
  crecer: { label: "Etapa 4 de 4 · Pon tu dinero a crecer", step: 4 },
}

const PLAZOS = [12, 36, 60]
const pctTxt = (x: number) => (Math.round(x * 1000) / 10).toString().replace(".", ",") + "%"

export function SurplusCard({ data, s, fmt, tip }: { data: FinanceData; s: Summary; fmt: Fmt; tip: TipRef }) {
  const plan = React.useMemo(() => F.surplusPlan(data, s), [data, s])
  const amount = (id: BucketId) => plan.split.find((x) => x.id === id)?.amount ?? 0
  const top = plan.expensive[0]

  // Simulador: por defecto, lo que el plan manda a ahorro (no a deudas); si no sobra nada, un 25% de los prescindibles.
  const suggested = plan.margin > 0 ? plan.margin - amount("deudas") : Math.round(s.byType.prescindible * 0.25)
  const [monthlyTxt, setMonthlyTxt] = React.useState(new Intl.NumberFormat("es-CO").format(Math.max(0, suggested)))
  const [rateTxt, setRateTxt] = React.useState("8")
  const [plazo, setPlazo] = React.useState(2)
  const monthly = parseAmount(monthlyTxt)
  const rate = Math.min(60, parseAmount(rateTxt))
  const months = PLAZOS[plazo]
  const g = React.useMemo(() => F.growth(0, monthly, rate, months), [monthly, rate, months])
  const flat = React.useMemo(() => F.growth(0, monthly, 0, months), [monthly, months])
  const labels = React.useMemo(() => Array.from({ length: months + 1 }, (_, i) => (i === 0 ? "Hoy" : `Mes ${i}`)), [months])

  const milestone = (() => {
    const m = plan.milestone
    if (!m || m.months === null) return null
    const meses = `${m.months} ${m.months === 1 ? "mes" : "meses"}`
    if (m.id === "un_mes") return `En ${meses} tendrás al menos un mes de gastos esenciales guardado. Ahí pasas a la siguiente etapa.`
    if (m.id === "sin_deudas_caras") return `Con ${fmt.full(amount("deudas"))} extra al mes sales de tus deudas caras en ${meses}.`
    return `Completas tu colchón de ${s.targetMonths} meses en ${meses}.`
  })()

  return (
    <BentoCard className="col-span-12 border-primary/30 ring-1 ring-primary/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            <PiggyBank className="size-4" />{STAGE[plan.stage].label}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">Qué hacer con lo que te sobra</h2>
          <p className="mt-1 text-sm text-ink-2">
            {plan.margin > 0
              ? <>Te sobran <b className="font-num text-foreground">{fmt.full(plan.margin)}</b> al mes. Este es el reparto que te sugerimos según la etapa en que estás.</>
              : <>Hoy no te sobra dinero al mes. Primero hay que liberar algo (mira <b className="text-foreground">Qué hacer, en orden</b>). Abajo puedes simular cuánto crecería tu plata si apartas una parte.</>}
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
          <b>Tu {top.name.toLowerCase()} te cobra {String(top.rate).replace(".", ",")}% al mes: eso es {pctTxt(top.ea)} al año.</b>{" "}
          <span className="text-ink-2">Ninguna inversión segura te paga eso. Cada peso que abonas a esa deuda te ahorra intereses a esa tasa: es la &quot;inversión&quot; con mejor rendimiento que tienes hoy.</span>
        </div>
      )}

      {/* Dónde poner cada parte */}
      <h3 className="mt-6 text-[15px] font-bold">Dónde poner cada parte</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {F.BUCKETS.map((b) => {
          const a = amount(b.id)
          const off = plan.split.length > 0 && a === 0
          return (
            <div key={b.id} className={cn("flex flex-col rounded-2xl border p-4", off ? "bg-muted/30" : "bg-card")}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold"><i className="size-2.5 rounded-[3px]" style={{ background: COLORS[b.id] }} />{b.name}</span>
                {off && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Más adelante</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{b.when}</div>
              {a > 0 && <div className="mt-2 font-num text-xl font-bold">{fmt.full(a)}<span className="text-xs font-semibold text-muted-foreground"> /mes</span></div>}
              <ul className="mt-2 grid gap-1 text-sm">
                {b.products.map((p) => <li key={p} className="flex gap-1.5"><span className="text-primary">•</span>{p}</li>)}
              </ul>
              <dl className="mt-auto grid grid-cols-2 gap-2 pt-3 text-xs">
                <div><dt className="text-muted-foreground">Riesgo</dt><dd className="font-semibold">{b.risk}</dd></div>
                <div><dt className="text-muted-foreground">Disponible</dt><dd className="font-semibold">{b.access}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-ink-2">{b.tip}</p>
            </div>
          )
        })}
      </div>

      {/* Simulador */}
      <div className="mt-6 grid gap-5 rounded-2xl bg-muted/40 p-4 md:p-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><TrendingUp className="size-4 text-primary" />Simula cuánto crece</h3>
          <label className="mt-3 block text-sm font-semibold" htmlFor="sim-aporte">Ahorro al mes</label>
          <input id="sim-aporte" inputMode="decimal" value={monthlyTxt} onChange={(e) => setMonthlyTxt(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent" />
          <label className="mt-3 block text-sm font-semibold" htmlFor="sim-tasa">Tasa anual que te ofrecen (%)</label>
          <input id="sim-tasa" inputMode="decimal" value={rateTxt} onChange={(e) => setRateTxt(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent" />
          <p className="mt-1 text-xs text-muted-foreground">Es la tasa efectiva anual (EA o TEA). Pídela en tu banco o mírala en su app y cámbiala aquí.</p>
          <div className="mt-3"><Segmented label="Plazo" items={["1 año", "3 años", "5 años"]} value={plazo} onChange={setPlazo} /></div>
        </div>
        <div>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              ["Tendrías", fmt.compact(g.total), ""],
              ["Intereses ganados", fmt.compact(g.interest), "text-verde"],
              ["Guardado sin rendimiento", fmt.compact(flat.total), "text-muted-foreground"],
            ].map(([l, v, c]) => (
              <div key={l} className="flex items-baseline justify-between gap-3 sm:block">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className={cn("font-num text-xl font-bold sm:text-2xl", c)}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <LineChart tip={tip} labels={labels} format={fmt.compact} height={170}
              series={[{ name: `Al ${String(rate).replace(".", ",")}% anual`, values: g.series, color: "var(--primary)" }, { name: "Sin rendimiento", values: flat.series, color: "var(--muted-foreground)", dashed: true }]} />
          </div>
          {top && <p className="mt-2 text-xs text-ink-2">{withMoney(`Compáralo: abonar a tu ${top.name.toLowerCase()} te "rinde" ${pctTxt(top.ea)} al año.`, fmt.full)}</p>}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Son tipos de producto, no recomendaciones de entidades ni asesoría personalizada. Antes de abrir uno, verifica que la entidad esté vigilada por el supervisor financiero de tu país y compara la tasa con la inflación: si es menor, tu dinero pierde poder de compra.
      </p>
    </BentoCard>
  )
}
