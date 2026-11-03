"use client"

// Sección de funciones de Pulso Financiero. Adaptada del componente "ink-orbit-features":
// página rayada y un bento de tres diagramas vivos —
//   1. tus respuestas pasan por el motor de Pulso y salen convertidas en tu informe,
//   2. los cuatro entregables del paquete, que se "entregan" uno por uno,
//   3. un gráfico de potencial que puedes recorrer con el mouse (ejemplo ilustrativo).
// Sin imágenes ni dependencias: solo React.

import React from "react"

export type PulsoFeaturesProps = {
  /** `auto` sigue el tema del sistema. */
  theme?: "light" | "dark" | "auto"
  className?: string
}

/* ------------------------------------------------------------------ lógica */

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

// Línea suave y área cerrada a través de los valores, dentro de una caja w×h.
function chartPaths(values: number[], w: number, h: number, pad: number) {
  const n = values.length
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => [
    pad + (n < 2 ? 0 : (i / (n - 1)) * (w - pad * 2)),
    h - pad - ((v - lo) / span) * (h - pad * 2),
  ] as [number, number])
  let line = ""
  pts.forEach(([x, y], i) => {
    if (i === 0) {
      line = "M" + x.toFixed(1) + "," + y.toFixed(1)
      return
    }
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    line += " C" + cx.toFixed(1) + "," + py.toFixed(1) + " " + cx.toFixed(1) + "," + y.toFixed(1) + " " + x.toFixed(1) + "," + y.toFixed(1)
  })
  const area = n ? line + " L" + pts[n - 1][0].toFixed(1) + "," + (h - pad) + " L" + pts[0][0].toFixed(1) + "," + (h - pad) + " Z" : ""
  return { line, area, points: pts }
}

function nearestIndex(xs: number[], x: number): number {
  let best = 0
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i
  return best
}

// true cuando el elemento ya estuvo en pantalla
function useInView(threshold = 0.2) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver !== "function") {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, threshold])
  return [ref, inView] as const
}

/* --------------------------------------------------------------- textos */

const COPY = {
  tag: "Cómo funciona por dentro",
  title: ["Un diagnóstico serio,", "en *cinco minutos*"],
  answers: {
    title: "Tus respuestas, analizadas",
    description: "12 preguntas sobre 5 áreas de tus finanzas, calificadas con un método internacional adaptado a Latinoamérica.",
  },
  report: {
    title: "Un informe hecho para ti",
    description: "Tu puntaje, tus alertas y un plan de 30 días armados con tus respuestas, no con una plantilla genérica.",
  },
  deliverables: {
    title: "Todo para pasar a la acción",
    description: "Recibes el informe, el plan y un archivo de presupuesto, deudas y metas que funciona en Excel y en Google Sheets.",
    tools: ["Informe PDF", "Plan 30 días", "Excel", "Google Sheets"],
  },
  potential: {
    title: "Mide tu avance",
    description: "Cada área que llevas a verde sube tu puntaje. Repite el test cada trimestre y compara. Gráfico de ejemplo.",
    values: [52, 53, 55, 57, 60, 62, 65, 68, 71, 74, 77, 81],
    planFrom: 1,
  },
}

const AREA_NODES = [
  { x: 58, y: 38, label: "G", name: "Gastar · 3 preguntas" },
  { x: 104, y: 22, label: "A", name: "Ahorrar · 2 preguntas" },
  { x: 150, y: 40, label: "D", name: "Deber · 3 preguntas" },
  { x: 46, y: 96, label: "P", name: "Proteger · 2 preguntas" },
  { x: 150, y: 110, label: "M", name: "Planear (metas) · 2 preguntas" },
]

const PAGES = ["DIAGNÓSTICO", "PLAN 30 DÍAS", "PRESUPUESTO"]

/* -------------------------------------------------------------- componente */

