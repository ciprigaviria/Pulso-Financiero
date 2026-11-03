"use client"

// Piezas visuales del tablero. Adaptadas de "analytics-bento" (vasnev.art):
// tarjetas, números que cuentan, tooltip, selector segmentado, línea suave,
// mapa de cuadros (treemap) y radar. Solo SVG, sin librerías de gráficos.
import * as React from "react"
import { cn } from "@/lib/utils"

/* ---------------- utilidades ---------------- */

export const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export function useReducedMotion() {
  const [r, setR] = React.useState(false)
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)")
    setR(m.matches)
    const on = () => setR(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return r
}

export function useSize() {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height)
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** curva suave por puntos (catmull-rom como béziers cúbicas) */
export function smooth(P: [number, number][], closed = false) {
  const n = P.length
  if (n < 2) return ""
  const g = (i: number) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))])
  let d = `M${P[0][0]},${P[0][1]}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = 0.18
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`
  }
  return closed ? d + "Z" : d
}

export function CountUp({ value, format, duration = 1100 }: { value: number; format: (n: number) => string; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const from = React.useRef(0)
  const reduce = useReducedMotion()
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) { el.textContent = format(value); from.current = value; return }
    const a = from.current, t0 = performance.now()
    let raf = 0
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / duration), v = a + (value - a) * ease(t)
      el.textContent = format(v); from.current = v
      if (t < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [value, format, duration, reduce])
  return <span ref={ref}>{format(0)}</span>
}

/* ---------------- tooltip ---------------- */

export type Tip = { title: string; rows: { label: string; value: string; color?: string }[] }
export type TipApi = { show: (x: number, y: number, t: Tip) => void; hide: () => void }
export type TipRef = React.MutableRefObject<TipApi | null>

