"use client"

// País del visitante para mostrar los ejemplos en su moneda. Orden: el que eligió en el selector,
// el que escribió en el test, el idioma del navegador y, si nada aplica, dólares.
// Es un estado compartido: si cambia en un lugar de la página, cambia en todos.
import * as React from "react"
import { COUNTRIES, DEFAULT_COUNTRY, countryById, countryFromNavigator, countryFromText, type Country } from "@/lib/money"
import { store } from "@/lib/store"
import { sampleData } from "@/lib/sample"

let current: Country | null = null
const listeners = new Set<() => void>()

function detect(): Country {
  return countryById(store.getCountry()) || countryFromText(store.getTest()?.pais) || countryFromNavigator() || DEFAULT_COUNTRY
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const getSnapshot = () => (current ??= detect())
const getServerSnapshot = () => DEFAULT_COUNTRY

export function setVisitorCountry(id: string) {
  current = countryById(id) || DEFAULT_COUNTRY
  store.setCountry(current.id === DEFAULT_COUNTRY.id ? null : current.id)
  listeners.forEach((fn) => fn())
}

export function useVisitorCountry(): Country {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export const COUNTRY_OPTIONS = [...COUNTRIES, DEFAULT_COUNTRY]

/** Datos del perfil de ejemplo en la moneda del visitante. */
export function useSampleData() {
  const c = useVisitorCountry()
  return React.useMemo(() => sampleData(c.currency, c.locale), [c])
}
