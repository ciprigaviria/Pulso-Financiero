"""Validación cruzada en Python: reimplementa las reglas de puntaje de forma independiente
y compara contra lo que calcula el sitio (src/lib/scoring.js).
Uso: python3 tests/validate.py
"""
import json, math, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

POINTS = {  # pregunta: (área, puntos por opción)
    1: ('gastar', [100, 75, 50, 25, 0]), 2: ('gastar', [100, 60, 40, 20, 0]), 3: ('gastar', [100, 70, 40, 0]),
    4: ('ahorrar', [100, 75, 50, 25, 0]), 5: ('ahorrar', [100, 75, 50, 20, 0]),
    6: ('deber', [100, 85, 40, 0]), 7: ('deber', [100, 100, 50, 20, 0]), 8: ('deber', [100, 75, 50, 25, 0]),
    9: ('proteger', [100, 75, 50, 25, 0]), 10: ('proteger', [100, 100, 60, 30, 0]),
    11: ('planear', [100, 75, 40, 0]), 12: ('planear', [100, 65, 35, 15, 0]),
}
AREAS = ['gastar', 'ahorrar', 'deber', 'proteger', 'planear']
FLAGS = [('gasta_mas', 1, 3), ('atrasos', 2, 3), ('sin_colchon', 4, 4), ('deuda_inmanejable', 6, 3), ('tarjeta_limite', 7, 3)]


def r(x):  # redondeo "mitad hacia arriba", igual que Math.floor(x + 0.5)
    return math.floor(x + 0.5)


def score(code):
    q = [int(c) for c in code[3:]]
    by_area = {a: [] for a in AREAS}
    for n, (area, pts) in POINTS.items():
        by_area[area].append(pts[q[n - 1]])
    raw = [sum(v) / len(v) for v in (by_area[a] for a in AREAS)]
    total = r(sum(raw) / 5)
    flags = [f for f, n, m in FLAGS if q[n - 1] >= m]
    s = min(total, 59) if flags else total
    level = 'sana' if s >= 80 else 'estable' if s >= 60 else 'riesgo' if s >= 40 else 'vulnerable'
    # Potencial: el área más débil (primera en caso de empate) llevada a 80.
    w = min(range(5), key=lambda i: raw[i])
    potential = r(sum(80 if i == w else raw[i] for i in range(5)) / 5) if raw[w] < 80 else None
    return {'total': total, 'level': level, 'areas': [r(x) for x in raw], 'flags': flags, 'potential': potential}


out = subprocess.run(['npx', 'tsx', str(ROOT / 'tests/scoring.test.mts'), '--dump', '20000'], capture_output=True, text=True, check=True, cwd=ROOT)
js = json.loads(out.stdout)
bad = [row for row in js if score(row['code']) != {k: row[k] for k in ('total', 'level', 'areas', 'flags', 'potential')}]
levels = {}
for row in js:
    levels[row['level']] = levels.get(row['level'], 0) + 1
print(f'Comparadas {len(js)} combinaciones; diferencias: {len(bad)}')
if bad:
    print('Primera diferencia:', bad[0], score(bad[0]['code']))
    sys.exit(1)
print('✓ Python y el sitio coinciden')
