"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { sendForm } from "@/lib/store"

export function BetaForm() {
  const [email, setEmail] = React.useState("")
  const [ok, setOk] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setMsg("Revisa tu correo.")
    if (!ok) return setMsg("Necesitamos tu autorización para escribirte.")
    try { await sendForm({ type: "beta", email: email.trim(), consent: true }); setMsg("¡Listo! Te escribimos con tu acceso.") }
    catch { setMsg("Las inscripciones a la beta aún no están abiertas.") }
  }
  return (
    <form onSubmit={submit} className="mt-6 grid max-w-xl gap-3" noValidate>
      <div className="flex flex-wrap gap-2.5">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" aria-label="Correo" className="min-w-0 flex-[1_1_240px] rounded-full border-[1.5px] border-white/20 bg-white/10 px-5 py-3 text-white placeholder:text-white/50 outline-none focus:border-white/60" />
        <Button type="submit" size="lg">Quiero entrar a la beta</Button>
      </div>
      <label className="flex items-start gap-2 text-sm text-white/70"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 accent-[var(--brand-bright)]" />Acepto que me escriban sobre la beta, según la política de privacidad.</label>
      {msg && <p role="status" className="text-sm font-semibold text-white">{msg}</p>}
    </form>
  )
}
