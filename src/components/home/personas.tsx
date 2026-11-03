import * as S from "@/lib/scoring"
import { PERSONAS } from "@/lib/sample"
import { cn } from "@/lib/utils"

const bg = { verde: "bg-verde", amarillo: "bg-amarillo", naranja: "bg-naranja", rojo: "bg-rojo" } as const

export function Personas() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <p className="mb-2 text-sm font-semibold text-primary">Perfiles de ejemplo</p>
      <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">Tres resultados posibles, tres planes distintos</h2>
      <p className="mt-3 max-w-2xl text-ink-2">Son perfiles ilustrativos armados con respuestas ficticias, no clientes. Sirven para ver cómo cambia el diagnóstico según la situación.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PERSONAS.map((p) => {
          const r = S.score(S.decode(p.code))
          return (
            <article key={p.name} className="rounded-3xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{p.name} · ilustrativo</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold text-white", bg[r.level.color])}>{r.level.name}</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-num text-5xl font-bold tracking-tight">{r.total}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <p className="mt-1 text-sm font-semibold">{p.who}</p>
              <div className="mt-4 flex gap-1">
                {r.areas.map((a) => (
                  <div key={a.id} className="flex-1" title={`${a.name}: ${a.score}`}>
                    <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", bg[a.color])} style={{ width: a.score + "%" }} /></div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{a.name}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-ink-2"><b className="text-foreground">Lo que encontró el test:</b> {p.finding}</p>
              <p className="mt-2 text-sm text-ink-2"><b className="text-foreground">Primer paso del plan:</b> {p.next}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
