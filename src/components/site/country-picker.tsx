"use client"

// Selector para ver los ejemplos en la moneda de otro país.
import { Globe } from "lucide-react"
import { COUNTRY_OPTIONS, setVisitorCountry, useVisitorCountry } from "@/lib/use-country"
import { cn } from "@/lib/utils"

export function CountryPicker({ className, label = "Ver en", tone = "light" }: { className?: string; label?: string; tone?: "light" | "dark" }) {
  const c = useVisitorCountry()
  const dark = tone === "dark"
  return (
    <label className={cn("inline-flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-sm", dark ? "border-white/15 bg-white/5 text-white" : "bg-card", className)}>
      <Globe className={cn("size-4", dark ? "text-white/60" : "text-primary")} />
      <span className={dark ? "text-white/60" : "text-muted-foreground"}>{label}</span>
      <select aria-label="País y moneda del ejemplo" value={c.id} onChange={(e) => setVisitorCountry(e.target.value)}
        className={cn("cursor-pointer rounded-full px-2.5 py-1 font-semibold outline-none focus:ring-2 focus:ring-ring", dark ? "bg-white/10 text-white [&>option]:text-black" : "bg-muted")}>
        {COUNTRY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.currency}</option>)}
      </select>
    </label>
  )
}
