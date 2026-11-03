"use client"

// Sección de precios. Adaptada de "PricingSection5": título que se revela palabra
// por palabra, tarjetas que aparecen en secuencia y precio animado con NumberFlow.
// Pulso vende un solo producto de pago único, así que no hay planes mensuales ni anuales.
import Link from "next/link"
import NumberFlow from "@number-flow/react"
import { motion, useInView } from "motion/react"
import { BarChart3, Bell, CalendarCheck, CheckCheck, CreditCard, FileText, Gauge, LayoutDashboard, Lock, Mail, PiggyBank, ShieldCheck } from "lucide-react"
import { useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimelineContent } from "@/components/ui/timeline-content"
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"
import { config } from "@/config"
import { cn } from "@/lib/utils"

type Plan = {
  name: string
  description: string
  price: number | null
  priceNote: string
  badge?: string
  popular?: boolean
  soon?: boolean
  cta: string
  href?: string
  features: { text: string; icon: React.ReactNode }[]
  includes: string[]
}

const plans: Plan[] = [
  {
    name: "Diagnóstico",
    description: "Para conocer en 5 minutos tu salud financiera.",
    price: 0,
    priceNote: "sin registrarte",
    cta: "Hacer mi diagnóstico gratis",
    href: "/prueba-personal",
    features: [
      { text: "Puntaje de 0 a 100 y tu nivel", icon: <Gauge size={20} /> },
      { text: "Semáforo y perfil de las 5 áreas", icon: <BarChart3 size={20} /> },
      { text: "Vista previa de tu tablero", icon: <LayoutDashboard size={20} /> },
    ],
    includes: ["Incluye:", "Hallazgos clave de tus respuestas", "Tu potencial de mejora", "Tus alertas rojas", "La primera acción de tu plan"],
  },
  {
    name: "Tablero completo",
    description: "Tu plan financiero personal, actualizado mes a mes.",
    price: config.pricePersonal,
    priceNote: "pago único",
    badge: config.priceRegular ? config.launchLabel : undefined,
    popular: true,
    cta: "Empezar por el diagnóstico",
    href: "/prueba-personal",
    features: [
      { text: "Tu excedente mensual real", icon: <LayoutDashboard size={20} /> },
      { text: "Asignación del excedente por objetivo", icon: <PiggyBank size={20} /> },
      { text: "Plan de desendeudamiento", icon: <CalendarCheck size={20} /> },
    ],
    includes: ["Todo lo del diagnóstico, más:", "Instrumentos sugeridos según tu plazo", "Simulador de interés compuesto con la tasa de tu banco", "Distribución de gastos por categoría", "Recomendaciones priorizadas con tus cifras", "En la moneda de tu país", "Plan de 30 días e informe en PDF"],
  },
  {
    name: "Pulso Mensual",
    description: "Suscripción opcional para seguir tu avance mes a mes.",
    price: null,
    priceNote: "muy pronto",
    soon: true,
    cta: "Disponible pronto",
    features: [
      { text: "Evolución mes a mes", icon: <BarChart3 size={20} /> },
      { text: "Recordatorios y alertas", icon: <Bell size={20} /> },
      { text: "Diagnóstico trimestral comparativo", icon: <FileText size={20} /> },
    ],
    includes: ["Se suma al tablero completo:", "Historial de tus cifras", "Seguimiento de tus metas", "Nuevas recomendaciones cada mes"],
  },
]

function Price({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <span ref={ref} className="flex items-baseline gap-1.5 text-5xl font-extrabold tracking-tight">
      {value === 0 ? "Gratis" : (
        <>
          <span className="text-2xl font-bold text-muted-foreground">{config.currency}</span>
          <NumberFlow value={inView ? value : 0} className="font-num font-bold" />
        </>
      )}
    </span>
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
          El diagnóstico siempre es gratis. Si quieres un plan para tu dinero, activas tu tablero con un pago único y lo usas todos los meses.
        </TimelineContent>
      </article>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan, index) => (
          <TimelineContent key={plan.name} as="div" animationNum={1 + index}>
            <Card className={cn("relative h-full rounded-2xl", plan.popular ? "bg-accent/60 ring-2 ring-primary" : "bg-card", plan.soon && "opacity-80")}>
              <CardHeader className="text-left">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-extrabold tracking-tight">{plan.name}</h3>
                  {plan.badge && <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{plan.badge}</span>}
                  {plan.soon && <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Próximamente</span>}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">{plan.description}</p>
                <div className="flex min-h-14 items-baseline gap-2">
                  {plan.price !== null ? <Price value={plan.price} /> : <span className="text-3xl font-extrabold text-muted-foreground">—</span>}
                  <span className="text-sm font-semibold text-muted-foreground">{plan.priceNote}</span>
                </div>
                {plan.popular && config.priceRegular && (
                  <p className="text-sm font-semibold text-ink-2">Sube a {config.currency} {config.priceRegular} cuando termine el lanzamiento.</p>
                )}
              </CardHeader>
              <CardContent>
                {plan.href ? (
                  <Button asChild size="lg" variant={plan.popular ? "default" : "dark"} className="mb-3 w-full">
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="mb-3 w-full" disabled>{plan.cta}</Button>
                )}
                {plan.popular && <p className="mb-4 text-xs text-muted-foreground">Primero haces el diagnóstico: el tablero se construye con tus respuestas.</p>}

                <ul className="mb-5 mt-4 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm font-semibold">
                      <span className="text-primary">{f.icon}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-bold">{plan.includes[0]}</h4>
                  <ul className="space-y-2">
                    {plan.includes.slice(1).map((feature) => (
                      <li key={feature} className="flex items-start">
                        <span className="mr-3 mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border border-primary bg-card">
                          <CheckCheck className="size-4 text-primary" />
                        </span>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border bg-card px-6 py-4 text-sm font-semibold text-muted-foreground"
      >
        <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Pago seguro con Lemon Squeezy</span>
        <span className="flex items-center gap-2"><CreditCard className="size-4 text-primary" />Tarjeta de crédito o débito y otros medios en el checkout</span>
        <span className="flex items-center gap-2"><Mail className="size-4 text-primary" />Acceso por correo en minutos, sin crear cuenta</span>
        <span className="flex items-center gap-2"><Lock className="size-4 text-primary" />Tus cifras se quedan en tu navegador</span>
      </motion.div>
    </div>
  )
}
