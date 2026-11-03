"use client"

// Sección de precios: diagnóstico gratis + Pulso Premium mensual o anual.
// El plan anual muestra tachado 12 × el precio mensual (comparación real, no un precio anterior).
import Link from "next/link"
import NumberFlow from "@number-flow/react"
import { motion, useInView } from "motion/react"
import { CheckCheck, CreditCard, Gift, Lock, MessageCircle, ShieldCheck } from "lucide-react"
import { useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimelineContent } from "@/components/ui/timeline-content"
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"
import { annualPerMonth, annualRegular, annualSaving, annualSavingPct, fmtUsd, PLANS, PREMIUM_FEATURES, trialText, type PlanId } from "@/lib/plans"
import { checkoutUrl } from "@/lib/store"
import { config } from "@/config"
import { cn } from "@/lib/utils"

function Price({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <span ref={ref} className="flex items-baseline gap-1.5 text-5xl font-extrabold tracking-tight">
      {value === 0 ? <span className="font-num">Gratis</span> : (
        <>
          <span className="text-2xl font-bold text-muted-foreground">{config.currency}</span>
          <NumberFlow value={inView ? value : 0} className="font-num font-bold" locales="es-CO" format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }} />
        </>
      )}
    </span>
  )
}

function PremiumCard({ plan, index }: { plan: PlanId; index: number }) {
  const p = PLANS[plan]
  const annual = plan === "anual"
  const url = checkoutUrl(null, undefined, plan)
  return (
    <TimelineContent as="div" animationNum={1 + index}>
      <Card className={cn("relative h-full rounded-2xl", annual ? "bg-[#0f1a17] text-white ring-2 ring-primary" : "bg-card")}>
        <CardHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-2xl font-extrabold tracking-tight">Premium {p.name.toLowerCase()}</h3>
            {annual && <span className="shrink-0 rounded-full bg-brand-bright px-3 py-1 text-xs font-bold text-[#062019]">Ahorra {annualSavingPct}%</span>}
          </div>
          <p className={cn("mb-2 text-sm", annual ? "text-white/60" : "text-muted-foreground")}>{annual ? "Un pago al año, el mejor precio." : "Paga mes a mes, sin compromiso."}</p>
          <div className="flex min-h-14 items-baseline gap-2">
            <Price value={p.price} />
            <span className={cn("text-sm font-semibold", annual ? "text-white/60" : "text-muted-foreground")}>{p.period}</span>
          </div>
          {annual
            ? <p className="text-sm text-white/70"><s className="font-num">{fmtUsd(annualRegular)}</s> pagando 12 meses · equivale a <b className="text-white">{fmtUsd(annualPerMonth)}/mes</b></p>
            : <p className="text-sm text-muted-foreground">Cancela cuando quieras desde tu correo de compra.</p>}
        </CardHeader>
        <CardContent>
          {url
            ? <Button asChild size="lg" variant={annual ? "white" : "default"} className={cn("mb-2 w-full", annual && "rounded-full")}><a href={url}>{trialText ? `Empezar ${trialText}` : "Suscribirme"}</a></Button>
            : <Button size="lg" variant={annual ? "white" : "default"} className={cn("mb-2 w-full", annual && "rounded-full")} disabled title="Falta configurar los enlaces de pago en src/config.ts">Pago no configurado</Button>}
          <p className={cn("mb-5 text-xs", annual ? "text-white/50" : "text-muted-foreground")}>
            {trialText ? `${trialText}, luego ${p.priceText}${p.period}. ` : ""}{annual ? `Ahorras ${fmtUsd(annualSaving)} al año.` : "Sin permanencia."}
          </p>
          <div className={cn("space-y-3 border-t pt-4", annual && "border-white/10")}>
            <h4 className="text-sm font-bold">Todo Premium:</h4>
            <ul className="space-y-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.title} className="flex items-start">
                  <span className={cn("mr-3 mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border", annual ? "border-brand-bright bg-white/5" : "border-primary bg-card")}>
                    <CheckCheck className={cn("size-4", annual ? "text-brand-bright" : "text-primary")} />
                  </span>
                  <span className={cn("text-sm", annual ? "text-white/80" : "text-muted-foreground")}>{f.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </TimelineContent>
  )
}

export default function Pricing() {
  return (
    <div id="precios" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <article className="mb-8 max-w-2xl space-y-4 text-left">
        <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          <VerticalCutReveal splitBy="words" staggerDuration={0.12} reverse containerClassName="justify-start" transition={{ type: "spring", stiffness: 250, damping: 40 }}>
            Empieza gratis. Decide con un plan.
          </VerticalCutReveal>
        </h2>
        <TimelineContent as="p" animationNum={0} className="text-muted-foreground md:text-lg">
          El diagnóstico siempre es gratis. {config.premiumName} suma el asistente de WhatsApp y tu tablero completo{trialText ? `, con ${trialText} para probarlo` : ""}.
        </TimelineContent>
      </article>

      <div className="grid gap-5 md:grid-cols-3">
        <TimelineContent as="div" animationNum={1}>
          <Card className="relative h-full rounded-2xl bg-card">
            <CardHeader className="text-left">
              <h3 className="text-2xl font-extrabold tracking-tight">Diagnóstico</h3>
              <p className="mb-2 text-sm text-muted-foreground">Para conocer en 5 minutos tu salud financiera.</p>
              <div className="flex min-h-14 items-baseline gap-2"><Price value={0} /><span className="text-sm font-semibold text-muted-foreground">sin registro</span></div>
              <p className="text-sm text-muted-foreground">Sin tarjeta y sin crear cuenta.</p>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" variant="outline" className="mb-7 w-full"><Link href="/prueba-personal">Hacer mi diagnóstico gratis</Link></Button>
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-bold">Incluye:</h4>
                <ul className="space-y-2">
                  {["Puntaje de salud financiera de 0 a 100", "Semáforo de 5 áreas y tus alertas", "Lo que revelan tus respuestas", "Tu potencial de mejora", "La primera acción de tu plan"].map((f) => (
                    <li key={f} className="flex items-start">
                      <span className="mr-3 mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border border-primary bg-card"><CheckCheck className="size-4 text-primary" /></span>
                      <span className="text-sm text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TimelineContent>
        <PremiumCard plan="mensual" index={1} />
        <PremiumCard plan="anual" index={2} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border bg-card px-6 py-4 text-sm font-semibold text-muted-foreground"
      >
        {trialText && <span className="flex items-center gap-2"><Gift className="size-4 text-primary" />{trialText}, cancela cuando quieras</span>}
        <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Pago seguro con Lemon Squeezy</span>
        <span className="flex items-center gap-2"><CreditCard className="size-4 text-primary" />Tarjeta de crédito o débito y otros medios</span>
        <span className="flex items-center gap-2"><MessageCircle className="size-4 text-primary" />Acceso por correo y WhatsApp</span>
        <span className="flex items-center gap-2"><Lock className="size-4 text-primary" />No vendemos tus datos</span>
      </motion.div>
    </div>
  )
}
