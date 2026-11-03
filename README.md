# Pulso Financiero

Sitio web con un test gratis de salud financiera personal. El puntaje es gratis; el **Paquete Personal** (informe PDF, archivo de presupuesto y plan de 30 días) se cobra con Lemon Squeezy y se entrega automáticamente por correo.

## Cómo funciona

```
Persona ──► Sitio (GitHub Pages) ──► hace el test, ve su puntaje gratis
                │
                ├─ deja su correo ──────────────► Apps Script ──► envía el resumen gratis
                │
                └─ compra ──► Lemon Squeezy ──► aviso de pago ──► Apps Script
                                                                   ├─ confirma el pedido con la API
                                                                   ├─ genera el informe PDF
                                                                   └─ lo envía con el archivo de presupuesto
```

| Carpeta / archivo | Qué es |
| --- | --- |
| `index.html` | Página principal |
| `prueba-personal.html` | El test y el resultado |
| `privacidad.html`, `aviso-legal.html` | Páginas legales (plantillas: revisar con abogado) |
| `gracias.html` | Página a la que vuelve la persona después de pagar |
| `assets/js/config.js` | **Lo único que editas para conectar pago y correo** |
| `assets/js/scoring.js` | Preguntas, puntos, banderas rojas y niveles |
| `apps-script/Code.gs` | Backend: correos, pagos, informe PDF y plantilla de presupuesto |
| `tests/` | Pruebas que confirman que el sitio, Apps Script y Python calculan igual |

## Puesta en marcha (unas 2 horas, una sola vez)

Hazlo todo con las cuentas de la marca, nunca con las personales.

### 1. Cuentas de la marca
1. Crea una cuenta de Google nueva para la marca (por ejemplo `hola.pulsofinanciero@gmail.com`).
2. Con ese correo, crea una cuenta de GitHub. Elige un usuario sin relación con tu nombre.
3. Con ese correo, crea una cuenta en [Lemon Squeezy](https://lemonsqueezy.com). Al verificar tu identidad usarás tus datos reales; eso no se muestra a los compradores.

### 2. Subir el código a GitHub
1. En GitHub, crea un repositorio público llamado `pulso-financiero` (GitHub Pages gratis requiere repositorio público).
2. Sube estos archivos, o dale a Claude un token de acceso de ese repositorio para que los suba.
3. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
4. En 1–2 minutos el sitio queda en `https://<usuario>.github.io/pulso-financiero/`.

### 3. Apps Script (correos y entrega del paquete)
1. Con la cuenta de Google de la marca, abre [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Pega `apps-script/Code.gs`. En **Configuración del proyecto**, marca "Mostrar el archivo de manifiesto appsscript.json" y pega `apps-script/appsscript.json`.
3. Ejecuta la función `setup` y acepta los permisos. Crea la base de datos y la plantilla de presupuesto en tu Drive.
4. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *Yo*, acceso *Cualquier persona*. Copia la URL que termina en `/exec`.
5. Ejecuta `probarInforme` y revisa tu correo: debe llegar un informe de ejemplo con el archivo adjunto.

### 4. Lemon Squeezy (pago)
1. Crea una tienda y un producto **Paquete Personal**, pago único de USD 15. No adjuntes archivos: la entrega la hace Apps Script.
2. En el producto, **Confirmation modal → Button link**: `https://<tu sitio>/gracias.html`.
3. Copia el enlace de compra del producto (**Share**).
4. **Settings → API**: crea una API key. **Settings → Stores**: copia el número de tu tienda (Store ID).
5. **Settings → Webhooks → +**: URL = la de Apps Script terminada en `/exec` + `?src=ls`; evento: `order_created`. Escribe cualquier texto en "Signing secret" (Apps Script verifica el pedido directamente con la API).
6. En Apps Script → **Configuración del proyecto → Propiedades del script**, completa:

| Propiedad | Valor |
| --- | --- |
| `LS_API_KEY` | La API key de Lemon Squeezy |
| `LS_STORE_ID` | El número de tu tienda |
| `CHECKOUT_PERSONAL` | El enlace de compra del producto |
| `SITE_URL` | La dirección de tu sitio, sin `/` al final |
| `BRAND_NAME` | El nombre final de la marca |
| `REPLY_TO` | Correo al que llegan las respuestas (opcional) |

### 5. Conectar el sitio
Edita `assets/js/config.js` y pega `checkoutPersonal` (enlace de compra), `appsScriptUrl` (URL `/exec`) y `contactEmail`. Guarda los cambios en GitHub y el sitio se actualiza solo.

### 6. Probar de punta a punta
1. En Lemon Squeezy activa **Test mode** y haz una compra con la tarjeta de prueba `4242 4242 4242 4242`.
2. Revisa que llegue el correo con el PDF y el Excel, y que el pedido aparezca en la hoja **Pedidos** de la base de datos.
3. Si algo falla, mira la hoja **Errores** y **Ejecuciones** en Apps Script.

## Antes de publicar
- [ ] Revisar `privacidad.html` y `aviso-legal.html` con un abogado. La ley colombiana de datos (Ley 1581) exige identificar al responsable del tratamiento: si no quieres que aparezca tu nombre, ese responsable puede ser una empresa (por ejemplo, una SAS) a nombre de la marca.
- [ ] Reemplazar `tudominio.com` en `robots.txt`, `sitemap.xml` y `config.js`.
- [ ] Dominio propio (opcional): compra el dominio con privacidad WHOIS y configúralo en **Settings → Pages → Custom domain**.
- [ ] Registrar el sitio en Google Search Console y enviar `sitemap.xml`.

## Cambiar preguntas o puntos
Las reglas viven en dos lugares que deben coincidir: `assets/js/scoring.js` (sitio) y la sección 2 de `apps-script/Code.gs`. Después de cambiar algo:

```bash
node tests/scoring.test.mjs   # sitio vs Apps Script + flujos de correo y pedido
python3 tests/validate.py     # reimplementación independiente en Python
```

GitHub corre estas mismas pruebas en cada cambio (pestaña **Actions**).

## Límites a tener en cuenta
- Una cuenta gratuita de Google envía hasta ~100 correos al día. Con más volumen, usa Google Workspace o un servicio de correo.
- Apps Script responde a Lemon Squeezy con una redirección; Lemon Squeezy puede reintentar el aviso. El script ignora pedidos repetidos.
- El informe PDF lo genera Google a partir de HTML; puede verse un poco distinto de la vista previa en el navegador.
