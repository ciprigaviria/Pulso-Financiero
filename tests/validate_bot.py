"""Validación cruzada del bot de WhatsApp: reimplementa en Python la lectura de montos y los
totales del mes, y compara con Bot.gs (y con el sitio). Uso: python3 tests/validate_bot.py"""
import json, re, subprocess, sys, pathlib, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent

def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').lower()
    s = re.sub(r'[^a-z0-9ñ$., ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def number(s):
    s = re.sub(r'[^\d.,]', '', s)
    last = max(s.rfind('.'), s.rfind(','))
    dec = len(s) - last - 1 if last > -1 else 0
    if last > -1 and dec != 3:
        return float(re.sub(r'[.,]', '', s[:last]) + '.' + s[last + 1:])
    return float(re.sub(r'[.,]', '', s))

MILLION = {'millones', 'millon', 'palos', 'palo', 'melones', 'melon', 'mill', 'mm', 'm'}
THOUSAND = {'mil', 'lucas', 'luca', 'k', 'lks'}

def amounts(text):
    t = norm(text)
    # Recorre el texto token a token: número (con separadores) seguido opcionalmente de un multiplicador.
    out = []
    for m in re.finditer(r'(?<![a-z\d])\$?\s?(\d[\d.,]*\d|\d)\s?([a-z]+)?', t):
        v = number(m.group(1)); w = m.group(2) or ''
        if w in MILLION: v *= 1e6
        elif w in THOUSAND: v *= 1e3
        out.append(round(v * 100) / 100)
    return out

def summarize(movs):
    ing = sum(m['monto'] for m in movs if m['tipo'] == 'ingreso')
    gas = sum(m['monto'] for m in movs if m['tipo'] != 'ingreso')
    cats = {}
    for m in movs:
        if m['tipo'] != 'ingreso':
            cats[m['categoria']] = cats.get(m['categoria'], 0) + m['monto']
    r2 = lambda x: round(x * 100) / 100
    ing, gas = r2(ing), r2(gas)
    exc = r2(ing - gas)
    return {'ingresos': ing, 'gastos': gas, 'excedente': exc, 'porCategoria': {k: r2(v) for k, v in cats.items()}, 'n': len(movs)}

out = subprocess.run(['npx', 'tsx', str(ROOT / 'tests/bot.test.mts'), '--dump', '1500'], capture_output=True, text=True, check=True, cwd=ROOT)
data = json.loads(out.stdout)
bad = 0
mult = 0
for c in data['amountsCases']:
    py = amounts(c['text'])
    mult += bool(re.search(r'mil|k\b|lucas|palos|millones|\dm\b', c['text']))
    # El monto con el que se generó el texto es la verdad: Python y el bot deben recuperarlo.
    for got, who in ((py, 'python'), (c['amounts'], 'bot')):
        if len(got) != len(c['expected']) or any(abs(a - b) > 1e-6 for a, b in zip(got, c['expected'])):
            bad += 1; print('montos', who, c['text'], got, c['expected'])
for c in data['summaryCases']:
    py = summarize(c['movs'])
    for side in ('gas', 'web'):
        js = c[side]
        for k in ('ingresos', 'gastos', 'excedente', 'n'):
            if abs(py[k] - js[k]) > 1e-6: bad += 1; print('totales', side, k, py[k], js[k]); break
        if set(py['porCategoria']) != set(js['porCategoria']) or any(abs(py['porCategoria'][k] - js['porCategoria'][k]) > 1e-6 for k in py['porCategoria']):
            bad += 1; print('categorías', side)
from datetime import date, timedelta
def week(movs, today):
    t = date.fromisoformat(today)
    hasta = t - timedelta(days=t.weekday() + 1); desde = hasta - timedelta(days=6)
    pd, ph = desde - timedelta(days=7), desde - timedelta(days=1)
    inr = lambda m, a, b: m['tipo'] == 'gasto' and a <= date.fromisoformat(m['fecha']) <= b
    wk = [m for m in movs if inr(m, desde, hasta)]
    gasto = sum(m['monto'] for m in wk); ant = sum(m['monto'] for m in movs if inr(m, pd, ph))
    cats = {}
    for m in wk: cats[m['categoria']] = cats.get(m['categoria'], 0) + m['monto']
    top = sorted(cats, key=lambda k: (-cats[k], k))[0] if cats else None
    return desde.isoformat(), hasta.isoformat(), gasto, len(wk), ant, top, (cats[top] if top else None)
for c in data['weekCases']:
    d, h, g, n, a, top, tm = week(c['movs'], c['today']); js = c['week']
    ok = (d, h, n) == (js['desde'], js['hasta'], js['n']) and abs(g - js['gasto']) < 0.006 and abs(a - js['anterior']) < 0.006
    ok = ok and ((a > 0 and abs((round(g, 2) - round(a, 2)) / round(a, 2) - js['cambio']) < 1e-9) or (a == 0 and js['cambio'] is None))
    ok = ok and (top is None and js['top'] is None or top is not None and js['top']['categoria'] == top and abs(js['top']['monto'] - tm) < 0.006)
    if not ok: bad += 1; print('semana', c['today'], (d, h, g, n, a, top), js)
    spent = {}
    for m in c['movs']:
        if m['tipo'] == 'gasto' and m['fecha'][:7] == c['today'][:7]: spent[m['categoria']] = spent.get(m['categoria'], 0) + m['monto']
    ids = [k for k, v in c['pres'].items() if v > 0]
    exc = sorted(k for k in ids if round(spent.get(k, 0), 2) > c['pres'][k])
    ale = sorted(k for k in ids if round(spent.get(k, 0), 2) <= c['pres'][k] and round(spent.get(k, 0), 2) / c['pres'][k] >= 0.8)
    b = c['budget']
    if b['definido'] != bool(ids) or sorted(b['excedidas']) != exc or sorted(b['alerta']) != ale: bad += 1; print('presupuesto', c['today'], exc, ale, b)
def card(movs, pres, today):
    mes = today[:7]; mm = [m for m in movs if m['fecha'][:7] == mes]
    s = summarize(mm); r2 = lambda x: round(x * 100) / 100
    ids = sorted(k for k, v in pres.items() if v > 0)
    cats = []
    for k, monto in s['porCategoria'].items():
        p = pres.get(k, 0) if pres.get(k, 0) > 0 else 0; uso = monto / p if p else None
        cats.append({'id': k, 'monto': monto, 'share': monto / s['gastos'] if s['gastos'] > 0 else 0, 'presupuesto': p, 'uso': uso,
                     'estado': 'sin' if not p else 'excedido' if uso > 1 else 'alerta' if uso >= 0.8 else 'ok'})
    cats.sort(key=lambda c: (-c['monto'], c['id']))
    dentro = sum(1 for k in ids if s['porCategoria'].get(k, 0) <= pres[k])
    dias = int(today[8:10]); diario = [0.0] * dias
    for m in mm:
        d = int(m['fecha'][8:10])
        if m['tipo'] != 'ingreso' and 1 <= d <= dias: diario[d - 1] += m['monto']
    acc, acum = 0.0, []
    for v in diario: acc += v; acum.append(r2(acc))
    order = [m for _, m in sorted(enumerate(mm), key=lambda x: (x[1]['fecha'], x[0]), reverse=True)]
    return {'ingresos': s['ingresos'], 'gastos': s['gastos'], 'excedente': s['excedente'], 'n': s['n'], 'cats': cats, 'presupuestadas': len(ids), 'dentro': dentro,
            'cumplimiento': dentro / len(ids) if ids else None, 'presupuestoTotal': r2(sum(pres[k] for k in ids)), 'acumulado': acum,
            'ultimos': [m['id'] for m in order[:22]], 'restantes': max(0, len(order) - 22)}
close = lambda a, b: (a is None and b is None) or (a is not None and b is not None and abs(a - b) < 1e-6)
for c in data['cardCases']:
    py, js = card(c['movs'], c['pres'], c['today']), c['card']
    ok = all(close(py[k], js[k]) for k in ('ingresos', 'gastos', 'excedente', 'n', 'presupuestadas', 'dentro', 'cumplimiento', 'presupuestoTotal', 'restantes'))
    ok = ok and len(py['acumulado']) == len(js['acumulado']) and all(close(a, b) for a, b in zip(py['acumulado'], js['acumulado']))
    ok = ok and [m['id'] for m in js['ultimos']] == py['ultimos'] and len(py['cats']) == len(js['cats'])
    ok = ok and all(a['id'] == b['id'] and a['estado'] == b['estado'] and all(close(a[k], b[k]) for k in ('monto', 'share', 'presupuesto', 'uso')) for a, b in zip(py['cats'], js['cats']))
    if not ok: bad += 1; print('tarjeta', c['today'], py, js)
print(f"Comparados {len(data['amountsCases'])} textos con montos ({mult} con mil, k, lucas, palos o millones) y {len(data['summaryCases'])} meses de movimientos (bot y sitio), {len(data['weekCases'])} resúmenes semanales y {len(data['cardCases'])} tableros en imagen; diferencias: {bad}")
if bad: sys.exit(1)
print('✓ Python, el bot y el sitio coinciden')
