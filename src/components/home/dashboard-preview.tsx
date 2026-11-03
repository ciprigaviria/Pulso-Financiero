"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { SAMPLE } from "@/lib/sample"
import { useSampleData } from "@/lib/use-country"
import { CountryPicker } from "@/components/site/country-picker"

export function DashboardPreview() {
  const data = useSampleData()
  return (
    <section id="tablero" className="scroll-mt-20 border-y bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-semibold text-primary">El tablero</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Tus finanzas, con la claridad de un estado financiero</h2>
            <p className="mt-3 text-ink-2">Excedente mensual, distribución de gastos, plan de desendeudamiento y asignación de tu excedente por objetivo. Prueba el simulador y recorre los gráficos: es un perfil de ejemplo con datos ficticios; el tuyo se construye con tus cifras.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CountryPicker />
            <Button asChild variant="outline"><Link href="/tablero?ejemplo">Abrir el ejemplo completo <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="relative max-h-[1750px] overflow-hidden">
          <DashboardView key={data.currency + (data.locale || "")} data={data} testCode={SAMPLE.testCode} readOnly />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-muted" />
        </div>
      </div>
    </section>
  )
}
