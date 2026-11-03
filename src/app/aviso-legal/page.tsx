import type { Metadata } from "next"
import { ProsePage } from "@/components/site/prose-page"
import { config } from "@/config"

export const metadata: Metadata = { title: "Aviso legal", description: "Condiciones de uso de Pulso Financiero." }

// PLANTILLA: revisar con un abogado antes de publicar.
export default function AvisoLegal() {
  const mail = <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
  return (
    <ProsePage>
      <h1>Aviso legal</h1>
      <p className="text-sm">Última actualización: noviembre de 2026</p>
      <h2>Herramienta educativa</h2>
      <p>El test y los materiales de {config.brand} tienen fines educativos. No son asesoría financiera, legal ni tributaria personalizada, y no recomiendan productos financieros específicos. Antes de tomar decisiones importantes, consulta a un profesional.</p>
      <h2>Resultados</h2>
      <p>El puntaje depende de tus respuestas y de un método general basado en el FinHealth Score de la Financial Health Network, adaptado por nosotros. No garantizamos resultados económicos.</p>
      <h2>Precio</h2>
      <p>El tablero completo tiene un precio de lanzamiento de {config.currency} {config.pricePersonal}{config.priceRegular ? `, que subirá a ${config.currency} ${config.priceRegular} cuando termine el lanzamiento` : ""}. El precio que pagas es el que ves en el checkout.</p>
      <h2>Compras</h2>
      <p>Los pagos los procesa Lemon Squeezy, que actúa como vendedor registrado y emite el comprobante. El paquete es un producto digital que se entrega por correo. Si no lo recibes o tienes un problema, escríbenos a {mail}.</p>
      <h2>Propiedad intelectual</h2>
      <p>Los textos, el diseño, el informe y los archivos son de uso personal. No está permitido revenderlos ni distribuirlos.</p>
    </ProsePage>
  )
}
