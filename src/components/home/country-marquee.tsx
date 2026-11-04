// Cinta en movimiento con los países y monedas donde funciona Pulso.
import { COUNTRIES } from "@/lib/money"

export function CountryMarquee() {
  const items = [...COUNTRIES, ...COUNTRIES]
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-black py-4 text-white [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" aria-label="Países donde funciona Pulso">
      <div className="animate-marquee flex w-max gap-3">
        {items.map((c, i) => (
          <span key={i} aria-hidden={i >= COUNTRIES.length} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70">
            {c.name} <span className="font-num text-xs font-bold text-brand-bright">{c.currency}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
