import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { Hero } from "@/components/home/hero"
import { DashboardPreview } from "@/components/home/dashboard-preview"
import { Personas } from "@/components/home/personas"
import { BetaForm } from "@/components/home/beta-form"
import { AccessSteps } from "@/components/home/access-steps"
import { Button } from "@/components/ui/button"
import Pricing from "@/components/ui/pricing"

const STEPS = [
  { n: "01", title: "Haces el test gratis", text: "16 preguntas sencillas, sin montos ni datos personales. En 5 minutos sabes cómo estás: un puntaje de 0 a 100 y un semáforo de 5 áreas." },
  { n: "02", title: "Ves qué te frena", text: "Tus alertas, lo que revelan tus respuestas y la primera acción de tu plan. Gratis, sin registrarte." },
  { n: "03", title: "Sabes qué hacer con tu plata", text: "Si desbloqueas tu tablero, escribes tus números del mes y te dice qué recortar, qué deuda pagar primero y dónde poner lo que te sobra." },
]

const FAQ = [
  ["¿El test es gratis?", "Sí. El puntaje, el semáforo de las 5 áreas, los hallazgos, tu potencial y la vista previa del tablero son gratis. Solo pagas si quieres el tablero completo."],
  ["¿Dónde quedan mis números?", "En tu navegador. El tablero se calcula en tu dispositivo y no enviamos tus respuestas ni tus montos a ningún servidor. Para usarlo en otro dispositivo, descargas un respaldo y lo cargas allá."],
  ["¿Cómo entro al tablero después de pagar?", "Te llega un correo con el botón “Abrir mi tablero” y tu clave de acceso. Haces clic, escribes tus números del mes y listo. No creas cuenta ni contraseña."],
  ["¿Tengo que conectar mi banco?", "No. Escribes tú los totales del mes por categoría (vivienda, mercado, domicilios, deudas…), mirando tu extracto o la app de tu banco. Así nadie más ve tus movimientos."],
  ["¿Cómo veo mis gastos mes a mes?", "Cada mes entras con el mismo enlace, actualizas tus números y el tablero se recalcula: ves a dónde se va tu plata, cuánto te sobra y qué hacer con eso."],
  ["¿Y si cambio de celular o computador?", "Entras con tu clave y cargas tu respaldo, un archivo que descargas desde el tablero con un clic. Como tus números no se guardan en internet, el respaldo es la forma de llevarlos."],
  ["¿Me dicen en qué banco invertir?", "No recomendamos entidades. Te decimos qué tipo de producto usar según el plazo (cuenta de ahorro, depósito a plazo, fondo de inversión, pensión voluntaria) y te dejamos simular con la tasa que te ofrezca tu banco."],
  ["¿En qué se basa el puntaje?", "En el FinHealth Score de la Financial Health Network, un método usado por bancos y aseguradoras, adaptado a la realidad latinoamericana: pensión obligatoria, sistema público de salud y centrales de riesgo."],
  ["¿Esto es asesoría financiera?", "No. Es una herramienta educativa para que entiendas tu situación y te organices. No vendemos créditos, seguros ni inversiones, ni recomendamos productos."],
  ["¿Hay versión para negocios?", "Está en camino: un test y un tablero para dueños de pequeños negocios, con margen, punto de equilibrio y flujo de caja."],
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
      <SiteHeader />
      <main>
        <Hero />

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16">
          <div className="grid gap-x-10 gap-y-8 border-t pt-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="font-num text-sm text-primary">{s.n}</div>
                <h3 className="mt-2 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <DashboardPreview />

        <section id="acceso" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16">
          <p className="mb-2 text-sm font-semibold text-primary">Después de pagar</p>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">Así entras a tu tablero</h2>
          <p className="mt-3 max-w-2xl text-ink-2">Sin cuentas, sin contraseñas y sin conectar tu banco. Tus números se guardan solo en tu celular o computador.</p>
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
              <p>No vendemos créditos, seguros ni inversiones, y no ganamos comisión por recomendarte nada. Por eso el tablero puede decirte sin rodeos qué recortar y qué deuda pagar primero.</p>
              <p className="font-serif text-2xl italic text-foreground">— El equipo de Pulso</p>
            </div>
          </div>
        </section>

        <Personas />

        <Pricing />

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="rounded-[28px] bg-[#0f1a17] px-6 py-12 text-[#eef3f1] md:px-12">
            <p className="text-sm font-semibold text-brand-bright">Estamos en beta</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-4xl">Prueba el tablero completo gratis y cuéntanos qué te pareció</h2>
            <p className="mt-3 max-w-2xl text-[#b4c0bb]">Buscamos a las primeras personas que lo usen en serio. A cambio de tu opinión sincera, te damos acceso completo sin costo.</p>
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
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer el test gratis <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
