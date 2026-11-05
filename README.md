# Pulso Financiero

Plataforma de finanzas personales: un **diagnóstico gratis** y **Pulso Premium** (USD 4,99 al mes o USD 44,99 al año, con 7 días gratis), que incluye un **asistente de WhatsApp** para registrar gastos e ingresos y un **tablero** con presupuesto, cuánto te queda y recomendaciones de ahorro e inversión. Los cobros los hace Lemon Squeezy; Apps Script entrega el acceso (clave de licencia) por correo.

Las cifras de cada persona (ingresos, gastos, deudas) se guardan **solo en su navegador** (`localStorage`); nunca llegan al servidor. El tablero tiene un botón de respaldo para llevarlas a otro dispositivo.

Hecho con **Next.js + React + TypeScript + Tailwind CSS + shadcn/ui**, exportado como sitio estático y publicado en **GitHub Pages** con GitHub Actions.

## Cómo funciona

```
Persona ──► Sitio (GitHub Pages) ──► hace el test; el puntaje se calcula en su navegador
                │
                ├─ deja su correo ──────────────► Apps Script ──► envía el resumen gratis
                │
                ├─ compra ──► Lemon Squeezy ──► aviso de pago ──► Apps Script
                │                                                  ├─ confirma el pedido con la API
                │                                                  ├─ busca la clave de licencia
                │                                                  └─ envía enlace al tablero + clave + informe PDF
                │
                └─ abre /tablero/?licencia=CLAVE ──► Apps Script valida la clave con Lemon Squeezy
                                                      └─ el tablero se desbloquea en ese navegador
```

| Carpeta / archivo | Qué es |
| --- | --- |
| `src/config.ts` | **Lo único que editas** para conectar pago y correo o cambiar el precio |
| `src/lib/scoring.js` | Preguntas, puntos, hallazgos, banderas rojas, potencial y plan de 30 días |
| `src/lib/finance.js` | Cálculos del tablero: margen, tasa de ahorro, fondo de emergencia, plan de deudas (avalancha y bola de nieve), proyección, recomendaciones y qué hacer con lo que sobra (reparto por etapa y simulador de ahorro) |
| `src/lib/sample.js` | Datos ficticios del tablero de ejemplo y de los perfiles ilustrativos |
| `src/app/` | Las páginas: inicio, test, tablero, privacidad, aviso legal y gracias |
| `src/components/dashboard/` | El tablero: gráficos, formulario de cifras, vista bloqueada y desbloqueada |
| `src/components/home/` | Secciones de la página de inicio (portada, vista previa, perfiles, beta) |
| `src/components/quiz/quiz.tsx` | El test y la pantalla de resultado |
| `apps-script/` | Backend en Google Apps Script: correos, pagos, licencias, beta, comentarios e informe PDF |
| `tests/` | Pruebas: sitio vs Apps Script vs Python |
| `.github/workflows/deploy.yml` | Compila, prueba y publica el sitio en cada cambio |

## Cómo se publica

Cada vez que guardas un cambio en la rama `main` (desde la web de GitHub o con `git push`), GitHub Actions:

1. instala las dependencias,
2. corre las pruebas del puntaje (si fallan, no publica),
3. compila el sitio y lo publica en `https://<usuario>.github.io/<repositorio>/`.

Sigue el avance en la pestaña **Actions**: verde = publicado, rojo = algo falló (haz clic para ver el error).

## Puesta en marcha

