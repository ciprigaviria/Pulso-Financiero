"use client"

// Formulario para escribir los números reales. Todo se guarda solo en este navegador.
import * as React from "react"
import { Lock, Plus, Trash2 } from "lucide-react"
import type { FinanceData, ExpenseType } from "@/lib/finance"
import { CURRENCIES } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TYPE_LABEL: Record<ExpenseType, string> = { esencial: "Esencial", importante: "Importante", prescindible: "Prescindible" }

/** "1.650.000" → 1650000 · "2,4" → 2.4 · "2.4" → 2.4 */
export function parseAmount(t: string) {
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", ".")) || 0
  if (/^\d+\.\d{1,2}$/.test(t)) return Number(t) || 0
  return Number(t.replace(/\./g, "")) || 0
}

function Money({ value, onChange, label, className }: { value: number; onChange: (n: number) => void; label: string; className?: string }) {
  const [text, setText] = React.useState(value ? String(value).replace(".", ",") : "")
  React.useEffect(() => { setText((t) => (parseAmount(t) === value ? t : value ? String(value).replace(".", ",") : "")) }, [value])
  return (
    <input
      inputMode="decimal" aria-label={label} placeholder="0" value={text}
      onChange={(e) => { const t = e.target.value.replace(/[^\d.,]/g, ""); setText(t); onChange(parseAmount(t)) }}
      className={cn("w-full rounded-xl border bg-card px-3 py-2.5 text-right font-num tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-accent", className)}
    />
  )
}

export function NumbersForm({ initial, onSave, onCancel }: { initial: FinanceData; onSave: (d: FinanceData) => void; onCancel?: () => void }) {
  const [d, setD] = React.useState<FinanceData>(initial)
  const set = <K extends keyof FinanceData>(k: K, v: FinanceData[K]) => setD((x) => ({ ...x, [k]: v }))
  const setExp = (i: number, patch: Partial<FinanceData["expenses"][number]>) => setD((x) => ({ ...x, expenses: x.expenses.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  const setDebt = (i: number, patch: Partial<FinanceData["debts"][number]>) => setD((x) => ({ ...x, debts: x.debts.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))

  return (
    <form className="grid gap-6" onSubmit={(e) => { e.preventDefault(); onSave(d) }}>
      <p className="flex items-start gap-2 rounded-2xl bg-accent p-4 text-sm"><Lock className="mt-0.5 size-4 shrink-0 text-primary" />Tus números se guardan solo en este navegador. No los enviamos a ningún servidor. Usa montos mensuales aproximados; no tienen que ser exactos.</p>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-semibold">Moneda
          <select value={d.currency} onChange={(e) => set("currency", e.target.value)} className="rounded-xl border bg-card px-3 py-2.5">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">Ingreso mensual neto
          <Money label="Ingreso mensual neto" value={d.income} onChange={(v) => set("income", v)} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">Ahorro disponible hoy
          <Money label="Ahorro disponible hoy" value={d.savings} onChange={(v) => set("savings", v)} />
        </label>
      </section>

      <section>
        <h3 className="mb-1 font-extrabold">Gastos del mes</h3>
        <p className="mb-3 text-sm text-muted-foreground">Sin cuotas de deudas: esas van abajo. Puedes cambiar si cada gasto es esencial, importante o prescindible.</p>
        <div className="grid gap-2">
          {d.expenses.map((e, i) => (
            <div key={e.id} className="grid grid-cols-[1fr_130px] items-center gap-2 sm:grid-cols-[1fr_150px_160px]">
              <span className="text-sm font-semibold">{e.name}</span>
              <select aria-label={`Tipo de ${e.name}`} value={e.type} onChange={(ev) => setExp(i, { type: ev.target.value as ExpenseType })} className="hidden rounded-xl border bg-card px-2 py-2.5 text-sm sm:block">
                {(Object.keys(TYPE_LABEL) as ExpenseType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
              <Money label={e.name} value={e.amount} onChange={(v) => setExp(i, { amount: v })} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 font-extrabold">Deudas</h3>
        <p className="mb-3 text-sm text-muted-foreground">Saldo pendiente, tasa de interés <b>mensual</b> (aparece en tu extracto) y cuota mínima.</p>
        <div className="grid gap-2">
          {d.debts.map((x, i) => (
            <div key={x.id} className="grid grid-cols-2 gap-2 rounded-2xl border p-3 sm:grid-cols-[1.4fr_1fr_.7fr_1fr_auto] sm:items-end">
              <label className="col-span-2 grid gap-1 text-xs font-semibold sm:col-span-1">Nombre<input value={x.name} onChange={(e) => setDebt(i, { name: e.target.value })} className="rounded-xl border bg-card px-3 py-2.5 text-sm" /></label>
              <label className="grid gap-1 text-xs font-semibold">Saldo<Money label="Saldo" value={x.balance} onChange={(v) => setDebt(i, { balance: v })} /></label>
              <label className="grid gap-1 text-xs font-semibold">Tasa % mes<Money label="Tasa mensual" value={x.rate} onChange={(v) => setDebt(i, { rate: v })} /></label>
              <label className="grid gap-1 text-xs font-semibold">Cuota mínima<Money label="Cuota mínima" value={x.min} onChange={(v) => setDebt(i, { min: v })} /></label>
              <button type="button" aria-label={`Quitar ${x.name}`} onClick={() => setD((s) => ({ ...s, debts: s.debts.filter((_, j) => j !== i) }))} className="grid size-10 place-items-center self-end justify-self-end rounded-xl text-muted-foreground hover:bg-muted hover:text-rojo"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setD((s) => ({ ...s, debts: [...s.debts, { id: "d" + Date.now(), name: "Deuda " + (s.debts.length + 1), balance: 0, rate: 0, min: 0 }] }))}>
            <Plus /> Agregar deuda
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">Meta del fondo de emergencia
          <select value={d.emergencyTargetMonths} onChange={(e) => set("emergencyTargetMonths", Number(e.target.value))} className="rounded-xl border bg-card px-3 py-2.5">
            {[3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} meses de gastos esenciales</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">Pago extra a deudas al mes (opcional)
          <Money label="Pago extra a deudas" value={d.extraDebtPayment} onChange={(v) => set("extraDebtPayment", v)} />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg">Ver mi tablero</Button>
        {onCancel && <Button type="button" size="lg" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