export default function PulsoFeatures({ theme = "auto", className = "" }: PulsoFeaturesProps) {
  const uid = "pf" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const [dark, setDark] = React.useState(theme === "dark")
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      setDark(theme === "auto" ? scheme.matches : theme === "dark")
      setReduced(motion.matches)
    }
    sync()
    scheme.addEventListener?.("change", sync)
    motion.addEventListener?.("change", sync)
    return () => {
      scheme.removeEventListener?.("change", sync)
      motion.removeEventListener?.("change", sync)
    }
  }, [theme])

  const [featRef, featIn] = useInView(0.12)

  return (
    <div className={"ib-root " + className} data-theme={dark ? "dark" : "light"}>
      <style>{IB_CSS}</style>
      <div className="ib-shell">
        <section className="ib-sec" aria-labelledby={uid + "feat"}>
          <div className="ib-reveal" ref={featRef} data-in={featIn}>
            <div className="ib-head" id={uid + "feat"}>
              <span className="ib-tag">{COPY.tag}</span>
              <h2 className="ib-h2">
                {COPY.title.map((line, i) => (
                  <span key={i}>
                    {line.split("*").map((run, j) => (j % 2 ? <span key={j} className="ib-muted">{run}</span> : run))}
                  </span>
                ))}
              </h2>
            </div>
            <div className="ib-bento">
              <FlowCard uid={uid} reduced={reduced} inView={featIn} />
              <DeliverablesCard reduced={reduced} />
              <PotentialCard uid={uid} reduced={reduced} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- piezas */

function Brackets() {
  return (
    <>
      <span className="ib-c ib-c-tl" aria-hidden="true" />
      <span className="ib-c ib-c-tr" aria-hidden="true" />
      <span className="ib-c ib-c-bl" aria-hidden="true" />
      <span className="ib-c ib-c-br" aria-hidden="true" />
    </>
  )
}

function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 13h4l2-5 3.2 9 2.4-6.5 1.2 2.5H22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToolGlyph({ index }: { index: number }) {
  const k = index % 4
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {k === 0 && (
        <>
          <path d="M-4.5 -6.5h6l3 3v10h-9z" />
          <path d="M-2 0h4.5M-2 3h4.5" />
        </>
      )}
      {k === 1 && (
        <>
          <rect x="-6" y="-6" width="3.5" height="3.5" rx=".6" />
          <path d="M0 -4.2h6" />
          <rect x="-6" y="-1.7" width="3.5" height="3.5" rx=".6" />
          <path d="M0 0h6" />
          <rect x="-6" y="2.6" width="3.5" height="3.5" rx=".6" />
          <path d="M0 4.3h6" />
        </>
      )}
      {k === 2 && (
        <>
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <path d="M-6 -2h12M-6 2h12M-1.5 -6v12" />
        </>
      )}
      {k === 3 && (
        <>
          <rect x="-5" y="-6.5" width="10" height="13" rx="1.5" />
          <path d="M-5 -2.5h10M-5 1.5h10M0 -2.5v9" />
        </>
      )}
    </g>
  )
}

