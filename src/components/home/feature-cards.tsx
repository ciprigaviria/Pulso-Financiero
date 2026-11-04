"use client"

// Fila deslizable con "pantallazos" de Premium: pagos fijos, presupuesto, metas, deudas y tasas.
// Datos ficticios en la moneda del visitante; las barras se llenan al entrar en pantalla.
import * as React from "react"
import { motion } from "motion/react"
import { AlertTriangle, ArrowLeft, ArrowRight, Bell, CalendarCheck, Landmark, PiggyBank, Target, Wallet } from "lucide-react"
import { moneyFormatter } from "@/lib/money"
import { FX_PER_USD } from "@/lib/sample"
import { useVisitorCountry } from "@/lib/use-country"
import { cn } from "@/lib/utils"

function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, pct)}%` }} viewport={{ once: true }} transition={{ duration: 1.1, delay, ease: [0.3, 0.8, 0.2, 1] }} />
    </div>
  )
}

function Frame({ icon: Icon, title, badge, badgeTone = "muted", children }: { icon: React.ElementType; title: string; badge?: string; badgeTone?: "muted" | "warn"; children: React.ReactNode }) {
  return (
    <div className="h-[300px] overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold"><span className="grid size-7 place-items-center rounded-lg bg-muted"><Icon className="size-4" /></span>{title}</span>
        {badge && <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badgeTone === "warn" ? "bg-amarillo/20 text-[#8a6410]" : "bg-muted text-muted-foreground")}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

export function FeatureCards() {
  const country = useVisitorCountry()
  const cur = FX_PER_USD[country.currency] ? country.currency : "USD"
  const fmt = moneyFormatter(cur, FX_PER_USD[country.currency] ? country.locale : "es-US")
  const k = FX_PER_USD[cur]
  const m = (usd: number) => { const x = usd * k; const s = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / s) * s }
  const scroller = React.useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 340, behavior: "smooth" })

  const cards: { key: string; title: string; text: string; ui: React.ReactNode }[] = [
    {
      key: "fijos", title: "Nada se cobra sin que lo sepas", text: "El asistente detecta tus pagos fijos y suscripciones, te recuerda antes de cada cobro y te muestra cuánto se van al año.",
      ui: (
        <Frame icon={Bell} title="Pagos fijos" badge="3 por vencer" badgeTone="warn">
          {[["Arriendo", "día 5", 420, ""], ["Netflix", "se cobra hoy", 12, "hoy"], ["Plan celular", "día 12", 36, ""]].map(([n, d, v, tag]) => (
            <div key={String(n)} className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2">
              <div>
                <div className="text-sm font-semibold">{n}</div>
                <div className="text-[11px] text-muted-foreground">Mensual · {tag ? <span className="rounded bg-amarillo/25 px-1 text-[#8a6410]">{d}</span> : d}</div>
                {tag && <div className="mt-1.5 flex gap-1.5"><span className="rounded-md bg-[#d9fdd3] px-2 py-0.5 text-[11px] font-semibold text-[#0b6b3a]">Pagado</span><span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold">Revisar</span></div>}
              </div>
              <span className="font-num text-sm font-bold text-rojo">{fmt.full(m(Number(v)))}</span>
            </div>
          ))}
        </Frame>
      ),
    },
    {
      key: "presupuesto", title: "Presupuestos que avisan antes", text: "Defines cuánto gastar por categoría y el asistente te escribe cuando vas en el 80 %, no cuando ya te pasaste.",
      ui: (
        <Frame icon={Wallet} title="Presupuesto del mes" badge="cierra en 9 días">
          {[["Mercado", 160, 260, "#14b88f"], ["Restaurantes", 104, 120, "#f2b84b"], ["Transporte", 48, 80, "#14b88f"], ["Salidas", 92, 85, "#d6453d"]].map(([n, used, total, c], i) => (
            <div key={String(n)} className="mb-3">
              <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{n}</span><span className="font-num text-muted-foreground"><b className={Number(used) > Number(total) ? "text-rojo" : "text-foreground"}>{fmt.full(m(Number(used)))}</b> de {fmt.full(m(Number(total)))}</span></div>
              <Bar pct={(Number(used) / Number(total)) * 100} color={String(c)} delay={i * 0.12} />
            </div>
          ))}
          <div className="mt-3 flex items-start gap-2 rounded-xl border bg-background px-3 py-2 text-xs"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amarillo" />Restaurantes va en el 87 %. Te quedan {fmt.full(m(16))} hasta fin de mes.</div>
        </Frame>
      ),
    },
    {
      key: "metas", title: "Metas con fecha y avance", text: "Pones nombre, monto y fecha; el tablero te dice cuánto apartar cada mes y cómo vas.",
      ui: (
        <Frame icon={Target} title="Metas" badge="3 en curso">
          {[["Fondo de emergencia", 40, 1200, "sin fecha"], ["Viaje de fin de año", 69, 900, "para diciembre"], ["Computador nuevo", 85, 700, "para marzo"]].map(([n, p, goal, when], i) => (
            <div key={String(n)} className="mb-2.5 rounded-xl border px-3 py-2.5">
              <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{n}</span><span className="font-num text-xs font-bold text-primary">{p}%</span></div>
              <Bar pct={Number(p)} color="#14b88f" delay={i * 0.15} />
              <div className="mt-1 text-[11px] text-muted-foreground"><span className="font-num">{fmt.full(m((Number(goal) * Number(p)) / 100))}</span> de <span className="font-num">{fmt.full(m(Number(goal)))}</span> · {when}</div>
            </div>
          ))}
        </Frame>
      ),
    },
    {
      key: "deudas", title: "Sal de deudas con un plan", text: "Qué deuda pagar primero, en cuántos meses quedas libre y cuánto te ahorras en intereses con cada abono extra.",
      ui: (
        <Frame icon={CalendarCheck} title="Plan de desendeudamiento">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/60 p-3"><div className="text-[11px] text-muted-foreground">Libre de deudas en</div><div className="font-num text-2xl font-bold">15 meses</div></div>
            <div className="rounded-xl bg-muted/60 p-3"><div className="text-[11px] text-muted-foreground">Intereses que te ahorras</div><div className="font-num text-2xl font-bold text-verde">{fmt.compact(m(410))}</div></div>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            {[["1. Tarjeta de crédito", "2,4% mensual", "mes 6"], ["2. Crédito de consumo", "1,6% mensual", "mes 15"]].map(([a, b, c]) => (
              <div key={a} className="flex items-center justify-between rounded-xl border px-3 py-2"><span><b className="block">{a}</b><span className="text-[11px] text-muted-foreground">{b}</span></span><span className="font-num text-xs font-bold">{c}</span></div>
            ))}
          </div>
        </Frame>
      ),
    },
    {
      key: "tasas", title: "Tu excedente, donde más rinde", text: "Recomendaciones de inversión según tu plazo y un comparador de tasas de tu país, con su fuente oficial y la fecha de actualización.",
      ui: (
        <Frame icon={Landmark} title="Tasas en tu país" badge="ejemplo">
          {[["Cuenta de alto rendimiento", "Retiro inmediato", 9.1], ["Depósito a plazo 360 días", "Al vencimiento", 10.4], ["Fondo de mercado monetario", "En 1 día", 9.6], ["Fondo diversificado", "Largo plazo · varía", 12.0]].map(([n, d, r], i) => (
            <div key={String(n)} className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2">
              <span><b className="block text-sm">{n}</b><span className="text-[11px] text-muted-foreground">{d}</span></span>
              <span className={cn("font-num text-sm font-bold", i === 1 ? "text-primary" : "")}>{fmt.num(Number(r), 1)}% EA</span>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><PiggyBank className="size-3.5" />Fuente oficial y fecha en cada tasa</div>
        </Frame>
      ),
    },
  ]

  return (
    <div className="relative">
      <div className="mb-5 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="Anterior" className="grid size-10 place-items-center rounded-full border bg-card hover:bg-muted"><ArrowLeft className="size-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Siguiente" className="grid size-10 place-items-center rounded-full border bg-card hover:bg-muted"><ArrowRight className="size-4" /></button>
      </div>
      <div ref={scroller} className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c, i) => (
          <motion.article key={c.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.08, duration: 0.5 }}
            className="w-[300px] shrink-0 snap-start sm:w-[330px]">
            {c.ui}
            <h3 className="mt-4 text-lg font-extrabold tracking-tight">{c.title}</h3>
            <p className="mt-1 text-sm text-ink-2">{c.text}</p>
          </motion.article>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Pantallas de ejemplo con datos ficticios.</p>
    </div>
  )
}
