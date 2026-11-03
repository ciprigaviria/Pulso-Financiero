"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Clock, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreGauge } from "@/components/ui/score-gauge"
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"
import { areaColor } from "@/lib/scoring"
import { cn } from "@/lib/utils"

const DEMO = [["Gastar", 82], ["Ahorrar", 75], ["Deber", 87], ["Proteger", 68], ["Planear", 55]] as const
const bg = { verde: "bg-verde", amarillo: "bg-amarillo", rojo: "bg-rojo" } as const

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-14 md:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40%_50%_at_80%_30%,color-mix(in_srgb,var(--brand-bright)_22%,transparent),transparent_70%),radial-gradient(35%_40%_at_10%_10%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="size-2 animate-pulse rounded-full bg-brand-bright" /> Test gratis · 5 minutos
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            <VerticalCutReveal splitBy="words" staggerDuration={0.08} transition={{ type: "spring", stiffness: 220, damping: 30 }}>
              ¿Qué tan sanas están tus finanzas?
            </VerticalCutReveal>
          </h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-5 max-w-[36ch] text-lg text-muted-foreground md:text-xl">
            Responde 16 preguntas y recibe tu puntaje de 0 a 100, un diagnóstico de tus gastos, ahorro, deudas, protección y metas, y tu potencial de mejora.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mb-5 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer mi test gratis <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#como-funciona">Ver cómo funciona</a></Button>
          </motion.div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Lock className="size-4 text-primary" />No recopilamos tus respuestas</span>
            <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" />Resultado inmediato</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" />Basado en un método internacional</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: 1 }} transition={{ delay: 0.3, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-3xl border bg-card p-7 shadow-2xl shadow-black/10" aria-label="Ejemplo de resultado"
        >
          <div className="mb-5 flex items-center gap-5">
            <ScoreGauge value={73} color="amarillo" size={124} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ejemplo de resultado</div>
              <div className="text-xl font-extrabold text-amarillo">Estable con alertas</div>
              <p className="mt-1 text-sm text-muted-foreground">Vas bien, pero hay áreas que te pueden frenar.</p>
            </div>
          </div>
          <div className="grid gap-3">
            {DEMO.map(([name, v], i) => (
              <div key={name} className="grid grid-cols-[84px_1fr_32px] items-center gap-3 text-sm font-semibold">
                <span>{name}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div className={cn("h-full rounded-full", bg[areaColor(v)])} initial={{ width: 0 }} animate={{ width: v + "%" }} transition={{ delay: 0.6 + i * 0.08, duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
                </div>
                <span className="text-right tabular-nums text-ink-2">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
