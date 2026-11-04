import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { ProsePage } from "@/components/site/prose-page"
import { Button } from "@/components/ui/button"
import { config } from "@/config"

export const metadata: Metadata = { title: "Gracias por tu compra", robots: { index: false } }

export default function Gracias() {
  return (
    <ProsePage>
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-4 size-14 text-primary" />
        <h1>¡Bienvenido a {config.premiumName}!</h1>
        <p className="text-lg">En unos minutos te llega un correo con tu código de activación y, si hiciste el diagnóstico, tu informe en PDF.</p>
        <ol className="my-6 grid gap-3 rounded-2xl border bg-card p-6 text-left">
          <li><strong>Activa tu WhatsApp:</strong> en el correo, toca <strong>Activar mi WhatsApp</strong>. Se abre el chat con el mensaje listo; solo dale enviar. Tu número queda ligado a tu suscripción.</li>
          <li><strong>Escríbele tu primer gasto</strong> (“almuerzo 25 mil”) o mándale la foto de un recibo.</li>
          <li><strong>Escríbele “tablero”</strong> y te envía tu mes en imagen y PDF, sin salir de WhatsApp, más el enlace para ver y editar presupuesto y metas.</li>
        </ol>
        <div className="my-7 rounded-2xl border bg-card p-6 text-left">
          <p className="!mb-0"><strong>¿No lo ves?</strong> Revisa la carpeta de spam o promociones. Si en 30 minutos no ha llegado, escríbenos a <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> con el correo que usaste al pagar.</p>
        </div>
        <Button asChild variant="outline"><Link href="/" className="!no-underline !text-foreground">Volver al inicio</Link></Button>
      </div>
    </ProsePage>
  )
}
