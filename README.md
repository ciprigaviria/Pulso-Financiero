# Pulso Financiero

Plataforma con un test gratis de salud financiera personal y un **tablero personal** con visuales y recomendaciones. El test y una vista previa del tablero son gratis; el **tablero completo** se desbloquea con un pago único (Lemon Squeezy) y una clave de licencia que llega por correo desde Apps Script, junto con el informe PDF.

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
1. Crea una tienda y un producto **Tablero completo**, pago único de USD 9 (precio de lanzamiento). No adjuntes archivos: la entrega la hace Apps Script. Cuando termine el lanzamiento, sube el precio a USD 29 aquí, en `src/config.ts` (`pricePersonal`) y en la propiedad `PRICE_PERSONAL` de Apps Script.
   - En el producto activa **Generate license keys** (límite de activaciones: el que quieras, por ejemplo 3; sin vencimiento). Sin esto no hay clave y el tablero no se puede desbloquear.
2. En el producto, **Confirmation modal → Button link**: `https://<tu sitio>/gracias/`.
3. Copia el enlace de compra del producto (**Share**).
4. **Settings → API**: crea una API key. **Settings → Stores**: copia el número de tu tienda (Store ID).
5. **Settings → Webhooks → +**: URL = la de Apps Script terminada en `/exec` + `?src=ls`; evento: `order_created`. Escribe cualquier texto en "Signing secret" (Apps Script verifica el pedido directamente con la API).
6. En Apps Script → **Configuración del proyecto → Propiedades del script**, completa:

| Propiedad | Valor |
| --- | --- |
| `LS_API_KEY` | La API key de Lemon Squeezy |
| `LS_STORE_ID` | El número de tu tienda |
| `LS_PRODUCT_ID` | El número del producto (opcional; si lo pones, solo se aceptan claves de ese producto) |
| `CHECKOUT_PERSONAL` | El enlace de compra del producto |
| `SITE_URL` | La dirección de tu sitio, sin `/` al final |
| `BRAND_NAME` | El nombre final de la marca |
| `REPLY_TO` | Correo al que llegan las respuestas (opcional) |
| `PRICE_PERSONAL` y `PRICE_REGULAR` | Precio actual y precio después del lanzamiento, como aparecen en el correo (`USD 9` y `USD 29`) |

### 4. Conectar el sitio
En GitHub abre `src/config.ts`, haz clic en el lápiz y pega `checkoutPersonal` (enlace de compra), `appsScriptUrl` (URL `/exec`) y `contactEmail`. Al hacer **Commit changes**, GitHub vuelve a compilar y publicar el sitio solo (pestaña **Actions**, 1–2 minutos).

### 5. Probar de punta a punta
1. En Lemon Squeezy activa **Test mode** y haz una compra con la tarjeta de prueba `4242 4242 4242 4242`.
2. Revisa que llegue el correo con el botón **Abrir mi tablero**, la clave y el PDF; que el botón desbloquee el tablero; y que el pedido aparezca en la hoja **Pedidos** con "Clave enviada: Sí".
3. Si algo falla, mira la hoja **Errores** y **Ejecuciones** en Apps Script.

## Beta y comentarios
- Quienes se inscriben en la beta (formulario de inicio) quedan en la hoja **Beta**. Para darles acceso gratis, crea en Lemon Squeezy un **descuento del 100 %** (Store → Discounts), limitado en usos, y envíales el enlace de compra con el código: el pedido sale por USD 0 y Apps Script les manda su clave como a cualquier comprador.
- Los comentarios del tablero llegan a la hoja **Comentarios**, con la columna "Autoriza publicar". Publica en el sitio solo los que tengan "Sí", con el nombre tal como la persona lo escribió. No uses comentarios inventados: además de engañoso, en Colombia y la mayoría de países es publicidad engañosa.

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
