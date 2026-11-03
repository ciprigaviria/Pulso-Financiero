"use client"

// Selector para ver los ejemplos en la moneda de otro país.
import { Globe } from "lucide-react"
import { COUNTRY_OPTIONS, setVisitorCountry, useVisitorCountry } from "@/lib/use-country"
import { cn } from "@/lib/utils"

export function CountryPicker({ className, label = "Ver en" }: { className?: string; label?: string }) {
  const c = useVisitorCountry()
  return (
    <label className={cn("inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-sm", className)}>
      <Globe className="size-4 text-primary" />
      <span className="text-muted-foreground">{label}</span>
      <select aria-label="País y moneda del ejemplo" value={c.id} onChange={(e) => setVisitorCountry(e.target.value)}
        className="cursor-pointer rounded-full bg-muted px-2.5 py-1 font-semibold outline-none focus:ring-2 focus:ring-ring">
        {COUNTRY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.currency}</option>)}
      </select>
    </label>
  )
}
