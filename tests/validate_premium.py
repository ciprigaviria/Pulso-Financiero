"""Validación cruzada del motor Premium (presupuesto, metas, pagos fijos, tasa real y gráfica diaria/mensual/anual/torta) contra src/lib/premium.ts.
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

import calendar

def series(r, vista):
    pres = {k: v for k, v in r['pres'].items() if v > 0}
    cat, mes, movs = r['cat'], '2026-11', r['movs']
    B = sum(pres.values()) if cat == 'todo' else pres.get(cat, 0)
    cmp_ = r['con'] and B > 0
    inc = (lambda c: (not cmp_ or c in pres)) if cat == 'todo' else (lambda c: c == cat)
    if vista == 'diario':
        days = calendar.monthrange(2026, 11)[1]
        shown = int(r['today'][8:]) if r['today'].startswith(mes) else days
        daily = [0.0] * days
        for m in movs:
            if m['tipo'] == 'gasto' and m['fecha'].startswith(mes) and inc(m['categoria']): daily[int(m['fecha'][8:]) - 1] += m['monto']
        acc, g = 0.0, []
        for v in daily: acc += v; g.append(acc)
        g = g[:shown]
        return g, ([B * (i + 1) / days for i in range(len(g))] if cmp_ else None)
    bymes = {h['mes']: h['porCategoria'] for h in r['hist']}
    cur = {}
    for m in movs:
        if m['tipo'] != 'ingreso': cur[m['categoria']] = cur.get(m['categoria'], 0) + m['monto']
    if movs or mes not in bymes: bymes[mes] = cur
    pick = lambda pc: sum(v for c, v in pc.items() if inc(c))
    idx = lambda ym: int(ym[:4]) * 12 + int(ym[5:]) - 1
    ks = sorted(bymes)
    if vista == 'mensual':
        n = max(1, min(12, idx(mes) - idx(ks[0]) + 1))
        keys = [f'{t // 12}-{t % 12 + 1:02d}' for t in range(idx(mes) - n + 1, idx(mes) + 1)]
        return [pick(bymes.get(k, {})) for k in keys], ([B] * n if cmp_ else None)
    years = range(int(ks[0][:4]), int(ks[-1][:4]) + 1)
    g = [sum(pick(bymes[k]) for k in ks if int(k[:4]) == y) for y in years]
    b = [B * (idx(min(ks[-1], f'{y}-12')) - idx(max(ks[0], f'{y}-01')) + 1) for y in years] if cmp_ else None
    return g, b

def close(a, b, tol=0.02):
    if a is None or b is None: return a is None and b is None
    return len(a) == len(b) and all(abs(x - y) <= tol for x, y in zip(a, b))

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
    for v in ('diario', 'mensual', 'anual'):
        g, b = series(r, v)
        if not close(g, r['ser'][v]['gasto']) or not close(b, r['ser'][v]['presupuesto']):
            bad += 1; print('serie', v, r['cat'], r['con'], g, r['ser'][v]); break
    bym = {h['mes']: h['porCategoria'] for h in r['hist']}
    cur = {}
    for m in r['movs']:
        if m['tipo'] != 'ingreso': cur[m['categoria']] = cur.get(m['categoria'], 0) + m['monto']
    if r['movs'] or '2026-11' not in bym: bym['2026-11'] = cur
    for key, keep in (('perM', lambda k: '2025-11' < k <= '2026-11'), ('perA', lambda k: k.startswith('2026'))):
        agg = {}
        for k, pc in bym.items():
            if keep(k):
                for c, v in pc.items(): agg[c] = agg.get(c, 0) + v
        if set(agg) != set(r[key]) or any(abs(agg[c] - r[key][c]) > 0.02 for c in agg): bad += 1; print('periodo', key, agg, r[key])
    sp = {}
    for m in r['movs']:
        if m['tipo'] == 'gasto': sp[m['categoria']] = sp.get(m['categoria'], 0) + m['monto']
    tot = sum(sp.values())
    if tot > 0 and any(abs(sp[i['id']] / tot - i['pct']) > 1e-4 for i in r['shares']['items']): bad += 1; print('torta', sp, r['shares'])
    if r['shares']['items'] and abs(sum(i['pct'] for i in r['shares']['items']) - 1) > 1e-9: bad += 1
    real = ((1 + r['nom'] / 100) / (1 + r['inf'] / 100) - 1) * 100
    if abs(real - r['real']) > 1e-9: bad += 1
print(f'Comparados {len(rows)} casos (presupuesto, metas, pagos fijos, tasa real y gráfica diaria/mensual/anual/torta); diferencias: {bad}')
if bad: sys.exit(1)
print('✓ Python y el motor Premium coinciden')
