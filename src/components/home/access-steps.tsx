// Cómo accede al tablero quien paga: se usa en el inicio (versión completa) y en la vista bloqueada (compacta).
import { CreditCard, LayoutDashboard, Mail, PencilLine, RefreshCw, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export const ACCESS_STEPS = [
  { icon: CreditCard, title: "Eliges tu plan", text: "Mensual o anual, en el checkout seguro de Lemon Squeezy. Los primeros días son gratis." },
  { icon: Mail, title: "Recibes tu acceso", text: "En un par de minutos llega un correo con el enlace a tu tablero, tu clave y el botón para abrir el asistente en WhatsApp." },
  { icon: PencilLine, title: "Le escribes “hola” al asistente", text: "Detecta tu país y tu moneda. Desde ahí, cada gasto o ingreso que le escribas queda registrado y clasificado." },
  { icon: LayoutDashboard, title: "Tu tablero se actualiza solo", text: "Gastos, ingresos, presupuesto, cuánto te queda y recomendaciones, cada vez que registras algo." },
]

export const ACCESS_NOTES = [
  { icon: RefreshCw, text: "Cancela cuando quieras desde el correo de compra. Conservas el acceso hasta el final del periodo pagado." },
  { icon: Smartphone, text: "Entra a tu tablero desde el celular o el computador con tu enlace personal." },
]

export function AccessSteps({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <ol className={cn("grid gap-2.5 text-sm", className)}>
        {ACCESS_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-num text-xs font-bold text-accent-foreground">{i + 1}</span>
            <span><b>{s.title}.</b> <span className="text-ink-2">{s.text}</span></span>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <div className={className}>
      <ol className="grid gap-4 md:grid-cols-4">
        {ACCESS_STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><s.icon className="size-5" /></span>
              <span className="font-num text-3xl font-bold text-muted-foreground/30">{i + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-extrabold leading-snug">{s.title}</h3>
            <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ACCESS_NOTES.map((n) => (
          <p key={n.text} className="flex items-start gap-2.5 rounded-2xl bg-muted/60 p-4 text-sm text-ink-2">
            <n.icon className="mt-0.5 size-4 shrink-0 text-primary" />{n.text}
          </p>
        ))}
      </div>
    </div>
  )
}
