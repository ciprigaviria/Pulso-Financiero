"""Validación cruzada del motor del tablero: reimplementa resumen, plan de deudas, reparto del
sobrante y crecimiento del ahorro en Python
y compara contra src/lib/finance.js. Uso: python3 tests/validate_finance.py"""
import json, math, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def summary(d):
    income = max(0, d['income'])
    exp = d['expenses']; debts = [x for x in d['debts'] if x['balance'] > 0]
    total = sum(e['amount'] for e in exp)
    pay = sum(min(x['min'], x['balance']) for x in debts)
    margin = income - total - pay
    ess = sum(e['amount'] for e in exp if e['type'] == 'esencial') + pay
    return {
        'margin': margin, 'savingsRate': margin / income if income > 0 else 0, 'essentials': ess,
        'emergencyMonths': d['savings'] / ess if ess > 0 else None, 'debtLoad': pay / income if income > 0 else 0,
    }

def payoff(debts, extra, method, cap=600):
    ds = [dict(id=x['id'], b=float(x['balance']), r=x['rate'] / 100, m=float(x['min'])) for x in debts if x['balance'] > 0]
    budget = sum(x['m'] for x in ds) + extra
    interest = 0.0; month = 0
    while any(x['b'] > 1e-9 for x in ds) and month < cap:
        month += 1; avail = budget
        for x in ds:
            if x['b'] > 1e-9:
                i = x['b'] * x['r']; x['b'] += i; interest += i
        for x in ds:
            if x['b'] > 1e-9:
                p = min(x['m'], x['b'], avail); x['b'] -= p; avail -= p
        act = [x for x in ds if x['b'] > 1e-9]
        key = (lambda x: (x['b'], -x['r'])) if method == 'bola' else (lambda x: (-x['r'], x['b']))
        for x in sorted(act, key=key):
            if avail <= 1e-9: break
            p = min(x['b'], avail); x['b'] -= p; avail -= p
        for x in ds:
            if x['b'] <= 1e-9: x['b'] = 0
    ok = all(x['b'] <= 1e-9 for x in ds)
    return [ok, month if ok else None, interest]

def payoff_months(debts, extra):
    """Mes en que se paga cada deuda (avalancha)."""
    ds = [dict(id=x['id'], b=float(x['balance']), r=x['rate'] / 100, m=float(x['min'])) for x in debts if x['balance'] > 0]
    budget = sum(x['m'] for x in ds) + extra
    month = 0; done = {}
    while any(x['b'] > 1e-9 for x in ds) and month < 600:
        month += 1; avail = budget
        for x in ds:
            if x['b'] > 1e-9: x['b'] += x['b'] * x['r']
        for x in ds:
            if x['b'] > 1e-9:
                p = min(x['m'], x['b'], avail); x['b'] -= p; avail -= p
        for x in sorted([x for x in ds if x['b'] > 1e-9], key=lambda x: (-x['r'], x['b'])):
            if avail <= 1e-9: break
            p = min(x['b'], avail); x['b'] -= p; avail -= p
        for x in ds:
            if x['b'] <= 1e-9 and x['id'] not in done: x['b'] = 0; done[x['id']] = month
    return all(x['b'] <= 1e-9 for x in ds), done

def js_round(x):
    return math.floor(x + 0.5)

def surplus(d):
    s = summary(d)
    debts = [x for x in d['debts'] if x['balance'] > 0]
    ess = s['essentials']; sav = max(0, d['savings'])
    tm = d['emergencyTargetMonths'] or 3
    gap = max(0, ess * tm - sav)
    margin = max(0, js_round(s['margin']))
    exp = [x for x in debts if (1 + x['rate'] / 100) ** 12 - 1 > 0.15]
    if margin <= 0: stage, w = 'sin_margen', {}
    elif ess > 0 and sav < ess: stage, w = 'colchon_minimo', {'colchon': 1}
    elif exp: stage, w = 'deudas_caras', ({'colchon': 0.3, 'deudas': 0.7} if gap > 0 else {'deudas': 0.7, 'metas': 0.3})
    elif gap > 0: stage, w = 'colchon', {'colchon': 0.7, 'metas': 0.3}
    else: stage, w = 'crecer', {'metas': 0.5, 'largo': 0.5}
    ids = [k for k in ('colchon', 'deudas', 'metas', 'largo') if k in w]
    split = []; acc = 0
    for i, k in enumerate(ids):
        a = margin - acc if i == len(ids) - 1 else js_round(margin * w[k]); acc += a; split.append([k, a])
    amt = dict(split)
    ms = None
    if stage == 'colchon_minimo': ms = math.ceil((ess - sav) / margin)
    elif stage == 'deudas_caras':
        ok, done = payoff_months(debts, amt['deudas'])
        ms = max(done.get(x['id'], 0) for x in exp) if ok else None
    elif stage == 'colchon': ms = math.ceil(gap / amt['colchon'])
    return stage, split, ms

def growth(start, monthly, ea, months):
    i = (1 + ea / 100) ** (1 / 12) - 1; b = start
    for _ in range(months): b = b * (1 + i) + monthly
    return b

out = subprocess.run(['npx', 'tsx', str(ROOT / 'tests/finance.test.mts'), '--dump', '800'], capture_output=True, text=True, check=True, cwd=ROOT)
rows = json.loads(out.stdout)
bad = 0
for row in rows:
    d = row['data']; s = summary(d)
    for k in ('margin', 'savingsRate', 'essentials', 'debtLoad'):
        if abs(s[k] - row[k]) > 1e-6: bad += 1; print('resumen', k, s[k], row[k]); break
    em = s['emergencyMonths']
    if (em is None) != (row['emergencyMonths'] is None) or (em is not None and abs(em - row['emergencyMonths']) > 1e-6): bad += 1
    for key, extra, method in (('p0', 0, 'avalancha'), ('p1', d['extraDebtPayment'], 'avalancha'), ('p2', d['extraDebtPayment'], 'bola')):
        py = payoff(d['debts'], extra, method); js = row[key]
        if py[0] != js[0] or py[1] != js[1] or abs(py[2] - js[2]) > 1e-4 * max(1, py[2]):
            bad += 1; print('deudas', key, py, js); break
    st, sp, ms = surplus(d); js = row['surplus']
    jms = js['milestone']['months'] if js['milestone'] else None
    if st != js['stage'] or sp != [[x['id'], x['amount']] for x in js['split']] or ms != jms:
        bad += 1; print('sobrante', st, sp, ms, js)
    g = growth(max(0, d['savings']), max(0, s['margin']), row['growthRate'], 24)
    if abs(g - row['growth']['total']) > 1e-6 * max(1, g): bad += 1; print('crecimiento', g, row['growth']['total'])
print(f'Comparados {len(rows)} casos (resumen, 3 planes de deudas, reparto del sobrante y crecimiento); diferencias: {bad}')
if bad: sys.exit(1)
print('✓ Python y el tablero coinciden')
