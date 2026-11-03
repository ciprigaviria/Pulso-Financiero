import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { Hero } from "@/components/home/hero"
import { Button } from "@/components/ui/button"
import { TimelineContent } from "@/components/ui/timeline-content"
import PulsoFeatures from "@/components/ui/pulso-features"
import Pricing from "@/components/ui/pricing"

const STEPS = [
  { n: 1, title: "Responde 16 preguntas", text: "Sobre cómo gastas, ahorras, te endeudas, te proteges y planeas. Toma unos 5 minutos y nunca pedimos montos." },
  { n: 2, title: "Recibe tu diagnóstico", text: "Tu puntaje de 0 a 100, tu nivel, un semáforo por área, tus alertas y tu potencial de mejora. Gratis y al instante." },
  { n: 3, title: "Pasa a la acción", text: "Si quieres, llévate el paquete completo: informe en PDF, plan de 30 días y archivo de presupuesto." },
]

const FAQ = [
  ["¿El test es gratis?", "Sí. El puntaje, tu nivel, el semáforo de las 5 áreas, los hallazgos clave y tu potencial de mejora son gratis. Solo pagas si quieres el paquete completo."],
  ["¿Guardan mis respuestas?", "No. El puntaje se calcula en tu propio navegador y tus respuestas no se envían a ningún servidor. Solo si decides pedir tu informe por correo nos llegan tu correo y tus respuestas, con tu autorización."],
  ["¿Tengo que escribir cuánto gano o cuánto debo?", "No. Todas las preguntas usan rangos. No pedimos nombre, documento ni montos de dinero."],
  ["¿En qué se basa el puntaje?", "En el FinHealth Score de la Financial Health Network, un método usado por bancos y aseguradoras, adaptado a la realidad latinoamericana: pensión obligatoria, sistema público de salud y centrales de riesgo."],
  ["¿Esto es asesoría financiera?", "No. Es una herramienta educativa para que entiendas tu situación y te organices. No recomendamos productos financieros ni reemplaza a un asesor."],
  ["¿Cómo recibo el paquete si pago?", "Llega a tu correo en pocos minutos: el informe en PDF, el archivo de presupuesto y el plan de 30 días. El pago se procesa de forma segura con Lemon Squeezy."],
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

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
          <div className="mb-10 max-w-2xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Cómo funciona</div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Un chequeo financiero tan simple como medirte el pulso</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <TimelineContent key={s.n} animationNum={i} className="rounded-2xl border bg-card p-7 shadow-sm">
                <div className="mb-4 grid size-10 place-items-center rounded-xl bg-accent font-extrabold text-primary">{s.n}</div>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-muted-foreground">{s.text}</p>
              </TimelineContent>
            ))}
          </div>
        </section>

        <section className="bg-hatch px-3 py-16 md:px-6">
          <PulsoFeatures />
        </section>

        <Pricing />

        <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Preguntas frecuentes</div>
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight md:text-4xl">Lo que la gente pregunta</h2>
          <div className="grid gap-2.5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border bg-card px-5 py-4">
                <summary className="flex cursor-pointer list-none justify-between gap-3 font-bold">
                  {q}<span className="font-extrabold text-primary group-open:hidden">+</span><span className="hidden font-extrabold text-primary group-open:inline">–</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="rounded-3xl bg-[#0f1a17] px-6 py-14 text-center text-[#eef3f1] md:px-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Cinco minutos hoy pueden ahorrarte años de estrés</h2>
            <p className="mb-7 mt-3 text-[#b4c0bb]">Descubre tu puntaje y qué área mover primero.</p>
            <Button asChild size="lg"><Link href="/prueba-personal">Hacer mi test gratis <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