export function Tooltip({ api }: { api: TipRef }) {
  const [tip, setTip] = React.useState<(Tip & { x: number; y: number }) | null>(null)
  const [pos, setPos] = React.useState({ l: 0, t: 0 })
  const box = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    api.current = { show: (x, y, t) => setTip({ ...t, x, y }), hide: () => setTip(null) }
    return () => { api.current = null }
  }, [api])
  React.useLayoutEffect(() => {
    if (!tip || !box.current) return
    const r = box.current.getBoundingClientRect()
    let l = tip.x + 14, t = tip.y - r.height - 12
    if (l + r.width > window.innerWidth - 8) l = tip.x - r.width - 14
    if (t < 8) t = tip.y + 16
    setPos({ l, t })
  }, [tip])
  return (
    <div
      ref={box}
      role="tooltip"
      className={cn("pointer-events-none fixed z-50 whitespace-nowrap rounded-xl border bg-popover/95 px-2.5 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur-md transition-opacity duration-150", tip ? "opacity-100" : "opacity-0")}
      style={{ left: pos.l, top: pos.t }}
    >
      {tip && (
        <>
          <div className="mb-1 text-muted-foreground">{tip.title}</div>
          {tip.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {r.color && <i className="inline-block size-2 rounded-[2px]" style={{ background: r.color }} />}
                {r.label}
              </span>
              <b className="font-mono font-medium tabular-nums">{r.value}</b>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ---------------- piezas compartidas ---------------- */

export function BentoCard({ className, children, ...rest }: React.ComponentProps<"section">) {
  return (
    <section className={cn("relative min-w-0 overflow-hidden rounded-[24px] border bg-card p-5 text-card-foreground shadow-sm sm:p-6", className)} {...rest}>
      {children}
    </section>
  )
}

export function Segmented({ items, value, onChange, label }: { items: string[]; value: number; onChange: (i: number) => void; label: string }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [thumb, setThumb] = React.useState({ x: 0, w: 0 })
  React.useLayoutEffect(() => {
    const b = refs.current[value]
    if (b) setThumb({ x: b.offsetLeft, w: b.offsetWidth })
  }, [value, items])
  return (
    <div role="tablist" aria-label={label} className="relative inline-grid h-[30px] auto-cols-fr grid-flow-col rounded-[10px] bg-muted p-[2px]">
      <div className="absolute bottom-[2px] top-[2px] rounded-[8px] bg-background shadow-sm ring-1 ring-border transition-[transform,width] duration-300" style={{ width: thumb.w, transform: `translateX(${thumb.x - 2}px)`, left: 2 }} />
      {items.map((it, i) => (
        <button
          key={it}
          ref={(el) => { refs.current[i] = el }}
          role="tab"
          type="button"
          aria-selected={i === value}
          onClick={() => onChange(i)}
          className={cn("relative z-10 rounded-[8px] px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", i === value ? "text-foreground" : "text-muted-foreground")}
        >
          {it}
        </button>
      ))}
    </div>
  )
}

/* ---------------- línea: una o varias series ---------------- */

export type Series = { name: string; values: number[]; color: string; dashed?: boolean }

export function LineChart({ series, labels, format, caption, tip, height = 200 }: { series: Series[]; labels: string[]; format: (n: number) => string; caption?: string; tip: TipRef; height?: number }) {
  const [ref, { w: W, h: H }] = useSize()
  const reduce = useReducedMotion()
  const [drawn, setDrawn] = React.useState(false)
  const [hover, setHover] = React.useState<number | null>(null)
  const id = React.useId().replace(/:/g, "")
  React.useEffect(() => { if (!W) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true))); return () => cancelAnimationFrame(r) }, [W])

  const all = series.flatMap((s) => s.values)
  const lo = Math.min(0, ...all), hi = Math.max(1, ...all), span = hi - lo || 1
  const top = 28, bot = 22, left = 10, right = 58
  const n = labels.length
  const X = (i: number) => left + (n < 2 ? 0 : (i / (n - 1)) * (W - left - right))
  const Y = (v: number) => top + (1 - (v - lo) / span) * (H - top - bot)
  const raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(v)

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGRectElement).ownerSVGElement!.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - left) / (W - left - right)) * (n - 1))))
    setHover(i)
    tip.current?.show(r.left + X(i), r.top + Y(series[0].values[i]), { title: labels[i], rows: series.map((s) => ({ label: s.name, value: format(s.values[i]), color: s.color })) })
  }

  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-[18px] border bg-muted/40" style={{ height }}>
      {caption && <div className="pointer-events-none absolute left-3 top-2.5 text-[11px] text-muted-foreground">{caption}</div>}
      {W > 0 && (
        <svg width={W} height={H} className="block" role="img" aria-label={caption}>
          <defs>
            <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: series[0].color, stopOpacity: 0.16 }} />
              <stop offset="1" style={{ stopColor: series[0].color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} className={v === 0 ? "stroke-muted-foreground/40" : "stroke-border"} strokeWidth={1} />
              <text x={W - 8} y={Y(v) - 5} textAnchor="end" fontSize={10} className="fill-muted-foreground font-mono">{format(v)}</text>
            </g>
          ))}
          {series.map((s, si) => {
            const P = s.values.map((v, i) => [X(i), Y(v)] as [number, number])
            const d = smooth(P)
            const last = P[P.length - 1]
            return (
              <g key={s.name}>
                {si === 0 && <path d={`${d}L${last[0]},${H}L${P[0][0]},${H}Z`} fill={`url(#${id}a)`} />}
                <path d={d} pathLength={1} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2.5 : 2} strokeLinecap="round"
                  strokeDasharray={s.dashed ? "4 5" : undefined}
                  style={s.dashed ? { opacity: drawn || reduce ? 1 : 0, transition: "opacity .8s .6s" } : { strokeDasharray: 1, strokeDashoffset: drawn || reduce ? 0 : 1, transition: reduce ? "none" : "stroke-dashoffset 1.4s cubic-bezier(.3,.8,.2,1) .2s" }} />
                <circle cx={last[0]} cy={last[1]} r={4} fill={s.color} className="stroke-card" strokeWidth={2} />
              </g>
            )
          })}
          {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={0} y2={H} className="stroke-muted-foreground/50" strokeWidth={1} />}
          {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
            <text key={i} x={X(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} className="fill-muted-foreground">{labels[i]}</text>
          ))}
          <rect width={W} height={H} fill="transparent" onPointerMove={move} onPointerLeave={() => { setHover(null); tip.current?.hide() }} />
        </svg>
      )}
    </div>
  )
}

/* ---------------- mapa de cuadros ---------------- */

type Item = { name: string; group: string; v: number }
type Rect = Item & { x: number; y: number; w: number; h: number }
function squarify(items: Item[], x: number, y: number, w: number, h: number): Rect[] {
  const total = items.reduce((a, b) => a + b.v, 0) || 1, scale = (w * h) / total, out: Rect[] = []
  let rest = items.map((i) => ({ ...i, a: i.v * scale }))
  const worst = (row: typeof rest, len: number) => {
    const s = row.reduce((a, b) => a + b.a, 0), mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a))
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn))
  }
  while (rest.length) {
    const len = Math.min(w, h)
    const row = [rest[0]]
    let i = 1
    while (i < rest.length && worst([...row, rest[i]], len) <= worst(row, len)) row.push(rest[i++])
    rest = rest.slice(i)
    const s = row.reduce((a, b) => a + b.a, 0)
    if (w >= h) { const cw = s / h; let cy = y; for (const r of row) { const rh = r.a / cw; out.push({ ...r, x, y: cy, w: cw, h: rh }); cy += rh } x += cw; w -= cw }
    else { const rh = s / w; let cx = x; for (const r of row) { const rw = r.a / rh; out.push({ ...r, x: cx, y, w: rw, h: rh }); cx += rw } y += rh; h -= rh }
  }
  return out
}

export type TreeGroup = { id: string; name: string; color: string; ink: "dark" | "light" }

