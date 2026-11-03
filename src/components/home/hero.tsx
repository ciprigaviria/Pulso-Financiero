"use client"

// Portada en negro, inspirada en la plantilla "SaaS template": aviso tipo píldora, título blanco
// con degradado, botón blanco y, debajo, el tablero real (no una imagen) dentro de un marco con brillo.
// El tablero del marco usa los datos de ejemplo en la moneda del visitante.
import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSize } from "@/components/dashboard/charts"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { CountryPicker } from "@/components/site/country-picker"
import { SAMPLE } from "@/lib/sample"
import { useSampleData } from "@/lib/use-country"
import { annualPerMonth, fmtUsd, trialText } from "@/lib/plans"
import { config } from "@/config"

/** Muestra un componente ancho escalado para que quepa en el contenedor, como una captura viva. */
function ScaledPreview({ children, width, visibleHeight }: { children: React.ReactNode; width: number; visibleHeight: number }) {
  const [ref, { w }] = useSize()
  const scale = w ? Math.min(1, w / width) : 0
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: w ? visibleHeight * scale : visibleHeight * 0.5 }}>
      <div inert aria-hidden="true" style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", opacity: scale ? 1 : 0, transition: "opacity .4s" }}>
        {children}
      </div>
    </div>
  )
}

export function Hero() {
  const data = useSampleData()
  const [frameRef, { w }] = useSize()
  const inner = w && w < 640 ? 860 : 1180

  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* brillo y cuadrícula de fondo */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[38%] mx-auto h-[620px] max-w-5xl rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, rgba(20,184,143,.45), rgba(20,184,143,.08) 45%, transparent 70%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black 20%, transparent 65%)" }} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-10 pt-14 text-center md:pt-20">
        <aside className="mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs backdrop-blur-sm">
          <span className="font-semibold text-white">Finanzas para no financieros</span>
          <span className="hidden text-white/30 sm:inline">·</span>
          <span className="text-white/60">Nuevo: registra tus gastos por WhatsApp</span>
          <Link href="/tablero?ejemplo" className="flex items-center gap-1 text-white/60 transition-colors hover:text-white">
            Ver ejemplo <ArrowRight className="size-3" />
          </Link>
        </aside>

        <h1 className="max-w-5xl text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.04em] md:text-6xl lg:text-[4.25rem]"
          style={{ background: "linear-gradient(to bottom, #fff 30%, rgba(255,255,255,.62))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Escribe tus gastos por WhatsApp. <br className="hidden sm:block" /><span className="font-serif font-normal italic tracking-[-0.01em]">Pulso hace el resto.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/60 md:text-lg">
          Mandas “almuerzo 25 mil” y tu tablero se actualiza: gastos, ingresos, cumplimiento de tu presupuesto, cuánto te queda y recomendaciones de ahorro e inversión. Empieza con un diagnóstico gratis de 5 minutos.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="white" className="rounded-lg"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="ghost-dark" className="rounded-lg"><Link href="/#como-funciona">Ver cómo funciona</Link></Button>
        </div>
        <p className="mt-5 text-xs text-white/50"><Lock className="mr-1.5 inline size-3.5 align-[-2px]" />Diagnóstico gratis y sin registro · {config.premiumName} desde {fmtUsd(annualPerMonth)} al mes{trialText ? ` · ${trialText}` : ""}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }}
        className="relative mx-auto max-w-6xl px-3 pb-16 sm:px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_0_80px_-20px_rgba(20,184,143,.5)] sm:p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 px-2 pt-0.5 sm:mb-2.5">
            <i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" />
            <span className="mx-auto hidden rounded-md bg-white/5 px-3 py-0.5 text-[11px] text-white/40 sm:block">pulso · mi tablero</span>
          </div>
          <div ref={frameRef} className="overflow-hidden rounded-xl bg-background">
            <div className="p-3 sm:p-4">
              <ScaledPreview width={inner} visibleHeight={inner < 1000 ? 1500 : 1180}>
                <DashboardView key={data.currency} data={data} testCode={SAMPLE.testCode} readOnly />
              </ScaledPreview>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-2 top-[15.5rem] z-10 hidden w-64 flex-col gap-2 lg:flex xl:-right-8">
          <div className="self-end rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] text-[#111b21] shadow-xl">almuerzo 25 mil</div>
          <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] text-[#111b21] shadow-xl">✓ Gasto · Restaurantes<br /><span className="text-[#667781]">Vas en el 62% de tu presupuesto</span></div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent via-black/85 to-black" />
        <div className="relative -mt-24 flex flex-wrap items-center justify-center gap-3">
          <p className="text-xs text-white/50">Ejemplo ilustrativo con datos ficticios</p>
          <CountryPicker tone="dark" />
        </div>
      </motion.div>
    </section>
  )
}
