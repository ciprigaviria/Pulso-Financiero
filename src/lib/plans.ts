// Planes de Pulso Premium. Todas las cifras de precio salen de src/config.ts.
import { config } from "@/config"

export type PlanId = "mensual" | "anual"

const usd = (n: number) => `${config.currency} ${n.toFixed(2).replace(".", ",")}`

export const annualRegular = Math.round(config.priceMonthly * 12 * 100) / 100 // 12 × mensual
export const annualSaving = Math.round((annualRegular - config.priceAnnual) * 100) / 100
export const annualSavingPct = Math.round((annualSaving / annualRegular) * 100)
export const annualPerMonth = Math.floor((config.priceAnnual / 12) * 100) / 100

export const PLANS: Record<PlanId, { id: PlanId; name: string; price: number; period: string; priceText: string; note: string; checkout: string }> = {
  mensual: {
    id: "mensual", name: "Mensual", price: config.priceMonthly, period: "/mes", priceText: usd(config.priceMonthly),
    note: "Se renueva cada mes. Cancela cuando quieras.", checkout: config.checkoutMonthly,
  },
  anual: {
    id: "anual", name: "Anual", price: config.priceAnnual, period: "/año", priceText: usd(config.priceAnnual),
    note: `Equivale a ${usd(annualPerMonth)} al mes. Ahorras ${usd(annualSaving)} frente a pagar 12 meses.`, checkout: config.checkoutAnnual,
  },
}

export const fmtUsd = usd
export const trialText = config.trialDays > 0 ? `${config.trialDays} días gratis` : ""

/** Lo que incluye Premium; se usa en precios, en el resultado del test y en el tablero bloqueado. */
export const PREMIUM_FEATURES = [
  { title: "Asistente de WhatsApp", text: "Escribes “almuerzo 25 mil” o mandas la foto del recibo y queda registrado. Cada lunes, el resumen de tu semana." },
  { title: "Tablero de gastos e ingresos", text: "Cuánto entra, cuánto sale y cuánto te queda, por día y por categoría, en la moneda de tu país." },
  { title: "Presupuesto con cumplimiento", text: "Defines cuánto gastar por categoría y ves en qué vas, con alertas antes de pasarte." },
  { title: "Recomendaciones de ahorro", text: "Qué ajustar con tus propias cifras, respaldado por guías de entidades oficiales." },
  { title: "Recomendaciones de inversión", text: "Dónde ubicar tu excedente según tu plazo, y un comparador de tasas reales de tu país con su fuente." },
  { title: "Plan de desendeudamiento", text: "Qué deuda pagar primero, en cuántos meses sales y cuánto te ahorras en intereses." },
]

/** Enlace al modo demo del asistente: abre WhatsApp con la palabra "demo" lista para enviar. */
export const demoUrl = config.botWhatsapp ? `https://wa.me/${config.botWhatsapp}?text=demo` : ""
