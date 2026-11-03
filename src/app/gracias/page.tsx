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
        <p className="text-lg">En unos minutos te llega un correo con el enlace a tu tablero, tu clave de acceso, el botón para abrir el asistente de WhatsApp y tu informe en PDF.</p>{config.botWhatsapp && <p><a href={`https://wa.me/${config.botWhatsapp}?text=Hola`}>Escríbele “hola” al asistente ahora</a></p>}
        <div className="my-7 rounded-2xl border bg-card p-6 text-left">
          <p className="!mb-0"><strong>¿No lo ves?</strong> Revisa la carpeta de spam o promociones. Si en 30 minutos no ha llegado, escríbenos a <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> con el correo que usaste al pagar.</p>
        </div>
        <Button asChild variant="outline"><Link href="/" className="!no-underline !text-foreground">Volver al inicio</Link></Button>
      </div>
    </ProsePage>
  )
}