### 1. GitHub Pages (una sola vez)
En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 2. Apps Script (correos y entrega del paquete)
1. Con la cuenta de Google de la marca, abre [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Pega `apps-script/Code.gs`. En **Configuración del proyecto**, marca "Mostrar el archivo de manifiesto appsscript.json" y pega `apps-script/appsscript.json`.
3. Ejecuta la función `setup` y acepta los permisos. Crea la base de datos en tu Drive (hojas Leads, Pedidos, Beta, Comentarios y Errores).
4. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *Yo*, acceso *Cualquier persona*. Copia la URL que termina en `/exec`.
5. Ejecuta `probarInforme` y revisa tu correo: debe llegar el correo de compra de ejemplo con el informe PDF (la clave de ese correo es de prueba y no desbloquea nada).

### 3. Lemon Squeezy (pago)
1. Crea una tienda y un producto **Pulso Premium** de tipo **suscripción** con dos variantes:
   - **Mensual**: USD 4,99 cada mes.
   - **Anual**: USD 44,99 cada año.
   - En ambas, **Free trial**: 7 días.
   - En el producto activa **Generate license keys** (límite de activaciones: por ejemplo 3). Sin esto no hay clave y el tablero no se puede desbloquear.
   - No adjuntes archivos: la entrega la hace Apps Script. Si cambias precios o días de prueba, cámbialos también en `src/config.ts` y en las propiedades `PRICE_MONTHLY`, `PRICE_ANNUAL` y `TRIAL_DAYS` de Apps Script.
2. En el producto, **Confirmation modal → Button link**: `https://<tu sitio>/gracias/`.
3. Copia el enlace de compra de cada variante (**Share**).
4. **Settings → API**: crea una API key. **Settings → Stores**: copia el número de tu tienda (Store ID).
5. **Settings → Webhooks → +**: URL = la de Apps Script terminada en `/exec` + `?src=ls`; evento: `order_created`. Escribe cualquier texto en "Signing secret" (Apps Script verifica el pedido directamente con la API).
6. En Apps Script → **Configuración del proyecto → Propiedades del script**, completa:

| Propiedad | Valor |
| --- | --- |
| `LS_API_KEY` | La API key de Lemon Squeezy |
| `LS_STORE_ID` | El número de tu tienda |
| `LS_PRODUCT_ID` | El número del producto (opcional; si lo pones, solo se aceptan claves de ese producto) |
| `CODIGOS_CORTESIA` | Códigos de membresía gratis, separados por coma (se llena solo con `crearCodigoCortesia`) |
| `CHECKOUT_ANUAL` | El enlace de compra de la variante anual (va en el correo del resumen gratis) |
| `SITE_URL` | La dirección de tu sitio, sin `/` al final |
| `BRAND_NAME` | El nombre final de la marca |
| `REPLY_TO` | Correo al que llegan las respuestas (opcional) |
| `PRICE_MONTHLY`, `PRICE_ANNUAL` y `TRIAL_DAYS` | Precios y días de prueba como aparecen en el correo (`USD 4,99`, `USD 44,99`, `7`) |

### 4. Conectar el sitio
En GitHub abre `src/config.ts`, haz clic en el lápiz y pega `checkoutMonthly` y `checkoutAnnual` (enlaces de compra), `appsScriptUrl` (URL `/exec`) y `contactEmail`. Al hacer **Commit changes**, GitHub vuelve a compilar y publicar el sitio solo (pestaña **Actions**, 1–2 minutos).

### 5. Probar de punta a punta
1. En Lemon Squeezy activa **Test mode** y haz una compra con la tarjeta de prueba `4242 4242 4242 4242`.
2. Revisa que llegue el correo con el botón **Abrir mi tablero**, la clave y el PDF; que el botón desbloquee el tablero; y que el pedido aparezca en la hoja **Pedidos** con "Clave enviada: Sí".
3. Si algo falla, mira la hoja **Errores** y **Ejecuciones** en Apps Script.

## Membresías gratis (códigos de cortesía)
Sirven para revisar el tablero como cliente, para la beta y para aliados, sin pasar por Lemon Squeezy.
1. En Apps Script, elige la función `crearCodigoCortesia` y pulsa **Ejecutar**. En el registro aparece el código (por ejemplo `PULSO-7F3A-91C2`) y un enlace directo `…/tablero/?licencia=PULSO-7F3A-91C2`; también queda en la hoja **Cortesías**.
2. Envía el enlace. Al abrirlo, el tablero se desbloquea en ese navegador; también pueden escribir el código en "¿Ya compraste? Escribe tu clave".
3. Para revocar un código, bórralo de la propiedad `CODIGOS_CORTESIA` (Configuración del proyecto → Propiedades del script). Deja de servir para nuevos ingresos; quien ya lo activó conserva el acceso en ese navegador.

## Beta y comentarios
- Quienes se inscriben en la beta (formulario de inicio) quedan en la hoja **Beta**. Para darles acceso gratis, créales un código de cortesía (arriba). Si prefieres que pasen por el checkout, crea en Lemon Squeezy un **descuento del 100 %** (Store → Discounts) limitado en usos: el pedido sale por USD 0 y Apps Script les manda su clave como a cualquier comprador.
- Los comentarios del tablero llegan a la hoja **Comentarios**, con la columna "Autoriza publicar". Publica en el sitio solo los que tengan "Sí", con el nombre tal como la persona lo escribió. No uses comentarios inventados: además de engañoso, en Colombia y la mayoría de países es publicidad engañosa.

## Bot de WhatsApp (piloto)

La persona escribe "almuerzo 25 mil" por WhatsApp; el bot lo entiende, lo guarda y responde con la confirmación. En su **tablero Premium** (`/tablero`, enlace personal que da el bot) ve su mes, su presupuesto, sus metas y sus recomendaciones.

```
WhatsApp ──► Meta ──► Relevo (Cloudflare Worker) ──► Apps Script del bot ──► Hoja de cálculo
                       verifica la firma               entiende el mensaje (IA + reglas)
                       responde 200 al instante        responde por WhatsApp
Sitio /tablero ◄──────────────── GET ?action=tablero&t=enlace personal
Apps Script del bot ──► Apps Script de pagos (?action=licencia) ──► Lemon Squeezy   (¿suscripción activa?)
```

| Carpeta | Qué es |
| --- | --- |
| `apps-script-bot/Bot.gs` | El bot, en un solo archivo de Apps Script (proyecto aparte del de pagos) |
| `relay/worker.js` | El relevo que recibe los avisos de Meta |
| `src/components/premium/`, `src/lib/premium.ts`, `src/data/tasas.ts` | El tablero Premium, su motor y las tasas por país |

Ejemplo sin bot: `/tablero?ejemplo`.

### Lo que entiende
- Gastos e ingresos en lenguaje natural, varios por mensaje: "taxi 12.000 y café 6.000", "me pagaron la quincena 2,1 millones", "ayer súper 85 mil".
- Montos coloquiales: mil, k, lucas, palos, millones, medio millón, y separadores de cualquier país.
- **Modo demo**: con el cobro activo (`PAGOS_URL`), cualquier número sin suscripción puede escribir *demo* (el sitio tiene el botón "Probar el asistente gratis", que abre WhatsApp con la palabra lista). Durante `DEMO_HORAS` (24) puede anotar hasta `DEMO_MOVIMIENTOS` (10) movimientos, con un máximo de `DEMO_MENSAJES` (30) mensajes al día, y pedir *tablero*. Es una vez por número (hoja **Demos**). Al terminar, la tarea de cada hora borra lo anotado; si se suscribe y escribe *activar CÓDIGO* antes, lo anotado se queda. `DEMO=no` lo apaga. Mientras uses el número de prueba de Meta, solo pueden escribirle los números que registres allí.
- **Tablero en el chat**: al escribir *tablero*, el bot arma una presentación temporal de Google Slides con el estilo del sitio (negro y verde), envía la primera hoja como imagen (con el enlace en el texto) y las dos hojas como PDF (resumen + últimos 22 movimientos), y borra la presentación. Usa el permiso `presentations` y los servicios avanzados **Google Slides API** y **Drive API** (ya van en `appsscript.json` y activan esas APIs; hay que volver a autorizar y publicar una versión nueva). La presentación se exporta y se manda a la papelera por la API de Drive con el permiso `drive.file` (solo archivos que crea el bot). Opcionales: `TABLERO_IMAGEN=no` (solo enlace) y `MAX_TABLEROS_DIA` (6 por defecto; después, solo enlace). Para revisarlo sin WhatsApp, ejecuta `probarTablero()`: deja la imagen y el PDF de ejemplo en tu Drive.
- Comandos: **resumen**, **cuánto llevo en restaurantes**, **borrar** (último), **tablero** (imagen + PDF del mes en el chat, más el enlace), **nuevo enlace**, **borrar mis datos** (pide confirmación), **resumen no / resumen si** (resumen de los lunes), **activar CÓDIGO** (suscripción), el nombre de una categoría para corregir el último ("transporte") y el nombre de un país para cambiar la moneda.
- **Fotos de recibos**: lee el total con la IA y anota un gasto. Si la foto trae un texto con monto, manda ese monto. La foto no se guarda. Tope de fotos por persona al día: `MAX_FOTOS_DIA` (15).
- La IA (Claude) interpreta el mensaje, pero **nunca pone montos**: cada monto se compara con los que de verdad aparecen en el texto. Si la IA no está configurada o falla, entran reglas propias.

### Puesta en marcha (unos 45 minutos)
1. **Apps Script del bot.** Proyecto nuevo en [script.google.com](https://script.google.com) con la cuenta de la marca. Pega `apps-script-bot/Bot.gs` y `apps-script-bot/appsscript.json`. Ejecuta `setup` y copia el **RELAY_SECRET** que aparece en el registro. Implementa como aplicación web (ejecutar como *Yo*, acceso *Cualquier persona*) y copia la URL `/exec`.
2. **Claude (IA).** En [console.anthropic.com](https://console.anthropic.com) crea una API key, carga un saldo pequeño (USD 5 alcanzan para miles de mensajes del piloto) y ponla en la propiedad `ANTHROPIC_API_KEY`. Sin clave, el bot funciona solo con reglas.
3. **Meta.** En [developers.facebook.com](https://developers.facebook.com) → *Crear app* → tipo *Empresa* → agrega el producto **WhatsApp**. En *API Setup* verás un **número de prueba**, su **Phone number ID** y un token temporal. Agrega hasta 5 números de destinatarios (el tuyo y tus beta testers).
   - Para un token que no vence: *Business settings → Users → System users* → crea uno, asígnale la app con permiso `whatsapp_business_messaging` y genera el token.
   - Copia también el **App Secret** (*App settings → Basic*).
4. **Relevo.** En [dash.cloudflare.com](https://dash.cloudflare.com) → *Workers & Pages → Create → Worker*, pega `relay/worker.js` y publícalo. En *Settings → Variables and Secrets* crea `VERIFY_TOKEN` (un texto que inventes), `META_APP_SECRET`, `APPS_SCRIPT_URL` (la `/exec`) y `RELAY_SECRET`.
5. **Webhook.** En Meta → WhatsApp → *Configuration*: Callback URL = la URL del Worker, Verify token = tu `VERIFY_TOKEN`. Suscríbete al campo **messages**.
6. **Propiedades del bot** (Apps Script → Configuración → Propiedades del script):

| Propiedad | Valor |
| --- | --- |
| `WA_TOKEN` | Token de Meta (el permanente del paso 3) |
| `WA_PHONE_NUMBER_ID` | Phone number ID del número de WhatsApp |
| `ANTHROPIC_API_KEY` | Clave de Claude |
| `SITE_URL` | Dirección del sitio, sin `/` al final |
| `BETA_NUMEROS` | Números autorizados, separados por coma (ej. `573001234567`). Vacío = cualquiera |
| `MAX_MENSAJES_DIA` | Tope de mensajes por persona al día (control de costos; 60 por defecto) |
| `LLM_MODEL` / `GRAPH_VERSION` | Modelo de Claude y versión de la API de Meta (vienen con un valor por defecto) |
| `PAGOS_URL` | La `/exec` del Apps Script de pagos. **Al ponerla, el bot exige suscripción** (ver abajo). Vacío = piloto abierto |
| `CONTACTO` | Correo de soporte que el bot da cuando un código falla o está en otro número |
| `RENOVAR_URL` | Dónde renovar (por defecto `SITE_URL/#precios`) |
| `DIAS_CONSULTA` | Días de modo consulta tras terminar la suscripción antes de borrar los datos (90) |
| `WA_PLANTILLA_RESUMEN` / `WA_PLANTILLA_IDIOMA` | Nombre e idioma de la plantilla aprobada del resumen semanal (ej. `resumen_semanal`, `es`) |
| `RESUMEN_HORA` | Hora local desde la que sale el resumen de los lunes (9) |

7. **Sitio.** En `src/config.ts` pega `botScriptUrl` (la `/exec` del bot) y `botWhatsapp` (el número, solo dígitos).
8. **Prueba.** Escríbele "hola" al número de prueba desde un número autorizado. También puedes ejecutar `probarBot` en Apps Script: simula una conversación y deja el resultado en la hoja.

### Suscripción ligada al WhatsApp (paso 3)
1. En el Apps Script **de pagos** (`apps-script/Code.gs`) pon `BOT_WHATSAPP` = el número del bot con indicativo (ej. `573001234567`). El correo de bienvenida trae el botón **Activar mi WhatsApp**, que abre el chat con `activar CÓDIGO` ya escrito. Vuelve a implementar (*Implementar → Gestionar → Editar → Versión nueva*).
2. En el Apps Script **del bot** pon `PAGOS_URL` (la `/exec` de pagos) y `CONTACTO`. Ejecuta `instalarTareas` una vez y vuelve a implementar.
3. Cómo se comporta:
   - Un número sin suscripción recibe una invitación con el enlace de precios (como máximo una vez cada 6 horas) y no se registra nada.
   - `activar CÓDIGO` valida la clave con Lemon Squeezy (a través de pagos) y liga el número. Un código sirve para un solo número; si alguien cambia de número, borra el valor de `licencia` en su fila vieja de la hoja **Usuarios** y pídele que vuelva a activar desde el número nuevo.
   - El bot revisa cada clave como máximo cada 12 horas. Si cancelan, Lemon Squeezy mantiene la clave activa hasta el final del periodo pagado; luego queda vencida.
   - Vencida: el bot deja de registrar, pero responde **tablero** y **resumen**; el tablero muestra un aviso de modo consulta y no guarda cambios. A los `DIAS_CONSULTA` días, la tarea de cada hora borra los datos.
   - Renovar = nueva suscripción con código nuevo: `activar CÓDIGO-NUEVO` en el mismo número y sus datos siguen ahí.
   - Si el servicio de pagos o Lemon Squeezy fallan, el bot conserva el último estado (no bloquea a quien pagó).
   - Los números en `BETA_NUMEROS` usan el bot gratis aunque el cobro esté activo. Las personas del piloto sin código quedan en modo consulta: agrégalas a `BETA_NUMEROS` si deben seguir gratis.

### Resumen semanal
- Sale los lunes desde `RESUMEN_HORA` (hora local de cada persona; si falla, se reintenta hasta el miércoles), una vez por semana, solo a quien tiene acceso, registró algo en las últimas dos semanas y no escribió **resumen no**.
- Si la persona escribió en las últimas 24 horas, va como mensaje normal. Si no, Meta exige una **plantilla aprobada** (categoría *Utilidad*). Créala en *WhatsApp Manager → Plantillas*, nombre `resumen_semanal`, idioma *Español*, con este cuerpo exacto:

  > Hola {{1}}, este es tu resumen de la semana del {{2}}: gastaste {{3}} en {{4}} registros. Frente a la semana anterior: {{5}}. Donde más gastaste: {{6}}. Presupuesto del mes: {{7}}. Escribe \*tablero\* para ver el detalle o \*resumen no\* si no quieres recibir este mensaje.

  Ejemplos para la revisión: Ana · 2 nov al 8 nov · $ 150.000 · 3 · 12 % más · Mercado ($ 100.000) · todo dentro de lo planeado. Cuando la aprueben, pon su nombre en `WA_PLANTILLA_RESUMEN`. Mientras no exista, solo reciben el resumen quienes escribieron en las últimas 24 horas.
- Costo: cada plantilla de utilidad la cobra Meta por mensaje entregado (tarifa por país en la página de precios de WhatsApp Business). Los mensajes dentro de la ventana de 24 horas no son plantillas.

### Costos del piloto
- WhatsApp: desde el 1 de octubre de 2026 Meta cobra las respuestas de servicio, pero cada número tiene **1.000 mensajes de servicio gratis al mes**. Un piloto de 5–20 personas cabe ahí.
- Claude: centavos de dólar por cada cien mensajes con el modelo Haiku. Una foto de recibo consume varias veces lo de un texto (por eso el tope diario de fotos).
- Cloudflare Workers y Apps Script: planes gratuitos.

### Privacidad
Los movimientos del bot se guardan en la hoja de la marca (a diferencia del tablero, donde las cifras viven en el navegador). Antes de abrir el bot al público: actualizar la política de privacidad, identificar al responsable (la SAS) y mantener el comando **borrar mis datos**.

## Tablero Premium
`/tablero/?t=<enlace personal>` (el asistente lo envía con el mensaje "tablero"). Ejemplo sin bot: `/tablero/?ejemplo`.

- **Resumen**: ingresos, gastos, cuánto te queda, cumplimiento del presupuesto, gasto acumulado, a dónde se va el dinero, pagos fijos y la recomendación del mes.
- **Presupuesto** por categoría (con "Sugerir con mis gastos"). El asistente avisa en cada registro cómo va esa categoría y alerta desde el 80 %.
- **Metas** con avance y cuánto apartar al mes. **Plan**: reparto del excedente, instrumentos, simulador y plan de desendeudamiento.
- **Recomendaciones** de ahorro con enlace a la guía oficial del país y prioridades del mes.
- **Tasas**: inflación, tasa del banco central y referencia de ahorro del país con fuente y fecha, y el cálculo del rendimiento real de la tasa que escribe la persona.
- **Mis datos**: ahorros, meta del fondo, deudas y pagos fijos. Se guarda en la hoja **Perfiles** del bot.
- El asistente **aprende de las correcciones**: si cambias "varios" a Mercado, la próxima vez lo clasifica solo.

Las cuentas del presupuesto, metas, pagos fijos y tasa real se validan contra Python en `npm test`.

### Actualizar las tasas (una vez al mes)
Edita `src/data/tasas.ts`: para cada país, el valor, el periodo, la fuente y su enlace oficial, y la fecha `TASAS_REVISADAS`. Publica solo datos con fuente oficial verificable; si no hay, deja el país sin datos (la página lo explica).

## Antes de publicar
- [ ] Revisar las páginas de privacidad y aviso legal (`src/app/privacidad`, `src/app/aviso-legal`) con un abogado. La ley colombiana de datos (Ley 1581) exige identificar al responsable del tratamiento: si no quieres que aparezca tu nombre, ese responsable puede ser una empresa (por ejemplo, una SAS) a nombre de la marca.
- [ ] Reemplazar `tudominio.com` en `public/robots.txt` y `public/sitemap.xml`.
- [ ] Dominio propio (opcional): configúralo en **Settings → Pages → Custom domain** y cambia `NEXT_PUBLIC_BASE_PATH` a vacío en `.github/workflows/deploy.yml`.

## Trabajar en tu computador (opcional)
Necesitas Node.js 22.

```bash
npm install
npm run dev        # sitio en http://localhost:3000
npm test           # pruebas del puntaje
npm run build      # compila el sitio estático en out/
```

## Cambiar preguntas o puntos
Las reglas viven en dos lugares que deben coincidir: `src/lib/scoring.js` (sitio) y la sección 2 de `apps-script/Code.gs`. `npm test` compara las dos copias y una reimplementación independiente en Python; GitHub corre estas pruebas antes de cada publicación.

## Límites a tener en cuenta
- Una cuenta gratuita de Google envía hasta ~100 correos al día.
- Apps Script responde a Lemon Squeezy con una redirección; Lemon Squeezy puede reintentar el aviso. El script ignora pedidos repetidos.
- El informe PDF lo genera Google a partir de HTML; puede verse un poco distinto de la vista previa en el navegador.
