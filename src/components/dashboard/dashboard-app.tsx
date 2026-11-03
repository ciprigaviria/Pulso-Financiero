"use client"

// La plataforma: vista previa gratis (con el resultado del test), desbloqueo con la clave
// de licencia de Lemon Squeezy y tablero completo con los números de la persona.
import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowUp, Download, KeyRound, Lock, Pencil, Trash2, Upload } from "lucide-react"
import * as S from "@/lib/scoring"
import * as F from "@/lib/finance"
import type { FinanceData } from "@/lib/finance"
import { SAMPLE } from "@/lib/sample"
import { sendForm, store, validateLicense, type SavedTest } from "@/lib/store"
import { DEFAULT_COUNTRY, countryFromNavigator, countryFromText } from "@/lib/money"
import { useSampleData } from "@/lib/use-country"
import { CountryPicker } from "@/components/site/country-picker"
import { PlanPicker } from "@/components/site/plan-picker"
import { PREMIUM_FEATURES } from "@/lib/plans"
import { config } from "@/config"
import { Button } from "@/components/ui/button"
import { BentoCard, Radar, Tooltip, type TipApi } from "./charts"
import { DashboardView } from "./dashboard-view"
import { NumbersForm } from "./numbers-form"
import { cn } from "@/lib/utils"
import { AccessSteps } from "@/components/home/access-steps"

type Mode = "loading" | "demo" | "locked" | "unlocked"

export function DashboardApp() {
  const sample = useSampleData()
  const [mode, setMode] = React.useState<Mode>("loading")
  const [test, setTest] = React.useState<SavedTest | null>(null)
  const [data, setData] = React.useState<FinanceData | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [unlockMsg, setUnlockMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTest(store.getTest())
    setData(store.getData())
    if (params.has("ejemplo")) { setMode("demo"); return }
    const key = params.get("licencia")
    if (key) {
      validateLicense(key).then((r) => {
        if (r.ok) { store.setLicense({ key, at: new Date().toISOString() }); setMode("unlocked") }
        else { setUnlockMsg(r.message || "La clave no es válida."); setMode(store.getLicense() ? "unlocked" : "locked") }
        window.history.replaceState(null, "", window.location.pathname)
      })
      return
    }
    setMode(store.getLicense() ? "unlocked" : "locked")
  }, [])

  const unlock = async (key: string) => {
    setUnlockMsg("Verificando…")
    const r = await validateLicense(key)
    if (r.ok) { store.setLicense({ key, at: new Date().toISOString() }); setUnlockMsg(null); setMode("unlocked") }
    else setUnlockMsg(r.message || "La clave no es válida.")
  }

  if (mode === "loading") return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Cargando tu tablero…</div>

  if (mode === "demo") {
    return (
      <Shell title="Así se ve un tablero" subtitle={SAMPLE.label}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amarillo/40 bg-amarillo/10 px-4 py-3 text-sm">
          <span><b>Ejemplo ilustrativo con datos ficticios.</b> Tu tablero se construye con tu diagnóstico y tus propias cifras.</span>
          <div className="flex flex-wrap items-center gap-2">
            <CountryPicker />
            <Button asChild size="sm"><Link href="/prueba-personal">Hacer mi diagnóstico gratis <ArrowRight /></Link></Button>
          </div>
        </div>
        <DashboardView key={sample.currency + (sample.locale || "")} data={sample} testCode={SAMPLE.testCode} readOnly />
      </Shell>
    )
  }

  if (mode === "locked") return <LockedView test={test} sample={sample} onUnlock={unlock} unlockMsg={unlockMsg} />

  // Desbloqueado
  if (!data || editing) {
    return (
      <Shell title={data ? "Editar mis cifras" : "Configura tu tablero"} subtitle="Unos 10 minutos. Puedes actualizarlas cuando quieras.">
        <BentoCard className="mx-auto max-w-3xl">
          <NumbersForm
            initial={data || (() => { const c = countryFromText(test?.pais) || countryFromNavigator() || DEFAULT_COUNTRY; return F.emptyData(c.currency, c.locale, c.id) })()}
            onSave={(d) => { store.setData(d); setData(d); setEditing(false); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            onCancel={data ? () => setEditing(false) : undefined}
          />
        </BentoCard>
      </Shell>
    )
  }

  return (
    <Shell
      title="Tu tablero"
      subtitle={test ? `Test del ${test.at ? new Date(test.at).toLocaleDateString("es") : "último intento"}${test.pais ? " · " + test.pais : ""}` : "Aún no tienes test: hazlo para ver tu radar y tu plan."}
      actions={<Toolbar data={data} onEdit={() => setEditing(true)} onImport={(d) => { store.setData(d); setData(d) }} onClear={() => { store.setData(null); setData(null) }} />}
    >
      {!test && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-sm">
          <span>Haz el diagnóstico para sumar tu perfil por áreas y tu plan de 30 días.</span>
          <Button asChild size="sm" variant="outline"><Link href="/prueba-personal">Hacer el diagnóstico</Link></Button>
        </div>
      )}
      <DashboardView data={data} testCode={test?.code} onEditNumbers={() => setEditing(true)} />
      <Feedback />
    </Shell>
  )
}