function FlowCard({ uid, reduced, inView }: { uid: string; reduced: boolean; inView: boolean }) {
  const [page, setPage] = React.useState(0)
  const [side, setSide] = React.useState<"" | "left" | "right">("")
  React.useEffect(() => {
    if (reduced || !inView) return
    const t = setInterval(() => setPage((n) => n + 1), 2800)
    return () => clearInterval(t)
  }, [reduced, inView])
  const L1 = "M117,67 C196,67 210,100 262,100" // de las respuestas …
  const L2 = "M117,73 C186,73 206,120 262,120" // … al motor
  const R1 = "M378,100 C412,100 418,86 450,86" // motor → informe
  const R2 = "M378,120 C412,120 418,134 450,134"
  const rays = uid + "rays"
  const glow = uid + "glow"
  const kind = page % PAGES.length
  return (
    <div className="ib-frame ib-frame-hover ib-wide">
      <Brackets />
      <div className="ib-card" style={{ padding: 0, overflow: "hidden" }}>
        <svg className="ib-diagram" viewBox="0 0 640 178" role="img" aria-label="Tus respuestas pasan por el motor de Pulso y se convierten en tu informe">
          <defs>
            <radialGradient id={glow} cx="320" cy="110" r="190" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--ib-raise)" stopOpacity="1" />
              <stop offset="1" stopColor="var(--ib-raise)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={rays} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-accent)" stopOpacity=".28" />
              <stop offset="1" stopColor="var(--ib-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="640" height="178" fill={"url(#" + glow + ")"} />
          {[-62, -38, -14, 14, 38, 62].map((a, i) => (
            <path key={i} d={"M320,110 L" + (320 + Math.sin((a * Math.PI) / 180) * 260) + "," + (110 - Math.cos((a * Math.PI) / 180) * 260) + " L" + (320 + Math.sin(((a + 7) * Math.PI) / 180) * 260) + "," + (110 - Math.cos(((a + 7) * Math.PI) / 180) * 260) + "Z"} fill={"url(#" + rays + ")"} opacity=".5" />
          ))}

          {/* las 5 áreas */}
          <g onMouseEnter={() => setSide("left")} onMouseLeave={() => setSide("")}>
            <rect x="20" y="8" width="170" height="130" fill="transparent" />
            {AREA_NODES.map((m, i) => (
              <line key={"l" + i} x1={m.x} y1={m.y} x2="104" y2="70" stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
            ))}
            <g transform="translate(91,57)">
              <rect width="26" height="26" rx="5" className="ib-node" />
              <g transform="translate(5,5)" style={{ color: "var(--ib-accent)" }}>
                <Mark size={16} />
              </g>
            </g>
            {AREA_NODES.map((m, i) => (
              <g key={i} className="ib-av" tabIndex={0} role="img" aria-label={m.name}>
                <circle cx={m.x} cy={m.y} r="11" fill="var(--ib-raise)" stroke="var(--ib-line-strong)" />
                <text x={m.x} y={m.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ib-ink)" fontFamily="var(--ib-sans)">
                  {m.label}
                </text>
                <circle cx={m.x + 8} cy={m.y + 8} r="2.6" fill="var(--ib-accent)" stroke="var(--ib-paper)" className="ib-presence" />
                <g className="ib-av-tip" transform={"translate(" + m.x + "," + (m.y - 18) + ")"}>
                  <rect x={-m.name.length * 2.45 - 6} y="-9" width={m.name.length * 4.9 + 12} height="14" rx="2" fill="var(--ib-inv)" />
                  <text x="0" y="1" textAnchor="middle" fontSize="7.5" fill="var(--ib-inv-ink)" fontFamily="var(--ib-sans)">
                    {m.name}
                  </text>
                </g>
              </g>
            ))}
          </g>

          {/* conectores */}
          {[L1, L2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "left" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {[R1, R2].map((d, i) => (
            <path key={d} d={d} className={"ib-flow" + (side === "right" ? " ib-flow-on" : "") + (i ? " ib-dash" : "")} />
          ))}
          {!reduced &&
            [L1, L2, R1, R2].map((d, i) => (
              <circle key={"p" + i} r="2.2" className="ib-pkt">
                <animateMotion dur={2.2 + (i % 2) * 0.6 + "s"} begin={i * 0.35 + "s"} repeatCount="indefinite" path={d} />
              </circle>
            ))}

          {/* el motor */}
          <g transform="translate(262,88)">
            <rect x="-4" y="-4" width="124" height="52" rx="8" fill="none" stroke="var(--ib-line)" className={reduced ? undefined : "ib-glow"} />
            <rect width="116" height="44" rx="6" className="ib-node" style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,.08))" }} />
            <g transform="translate(13,14)" style={{ color: "var(--ib-accent)" }}>
              <Mark size={16} />
            </g>
            <text x="36" y="26" fontSize="8.5" letterSpacing="1.4" fontWeight="600" fill="var(--ib-soft)" fontFamily="var(--ib-sans)">
              PULSO
            </text>
            <path d="M100 18l4 4-4 4" fill="none" stroke="var(--ib-muted)" strokeWidth="1.3" />
          </g>

          {/* el informe */}
          <g onMouseEnter={() => setSide("right")} onMouseLeave={() => setSide("")}>
            {[2, 1, 0].map((k) => (
              <g key={page - k} transform={"translate(" + (450 + k * 12) + "," + (40 - k * 10) + ")"} opacity={1 - k * 0.25}>
                <g className={"ib-sheet" + (k === 0 ? " ib-sheet-new" : "")}>
                  <rect width="138" height="102" rx="3" fill="var(--ib-raise)" stroke="var(--ib-line-strong)" />
                  {k === 0 && (
                    <>
                      <text x="10" y="16" fontSize="7" fill="var(--ib-muted)" fontFamily="var(--ib-mono)">
                        {"TU INFORME · " + PAGES[kind]}
                      </text>
                      {kind === 0 && (
                        <>
                          <circle cx="30" cy="52" r="15" fill="none" stroke="var(--ib-line)" strokeWidth="5" />
                          <circle cx="30" cy="52" r="15" fill="none" stroke="var(--ib-warn)" strokeWidth="5" strokeDasharray="94.2" strokeDashoffset="26" transform="rotate(-90 30 52)" strokeLinecap="round" />
                          {[["var(--ib-accent)", 66], ["var(--ib-warn)", 52], ["var(--ib-warn)", 44], ["var(--ib-bad)", 30]].map(([c, w], j) => (
                            <g key={j}>
                              <rect x="56" y={38 + j * 8} width="70" height="4" rx="2" fill="var(--ib-line)" />
                              <rect x="56" y={38 + j * 8} width={w as number} height="4" rx="2" fill={c as string} />
                            </g>
                          ))}
                          <rect x="10" y="80" width="116" height="3" rx="1" fill="var(--ib-line-strong)" />
                          <rect x="10" y="87" width="90" height="3" rx="1" fill="var(--ib-line-strong)" />
                        </>
                      )}
                      {kind === 1 &&
                        [0, 1, 2, 3, 4, 5].map((j) => (
                          <g key={j}>
                            <rect x="10" y={26 + j * 12} width="7" height="7" rx="1.5" fill="none" stroke="var(--ib-accent)" />
                            {j < 2 && <path d={"M11.5 " + (29.5 + j * 12) + "l1.6 1.6 2.6-3"} fill="none" stroke="var(--ib-accent)" strokeWidth="1.2" />}
                            <rect x="22" y={28 + j * 12} width={60 + ((j * 17) % 40)} height="3.5" rx="1" fill="var(--ib-line-strong)" />
                          </g>
                        ))}
                      {kind === 2 && (
                        <>
                          <rect x="10" y="24" width="118" height="9" fill="var(--ib-accent)" opacity=".85" />
                          {[0, 1, 2, 3, 4, 5].map((j) => (
                            <rect key={j} x="10" y={36 + j * 10} width="118" height="7" fill={j % 2 ? "var(--ib-card)" : "var(--ib-input)"} />
                          ))}
                          {[40, 70, 99].map((x) => (
                            <line key={x} x1={x} x2={x} y1="24" y2="96" stroke="var(--ib-line-strong)" />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </g>
              </g>
            ))}
          </g>
        </svg>
        <div className="ib-wide-copy" style={{ padding: "0 22px 20px" }}>
          <div>
            <h3>{COPY.answers.title}</h3>
            <p>{COPY.answers.description}</p>
          </div>
          <div>
            <h3>{COPY.report.title}</h3>
            <p>{COPY.report.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeliverablesCard({ reduced }: { reduced: boolean }) {
  const copy = COPY.deliverables
  const [hover, setHover] = React.useState(-1)
  const [auto, setAuto] = React.useState(0)
  React.useEffect(() => {
    if (reduced || hover >= 0) return
    const t = setInterval(() => setAuto((a) => (a + 1) % 4), 1700)
    return () => clearInterval(t)
  }, [reduced, hover])
  const on = hover >= 0 ? hover : reduced ? -1 : auto
  const tiles = [
    { x: 66, y: 34 },
    { x: 66, y: 116 },
    { x: 234, y: 34 },
    { x: 234, y: 116 },
  ]
  const path = (i: number) => {
    const t = tiles[i]
    const dir = t.x < 150 ? -1 : 1
    return "M" + (150 + dir * 17) + ",75 H" + (150 + dir * 42) + " V" + t.y + " H" + (t.x - dir * 15)
  }
  return (
    <div className="ib-frame ib-frame-hover">
      <Brackets />
      <div className="ib-card">
        <svg className="ib-diagram" viewBox="0 0 300 150" role="group" aria-label="Lo que incluye el paquete">
          {tiles.map((_, i) => (
            <path key={i} d={path(i)} className={"ib-flow" + (on === i ? " ib-flow-on" : "")} />
          ))}
          {!reduced && on >= 0 && (
            <circle key={on} r="2.2" className="ib-pkt">
              <animateMotion dur="1.1s" repeatCount="indefinite" path={path(on)} />
            </circle>
          )}
          <g transform="translate(133,58)">
            <rect width="34" height="34" rx="7" className="ib-node" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.08))" }} />
            <g transform="translate(8,8)" style={{ color: "var(--ib-accent)" }}>
              <Mark size={18} />
            </g>
          </g>
          {tiles.map((t, i) => (
            <g
              key={i}
              className={"ib-tool" + (on === i ? " ib-tool-on" : "")}
              tabIndex={0}
              role="img"
              aria-label={copy.tools[i]}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(-1)}
            >
              <rect x={t.x - 15} y={t.y - 15} width="30" height="30" rx="6" className="ib-node" />
              <g transform={"translate(" + t.x + "," + t.y + ")"} style={{ color: on === i ? "var(--ib-accent)" : "var(--ib-ink)" }}>
                <ToolGlyph index={i} />
              </g>
              <text x={t.x} y={t.y + (t.y < 75 ? -21 : 28)} textAnchor="middle" fontSize="8" fill="var(--ib-muted)" fontFamily="var(--ib-sans)" opacity={on === i ? 1 : 0} style={{ transition: "opacity .25s" }}>
                {copy.tools[i]}
              </text>
            </g>
          ))}
          <text x="150" y="112" textAnchor="middle" fontSize="7" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            {on >= 0 ? "entregando · " + copy.tools[on].toLowerCase() : "4 entregables"}
          </text>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
      </div>
    </div>
  )
}

function PotentialCard({ uid, reduced }: { uid: string; reduced: boolean }) {
  const copy = COPY.potential
  const [ref, inView] = useInView(0.3)
  const [hover, setHover] = React.useState(-1)
  const W = 300
  const H = 130
  const vals = copy.values
  const { line, area, points } = chartPaths(vals, W, H, 14)
  const split = clamp(copy.planFrom, 1, vals.length - 1)
  const fill = uid + "area"
  const last = points[points.length - 1]
  const i = hover >= 0 ? hover : points.length - 1
  const p = points[i]
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex(points.map((q) => q[0]), ((e.clientX - r.left) / r.width) * W))
  }
  return (
    <div className="ib-frame ib-frame-hover" ref={ref} data-in={inView}>
      <Brackets />
      <div className="ib-card">
        <svg className="ib-diagram ib-chart" viewBox={"0 0 " + W + " " + (H + 6)} onPointerMove={onMove} onPointerLeave={() => setHover(-1)} role="img" aria-label="Ejemplo de cómo sube el puntaje al seguir el plan">
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ib-accent)" stopOpacity=".18" />
              <stop offset="1" stopColor="var(--ib-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="14" x2={W - 14} y1={H * g} y2={H * g} stroke="var(--ib-line)" />
          ))}
          <path d={area} fill={"url(#" + fill + ")"} />
          <path d={line} fill="none" stroke="var(--ib-accent)" strokeWidth="1.6" pathLength={1} className="ib-line-draw" />
          <line x1={points[split][0]} x2={points[split][0]} y1="10" y2={H - 14} stroke="var(--ib-line-strong)" strokeDasharray="2 3" />
          <text x={points[split][0] + 4} y="16" fontSize="7" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            EMPIEZA EL PLAN
          </text>
          <text x={W - 14} y={H - 2} textAnchor="end" fontSize="7" fill="var(--ib-faint)" fontFamily="var(--ib-mono)">
            EJEMPLO
          </text>
          {hover >= 0 && <line x1={p[0]} x2={p[0]} y1="8" y2={H - 14} stroke="var(--ib-ink)" strokeOpacity=".35" />}
          {!reduced && hover < 0 && <circle cx={last[0]} cy={last[1]} r="7" fill="var(--ib-accent)" opacity=".2" className="ib-glow" />}
          <circle cx={p[0]} cy={p[1]} r="3.2" fill="var(--ib-raise)" stroke="var(--ib-accent)" strokeWidth="1.5" />
          <g transform={"translate(" + clamp(p[0], 46, W - 46) + "," + (p[1] < 34 ? p[1] + 22 : p[1] - 14) + ")"}>
            <rect x="-40" y="-11" width="80" height="15" rx="2" fill="var(--ib-inv)" />
            <text x="0" y="-1" textAnchor="middle" fontSize="7.5" fill="var(--ib-inv-ink)" fontFamily="var(--ib-mono)">
              {"sem " + (i + 1) + " · " + vals[i] + " pts"}
            </text>
          </g>
        </svg>
        <div style={{ marginTop: "auto" }}>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
      </div>
    </div>
  )
}

const IB_CSS = `
.ib-root{--ib-page:transparent;--ib-paper:#fbfcfb;--ib-card:#f3f6f4;--ib-raise:#ffffff;--ib-input:#fff8d6;--ib-ink:#0f1a17;--ib-soft:#2f3b37;--ib-muted:#6b7a75;--ib-faint:#a3aeaa;--ib-line:#e1e7e3;--ib-line-strong:#cbd5d0;--ib-bracket:#c3cdc8;--ib-inv:#0f1a17;--ib-inv-ink:#f2f6f4;--ib-accent:#0e7c66;--ib-warn:#d9a21b;--ib-bad:#d6453d;--ib-shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px -12px rgba(0,0,0,.12);--ib-sans:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--ib-mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;position:relative;width:100%;box-sizing:border-box;color:var(--ib-ink);font-family:var(--ib-sans);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
.ib-root[data-theme="dark"]{--ib-paper:#101816;--ib-card:#15201d;--ib-raise:#1a2522;--ib-input:#2a2a1c;--ib-ink:#eef3f1;--ib-soft:#c9d3cf;--ib-muted:#8f9c97;--ib-faint:#5d6a66;--ib-line:#24312d;--ib-line-strong:#33423d;--ib-bracket:#3c4b46;--ib-inv:#eef3f1;--ib-inv-ink:#101816;--ib-accent:#2bc39b;--ib-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -14px rgba(0,0,0,.7)}
.ib-root :where(*){box-sizing:border-box}
.ib-root :focus-visible{outline:2px solid var(--ib-accent);outline-offset:2px}
.ib-root :where(svg){display:block;max-width:none;flex:none}
.ib-root :where(h2,h3,p){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.ib-shell{width:100%;max-width:1180px;margin:0 auto;container-type:inline-size}
.ib-sec{position:relative;background:var(--ib-paper);border:1px solid var(--ib-line);border-radius:24px;padding:clamp(36px,6cqw,72px) clamp(16px,4cqw,48px)}
.ib-reveal{opacity:0;transform:translateY(18px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.ib-reveal[data-in="true"]{opacity:1;transform:none}
.ib-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;margin-bottom:clamp(28px,4.5cqw,52px)}
.ib-tag{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ib-accent);background:var(--ib-card);border:1px solid var(--ib-line)}
.ib-h2{font-size:clamp(28px,4.4cqw,44px);line-height:1.08;letter-spacing:-.025em;font-weight:800}
.ib-h2>span{display:block}
.ib-muted{color:var(--ib-faint)}
.ib-frame{position:relative}
.ib-c{position:absolute;width:12px;height:12px;border-color:var(--ib-bracket);border-style:solid;border-width:0;pointer-events:none;transition:border-color .3s,transform .35s cubic-bezier(.2,.8,.2,1)}
.ib-c-tl{top:-6px;left:-6px;border-top-width:1.5px;border-left-width:1.5px}
.ib-c-tr{top:-6px;right:-6px;border-top-width:1.5px;border-right-width:1.5px}
.ib-c-bl{bottom:-6px;left:-6px;border-bottom-width:1.5px;border-left-width:1.5px}
.ib-c-br{bottom:-6px;right:-6px;border-bottom-width:1.5px;border-right-width:1.5px}
.ib-frame-hover:hover>.ib-c{border-color:var(--ib-accent)}
.ib-frame-hover:hover>.ib-c-tl{transform:translate(-3px,-3px)}
.ib-frame-hover:hover>.ib-c-tr{transform:translate(3px,-3px)}
.ib-frame-hover:hover>.ib-c-bl{transform:translate(-3px,3px)}
.ib-frame-hover:hover>.ib-c-br{transform:translate(3px,3px)}
.ib-bento{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(22px,3cqw,34px)}
@container (min-width:720px){.ib-bento{grid-template-columns:repeat(2,minmax(0,1fr))}.ib-wide{grid-column:1 / -1;width:min(100%,820px);justify-self:center}}
.ib-card{background:linear-gradient(180deg,var(--ib-raise),var(--ib-card));border:1px solid var(--ib-line);padding:clamp(14px,2cqw,22px);display:flex;flex-direction:column;gap:14px;transition:border-color .3s,box-shadow .35s}
.ib-card:hover{border-color:var(--ib-line-strong);box-shadow:var(--ib-shadow)}
.ib-card h3{font-size:15px;font-weight:700;letter-spacing:-.005em}
.ib-card p{font-size:13.5px;line-height:1.55;color:var(--ib-muted);max-width:44ch}
.ib-diagram{width:100%;height:auto;overflow:visible}
.ib-wide-copy{display:grid;grid-template-columns:1fr;gap:16px}
@container (min-width:560px){.ib-wide-copy{grid-template-columns:1fr 1fr}.ib-wide-copy>div:last-child{justify-self:end;text-align:left}}
.ib-flow{stroke:var(--ib-line-strong);fill:none;stroke-width:1.2;transition:stroke .3s}
.ib-flow-on{stroke:var(--ib-accent)}
.ib-dash{stroke-dasharray:3 4;animation:ib-dash 1.2s linear infinite}
.ib-pkt{fill:var(--ib-accent)}
.ib-node{fill:var(--ib-raise);stroke:var(--ib-line-strong);transition:stroke .3s,transform .3s}
.ib-av{cursor:pointer;transition:transform .35s cubic-bezier(.2,.8,.2,1);transform-box:fill-box;transform-origin:center}
.ib-av:hover,.ib-av:focus-visible{transform:scale(1.15)}
.ib-av-tip{opacity:0;transition:opacity .2s;pointer-events:none}
.ib-av:hover .ib-av-tip,.ib-av:focus .ib-av-tip{opacity:1}
.ib-presence{animation:ib-pulse 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.ib-sheet{transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s}
.ib-sheet-new{animation:ib-sheet-in .7s cubic-bezier(.2,.8,.2,1) both}
.ib-tool{cursor:pointer;transition:transform .3s cubic-bezier(.2,.8,.2,1);transform-box:fill-box;transform-origin:center}
.ib-tool:hover,.ib-tool-on{transform:translateY(-2px)}
.ib-tool rect{transition:stroke .3s}
.ib-tool-on rect.ib-node{stroke:var(--ib-accent)}
.ib-chart{cursor:crosshair}
.ib-line-draw{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.8s cubic-bezier(.4,.1,.2,1)}
[data-in="true"] .ib-line-draw{stroke-dashoffset:0}
.ib-glow{animation:ib-pulse 2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ib-dash{to{stroke-dashoffset:-14}}
@keyframes ib-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.35)}}
@keyframes ib-sheet-in{from{opacity:0;transform:translate(14px,-10px) rotate(4deg)}to{opacity:1;transform:none}}
.ib-bento>.ib-frame{display:flex;flex-direction:column}
.ib-bento>.ib-frame>.ib-card{flex:1}
@media (prefers-reduced-motion:reduce){
.ib-reveal{opacity:1;transform:none;transition:none}
.ib-dash,.ib-presence,.ib-glow,.ib-sheet-new{animation:none}
.ib-line-draw{transition:none;stroke-dashoffset:0}
}
`
