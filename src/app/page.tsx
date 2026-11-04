import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { Hero } from "@/components/home/hero"
import { Personas } from "@/components/home/personas"
import { BetaForm } from "@/components/home/beta-form"
import { AccessSteps } from "@/components/home/access-steps"
import { Hub } from "@/components/home/hub"
import { FeatureCards } from "@/components/home/feature-cards"
import { CountryMarquee } from "@/components/home/country-marquee"
import { Button } from "@/components/ui/button"
import Pricing from "@/components/ui/pricing"
import { trialText } from "@/lib/plans"
import { config } from "@/config"

const STEPS = [
  { n: "01", title: "Haz tu diagnóstico gratis", text: "16 preguntas sencillas, sin montos ni datos personales. En 5 minutos obtienes tu puntaje de salud financiera y tus alertas." },
  { n: "02", title: "Escribe tus gastos por WhatsApp", text: "Con Premium, le escribes al asistente como a un amigo: “almuerzo 25 mil”, “me pagaron la quincena”. Él entiende, clasifica y confirma." },
  { n: "03", title: "Tu tablero se actualiza solo", text: "Gastos, ingresos, cumplimiento de tu presupuesto, cuánto te queda y recomendaciones de ahorro e inversión, al día." },
]

const FAQ = [
  ["¿El diagnóstico es gratis?", "Sí, siempre. El puntaje, el semáforo de las 5 áreas, los hallazgos y tu potencial de mejora son gratis y sin registro. Pagas solo si quieres Pulso Premium."],
  ["¿Cuánto cuesta Pulso Premium?", `USD ${config.priceMonthly.toFixed(2).replace(".", ",")} al mes o USD ${config.priceAnnual.toFixed(2).replace(".", ",")} al año, que equivale a pagar menos de 10 meses. ${config.trialDays ? `Los primeros ${config.trialDays} días son gratis.` : ""}`],
  ["¿Cómo funciona la prueba gratis?", `Te suscribes con tu tarjeta y no se cobra nada durante ${config.trialDays} días. Si cancelas antes de que terminen, no pagas. Si sigues, se cobra el plan que elegiste.`],
  ["¿Cómo cancelo?", "Desde el enlace de administración de tu suscripción que llega en el correo de compra, en cualquier momento. Conservas el acceso hasta el final del periodo que ya pagaste. Después, tu tablero queda en modo consulta durante 90 días por si quieres volver, y luego borramos tus datos."],
  ["¿Cómo registro mis gastos?", "Le escribes al asistente de WhatsApp como hablas: “taxi 12 mil y café 6 mil”, “arriendo 1,2 millones”, “me pagaron 2 palos”. También puedes mandarle la foto de un recibo, pedirle “resumen” o preguntarle “cuánto llevo en restaurantes”. Cada lunes te envía el resumen de tu semana."],
  ["¿Cómo activo mi WhatsApp después de pagar?", "En el correo de bienvenida toca “Activar mi WhatsApp”: se abre el chat con el mensaje listo y solo das enviar. Tu número queda ligado a tu suscripción."],
  ["¿Tengo que conectar mi banco?", "No. Tú le escribes lo que gastas y lo que recibes. Nadie accede a tus cuentas bancarias."],
  ["¿Funciona en mi país?", "Sí. Trabaja en la moneda y con el formato de cifras de tu país: pesos, soles, quetzales, lempiras, colones, euros, dólares y más. El asistente lo detecta por tu número de WhatsApp."],
  ["¿Qué pasa con mis datos?", "El diagnóstico se calcula en tu navegador. Los movimientos que envías al asistente se guardan cifrados en tránsito en nuestra base para mostrarte tu tablero; no los vendemos ni los compartimos, y con el mensaje “borrar mis datos” los eliminas por completo."],
  ["¿Me recomiendan en qué invertir?", "Te indicamos qué tipo de instrumento conviene según tu plazo y te mostramos un comparador de tasas reales de tu país con su fuente oficial y fecha. No recibimos comisiones de ninguna entidad."],
  ["¿En qué se basa el puntaje?", "En el FinHealth Score de la Financial Health Network, adaptado a la realidad latinoamericana: pensión obligatoria, sistema público de salud y centrales de riesgo."],
  ["¿Esto es asesoría financiera?", "No. Es una herramienta educativa para que entiendas tu situación y tomes mejores decisiones. No vendemos créditos, seguros ni inversiones."],
]