export function Treemap({ items, groups, format, total, tip, height = 300 }: { items: Item[]; groups: TreeGroup[]; format: (n: number) => string; total: number; tip: TipRef; height?: number }) {
  const [ref, { w: W, h: H }] = useSize()
  const [placed, setPlaced] = React.useState(false)
  React.useEffect(() => { if (W) { const r = requestAnimationFrame(() => requestAnimationFrame(() => setPlaced(true))); return () => cancelAnimationFrame(r) } }, [W])
  const G = 6
  const sorted = items.filter((i) => i.v > 0).sort((a, b) => b.v - a.v)
  const rects = W ? squarify(sorted, 0, 0, W + G, H + G) : []
  return (
    <div ref={ref} className="relative w-full" style={{ height }} role="img" aria-label="Gastos por categoría">
      {rects.map((r) => {
        const g = groups.find((x) => x.id === r.group)!
        const w = r.w - G, h = r.h - G
        const share = total > 0 ? Math.round((r.v / total) * 100) + "%" : ""
        const label = format(r.v)
        const showName = h >= 54 && w >= 84, showVal = h >= 76 && w >= label.length * 11 + (share ? 52 : 24)
        return (
          <div
            key={r.name}
            className={cn("absolute flex flex-col justify-between overflow-hidden rounded-[14px] p-3 transition-[left,top,width,height,filter] duration-700 hover:brightness-[1.06] motion-reduce:transition-none", g.ink === "light" ? "text-white" : "text-neutral-950")}
            style={{ left: placed ? r.x : W / 2, top: placed ? r.y : H / 2, width: placed ? w : 0, height: placed ? h : 0, background: g.color }}
            onPointerMove={(e) => tip.current?.show(e.clientX, e.clientY, { title: g.name, rows: [{ label: r.name, value: format(r.v), color: g.color }, { label: "Del ingreso", value: share }] })}
            onPointerLeave={() => tip.current?.hide()}
          >
            {showName && <div className="truncate text-[11px] font-bold uppercase tracking-wide">{r.name}</div>}
            {showVal && (
              <div className="flex items-end justify-between gap-1.5">
                <span className="font-mono text-lg font-medium leading-none tracking-tight tabular-nums">{label}</span>
                {share && <span className="rounded-md bg-black/75 px-[5px] py-[3px] font-mono text-[10px] text-white">{share}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- radar de las 5 áreas ---------------- */

export function Radar({ values, axis, color = "var(--primary)", tip, size = 340 }: { values: number[]; axis: string[]; color?: string; tip: TipRef; size?: number }) {
  const [ref, { w }] = useSize()
  const reduce = useReducedMotion()
  const [k, setK] = React.useState(reduce ? 1 : 0)
  const [hover, setHover] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (reduce) { setK(1); return }
    const t0 = performance.now(); let raf = 0
    const step = (now: number) => { const t = ease(Math.min(1, (now - t0) / 1000)); setK(t); if (t < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [values, reduce])
  const N = values.length, S = Math.min(w, size), R = S / 2 - 40, C = S / 2
  const ang = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2
  const pt = (i: number, v: number): [number, number] => [C + Math.cos(ang(i)) * R * (0.12 + 0.88 * (v / 100) * k), C + Math.sin(ang(i)) * R * (0.12 + 0.88 * (v / 100) * k)]
  const P = values.map((v, i) => pt(i, v))
  return (
    <div ref={ref} className="mx-auto w-full" style={{ maxWidth: size, height: S || size }}>
      {S > 0 && (
        <svg width={S} height={S} className="mx-auto block" role="img" aria-label={"Puntaje por área: " + axis.map((a, i) => `${a} ${values[i]}`).join(", ")}>
          {[0.5, 0.8, 1].map((q) => (
            <circle key={q} cx={C} cy={C} r={R * (0.12 + 0.88 * q)} fill="none" className={q === 0.8 ? "stroke-primary/30" : "stroke-border"} strokeDasharray={q === 0.8 ? "3 4" : undefined} strokeWidth={1} />
          ))}
          {axis.map((m, i) => (
            <g key={m}>
              <line x1={C} y1={C} x2={C + Math.cos(ang(i)) * R} y2={C + Math.sin(ang(i)) * R} className="stroke-border" strokeWidth={1} />
              <text x={C + Math.cos(ang(i)) * (R + 22)} y={C + Math.sin(ang(i)) * (R + 22)} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} className="fill-muted-foreground">{m}</text>
            </g>
          ))}
          <path d={smooth(P, true)} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          {P.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 6 : 4.5} fill={color} className="stroke-card" strokeWidth={2}
              onPointerEnter={(e) => { setHover(i); tip.current?.show(e.clientX, e.clientY, { title: axis[i], rows: [{ label: "Puntaje", value: values[i] + "/100", color }] }) }}
              onPointerLeave={() => { setHover(null); tip.current?.hide() }} />
          ))}
          <text x={C + 4} y={C - R * (0.12 + 0.88 * 0.8) - 4} fontSize={9} className="fill-primary/70">80 · verde</text>
        </svg>
      )}
    </div>
  )
}
