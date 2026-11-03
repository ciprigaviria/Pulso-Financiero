"use client"

import * as React from "react"
import NumberFlow from "@number-flow/react"
import { cn } from "@/lib/utils"

/** Medidor circular animado de 0 a 100. */
export function ScoreGauge({
  value,
  color,
  size = 180,
  className,
  label = "de 100",
}: {
  value: number
  color: "verde" | "amarillo" | "naranja" | "rojo"
  size?: number
  className?: string
  label?: string
}) {
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    const t = setTimeout(() => setShown(value), 120)
    return () => clearTimeout(t)
  }, [value])
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Puntaje ${value} de 100`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="11" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={`var(--${color})`} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <NumberFlow value={shown} className="font-num font-bold tracking-tight" style={{ fontSize: size * 0.3, lineHeight: 1 }} />
          <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  )
}
