/**
 * Curvas por tramos
 * =================
 * "El Vigor da vida: mucho hasta 27, menos hasta 50, casi nada despues."
 * El autor del juego lo dibuja como puntos (atributo -> resultado) y aqui se
 * convierte en una formula normal del motor:
 *
 *   y0 + m1 * (clamp(x, x0, x1) - x0) + m2 * (clamp(x, x1, x2) - x1) + ...
 *
 * Cada termino aporta su tramo solo cuando x lo recorre, asi que el resultado
 * es la interpolacion lineal, plano antes del primer punto y despues del
 * ultimo. Sin ifs anidados: la formula sigue siendo valida para las cotas por
 * intervalos del optimizador.
 */
import type { CurveDef, DerivedDef, GameTemplate } from './types'

/** Expresion de entrada: el valor del perfil, mas la estadistica homonima si existe (anillos +5 Fuerza). */
export function curveInputExpr(t: Pick<GameTemplate, 'stats'>, input: string): string {
  return t.stats.some((s) => s.id === input) ? `(base_${input} + ${input})` : `base_${input}`
}

const num = (n: number) => {
  const r = Math.round(n * 1e9) / 1e9
  return r < 0 ? `(${r})` : String(r)
}

/** Puntos ordenados por x, sin x repetidas (se queda el ultimo) y sin valores no finitos. */
export function cleanPoints(points: [number, number][]): [number, number][] {
  const m = new Map<number, number>()
  for (const p of points) if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) m.set(p[0], p[1])
  return [...m.entries()].sort((a, b) => a[0] - b[0])
}

export function curveFormula(t: Pick<GameTemplate, 'stats'>, c: CurveDef): string {
  const pts = cleanPoints(c.points)
  if (pts.length === 0) return '0'
  const x = curveInputExpr(t, c.input)
  const parts = [num(pts[0][1])]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const m = (y1 - y0) / (x1 - x0)
    if (m === 0) continue
    parts.push(`${num(m)} * (clamp(${x}, ${num(x0)}, ${num(x1)}) - ${num(x0)})`)
  }
  return parts.join(' + ')
}

/** Valor de la curva en x (misma regla que la formula; para vistas previas y pruebas). */
export function evalCurve(points: [number, number][], x: number): number {
  const pts = cleanPoints(points)
  if (pts.length === 0) return 0
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return pts[pts.length - 1][1]
}

/** El valor calculado con su formula regenerada desde la curva. */
export function syncCurve(t: Pick<GameTemplate, 'stats'>, d: DerivedDef): DerivedDef {
  return d.curve ? { ...d, formula: curveFormula(t, d.curve) } : d
}

export function checkCurves(t: Pick<GameTemplate, 'stats' | 'derived' | 'baseProfiles'>): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  for (const d of t.derived ?? []) {
    if (!d.curve) continue
    const c = d.curve
    const nombre = d.name || d.id
    if (!c.input || typeof c.input !== 'string') { errors.push(`La curva "${nombre}" no dice qué atributo la mueve.`); continue }
    if (!Array.isArray(c.points) || cleanPoints(c.points).length < 2) {
      errors.push(`La curva "${nombre}" necesita al menos dos puntos distintos.`)
      continue
    }
    if (cleanPoints(c.points).length !== c.points.length) warnings.push(`La curva "${nombre}" tiene puntos repetidos o vacíos; se usa el último de cada valor.`)
    const sinAtributo = t.baseProfiles.filter((p) => typeof p.base[c.input] !== 'number')
    if (sinAtributo.length > 0) {
      warnings.push(`La curva "${nombre}" usa "${c.input}", que no tienen: ${sinAtributo.map((p) => p.name).join(', ')} (cuenta como 0).`)
    }
    if (d.formula.replace(/\s+/g, '') !== curveFormula(t, c).replace(/\s+/g, '')) {
      warnings.push(`La fórmula de "${nombre}" ya no coincide con su curva. Ábrela en el editor de niveles para regenerarla.`)
    }
  }
  return { errors, warnings }
}
