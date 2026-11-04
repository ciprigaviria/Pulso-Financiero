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
  checkoutMonthly: "https://pulso.lemonsqueezy.com/checkout/buy/3f6939b2-a071-4c7f-bed1-e08eeaec0390?enabled=2339709",
  checkoutAnnual: "https://pulso.lemonsqueezy.com/checkout/buy/f646b61c-b2f2-4a20-b6d7-9747722aab82?enabled=2339708",

  // Precios en dólares. El "precio sin descuento" del plan anual es 12 × el mensual:
  // es una comparación real, no un precio anterior inventado.
  priceMonthly: 4.99,
  priceAnnual: 44.99,
  trialDays: 7,
  currency: "USD",

  // URL de la aplicación web de Apps Script de pagos (termina en /exec).
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxkH1VX5Lu2seDjQcS-jJCrv3rqKj-CIwLCZAo6b15LUTj63pAn7Q0HuD9Vvn74ndePtg/exec",

  contactEmail: "pulsofinancieroapp@gmail.com",

  // Asistente de WhatsApp. URL /exec del Apps Script del bot y número de WhatsApp
  // en formato internacional sin "+" ni espacios (ej. 15551234567). Vacíos = aún no conectado.
  botScriptUrl: "https://script.google.com/macros/s/AKfycbyqo_lUiUhqwrqFO61ZsgTDt-UvGPYxn_HnDbePJ6u1Gan_o5nEc9IeUEZT9ulEJJ6F/exec",
  botWhatsapp: "15551827377",
}
