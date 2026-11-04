"""Validación cruzada del motor Premium (presupuesto, metas, pagos fijos y tasa real) contra src/lib/premium.ts.
Uso: python3 tests/validate_premium.py"""
import json, math, subprocess, sys, pathlib, unicodedata
from datetime import date, timedelta
ROOT = pathlib.Path(__file__).resolve().parent.parent

def budget(movs, pres):
    spent = {}
    for m in movs:
        if m['tipo'] != 'ingreso': spent[m['categoria']] = spent.get(m['categoria'], 0) + m['monto']
    rows = []
    for c, p in pres.items():
        if p <= 0: continue
        g = round(spent.get(c, 0) * 100) / 100
        pct = g / p
        rows.append((c, 'excedido' if pct > 1 else 'alerta' if pct >= 0.8 else 'ok', pct))
    tot = sum(p for p in pres.values() if p > 0)
    inside = sum(1 for r in rows if r[1] != 'excedido')
    return {r[0]: r[1] for r in rows}, round(tot * 100) / 100, (inside / len(rows) if rows else None)

def months(a, b):
    y1, m1 = map(int, a.split('-')); y2, m2 = map(int, b.split('-'))
    return max(1, (y2 - y1) * 12 + (m2 - m1))

def goal(m, ym):
    falt = max(0, round((m['monto'] - m['ahorrado']) * 100) / 100)
    meses = months(ym, m['fecha']) if m['fecha'] else None
    return falt, (math.ceil(falt / meses) if meses else None)

def strip(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()

def fixed(pagos, movs, today):
    y, mo, d = map(int, today.split('-'))
    out = {}
    for p in pagos:
        dia = min(max(1, round(p['dia'])), 28)
        paid = any(x['tipo'] == 'gasto' and x['fecha'].startswith(today[:7]) and strip(p['nombre']).split(' ')[0] in strip(x['descripcion']) for x in movs)
        nxt = date(y, mo, dia) if dia >= d else (date(y + 1, 1, dia) if mo == 12 else date(y, mo + 1, dia))
        out[p['id']] = (paid, None if paid else (nxt - date(y, mo, d)).days)
    return out

out = subprocess.run(['npx', 'tsx', str(ROOT / 'tests/premium.test.mts'), '--dump', '600'], capture_output=True, text=True, check=True, cwd=ROOT)
rows = json.loads(out.stdout)
bad = 0
for r in rows:
    st, tot, cum = budget(r['movs'], r['pres'])
    js = r['budget']
    if st != {x['categoria']: x['estado'] for x in js['rows']} or abs(tot - js['presupuestado']) > 1e-6 or (cum is None) != (js['cumplimiento'] is None) or (cum is not None and abs(cum - js['cumplimiento']) > 1e-9):
        bad += 1; print('presupuesto', st, js); continue
    f, a = goal(r['meta'], r['today'][:7])
    if abs(f - r['goal']['faltante']) > 1e-6 or a != r['goal']['aporteMensual']:
        bad += 1; print('meta', r['meta'], f, a, r['goal']); continue
    fx = fixed(r['pagos'], r['movs'], r['today'])
    if any(fx[x['id']] != (x['pagado'], x['diasParaCobro']) for x in r['fixed']['rows']):
        bad += 1; print('pagos', fx, r['fixed']['rows']); continue
    real = ((1 + r['nom'] / 100) / (1 + r['inf'] / 100) - 1) * 100
    if abs(real - r['real']) > 1e-9: bad += 1
print(f'Comparados {len(rows)} casos (presupuesto, metas, pagos fijos y tasa real); diferencias: {bad}')
if bad: sys.exit(1)
print('✓ Python y el motor Premium coinciden')
