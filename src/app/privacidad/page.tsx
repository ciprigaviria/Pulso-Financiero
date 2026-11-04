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
        <li><strong>Correo electrónico:</strong> solo si lo escribes para recibir tu resumen, te suscribes a Premium o nos escribes a servicio al cliente.</li>
        <li><strong>Comentarios:</strong> si nos escribes desde el tablero, guardamos tu comentario y el nombre que pongas. Solo lo publicamos si marcas que nos autorizas.</li>
        <li><strong>Asistente de WhatsApp (Premium):</strong> tu número de WhatsApp, el nombre de tu perfil, el texto de los mensajes que le envías, las fotos de recibos que le mandas y los movimientos que resultan (fecha, monto, categoría y descripción). También guardamos el código de tu suscripción para saber si está activa.</li>
        <li><strong>Datos de compra:</strong> los procesa Lemon Squeezy como vendedor registrado; nosotros recibimos tu nombre, correo y el estado del pedido, nunca los datos de tu tarjeta.</li>
      </ul>
      <p>El puntaje se calcula en tu navegador. Si no dejas tu correo ni compras, tus respuestas no se envían a nuestros servidores.</p>
      <h2>Cómo tratamos tus movimientos</h2>
      <p>Para registrar lo que escribes al asistente, el mensaje pasa por WhatsApp (Meta), por nuestro servicio en Google y por un modelo de inteligencia artificial (Anthropic) que lo interpreta. Los movimientos se guardan en nuestra base de datos para mostrarte tu tablero. Las fotos de recibos se envían al modelo para leer el total y no las guardamos: solo queda el movimiento. Con el mensaje “borrar mis datos” eliminas tus movimientos y tu enlace personal de inmediato. Si tu suscripción termina, tu tablero queda en modo consulta durante 90 días y después borramos tus datos.</p>
      <p>Las cifras que escribes directamente en el tablero (ahorros y deudas, por ejemplo) se guardan en el almacenamiento local de tu navegador. Para validar tu acceso, tu navegador envía tu clave a nuestro servicio, que la verifica con Lemon Squeezy; esa verificación no incluye tus cifras.</p>
      <h2>Para qué los usamos</h2>
      <ul>
        <li>Enviarte tu resumen gratuito, tu acceso a Premium y tu informe.</li>
        <li>Registrar tus movimientos, mostrarte tu tablero y darte recomendaciones con tus cifras.</li>
        <li>Responder tus solicitudes de servicio al cliente y mejorar el producto con tus comentarios.</li>
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