export default function Home() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SiteHeader tone="dark" />
      <main>
        <Hero />
        <CountryMarquee />

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="mb-2 text-sm font-semibold text-primary">Cómo funciona</p>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl">Tus finanzas, al día con un mensaje de WhatsApp</h2>
              <ol className="mt-8 grid gap-7">
                {STEPS.map((s) => (
                  <li key={s.n} className="grid grid-cols-[auto_1fr] gap-4">
                    <span className="grid size-11 place-items-center rounded-2xl bg-accent font-num text-sm font-bold text-accent-foreground">{s.n}</span>
                    <div>
                      <h3 className="text-xl font-extrabold">{s.title}</h3>
                      <p className="mt-1.5 text-ink-2">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/#precios">Ver planes</Link></Button>
              </div>
            </div>
            <div>
              <Hub />
              <p className="mt-3 text-center text-xs text-muted-foreground">Todo lo que registras alimenta tu tablero, tus metas y tus recomendaciones.</p>
            </div>
          </div>
        </section>

        <section id="incluye" className="relative scroll-mt-20 overflow-hidden border-y bg-card py-20">
          <div aria-hidden="true" className="bg-guilloche pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-5">
            <p className="mb-2 text-sm font-semibold text-primary">{config.premiumName}</p>
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">Todo lo que necesitas para que tu dinero rinda</h2>
            <p className="mt-3 max-w-2xl text-ink-2">Un asistente que registra por ti y un tablero que te dice qué hacer. {trialText ? `Pruébalo ${trialText}.` : ""}</p>
            <div className="mt-8"><FeatureCards /></div>
          </div>
        </section>

        <section id="acceso" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16">
          <p className="mb-2 text-sm font-semibold text-primary">Al suscribirte</p>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">Empiezas en menos de 2 minutos</h2>
          <p className="mt-3 max-w-2xl text-ink-2">Sin cuentas, sin contraseñas y sin conectar tu banco.</p>
          <AccessSteps className="mt-8" />
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid items-start gap-10 md:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="mb-2 text-sm font-semibold text-primary">Quién está detrás</p>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Hecho por alguien de finanzas, explicado para quien no lo es</h2>
            </div>
            <div className="space-y-4 text-lg text-ink-2">
              <p>Pulso lo hace alguien que lleva años armando tableros financieros para gerencias en Latinoamérica. La idea es simple: llevar esa misma claridad a tus finanzas, sin tecnicismos. Si una palabra no se entiende, la cambiamos.</p>
              <p>No vendemos créditos, seguros ni inversiones, y no recibimos comisiones de ninguna entidad. Por eso el tablero puede decirte con total independencia qué ajustar y qué deuda priorizar.</p>
              <p className="font-serif text-2xl italic text-foreground">— El equipo de Pulso</p>
            </div>
          </div>
        </section>

        <Personas />

        <Pricing />

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="rounded-[28px] bg-[#0f1a17] px-6 py-12 text-[#eef3f1] md:px-12">
            <p className="text-sm font-semibold text-brand-bright">Estamos en beta</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-4xl">Únete a la beta: Premium sin costo a cambio de tu opinión</h2>
            <p className="mt-3 max-w-2xl text-[#b4c0bb]">Buscamos a las primeras personas que lo usen en serio durante un mes. Te damos {config.premiumName} completo, con el asistente de WhatsApp, y nos cuentas qué mejorar.</p>
            <BetaForm />
          </div>
        </section>

        <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight md:text-4xl">Preguntas frecuentes</h2>
          <div className="divide-y border-y">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none justify-between gap-3 text-lg font-bold">
                  {q}<span className="font-num text-primary group-open:hidden">+</span><span className="hidden font-num text-primary group-open:inline">–</span>
                </summary>
                <p className="mt-3 text-ink-2">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
