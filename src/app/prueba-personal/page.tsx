import type { Metadata } from "next"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { Quiz } from "@/components/quiz/quiz"

export const metadata: Metadata = {
  title: "Test de salud financiera personal",
  description: "Responde 16 preguntas y descubre tu puntaje de salud financiera de 0 a 100. Gratis, sin montos ni datos personales.",
}

export default function PruebaPersonal() {
  return (
    <>
      <SiteHeader minimal />
      <main id="app" aria-live="polite" className="min-h-[70vh]">
        <Quiz />
      </main>
      <SiteFooter />
    </>
  )
}
