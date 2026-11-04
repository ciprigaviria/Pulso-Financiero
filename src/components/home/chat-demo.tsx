"use client"

// Demostración del asistente de WhatsApp dentro de un teléfono: el mensaje se escribe letra por letra
// en la barra, se envía y el asistente responde. Se repite en bucle mientras está en pantalla.
// Montos en la moneda del visitante. Es una simulación ilustrativa, no una conversación real.
import * as React from "react"
import { useInView } from "motion/react"
import { Camera, CheckCheck, Mic, SendHorizontal } from "lucide-react"
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
  return [
    { from: "me", text: `almuerzo ${plain(6.4)}` },
    { from: "bot", text: `✓ Gasto · Restaurantes · ${fmt.full(n(6.4))}\nVas en el 62% de tu presupuesto de restaurantes.` },
    { from: "me", text: `taxi ${plain(3.1)} y café ${plain(1.5)}` },
    { from: "bot", text: `✓ Gasto · Transporte · ${fmt.full(n(3.1))}\n✓ Gasto · Restaurantes · ${fmt.full(n(1.5))}` },
    { from: "me", text: `me pagaron la quincena ${plain(800)}` },
    { from: "bot", text: `✓ Ingreso · Salario · ${fmt.full(n(800))}` },
    { from: "me", text: "resumen" },
    { from: "bot", text: `Tu mes hasta hoy\nIngresos: ${fmt.full(n(1600))}\nGastos: ${fmt.full(n(1010))}\nTe quedan: ${fmt.full(n(590))}\n\nCon tu excedente completas tu fondo de emergencia en 3 meses.` },
  ]
}

export function ChatDemo({ className, loop = true, height = 430 }: { className?: string; loop?: boolean; height?: number }) {
  const country = useVisitorCountry()
  const msgs = React.useMemo(() => script(FX_PER_USD[country.currency] ? country.currency : "USD", FX_PER_USD[country.currency] ? country.locale : "es-US"), [country])
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: "-60px" })
  const [shown, setShown] = React.useState(0)
  const [draft, setDraft] = React.useState("")
  const [botTyping, setBotTyping] = React.useState(false)

  React.useEffect(() => {
    if (!inView) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(msgs.length); return }
    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number) => new Promise<void>((r) => { timers.push(window.setTimeout(r, ms)) })
    const run = async () => {
      do {
        setShown(0); setDraft(""); setBotTyping(false)
        await wait(600)
        for (let i = 0; i < msgs.length && !cancelled; i++) {
          const m = msgs[i]
          if (m.from === "me") {
            for (let c = 1; c <= m.text.length && !cancelled; c++) { setDraft(m.text.slice(0, c)); await wait(45 + Math.random() * 40) }
            await wait(350)
            setDraft(""); setShown(i + 1)
            await wait(500)
          } else {
            setBotTyping(true); await wait(900)
            setBotTyping(false); setShown(i + 1)
            await wait(1300)
          }
        }
        await wait(3500)
      } while (loop && !cancelled)
    }
    run()
    return () => { cancelled = true; timers.forEach((t) => window.clearTimeout(t)) }
  }, [inView, msgs, loop])

  return (
    <div ref={ref} className={cn("relative mx-auto w-full max-w-[340px] rounded-[2.6rem] border border-white/15 bg-[#0b0f0e] p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)]", className)} aria-label="Ejemplo de conversación con el asistente de WhatsApp" role="img">
      <div className="overflow-hidden rounded-[2.1rem]">
        <div className="relative flex items-center gap-3 bg-[#075e54] px-4 pb-3 pt-8 text-white">
          <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
          <BrandMark size={34} />
          <div className="leading-tight">
            <div className="text-sm font-bold">Pulso · Asistente</div>
            <div className="text-[11px] text-white/70">{botTyping ? "escribiendo…" : "en línea"}</div>
          </div>
        </div>
        <div className="flex flex-col justify-end gap-2 overflow-hidden bg-[#ece5dd] px-3 py-3" style={{ height, backgroundImage: "radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
          {msgs.slice(0, shown).map((m, i) => (
            <div key={i} className={cn("max-w-[86%] whitespace-pre-line rounded-xl px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
              m.from === "me" ? "self-end rounded-tr-sm bg-[#d9fdd3]" : "self-start rounded-tl-sm bg-white")}>
              {m.text}
              {m.from === "me" && <CheckCheck className="ml-1 inline size-3.5 text-[#53bdeb]" />}
            </div>
          ))}
          {botTyping && (
            <div className="flex gap-1 self-start rounded-xl rounded-tl-sm bg-white px-3 py-3 shadow-sm">
              {[0, 1, 2].map((d) => <i key={d} className="size-1.5 animate-bounce rounded-full bg-[#667781]" style={{ animationDelay: `${d * 0.15}s` }} />)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-2.5 py-2">
          <div className="flex min-h-9 flex-1 items-center gap-2 rounded-full bg-white px-3 text-[13px] text-[#111b21]">
            <Camera className="size-4 shrink-0 text-[#8696a0]" />
            <span className={cn("truncate", !draft && "text-[#8696a0]")}>{draft || "Mensaje"}</span>
            {draft && <span className="-ml-1.5 h-4 w-px animate-pulse bg-[#00a884]" />}
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#00a884] text-white">
            {draft ? <SendHorizontal className="size-4" /> : <Mic className="size-4" />}
          </span>
        </div>
      </div>
    </div>
  )
}
