"use client"

// Demostración del asistente de WhatsApp: una conversación que se escribe sola al entrar en pantalla.
// Montos en la moneda del visitante. Es una simulación ilustrativa, no una conversación real.
import * as React from "react"
import { useInView } from "motion/react"
import { CheckCheck } from "lucide-react"
import { BrandMark } from "@/components/site/brand-mark"
import { moneyFormatter } from "@/lib/money"
import { FX_PER_USD } from "@/lib/sample"
import { useVisitorCountry } from "@/lib/use-country"
import { cn } from "@/lib/utils"

type Msg = { from: "me" | "bot"; text: string }

function script(currency: string, locale: string): Msg[] {
  const k = FX_PER_USD[currency] || 1
  const fmt = moneyFormatter(currency, locale)
  // Montos redondos, como los escribe la gente (2 cifras significativas)
  const n = (usd: number) => { const x = usd * k; const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / step) * step }
  const plain = (usd: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n(usd))
  const lunch = n(6.4), taxi = n(3.1), coffee = n(1.5), pay = n(800)
  return [
    { from: "me", text: `almuerzo ${plain(6.4)}` },
    { from: "bot", text: `✓ Gasto · Restaurantes · ${fmt.full(lunch)}\nVas en el 62% de tu presupuesto de restaurantes.` },
    { from: "me", text: `taxi ${plain(3.1)} y café ${plain(1.5)}` },
    { from: "bot", text: `✓ Gasto · Transporte · ${fmt.full(taxi)}\n✓ Gasto · Restaurantes · ${fmt.full(coffee)}` },
    { from: "me", text: `me pagaron la quincena ${plain(800)}` },
    { from: "bot", text: `✓ Ingreso · Salario · ${fmt.full(pay)}` },
    { from: "me", text: "resumen" },
    { from: "bot", text: `Tu mes hasta hoy\nIngresos: ${fmt.full(n(1600))}\nGastos: ${fmt.full(n(1010))}\nTe quedan: ${fmt.full(n(590))}\n\nTip: con tu excedente puedes completar tu fondo de emergencia en 3 meses.` },
  ]
}

export function ChatDemo({ className }: { className?: string }) {
  const country = useVisitorCountry()
  const msgs = React.useMemo(() => script(FX_PER_USD[country.currency] ? country.currency : "USD", FX_PER_USD[country.currency] ? country.locale : "es-US"), [country])
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    if (!inView) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) { setShown(msgs.length); return }
    let i = 0
    const id = window.setInterval(() => { i += 1; setShown(i); if (i >= msgs.length) window.clearInterval(id) }, 900)
    return () => window.clearInterval(id)
  }, [inView, msgs.length])
  const typing = inView && shown < msgs.length && msgs[shown]?.from === "bot"

  return (
    <div ref={ref} className={cn("mx-auto w-full max-w-[360px] overflow-hidden rounded-[2.2rem] border-[10px] border-[#0f1a17] bg-[#0f1a17] shadow-2xl", className)} aria-label="Ejemplo de conversación con el asistente de WhatsApp" role="img">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <BrandMark size={34} />
        <div className="leading-tight">
          <div className="text-sm font-bold">Pulso · Asistente</div>
          <div className="text-[11px] text-white/70">{typing ? "escribiendo…" : "en línea"}</div>
        </div>
      </div>
      <div className="flex h-[440px] flex-col justify-end gap-2 overflow-hidden bg-[#ece5dd] px-3 py-4" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
        {msgs.slice(0, shown).map((m, i) => (
          <div key={i} className={cn("max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm animate-in fade-in slide-in-from-bottom-2",
            m.from === "me" ? "self-end rounded-tr-sm bg-[#d9fdd3]" : "self-start rounded-tl-sm bg-white")}>
            {m.text}
            {m.from === "me" && <CheckCheck className="ml-1 inline size-3.5 text-[#53bdeb]" />}
          </div>
        ))}
        {typing && <div className="self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] text-[#667781] shadow-sm">• • •</div>}
      </div>
    </div>
  )
}
