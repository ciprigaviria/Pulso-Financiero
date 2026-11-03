import type { Metadata } from "next"
import { ProsePage } from "@/components/site/prose-page"
import { config } from "@/config"

export const metadata: Metadata = { title: "Política de privacidad", description: "Cómo tratamos tus datos en Pulso Financiero." }

// PLANTILLA: revisar con un abogado antes de publicar. Completar los datos del responsable entre corchetes.
export default function Privacidad() {
  const mail = <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
  return (
    <ProsePage>
      <h1>Política de privacidad y tratamiento de datos</h1>
      <p className="text-sm">Última actualización: noviembre de 2026</p>
      <p>En {config.brand} cuidamos tus datos. Esta política explica qué recogemos, para qué y cuáles son tus derechos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia y demás normas aplicables.</p>
      <h2>Responsable del tratamiento</h2>
      <p>[RAZÓN SOCIAL O NOMBRE DEL RESPONSABLE], identificado con [NIT/DOCUMENTO], con domicilio en [CIUDAD Y DIRECCIÓN]. Correo de contacto: {mail}.</p>
      <h2>Qué datos recogemos</h2>
      <ul>
        <li><strong>Respuestas del test:</strong> rangos de comportamiento financiero, país, rango de edad, tipo de ingreso y si tienes personas a cargo. Nunca pedimos montos, nombre ni documento de identidad.</li>
        <li><strong>Correo electrónico:</strong> solo si lo escribes para recibir tu resumen o si compras el paquete.</li>
        <li><strong>Datos de compra:</strong> los procesa Lemon Squeezy como vendedor registrado; nosotros recibimos tu nombre, correo y el estado del pedido, nunca los datos de tu tarjeta.</li>
      </ul>
      <p>El puntaje se calcula en tu navegador. Si no dejas tu correo ni compras, tus respuestas no se envían a nuestros servidores.</p>
      <h2>Para qué los usamos</h2>
      <ul>
        <li>Enviarte tu resumen gratuito o el paquete que compraste.</li>
        <li>Enviarte consejos de finanzas personales por correo, si lo autorizaste.</li>
        <li>Mejorar el test con estadísticas agregadas y anónimas.</li>
      </ul>
      <p>No vendemos ni compartimos tus datos con terceros para publicidad.</p>
      <h2>Tus derechos</h2>
      <p>Puedes conocer, actualizar, rectificar y pedir que eliminemos tus datos, revocar tu autorización y presentar quejas ante la Superintendencia de Industria y Comercio. Escríbenos a {mail} y respondemos en un máximo de 15 días hábiles.</p>
      <h2>Conservación y seguridad</h2>
      <p>Guardamos tus datos mientras sea necesario para las finalidades anteriores o hasta que pidas eliminarlos. Los almacenamos en servicios de Google con acceso restringido.</p>
    </ProsePage>
  )
}
