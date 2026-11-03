// Cómo accede al tablero quien paga: se usa en el inicio (versión completa) y en la vista bloqueada (compacta).
import { CreditCard, LayoutDashboard, Mail, PencilLine, RefreshCw, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export const ACCESS_STEPS = [
  { icon: CreditCard, title: "Pago único", text: "Con tarjeta u otros medios en el checkout seguro de Lemon Squeezy. Sin cuentas ni contraseñas." },
  { icon: Mail, title: "Acceso por correo", text: "En un par de minutos recibes el botón “Abrir mi tablero”, tu clave de acceso y tu informe en PDF." },
  { icon: PencilLine, title: "Registras tus cifras del mes", text: "Eliges tu país y moneda, y anotas ingresos, gastos por categoría y deudas. Son totales mensuales: unos 10 minutos con tu extracto bancario a la mano." },
  { icon: LayoutDashboard, title: "Tu tablero, al instante", text: "Distribución de gastos, recomendaciones priorizadas, plan de desendeudamiento y asignación de tu excedente." },
]

export const ACCESS_NOTES = [
  { icon: RefreshCw, text: "Cada mes entras con el mismo enlace, actualizas tus cifras y das seguimiento a tu evolución." },
  { icon: Smartphone, text: "¿Otro celular o computador? Entras con tu clave y cargas tu respaldo: un archivo que descargas desde el tablero con un clic." },
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
