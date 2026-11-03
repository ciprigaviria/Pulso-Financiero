import type { Metadata } from "next"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { DashboardApp } from "@/components/dashboard/dashboard-app"

export const metadata: Metadata = {
  title: "Tu tablero financiero",
  description: "Tu tablero personal: cuánto te queda al mes, a dónde se va tu plata, tu plan de deudas y recomendaciones con tus números.",
}

export default function Tablero() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh]">
        <DashboardApp />
      </main>
      <SiteFooter />
    </>
  )
}