function Shell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function Toolbar({ data, onEdit, onImport, onClear }: { data: FinanceData; onEdit: () => void; onImport: (d: FinanceData) => void; onClear: () => void }) {
  const file = React.useRef<HTMLInputElement>(null)
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: "pulso", version: 1, test: store.getTest(), data }, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob); a.download = "mi-tablero-pulso.json"; a.click(); URL.revokeObjectURL(a.href)
  }
  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text())
      if (j?.app !== "pulso" || !j.data) throw new Error()
      if (j.test) store.setTest(j.test)
      onImport(j.data)
    } catch { alert("Ese archivo no es un respaldo de Pulso.") }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={onEdit}><Pencil /> Editar mis cifras</Button>
      <Button size="sm" variant="outline" onClick={exportJson} title="Descarga un respaldo para abrir tu tablero en otro dispositivo"><Download /> Respaldo</Button>
      <Button size="sm" variant="outline" onClick={() => file.current?.click()}><Upload /> Cargar respaldo</Button>
      <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
      <Button size="sm" variant="ghost" onClick={() => { if (confirm("¿Borrar tus cifras de este navegador?")) onClear() }}><Trash2 /> Borrar</Button>
    </div>
  )
}

function LockedView({ test, sample, onUnlock, unlockMsg }: { test: SavedTest | null; sample: FinanceData; onUnlock: (k: string) => void; unlockMsg: string | null }) {
  const tip = React.useRef<TipApi | null>(null)
  const res = React.useMemo(() => { try { return test ? S.score(S.decode(test.code)) : null } catch { return null } }, [test])
  const [key, setKey] = React.useState("")
  const first = res?.plan[0].actions[0]
  return (
    <Shell title="Tu tablero" subtitle={res ? "Vista previa gratis con tu resultado del test." : "Haz el test gratis para ver tu vista previa."}>
      {res ? (
        <div className="grid grid-cols-12 gap-4">
          <BentoCard className="col-span-12 md:col-span-5">
            <h2 className="text-[17px] font-bold tracking-tight">Perfil financiero por áreas</h2>
            <p className="text-sm text-muted-foreground">Puntaje <b className="text-foreground">{res.total}/100</b> · {res.level.name}</p>
            <Radar tip={tip} values={res.areas.map((a) => a.score)} axis={res.areas.map((a) => a.name)} size={300} />
          </BentoCard>
          <div className="col-span-12 grid gap-4 md:col-span-7">
            {res.potential && (
              <BentoCard className="flex items-center gap-4 bg-gradient-to-br from-accent to-card">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowUp className="size-5" /></div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">Tu potencial</div>
                  <div className="font-num text-2xl font-bold">{res.potential.from} → {res.potential.to}</div>
                  <p className="text-sm text-ink-2">Si llevas {res.potential.area} a verde.</p>
                </div>
              </BentoCard>
            )}
            <BentoCard>
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Tu primera acción</div>
              <p className="mt-1 text-lg font-bold leading-snug">{first}</p>
              <p className="mt-1 text-sm text-muted-foreground">Es la más urgente según tus respuestas. Las otras 7 están en tu tablero completo.</p>
            </BentoCard>
          </div>
        </div>
      ) : (
        <BentoCard className="text-center">
          <p className="mb-4 text-lg">Tu tablero empieza con el test: 16 preguntas, 5 minutos, gratis.</p>
          <Button asChild size="lg"><Link href="/prueba-personal">Hacer el test <ArrowRight /></Link></Button>
        </BentoCard>
      )}

      {/* Tablero bloqueado: se ve el ejemplo detrás, borroso */}
      <div className="relative mt-6 overflow-hidden rounded-[28px]">
        <div aria-hidden="true" className="pointer-events-none select-none blur-[6px] saturate-50">
          <DashboardView key={sample.currency} data={sample} testCode={test?.code || SAMPLE.testCode} readOnly />
        </div>
        <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-background/40 via-background/70 to-background/95 px-4 pt-16">
          <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl sm:p-8">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Lock className="size-3.5" /> {config.premiumName}</div>
            <h2 className="text-2xl font-extrabold tracking-tight">Tu plan financiero, al día por WhatsApp</h2>
            <ul className="mt-4 grid gap-2 text-sm text-ink-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />{f.title}</li>
              ))}
            </ul>
            <PlanPicker test={test} className="mt-5" />
            <form className="mt-5 border-t pt-4" onSubmit={(e) => { e.preventDefault(); if (key.trim()) onUnlock(key) }}>
              <label htmlFor="clave" className="flex items-center gap-1.5 text-sm font-semibold"><KeyRound className="size-4" />¿Ya te suscribiste? Escribe tu clave</label>
              <div className="mt-2 flex gap-2">
                <input id="clave" value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX" className="min-w-0 flex-1 rounded-xl border bg-card px-3 py-2.5 font-num text-sm outline-none focus:border-primary" />
                <Button type="submit" variant="outline">Entrar</Button>
              </div>
              {unlockMsg && <p role="status" className={cn("mt-2 text-sm", unlockMsg === "Verificando…" ? "text-muted-foreground" : "text-rojo")}>{unlockMsg}</p>}
              <p className="mt-2 text-xs text-muted-foreground">La clave llega en tu correo de compra. También puedes entrar con el enlace del correo.</p>
            </form>
            <details className="mt-4 border-t pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-primary">¿Cómo funciona después de pagar?</summary>
              <AccessSteps compact className="mt-3" />
            </details>
          </div>
        </div>
      </div>
      <Tooltip api={tip} />
    </Shell>
  )
}

