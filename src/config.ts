/*
 * Configuración del sitio. Es el único archivo que necesitas editar para conectar
 * el pago y el correo, o para cambiar el precio. Al guardar el cambio en GitHub,
 * el sitio se vuelve a compilar y publicar solo (pestaña Actions).
 */
export const config = {
  brand: "Pulso Financiero",

  // Enlace de compra del tablero completo en Lemon Squeezy
  // (Products > tu producto > Share > Checkout URL).
  checkoutPersonal: "",

  // URL de la aplicación web de Apps Script (termina en /exec).
  appsScriptUrl: "",

  // Precio de lanzamiento y precio regular. El precio regular debe ser real:
  // el que cobrarás cuando termine el lanzamiento.
  pricePersonal: 9,
  priceRegular: 29 as number | null,
  currency: "USD",
  launchLabel: "Precio de lanzamiento",

  contactEmail: "hola@tudominio.com",

  // Bot de WhatsApp (piloto). URL /exec del Apps Script del bot y número de WhatsApp
  // en formato internacional sin "+" ni espacios (ej. 15551234567). Vacíos = bot no publicado aún.
  botScriptUrl: "",
  botWhatsapp: "",
};
