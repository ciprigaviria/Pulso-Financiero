"use client"

// Portada: título con palabras resaltadas, el teléfono con el asistente escribiendo en vivo y,
// alrededor, íconos de gastos que flotan y se van "metiendo" en el teléfono al bajar la página.
import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react"
import { ArrowRight, Car, Coffee, CreditCard, Home, Lightbulb, Lock, PiggyBank, Plane, Receipt, ShoppingCart, Smartphone, Target, TrendingUp, Utensils, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatDemo } from "@/components/home/chat-demo"
import { annualPerMonth, fmtUsd, trialText } from "@/lib/plans"
import { config } from "@/config"

type Tile = { icon: LucideIcon; x: number; y: number; label?: string; tint: string }
// Posición en % respecto al centro del teléfono (x negativo = izquierda)
const TILES: Tile[] = [
  { icon: ShoppingCart, x: -42, y: -30, label: "Mercado", tint: "#2ee59d" },
  { icon: Coffee, x: -30, y: -6, tint: "#f2c14e" },
  { icon: Car, x: -44, y: 14, label: "Transporte", tint: "#5cf2b8" },
  { icon: Home, x: -28, y: 34, tint: "#1fb37a" },
  { icon: Receipt, x: -40, y: 52, tint: "#e0742a" },
  { icon: Utensils, x: -20, y: -36, tint: "#f39a6b" },
  { icon: TrendingUp, x: 40, y: -32, label: "Inversión", tint: "#5b8def" },
  { icon: PiggyBank, x: 29, y: -8, tint: "#2ee59d" },
  { icon: Target, x: 44, y: 12, label: "Metas", tint: "#f2c14e" },
  { icon: CreditCard, x: 27, y: 32, tint: "#ff5d5d" },
  { icon: Lightbulb, x: 42, y: 50, tint: "#46e8a8" },
  { icon: Plane, x: 20, y: -38, tint: "#8fb2f5" },
  { icon: Smartphone, x: -14, y: 58, tint: "#5cf2b8" },
]

function FloatingTile({ t, i, progress }: { t: Tile; i: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion()
  // Al bajar, cada ícono viaja hacia el teléfono y se desvanece
  const x = useTransform(progress, [0, 0.55], [`${t.x * 1.0}vw`, "0vw"])
  const y = useTransform(progress, [0, 0.55], [`${t.y * 0.9}vh`, "8vh"])
  const scale = useTransform(progress, [0, 0.55], [1, 0.35])
  const opacity = useTransform(progress, [0, 0.4, 0.55], [1, 0.9, 0])
  const Icon = t.icon
  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[46%] hidden md:block" style={reduce ? { x: `${t.x}vw`, y: `${t.y * 0.9}vh` } : { x, y, scale, opacity }}>
      <div className="-translate-x-1/2 -translate-y-1/2" style={{ animation: reduce ? undefined : `pulso-float ${5 + (i % 4)}s ease-in-out ${i * 0.35}s infinite` }}>
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] p-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)] backdrop-blur-md">
          <span className="grid size-8 place-items-center rounded-xl" style={{ background: t.tint + "26", color: t.tint }}><Icon className="size-4" /></span>
          {t.label && <span className="pr-1 text-xs font-semibold text-white/80">{t.label}</span>}
        </div>
      </div>
    </motion.div>
  )
}

export function Hero() {
  const ref = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const phoneY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"])

  return (
    <section ref={ref} className="relative overflow-hidden bg-black text-white">
      {/* fondo: brillo verde, cuadrícula y grabado tipo billete */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[30%] mx-auto h-[700px] max-w-5xl rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, rgba(46,229,157,.45), rgba(46,229,157,.08) 45%, transparent 70%)" }} />
      <div aria-hidden="true" className="bg-guilloche-dark pointer-events-none absolute inset-0 opacity-60" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-6 pt-28 text-center md:pt-32">
        <aside className="mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs backdrop-blur-sm">
          <span className="font-semibold text-white">Finanzas para no financieros</span>
          <span className="hidden text-white/30 sm:inline">·</span>
          <span className="text-white/60">Funciona en 20 países y sus monedas</span>
          <Link href="/#como-funciona" className="flex items-center gap-1 text-white/60 transition-colors hover:text-white">Ver cómo <ArrowRight className="size-3" /></Link>
        </aside>

        <h1 className="max-w-4xl text-[2.5rem] font-semibold leading-[1.12] tracking-[-0.035em] md:text-6xl lg:text-[4.1rem]">
          Escribe tus gastos por{" "}
          <span className="relative inline-flex items-center gap-2 rounded-2xl bg-[#25d366]/15 px-3 align-middle text-[#5cf2b8] ring-1 ring-[#25d366]/30">
            <svg viewBox="0 0 24 24" className="size-[0.8em]" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.9-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
            WhatsApp
          </span>
          . <br className="hidden sm:block" />
          <span className="text-white/60">Pulso</span>{" "}
          <span className="font-serif font-normal italic tracking-[-0.01em] text-white">hace el resto.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/60 md:text-lg">
          Mandas “almuerzo 25 mil” y tu tablero se actualiza: gastos, ingresos, cumplimiento de tu presupuesto, cuánto te queda y recomendaciones de ahorro e inversión.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="white" className="rounded-lg"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="ghost-dark" className="rounded-lg"><Link href="/#precios">Ver planes</Link></Button>
        </div>
        <p className="mt-5 text-xs text-white/50"><Lock className="mr-1.5 inline size-3.5 align-[-2px]" />Diagnóstico gratis y sin registro · {config.premiumName} desde {fmtUsd(annualPerMonth)} al mes{trialText ? ` · ${trialText}` : ""}</p>
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6">
        {TILES.map((t, i) => <FloatingTile key={i} t={t} i={i} progress={scrollYProgress} />)}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }} style={{ y: phoneY }} className="relative z-10">
          <ChatDemo />
          <p className="mt-4 text-center text-xs text-white/40">Conversación de ejemplo con datos ficticios</p>
        </motion.div>
      </div>
    </section>
  )
}
