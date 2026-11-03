"use client"

// Selector de plan de Pulso Premium (mensual / anual) con el botón de pago.
// Se usa en el resultado del test y en el tablero bloqueado.
import * as React from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { annualRegular, annualSavingPct, fmtUsd, PLANS, trialText, type PlanId } from "@/lib/plans"
import { checkoutUrl, type SavedTest } from "@/lib/store"
import { config } from "@/config"
import { cn } from "@/lib/utils"

export function PlanToggle({ value, onChange, className }: { value: PlanId; onChange: (p: PlanId) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Frecuencia de pago" className={cn("inline-flex rounded-full border bg-muted p-1 text-sm font-semibold", className)}>
      {(["mensual", "anual"] as PlanId[]).map((p) => (
        <button key={p} type="button" role="radio" aria-checked={value === p} onClick={() => onChange(p)}
          className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors", value === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {PLANS[p].name}
          {p === "anual" && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">−{annualSavingPct}%</span>}
        </button>
      ))}
    </div>
  )
}

export function PlanPrice({ plan, size = "lg" }: { plan: PlanId; size?: "lg" | "md" }) {
  const p = PLANS[plan]
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className={cn("font-num font-bold leading-none tracking-tight", size === "lg" ? "text-5xl" : "text-4xl")}>{p.priceText}</span>
        <span className="text-sm font-semibold text-muted-foreground">{p.period}</span>
        {plan === "anual" && (
          <span className="text-sm text-muted-foreground">
            <s className="font-num" aria-label={`Sin descuento: ${fmtUsd(annualRegular)}`}>{fmtUsd(annualRegular)}</s> <span className="text-xs">(12 × {fmtUsd(config.priceMonthly)})</span>
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-2">{p.note}</p>
    </div>
  )
}

export function PlanPicker({ test, email, className }: { test?: SavedTest | null; email?: string; className?: string }) {
  const [plan, setPlan] = React.useState<PlanId>("anual")
  const url = checkoutUrl(test || null, email, plan)
  return (
    <div className={className}>
      <PlanToggle value={plan} onChange={setPlan} />
      <div className="mt-4"><PlanPrice plan={plan} /></div>
      {url
        ? <Button asChild size="lg" className="mt-4 w-full"><a href={url}>{trialText ? `Empezar mis ${trialText}` : "Suscribirme"} <ArrowRight /></a></Button>
        : <Button size="lg" className="mt-4 w-full" disabled title="Falta configurar los enlaces de pago en src/config.ts">Pago no configurado</Button>}
      {trialText && <p className="mt-2 text-center text-xs text-muted-foreground">No se cobra nada durante los {trialText}. Si cancelas antes de que terminen, no pagas.</p>}
    </div>
  )
}
