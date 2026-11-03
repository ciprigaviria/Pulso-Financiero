"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { SAMPLE } from "@/lib/sample"

export function DashboardPreview() {
  return (
    <section id="tablero" className="scroll-mt-20 border-y bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-semibold text-primary">El tablero</p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Tus números, explicados en una sola pantalla</h2>
            <p className="mt-3 text-ink-2">Pasa el mouse por los gráficos. Este es un perfil de ejemplo con datos ficticios; el tuyo se arma con tu test y tus números.</p>
          </div>
          <Button asChild variant="outline"><Link href="/tablero?ejemplo">Abrir el ejemplo completo <ArrowRight /></Link></Button>
        </div>
        <div className="relative max-h-[1150px] overflow-hidden">
          <DashboardView data={SAMPLE.data} testCode={SAMPLE.testCode} readOnly />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-muted" />
        </div>
      </div>
    </section>
  )
}
