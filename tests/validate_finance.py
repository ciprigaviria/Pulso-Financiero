"""Validación cruzada del motor del tablero: reimplementa resumen y plan de deudas en Python
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
print(f'Comparados {len(rows)} casos (resumen + 3 planes de deudas cada uno); diferencias: {bad}')
if bad: sys.exit(1)
print('✓ Python y el tablero coinciden')
