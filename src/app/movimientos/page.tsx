import type { Metadata } from "next"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { MovementsApp } from "@/components/bot/movements-app"

export const metadata: Metadata = {
  title: "Mis movimientos",
  description: "Tus gastos e ingresos registrados por WhatsApp, organizados por categoría y día.",
  robots: { index: false },
}

export default function Movimientos() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh]">
        <MovementsApp />
      </main>
      <SiteFooter />
    </>
  )
}
