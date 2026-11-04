"use client"

// Test de salud financiera personal: intro → 16 preguntas → diagnóstico.
// El puntaje se calcula en el navegador con src/lib/scoring.js; nada se envía
// salvo que la persona pida su resumen por correo o compre el paquete.
import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, Check, CreditCard, Lock, Mail, ShieldCheck, Star } from "lucide-react"
import * as S from "@/lib/scoring"
import type { AreaResult, Result } from "@/lib/scoring"
import { config } from "@/config"
import { Button } from "@/components/ui/button"
import { ScoreGauge } from "@/components/ui/score-gauge"
import { TimelineContent } from "@/components/ui/timeline-content"
import { cn } from "@/lib/utils"
import { store } from "@/lib/store"
import { PREMIUM_FEATURES, trialText } from "@/lib/plans"
import { PlanPicker } from "@/components/site/plan-picker"
import { countryFromText } from "@/lib/money"
import { setVisitorCountry } from "@/lib/use-country"

const STORE_KEY = "pulso_personal_v2"

const COUNTRIES = ["Argentina", "Bolivia", "Brasil", "Canadá", "Chile", "Colombia", "Costa Rica", "Cuba", "Ecuador",
  "El Salvador", "España", "Estados Unidos", "Guatemala", "Honduras", "México", "Nicaragua", "Panamá", "Paraguay",
  "Perú", "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela"]

const AREA_NAME: Record<string, string> = Object.fromEntries(S.AREAS.map((a) => [a.id, a.name]))

type Step =
  | { kind: "text"; label: string; text: string; placeholder: string }
  | { kind: "choice"; label: string; text: string; options: string[] }

const STEPS: Step[] = [
  { kind: "text", label: "Tu perfil", text: S.COUNTRY.text, placeholder: S.COUNTRY.placeholder },
  ...S.PROFILE.map((p) => ({ kind: "choice" as const, label: "Tu perfil", text: p.text, options: p.options })),
  ...S.QUESTIONS.map((q) => ({ kind: "choice" as const, label: AREA_NAME[q.area], text: q.text, options: q.options })),
]

type Saved = { code: string; pais: string }
type Answer = number | string | undefined

const colorText = { verde: "text-verde", amarillo: "text-amarillo", naranja: "text-naranja", rojo: "text-rojo" } as const
const colorBg = { verde: "bg-verde", amarillo: "bg-amarillo", naranja: "bg-naranja", rojo: "bg-rojo" } as const
const colorBorder = { verde: "border-l-verde", amarillo: "border-l-amarillo", naranja: "border-l-naranja", rojo: "border-l-rojo" } as const

function load(): Saved | null {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || "null") } catch { return null }
}
function save(v: Saved | null) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(v)) } catch { /* sin almacenamiento */ }
}

