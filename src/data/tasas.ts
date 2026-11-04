// Referencias oficiales por país para "¿Tu ahorro le gana a la inflación?".
// Solo se publican datos verificados con su fuente y fecha. Revisión mensual (ver README).
// Última revisión: 4 de noviembre de 2026.

export type Dato = { valor: number; periodo: string; fuente: string; url: string }
export type PaisTasas = {
  inflacion?: Dato
  tasaPolitica?: Dato & { nombre: string }
  referenciaAhorro?: Dato & { nombre: string; nota: string }
  guia?: { nombre: string; url: string }
}

export const TASAS_REVISADAS = "2026-11-04"

export const TASAS: Record<string, PaisTasas> = {
  CO: {
    inflacion: { valor: 6.29, periodo: "septiembre 2026, anual", fuente: "DANE vía Banco de la República", url: "https://www.banrep.gov.co/es" },
    tasaPolitica: { nombre: "Tasa de intervención del Banco de la República", valor: 12.25, periodo: "decisión del 30 oct 2026", fuente: "Banco de la República", url: "https://www.banrep.gov.co/es" },
    referenciaAhorro: { nombre: "DTF (CDT a 90 días)", valor: 10.38, periodo: "semana del 28 sep 2026, E.A.", fuente: "Banco de la República", url: "https://www.banrep.gov.co/es", nota: "Promedio de lo que pagan los bancos por CDT a 90 días." },
    guia: { nombre: "Superintendencia Financiera · Personas", url: "https://www.superfinanciera.gov.co/personas/" },
  },
  PE: {
    inflacion: { valor: 5.25, periodo: "octubre 2026, Lima, anual", fuente: "INEI", url: "https://www.inei.gob.pe/" },
    tasaPolitica: { nombre: "Tasa de referencia del BCRP", valor: 4.25, periodo: "decisión del 7 oct 2026", fuente: "Banco Central de Reserva del Perú", url: "https://www.bcrp.gob.pe/" },
  },
  CL: {
    inflacion: { valor: 4.1, periodo: "septiembre 2026, anual", fuente: "INE Chile", url: "https://www.ine.gob.cl/" },
    tasaPolitica: { nombre: "Tasa de Política Monetaria (TPM)", valor: 4.5, periodo: "decisión del 27 oct 2026", fuente: "Banco Central de Chile", url: "https://www.bcentral.cl/" },
    guia: { nombre: "Comisión para el Mercado Financiero", url: "https://www.cmfchile.cl/" },
  },
  GT: {
    inflacion: { valor: 4.69, periodo: "septiembre 2026, anual", fuente: "INE Guatemala (vía Prensa Libre)", url: "https://www.prensalibre.com/tema/inflacion-2026/" },
    tasaPolitica: { nombre: "Tasa líder de política monetaria", valor: 3.5, periodo: "decisión del 23 sep 2026", fuente: "Junta Monetaria · Banguat", url: "https://banguat.gob.gt/" },
  },
  AR: {
    guia: { nombre: "BCRA · Herramientas y conocimientos financieros", url: "https://www.bcra.gob.ar/herramientas-conocimientos/" },
  },
}

/** Rendimiento real aproximado: (1 + tasa) / (1 + inflación) − 1, en %. */
export function realRate(nominalPct: number, inflationPct: number) {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100
}
