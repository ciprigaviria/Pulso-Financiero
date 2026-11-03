/*
 * Configuración del sitio. Es el único archivo que necesitas editar para conectar
 * el pago y el correo, o para cambiar los precios. Al guardar el cambio en GitHub,
 * el sitio se vuelve a compilar y publicar solo (pestaña Actions).
 */
export const config = {
  brand: "Pulso Financiero",
  premiumName: "Pulso Premium",

  // Suscripción en Lemon Squeezy: un producto con dos variantes (mensual y anual).
  // Pega el enlace de compra de cada variante (Products > tu producto > variante > Share).
  checkoutMonthly: "",
  checkoutAnnual: "",

  // Precios en dólares. El "precio sin descuento" del plan anual es 12 × el mensual:
  // es una comparación real, no un precio anterior inventado.
  priceMonthly: 4.99,
  priceAnnual: 44.99,
  trialDays: 7,
  currency: "USD",

  // URL de la aplicación web de Apps Script de pagos (termina en /exec).
  appsScriptUrl: "",

  contactEmail: "hola@tudominio.com",

  // Asistente de WhatsApp. URL /exec del Apps Script del bot y número de WhatsApp
  // en formato internacional sin "+" ni espacios (ej. 15551234567). Vacíos = aún no conectado.
  botScriptUrl: "",
  botWhatsapp: "",
}
