import type { Metadata } from "next"
import { ProsePage } from "@/components/site/prose-page"
import { config } from "@/config"
import { fmtUsd } from "@/lib/plans"

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
      <h2>Suscripción {config.premiumName}</h2>
      <ul>
        <li><strong>Planes:</strong> mensual de {fmtUsd(config.priceMonthly)} o anual de {fmtUsd(config.priceAnnual)}. El precio que pagas es el que ves en el checkout, con los impuestos que correspondan en tu país.</li>
        {config.trialDays > 0 && <li><strong>Prueba gratis:</strong> los primeros {config.trialDays} días no se cobran. Si cancelas antes de que terminen, no se te cobra nada; si no cancelas, se cobra el plan elegido al terminar la prueba.</li>}
        <li><strong>Renovación:</strong> la suscripción se renueva automáticamente al final de cada periodo (mes o año) hasta que la canceles.</li>
        <li><strong>Cancelación:</strong> puedes cancelar en cualquier momento desde el enlace de administración de tu suscripción que llega en el correo de compra, o escribiéndonos. Conservas el acceso hasta el final del periodo ya pagado; no hacemos cobros posteriores.</li>
        <li><strong>Cambios de precio:</strong> si cambiamos el precio, te avisamos por correo antes de tu siguiente renovación.</li>
      </ul>
      <h2>Pagos</h2>
      <p>Los pagos los procesa Lemon Squeezy, que actúa como vendedor registrado y emite el comprobante. Si tienes un problema con un cobro, escríbenos a {mail}.</p>
      <h2>Asistente de WhatsApp</h2>
      <p>El asistente interpreta tus mensajes de forma automática y puede equivocarse: revisa las confirmaciones y corrige cuando haga falta. No envíes por WhatsApp contraseñas, números de tarjeta ni datos de acceso a tus cuentas.</p>
      <h2>Propiedad intelectual</h2>
      <p>Los textos, el diseño, el tablero y el informe son de uso personal. No está permitido revenderlos ni distribuirlos.</p>
    </ProsePage>
  )
}
