// Pruebas del relevo de WhatsApp (relay/worker.js). Uso: npx tsx tests/relay.test.mts
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { verifySignature } from '../relay/worker.js';

const env = { VERIFY_TOKEN: 'mi-token', META_APP_SECRET: 'app-secret', APPS_SCRIPT_URL: 'https://script.google.com/macros/s/X/exec', RELAY_SECRET: 's3cr3to' };
const sign = (body: string, secret = env.META_APP_SECRET) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

// Firma: la misma que calcula Meta (HMAC-SHA256 del cuerpo con el App Secret)
const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: 'w1', from: '57300', type: 'text', text: { body: 'almuerzo 25 mil' } }] } }] }] });
assert.equal(await verifySignature(body, sign(body), env.META_APP_SECRET), true);
assert.equal(await verifySignature(body + ' ', sign(body), env.META_APP_SECRET), false);
assert.equal(await verifySignature(body, sign(body, 'otro'), env.META_APP_SECRET), false);
assert.equal(await verifySignature(body, null as any, env.META_APP_SECRET), false);

// Verificación inicial de Meta
let r = await worker.fetch(new Request('https://relay.test/?hub.mode=subscribe&hub.verify_token=mi-token&hub.challenge=12345'), env as any, { waitUntil() {} } as any);
assert.equal(r.status, 200); assert.equal(await r.text(), '12345');
r = await worker.fetch(new Request('https://relay.test/?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1'), env as any, { waitUntil() {} } as any);
assert.equal(r.status, 403);

// Avisos: con firma válida responde 200 y reenvía; sin firma, 401 y no reenvía
const forwarded: { url: string; body: string }[] = [];
const pending: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p) };
const realFetch = globalThis.fetch;
(globalThis as any).fetch = async (url: string, o: any) => { forwarded.push({ url, body: o.body }); return new Response('ok'); };
const post = (b: string, sig?: string) => new Request('https://relay.test/', { method: 'POST', body: b, headers: sig ? { 'x-hub-signature-256': sig } : {} });
r = await worker.fetch(post(body, sign(body)), env as any, ctx as any);
await Promise.all(pending);
assert.equal(r.status, 200); assert.equal(forwarded.length, 1);
assert.equal(forwarded[0].url, env.APPS_SCRIPT_URL + '?k=s3cr3to'); assert.equal(forwarded[0].body, body);
r = await worker.fetch(post(body), env as any, ctx as any);
assert.equal(r.status, 401); assert.equal(forwarded.length, 1);
const status = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ status: 'read' }] } }] }] });
r = await worker.fetch(post(status, sign(status)), env as any, ctx as any);
assert.equal(r.status, 200); assert.equal(forwarded.length, 1, 'los avisos de estado no se reenvían');
globalThis.fetch = realFetch;
console.log('✓ Relevo: verificación de Meta, firma HMAC, reenvío con clave secreta y descarte de avisos de estado');
