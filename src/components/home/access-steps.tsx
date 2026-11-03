// Cómo accede al tablero quien paga: se usa en el inicio (versión completa) y en la vista bloqueada (compacta).
import { CreditCard, LayoutDashboard, Mail, PencilLine, RefreshCw, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export const ACCESS_STEPS = [
  { icon: CreditCard, title: "Pagas una sola vez", text: "Con tarjeta u otros medios en el checkout seguro de Lemon Squeezy. No creas cuenta ni contraseña." },
  { icon: Mail, title: "Te llega un correo", text: "En un par de minutos recibes el botón “Abrir mi tablero”, tu clave de acceso y tu informe en PDF." },
  { icon: PencilLine, title: "Escribes tus números del mes", text: "Lo que ganas, lo que gastas por categoría (vivienda, mercado, domicilios…) y tus deudas. Son totales del mes: unos 10 minutos con tu extracto o tu app del banco a la mano." },
  { icon: LayoutDashboard, title: "Tu tablero se arma al instante", text: "Ves a dónde se va tu plata, qué recortar, qué deuda pagar primero y qué hacer con lo que te sobra." },
]

export const ACCESS_NOTES = [
  { icon: RefreshCw, text: "Cada mes entras con el mismo enlace, actualizas tus números y ves cómo vas." },
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
