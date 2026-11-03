"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Clock, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BentoCard, CountUp, Radar, Tooltip, type TipApi } from "@/components/dashboard/charts"
import * as S from "@/lib/scoring"
import * as F from "@/lib/finance"
import { SAMPLE } from "@/lib/sample"
import { moneyFormatter } from "@/lib/money"
import { useSampleData } from "@/lib/use-country"
import { CountryPicker } from "@/components/site/country-picker"

export function Hero() {
  const tip = React.useRef<TipApi | null>(null)
  const test = S.score(S.decode(SAMPLE.testCode))
  const data = useSampleData()
  const s = F.summarize(data)
  const fmt = moneyFormatter(data.currency, data.locale)
  const plan = F.surplusPlan(data, s)
  const COLORS: Record<string, string> = { colchon: "#0e7c66", deudas: "#d6453d", metas: "#f2b84b", largo: "#3d6fd6" }
  return (
    <section className="pb-16 pt-12 md:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">Finanzas para no financieros</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-[3.6rem]">
            Conoce tu excedente mensual y <span className="font-serif font-normal italic text-primary">ponlo a trabajar</span>.
          </h1>
          <p className="mt-5 max-w-[48ch] text-lg text-ink-2">
            Tu excedente es lo que te queda cada mes después de gastos y deudas. Haz tu diagnóstico gratis en 5 minutos y activa tu tablero: distribución de tus gastos, plan de desendeudamiento y en qué instrumentos ubicar tu excedente según tu objetivo.
          </p>
          <div className="mb-5 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/tablero?ejemplo">Ver un tablero de ejemplo</Link></Button>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Lock className="size-4 text-primary" />Tus respuestas y cifras se quedan en tu navegador</span>
            <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" />Gratis y sin registro</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative">
          <div className="grid grid-cols-2 gap-3">
            <BentoCard className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Excedente mensual</div>
              <div className="mt-1.5 font-num text-2xl font-bold"><CountUp value={s.margin} format={fmt.compact} /></div>
              <div className="mt-1 text-xs text-muted-foreground">Tasa de ahorro {Math.round(s.savingsRate * 100)}%</div>
            </BentoCard>
            <BentoCard className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Libre de deudas en</div>
              <div className="mt-1.5 font-num text-2xl font-bold"><CountUp value={F.payoff(s.debts, data.extraDebtPayment).months || 0} format={(n) => Math.round(n) + " meses"} /></div>
              <div className="mt-1 text-xs text-muted-foreground">Con un abono extra de {fmt.compact(data.extraDebtPayment)}</div>
            </BentoCard>
            <BentoCard className="col-span-2 p-4">
              <div className="text-sm font-bold">Plan para tu excedente</div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                {plan.split.map((x) => <div key={x.id} style={{ width: `${x.pct * 100}%`, background: COLORS[x.id] }} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {plan.split.map((x) => (
                  <span key={x.id} className="flex items-center gap-1.5 text-ink-2">
                    <i className="size-2 rounded-[2px]" style={{ background: COLORS[x.id] }} />{F.BUCKETS.find((b) => b.id === x.id)!.name}
                    <b className="font-num text-foreground">{fmt.compact(x.amount)}</b>
                  </span>
                ))}
              </div>
            </BentoCard>
            <BentoCard className="col-span-2 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-bold">Perfil financiero por áreas</div>
                <div className="text-xs text-muted-foreground">{test.total}/100 · {test.level.name}</div>
              </div>
              <Radar tip={tip} values={test.areas.map((a) => a.score)} axis={test.areas.map((a) => a.name)} size={220} />
            </BentoCard>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Ejemplo ilustrativo con datos ficticios</p>
            <CountryPicker />
          </div>
          <Tooltip api={tip} />
        </motion.div>
      </div>
    </section>
  )
}
