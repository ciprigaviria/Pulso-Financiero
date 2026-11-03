import type { Metadata } from "next"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { DashboardApp } from "@/components/dashboard/dashboard-app"

export const metadata: Metadata = {
  title: "Tu tablero financiero",
  description: "Tu tablero personal: excedente mensual, distribución de gastos, plan de desendeudamiento y asignación de tu excedente, en la moneda de tu país.",
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