export function Quiz() {
  const [step, setStep] = React.useState(-1)
  const [answers, setAnswers] = React.useState<Answer[]>(() => new Array(STEPS.length))
  const [result, setResult] = React.useState<Saved | null>(null)

  React.useEffect(() => {
    const saved = load()
    if (saved?.code) {
      try { S.decode(saved.code); setResult(saved) } catch { save(null) }
    }
  }, [])

  // Avanza a la pregunta n; al pasar la última, calcula y guarda el resultado.
  const advance = React.useCallback((n: number, a: Answer[]) => {
    if (n >= STEPS.length) {
      const data: Saved = {
        code: S.encode({ profile: a.slice(1, 4) as number[], q: a.slice(4) as number[] }),
        pais: (a[0] as string) || "",
      }
      save(data)
      store.setTest({ ...data, at: new Date().toISOString() })
      const c = countryFromText(data.pais)
      if (c) setVisitorCountry(c.id)
      setResult(data)
    } else {
      setStep(Math.max(-1, n))
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const go = React.useCallback((n: number) => advance(n, answers), [advance, answers])

  const answer = React.useCallback((value: Answer, delay = 0) => {
    const next = answers.slice()
    next[step] = value
    setAnswers(next)
    setTimeout(() => advance(step + 1, next), delay)
  }, [answers, step, advance])

  const choose = React.useCallback((i: number) => answer(i, 220), [answer])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result || step < 0) return
      if (document.activeElement?.tagName === "INPUT") return
      const s = STEPS[step]
      if (s.kind !== "choice") return
      const k = Number(e.key)
      if (k >= 1 && k <= s.options.length) choose(k - 1)
      if (e.key === "Backspace") go(step - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, result, choose, go])

  const restart = () => { save(null); setResult(null); setAnswers(new Array(STEPS.length)); setStep(-1) }

  if (result) return <ResultView data={result} onRestart={restart} />
  if (step < 0) return <Intro onStart={() => go(0)} />

  const s = STEPS[step]
  const pct = Math.round((step / STEPS.length) * 100)
  return (
    <div className="mx-auto max-w-2xl px-5 pb-20 pt-10">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={step}>
        <motion.div className="h-full bg-gradient-to-r from-primary to-brand-bright" animate={{ width: pct + "%" }} transition={{ duration: 0.4 }} />
      </div>
      <div className="mb-8 flex justify-between text-sm font-semibold text-muted-foreground">
        <span>Pregunta {step + 1} de {STEPS.length}</span><span>{pct}%</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{s.label}</div>
          <h1 className="mb-6 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{s.text}</h1>
          {s.kind === "text" ? (
            <CountryInput
              initial={(answers[step] as string) || ""}
              placeholder={s.placeholder}
              onSubmit={(v) => answer(S.cleanCountry(v))}
            />
          ) : (
            <div className="grid gap-2.5" role="radiogroup">
              {s.options.map((o, i) => {
                const sel = answers[step] === i
                return (
                  <button
                    key={o}
                    role="radio"
                    aria-checked={sel}
                    autoFocus={i === 0}
                    onClick={() => choose(i)}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-xl border-[1.5px] bg-card px-4 py-4 text-left font-semibold transition-all hover:border-primary active:scale-[.995]",
                      sel && "border-primary bg-accent",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-extrabold text-ink-2", sel && "bg-primary text-primary-foreground")}>{i + 1}</span>
                    {o}
                  </button>
                )
              })}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" /> Atrás
            </button>
            {s.kind === "choice" && answers[step] !== undefined && (
              <button className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground" onClick={() => go(step + 1)}>
                Siguiente <ArrowRight className="size-4" />
              </button>
            )}
          </div>
          <PrivacyLine />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function PrivacyLine() {
  return (
    <p className="mt-8 flex items-center gap-2 border-t border-dashed pt-4 text-sm text-muted-foreground">
      <Lock className="size-4 shrink-0 text-primary" />
      No recopilamos tus respuestas: el puntaje se calcula aquí, en tu navegador.
    </p>
  )
}

function CountryInput({ initial, placeholder, onSubmit }: { initial: string; placeholder: string; onSubmit: (v: string) => void }) {
  const [v, setV] = React.useState(initial)
  return (
    <>
      <form className="flex flex-wrap gap-2.5" onSubmit={(e) => { e.preventDefault(); onSubmit(v) }} autoComplete="off">
        <label className="sr-only" htmlFor="pais">País</label>
        <input
          id="pais" list="paises" maxLength={40} autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
          className="min-w-0 flex-[1_1_260px] rounded-xl border-[1.5px] bg-card px-4 py-4 text-lg font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-accent [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <datalist id="paises">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
        <Button type="submit" size="lg">Continuar <ArrowRight /></Button>
      </form>
      <p className="mt-3 text-sm text-muted-foreground">Escríbelo como quieras. Si prefieres no decirlo, deja el campo vacío y continúa.</p>
    </>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-20 pt-12">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
        <span className="size-2 animate-pulse rounded-full bg-brand-bright" /> Test de salud financiera personal
      </div>
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">Mide el pulso de tus finanzas</h1>
      <p className="text-lg text-muted-foreground">
        16 preguntas rápidas sobre cómo gastas, ahorras, te endeudas, te proteges y planeas. Al final recibes tu puntaje de 0 a 100 y un diagnóstico de cada área.
      </p>
      <div className="my-7 flex gap-4 rounded-2xl border border-primary/25 bg-accent p-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Lock className="size-5" /></div>
        <div>
          <strong>Tu privacidad está protegida</strong>
          <ul className="mt-2 space-y-1 font-semibold">
            {["No recopilamos ni guardamos tus respuestas.", "No pedimos nombre, documento ni montos de dinero.", "El puntaje se calcula en tu propio navegador."].map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">Solo si al final decides pedir tu informe por correo, nos llegan tu correo y tus respuestas, con tu autorización.</p>
        </div>
      </div>
      <Button size="lg" onClick={onStart}>Empezar el test <ArrowRight /></Button>
      <p className="mt-3 text-sm text-muted-foreground">Toma unos 5 minutos. Puedes responder con las teclas 1 a 5.</p>
    </div>
  )
}

/* ------------------------------------------------------------ resultado */

function InsightCard({ a, kind }: { a: AreaResult; kind: "debil" | "fortaleza" }) {
  const strong = kind === "fortaleza"
  const cls = strong ? "verde" : a.color === "rojo" ? "rojo" : "amarillo"
  const tag = strong ? (a.color === "verde" ? "Tu fortaleza" : "Tu mejor área") : a.color === "rojo" ? "Riesgo" : "Atención"
  const Icon = strong ? Star : AlertTriangle
  return (
    <div className={cn("rounded-xl border border-l-4 bg-card p-4", colorBorder[cls])}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className={cn("flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider", colorText[cls])}><Icon className="size-3.5" />{tag}</span>
        <span className="text-xs font-bold text-muted-foreground">{a.name} · {a.score}/100</span>
      </div>
      <p className="font-semibold leading-snug">{strong ? a.bestInsight : a.insight}</p>
    </div>
  )
}

function ResultView({ data, onRestart }: { data: Saved; onRestart: () => void }) {
  const res: Result = React.useMemo(() => S.score(S.decode(data.code)), [data.code])
  const sorted = res.areas.slice().sort((a, b) => a.raw - b.raw)
  const weakTop = sorted.filter((a) => a.color !== "verde").slice(0, 3)
  const strength = res.strongest
  const locked = res.plan.flatMap((w, wi) => w.actions.map((t, ai) => ({ week: w.title, text: t, open: wi === 0 && ai === 0 })))
  const lockedCount = locked.length - 1
  const [email, setEmail] = React.useState("")

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10">
      {/* 1. Diagnóstico */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 rounded-3xl border bg-card p-6 text-center shadow-sm md:flex-row md:p-8 md:text-left">
        <ScoreGauge value={res.total} color={res.level.color} />
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Tu diagnóstico{data.pais ? " · " + data.pais : ""}</div>
          <span className={cn("inline-block rounded-full px-3.5 py-1 text-sm font-extrabold text-white", colorBg[res.level.color])}>{res.level.name}</span>
          <h1 className="mb-2 mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">{res.level.message}</h1>
          <p className="text-ink-2">
            {res.weakest.id === strength.id ? "Todas tus áreas están en el mismo nivel." : (
              <>{strength.color === "verde" ? "Tu mayor fortaleza es" : "Tu mejor área es"} <strong className="text-foreground">{strength.name}</strong> ({strength.score}/100). Tu punto más débil es <strong className="text-foreground">{res.weakest.name}</strong> ({res.weakest.score}/100).</>
            )}
          </p>
        </div>
      </motion.div>

      {/* 2. Alertas */}
      {res.flags.length > 0 && (
        <div className="mt-5 flex gap-3 rounded-xl border border-rojo/35 bg-rojo/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rojo" />
          <div>
            <strong className="text-rojo">{res.flags.length === 1 ? "Tienes 1 alerta roja" : `Tienes ${res.flags.length} alertas rojas`}</strong>
            <ul className="mt-1 list-disc pl-5">{res.flags.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
            {res.total > 59 && <p className="mt-1 text-sm text-muted-foreground">Por eso tu nivel no pasa de &quot;En riesgo&quot;, aunque tu puntaje sea {res.total}.</p>}
          </div>
        </div>
      )}

      {/* 3. Hallazgos */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold">Lo que revelan tus respuestas</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {weakTop.map((a, i) => <TimelineContent key={a.id} animationNum={i}><InsightCard a={a} kind="debil" /></TimelineContent>)}
          {!weakTop.includes(strength) && <TimelineContent animationNum={weakTop.length}><InsightCard a={strength} kind="fortaleza" /></TimelineContent>}
        </div>
      </section>

      {/* 4. Semáforo */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold">Tu semáforo por área</h2>
        <div className="grid gap-3">
          {res.areas.map((a, i) => (
            <div key={a.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between font-extrabold">
                <span className="flex items-center gap-2"><span className={cn("size-2.5 rounded-full", colorBg[a.color])} />{a.name}</span>
                <span className={cn("font-num font-bold", colorText[a.color])}>{a.score}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div className={cn("h-full rounded-full", colorBg[a.color])} initial={{ width: 0 }} whileInView={{ width: a.score + "%" }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }} />
              </div>
              <p className="mt-2 text-sm text-ink-2">{a.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Potencial */}
      {res.potential && (
        <TimelineContent className="mt-10 flex items-center gap-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-accent to-card p-6">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowUp className="size-6" /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Tu potencial</div>
            <div className="font-num flex items-baseline gap-2.5 text-3xl font-bold tracking-tight">
              <span>{res.potential.from}</span><span className="text-xl text-muted-foreground">→</span>
              <span className={colorText[res.potential.level.color]}>{res.potential.to}</span>
            </div>
            <p className="mt-1 text-ink-2">
              Si llevas <strong className="text-foreground">{res.potential.area}</strong> a verde, tu puntaje subiría de {res.potential.from} a {res.potential.to}
              {res.potential.level.id !== res.level.id && res.flags.length === 0 && <> y pasarías a <strong className="text-foreground">{res.potential.level.name}</strong></>}
              {res.flags.length > 0 && ", y al resolver tus alertas tu nivel deja de estar limitado"}. Tu plan te dice exactamente cómo.
            </p>
          </div>
        </TimelineContent>
      )}

      {/* 6. Plan bloqueado */}
      <section className="mt-10">
        <h2 className="mb-1 text-xl font-extrabold">Tu plan de 30 días ya está listo</h2>
        <p className="mb-4 text-sm text-muted-foreground">8 acciones ordenadas según tus respuestas. Esta es la primera:</p>
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          {locked.map((l, i) => (
            <div key={i} className="grid gap-1 border-b px-5 py-3.5 text-sm md:grid-cols-[170px_1fr] md:gap-3" aria-hidden={!l.open}>
              <span className="text-xs font-extrabold text-ink-2">{l.week}</span>
              {l.open
                ? <span className="flex gap-2 font-semibold"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{l.text}</span>
                : <span className="select-none text-ink-2 blur-[5px]">{l.text}</span>}
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 flex h-3/5 items-end justify-center gap-2 bg-gradient-to-b from-transparent via-card/90 to-card pb-6 font-extrabold">
            <Lock className="size-4 text-primary" /> {lockedCount} acciones más, en tu tablero completo
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
        <div>
          <div className="font-extrabold">Tu tablero ya tiene tu radar y tu primera acción</div>
          <p className="text-sm text-muted-foreground">Mira la vista previa gratis antes de decidir.</p>
        </div>
        <Button asChild variant="outline"><Link href="/tablero">Ver mi tablero <ArrowRight /></Link></Button>
      </div>

      <Offer data={data} email={email} />

      {/* 8. Correo */}
      <LeadForm data={data} email={email} setEmail={setEmail} />

      <p className="mt-8 text-center">
        <button className="font-semibold text-muted-foreground hover:text-foreground" onClick={onRestart}>Volver a hacer el test</button>
      </p>
    </div>
  )
}

function Offer({ data, email }: { data: Saved; email: string }) {
  return (
    <TimelineContent className="mt-12 overflow-hidden rounded-3xl shadow-xl">
      <div id="oferta" className="glow-card border-t bg-card px-6 py-7 text-foreground md:px-8">
        {trialText && <span className="inline-block rounded-full bg-brand-bright px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary-foreground">{trialText}</span>}
        <h2 className="mb-2 mt-3 text-2xl font-extrabold text-white md:text-3xl">Convierte este diagnóstico en un plan que se cumple</h2>
        <p className="max-w-[60ch] text-ink-2">Con {config.premiumName} escribes tus gastos por WhatsApp y tu tablero te muestra cada día cuánto te queda, cómo vas con tu presupuesto y qué hacer con tu dinero.</p>
      </div>
      <div className="grid gap-8 rounded-b-3xl border-2 border-t-0 border-primary bg-card px-6 py-7 md:grid-cols-[1.1fr_.9fr] md:px-8">
        <ul className="space-y-3">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3 text-ink-2">
              <span className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border border-primary"><Check className="size-3.5 text-primary" /></span>
              <span><strong className="text-foreground">{f.title}:</strong> {f.text}</span>
            </li>
          ))}
          <li className="flex gap-3 text-ink-2">
            <span className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border border-primary"><Check className="size-3.5 text-primary" /></span>
            <span><strong className="text-foreground">Tu plan de 30 días e informe en PDF</strong> con el resultado de este diagnóstico.</span>
          </li>
        </ul>
        <div className="rounded-2xl bg-muted p-5">
          <PlanPicker test={{ code: data.code, pais: data.pais }} email={email} />
          <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />Pago seguro con Lemon Squeezy</span>
            <span className="flex items-center gap-1.5"><CreditCard className="size-3.5 text-primary" />Tarjeta y otros medios en el checkout</span>
            <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-primary" />Acceso por correo en minutos</span>
          </div>
        </div>
      </div>
    </TimelineContent>
  )
}


function LeadForm({ data, email, setEmail }: { data: Saved; email: string; setEmail: (v: string) => void }) {
  const [consent, setConsent] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; tone: string } | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setMsg({ text: "Revisa tu correo.", tone: "text-rojo" })
    if (!consent) return setMsg({ text: "Necesitamos tu autorización para enviarte el correo.", tone: "text-rojo" })
    if (!config.appsScriptUrl) return setMsg({ text: "El envío de correos aún no está configurado.", tone: "text-naranja" })
    setMsg({ text: "Enviando…", tone: "" })
    try {
      await fetch(config.appsScriptUrl, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "lead", email: email.trim(), r: data.code, pais: data.pais, consent: true, test: "personal" }),
      })
      setMsg({ text: "Listo. Revisa tu correo en unos minutos (y la carpeta de spam).", tone: "text-verde" })
    } catch {
      setMsg({ text: "No pudimos enviarlo. Intenta de nuevo.", tone: "text-rojo" })
    }
  }
  return (
    <div className="mt-5 rounded-2xl border bg-card p-6">
      <h3 className="text-lg font-extrabold">¿Prefieres pensarlo? Te enviamos tu resumen gratis</h3>
      <form className="mt-3 flex flex-wrap gap-2.5" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email"
          className="min-w-0 flex-[1_1_240px] rounded-full border-[1.5px] bg-card px-5 py-3 outline-none focus:border-primary" />
        <Button type="submit" variant="outline">Enviarme el resumen</Button>
      </form>
      <label className="mt-3 flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--primary)]" />
        <span>Autorizo el tratamiento de mi correo y mis respuestas según la <Link href="/privacidad" target="_blank" className="text-primary underline">política de privacidad</Link> para recibir mi resumen y consejos por correo. Puedo darme de baja cuando quiera.</span>
      </label>
      {msg && <p role="status" className={cn("mt-2 text-sm font-semibold", msg.tone)}>{msg.text}</p>}
    </div>
  )
}