function Feedback() {
  const [text, setText] = React.useState("")
  const [name, setName] = React.useState("")
  const [publish, setPublish] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim().length < 5) return setMsg("Cuéntanos un poco más.")
    try {
      await sendForm({ type: "feedback", text: text.trim().slice(0, 1500), name: name.trim().slice(0, 60), publish })
      setMsg("¡Gracias! Lo leemos todo."); setText("")
    } catch { setMsg("El envío de comentarios aún no está configurado.") }
  }
  return (
    <BentoCard className="mt-4">
      <h2 className="text-[17px] font-bold tracking-tight">¿Te está sirviendo?</h2>
      <p className="text-sm text-muted-foreground">Estamos empezando y cada comentario cambia el producto. No envía tus cifras, solo lo que escribas aquí.</p>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Qué te gustó, qué te faltó, qué no entendiste…" className="rounded-xl border bg-card p-3 text-sm outline-none focus:border-primary" />
        <div className="flex flex-wrap items-center gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre de pila (opcional)" className="min-w-0 flex-1 rounded-xl border bg-card px-3 py-2.5 text-sm" />
          <Button type="submit" variant="outline">Enviar comentario</Button>
        </div>
        <label className="flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />Autorizo publicar este comentario en la página con mi nombre de pila.</label>
        {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      </form>
    </BentoCard>
  )
}
