/**
 * Pulso Financiero — relevo de WhatsApp (Cloudflare Worker).
 *
 * Por qué existe: Meta exige que el webhook responda "200 OK" de inmediato y firma cada aviso.
 * Apps Script responde con una redirección y no puede leer la firma. Este relevo:
 *   1. Atiende la verificación inicial de Meta (GET con hub.challenge).
 *   2. Comprueba la firma X-Hub-Signature-256 con el App Secret de Meta.
 *   3. Responde 200 al instante y reenvía el aviso a Apps Script con una clave secreta.
 *
 * Variables del Worker (Settings → Variables and Secrets):
 *   VERIFY_TOKEN      texto que inventas y repites en Meta al configurar el webhook
 *   META_APP_SECRET   App Secret de tu app de Meta (App settings → Basic)
 *   APPS_SCRIPT_URL   URL /exec del Apps Script del bot
 *   RELAY_SECRET      la clave que muestra setup() del bot
 */

export async function verifySignature(body, header, secret) {
  if (!header || !header.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

const relay = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get("hub.challenge") || "", { status: 200 }) : new Response("Forbidden", { status: 403 });
    }

    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await request.text();
    if (!(await verifySignature(body, request.headers.get("x-hub-signature-256"), env.META_APP_SECRET))) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Solo reenviamos avisos con mensajes; los de estado (entregado, leído) se descartan.
    if (body.includes('"messages"')) {
      const target = env.APPS_SCRIPT_URL + "?k=" + encodeURIComponent(env.RELAY_SECRET);
      ctx.waitUntil(fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body, redirect: "follow" }));
    }
    return new Response("OK", { status: 200 });
  },
};

export default relay;
