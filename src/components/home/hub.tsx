"use client"

// Diagrama "todo en un solo lugar": Pulso al centro y sus piezas alrededor, con líneas por las que
// "fluye" la información. Se arma con una animación al entrar en pantalla.
import { motion } from "motion/react"
import { CalendarCheck, FileText, Gauge, MessageCircle, PiggyBank, Target, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { BrandMark } from "@/components/site/brand-mark"

const NODES: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: MessageCircle, label: "WhatsApp", color: "#25d366" },
  { icon: Wallet, label: "Presupuesto", color: "#2ee59d" },
  { icon: Target, label: "Metas", color: "#f2c14e" },
  { icon: CalendarCheck, label: "Deudas", color: "#ff5d5d" },
  { icon: PiggyBank, label: "Ahorro", color: "#1fb37a" },
  { icon: TrendingUp, label: "Inversión", color: "#5b8def" },
  { icon: FileText, label: "Informe", color: "#e0742a" },
  { icon: Gauge, label: "Diagnóstico", color: "#8fb2f5" },
]

export function Hub() {
  const R = 40 // radio en % del lado
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] rounded-[2rem] border bg-card shadow-sm">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
        {NODES.map((n, i) => {
          const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2
          return (
            <g key={n.label}>
              <line x1="50" y1="50" x2={50 + Math.cos(a) * R} y2={50 + Math.sin(a) * R} stroke="var(--border)" strokeWidth="0.5" />
              <line x1="50" y1="50" x2={50 + Math.cos(a) * R} y2={50 + Math.sin(a) * R} stroke={n.color} strokeWidth="0.7" strokeLinecap="round"
                strokeDasharray="2 8" style={{ animation: `pulso-dash ${2 + (i % 3) * 0.6}s linear infinite` }} />
            </g>
          )
        })}
      </svg>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid size-24 place-items-center rounded-[1.6rem] bg-[#0a110e] shadow-[0_0_0_10px_rgba(46,229,157,.12),0_0_60px_rgba(46,229,157,.35)]">
          <span className="absolute inset-0 animate-ping rounded-[1.6rem] bg-primary/20 [animation-duration:2.6s]" aria-hidden="true" />
          <BrandMark size={56} />
        </div>
      </motion.div>
      {NODES.map((n, i) => {
        const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2
        const Icon = n.icon
        return (
          <motion.div key={n.label} initial={{ opacity: 0, scale: 0.4 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 220, damping: 16 }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5" style={{ left: `${50 + Math.cos(a) * R}%`, top: `${50 + Math.sin(a) * R}%` }}>
            <span className="grid size-12 place-items-center rounded-2xl border bg-card shadow-md" style={{ color: n.color }}><Icon className="size-5" /></span>
            <span className="rounded-full bg-card px-2 text-[11px] font-semibold text-ink-2">{n.label}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
