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
print(f"Comparados {len(data['amountsCases'])} textos con montos ({mult} con mil, k, lucas, palos o millones) y {len(data['summaryCases'])} meses de movimientos (bot y sitio); diferencias: {bad}")
if bad: sys.exit(1)
print('✓ Python, el bot y el sitio coinciden')
