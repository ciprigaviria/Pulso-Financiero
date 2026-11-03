/*
 * Configuración del sitio. Es el único archivo que necesitas editar para conectar
 * el pago y el correo. Ver README.md, pasos 4 y 5.
 */
window.PULSO_CONFIG = {
  brand: 'Pulso Financiero',

  // Enlace de compra del Paquete Personal en Lemon Squeezy
  // (Products > tu producto > Share > Checkout URL). Ejemplo:
  // 'https://pulsofinanciero.lemonsqueezy.com/buy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  checkoutPersonal: '',

  // URL de la aplicación web de Apps Script (termina en /exec). Recibe los correos
  // de quienes piden su resumen gratis.
  appsScriptUrl: '',

  pricePersonal: 'USD 15',
  pricePersonalLocal: 'aprox. COP 60.000',

  contactEmail: 'hola@tudominio.com'
};
