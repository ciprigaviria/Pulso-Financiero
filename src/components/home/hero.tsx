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
import { moneyFormatter } from "@/lib/store"

export function Hero() {
  const tip = React.useRef<TipApi | null>(null)
  const test = S.score(S.decode(SAMPLE.testCode))
  const s = F.summarize(SAMPLE.data)
  const fmt = moneyFormatter(SAMPLE.data.currency)
  return (
    <section className="pb-16 pt-12 md:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="mb-4 text-sm font-semibold text-primary">Test gratis · 5 minutos · sin registro</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-[3.6rem]">
            Mira tus finanzas como las ve un <span className="font-serif font-normal italic text-primary">analista</span>.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-ink-2">
            Haz el test y recibe tu puntaje de 0 a 100. Si quieres ir más allá, escribe tus números y arma tu tablero: cuánto te queda al mes, a dónde se va tu plata, cuándo sales de deudas y qué hacer primero.
          </p>
          <div className="mb-5 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer el test gratis <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/tablero?ejemplo">Ver un tablero de ejemplo</Link></Button>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Lock className="size-4 text-primary" />Tus respuestas y números se quedan en tu navegador</span>
            <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" />Resultado al instante</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative">
          <div className="grid grid-cols-2 gap-3">
            <BentoCard className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Te queda al mes</div>
              <div className="mt-1.5 font-mono text-2xl font-medium"><CountUp value={s.margin} format={fmt.compact} /></div>
              <div className="mt-1 text-xs text-muted-foreground">Tasa de ahorro {Math.round(s.savingsRate * 100)}%</div>
            </BentoCard>
            <BentoCard className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Libre de deudas en</div>
              <div className="mt-1.5 font-mono text-2xl font-medium"><CountUp value={F.payoff(s.debts, SAMPLE.data.extraDebtPayment).months || 0} format={(n) => Math.round(n) + " meses"} /></div>
              <div className="mt-1 text-xs text-muted-foreground">Pagando {fmt.compact(SAMPLE.data.extraDebtPayment)} extra</div>
            </BentoCard>
            <BentoCard className="col-span-2 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-bold">Tus 5 áreas</div>
                <div className="text-xs text-muted-foreground">{test.total}/100 · {test.level.name}</div>
              </div>
              <Radar tip={tip} values={test.areas.map((a) => a.score)} axis={test.areas.map((a) => a.name)} size={260} />
            </BentoCard>
          </div>
          <p className="mt-2 text-right text-xs text-muted-foreground">Ejemplo ilustrativo con datos ficticios</p>
          <Tooltip api={tip} />
        </motion.div>
      </div>
    </section>
  )
}
