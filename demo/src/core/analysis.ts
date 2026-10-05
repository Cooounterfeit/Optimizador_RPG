/**
 * Analisis simbolico de formulas
 * ==============================
 * El optimizador necesita saber tres cosas del objetivo antes de buscar:
 *
 *  1. De que estadisticas DEPENDE. Las que no influyen se descartan y el
 *     problema pierde dimensiones (un DPS Geo no mira el bono Pyro).
 *  2. En que DIRECCION se mueve con cada una: sube, baja o "depende". Si todas
 *     tienen direccion fija, la cota del branch and bound se obtiene evaluando
 *     una sola esquina de la caja (rapido); si no, hace falta aritmetica de
 *     intervalos (lento).
 *  3. Que estadisticas entran JUNTAS, como c·(a + b): esas se pueden fusionar
 *     en un solo eje.
 *
 * Antes se averiguaban las tres cosas muestreando puntos al azar, lo que
 * funciona casi siempre y falla en silencio el resto: una estadistica que solo
 * importa pasado un umbral que ningun punto toco se daba por irrelevante, y el
 * "optimo demostrado" dejaba de serlo. Aqui se DEMUESTRAN recorriendo el arbol
 * de la formula con reglas conservadoras: ante la duda, la respuesta es
 * "depende" o "no se puede fusionar", que es mas lento pero nunca incorrecto.
 *
 * Todo se razona sobre una caja [lo, hi] de valores posibles para cada
 * variable; los rangos de cada subexpresion salen de la misma aritmetica de
 * intervalos que usa el optimizador.
 */

import { compileNodeInterval, parseFormula, type FormulaNode, type IntervalOut } from './formula'

/** Direccion respecto de una estadistica. Ausente = no depende. */
export const UP = 1
export const DOWN = -1
export const UNKNOWN = 2
type Dir = Map<number, number>

export interface AnalysisInput {
  /** Nombre de variable → indice. Las estadisticas ocupan 0..statCount-1. */
  varIndex: Map<string, number>
  statCount: number
  /** Derivados en orden topologico. */
  derived: { id: string; formula: string }[]
  objective: string
  /**
   * Caja de valores posibles por variable (mismo tamano que el arreglo de
   * variables del motor). Estadisticas: su rango; bases: su valor fijo. Los
   * huecos de los derivados se rellenan aqui.
   */
  lo: Float64Array
  hi: Float64Array
}

interface Range { lo: number; hi: number; nan: boolean }

// --------------------------------------------------------------- direcciones

function merge(a: Dir, b: Dir): Dir {
  if (a.size === 0) return b
  if (b.size === 0) return a
  const out = new Map(a)
  for (const [k, v] of b) {
    const w = out.get(k)
    out.set(k, w === undefined || w === v ? v : UNKNOWN)
  }
  return out
}
const neg = (a: Dir): Dir => {
  const out: Dir = new Map()
  for (const [k, v] of a) out.set(k, v === UNKNOWN ? UNKNOWN : -v)
  return out
}
const unknownAll = (...ds: Dir[]): Dir => {
  const out: Dir = new Map()
  for (const d of ds) for (const k of d.keys()) out.set(k, UNKNOWN)
  return out
}
/** Signo de un rango: 1 si >= 0, -1 si <= 0, 0 si cruza el cero. */
const signOf = (r: Range) => (r.lo >= 0 ? 1 : r.hi <= 0 ? -1 : 0)
const scale = (d: Dir, s: number): Dir => (d.size === 0 ? d : s === 1 ? d : s === -1 ? neg(d) : unknownAll(d))
const finite = (r: Range) => Number.isFinite(r.lo) && Number.isFinite(r.hi) && !r.nan
/** Valor logico seguro de un rango (NaN cuenta como verdadero, igual que al evaluar). */
const truth = (r: Range) => (r.lo > 0 || r.hi < 0 ? 1 : r.lo === 0 && r.hi === 0 && !r.nan ? 0 : -1)

class Analyzer {
  private ranges = new Map<FormulaNode, Range>()
  private dirs = new Map<FormulaNode, Dir>()
  private derivedDir = new Map<number, Dir>()
  private derivedTree = new Map<number, FormulaNode>()
  private readonly out: IntervalOut

  constructor(private inp: AnalysisInput) {
    const varNaN = new Uint8Array(inp.lo.length)
    this.out = { hi: 0, nan: false, varNaN }
    // Rangos de los derivados, en orden: cada uno puede usar los anteriores.
    for (const d of inp.derived) {
      const idx = inp.varIndex.get(d.id)!
      const tree = parseFormula(d.formula)
      this.derivedTree.set(idx, tree)
      const r = this.range(tree)
      inp.lo[idx] = r.lo; inp.hi[idx] = r.hi; varNaN[idx] = r.nan ? 1 : 0
    }
    for (const d of inp.derived) {
      const idx = inp.varIndex.get(d.id)!
      this.derivedDir.set(idx, this.dir(this.derivedTree.get(idx)!))
    }
  }

  range(n: FormulaNode): Range {
    let r = this.ranges.get(n)
    if (!r) {
      const f = compileNodeInterval(n, this.inp.varIndex)
      const lo = f(this.inp.lo, this.inp.hi, this.out)
      r = { lo, hi: this.out.hi, nan: this.out.nan }
      this.ranges.set(n, r)
    }
    return r
  }

  /** Constante demostrada: no depende de ninguna estadistica y su rango es un punto. */
  constant(n: FormulaNode): number | undefined {
    if (this.dir(n).size > 0) return undefined
    const r = this.range(n)
    return r.lo === r.hi && !r.nan ? r.lo : undefined
  }

  dir(n: FormulaNode): Dir {
    let d = this.dirs.get(n)
    if (!d) { d = this.computeDir(n); this.dirs.set(n, d) }
    return d
  }

  derivedOf(idx: number): FormulaNode | undefined { return this.derivedTree.get(idx) }

  private computeDir(n: FormulaNode): Dir {
    switch (n.k) {
      case 'num': return new Map()
      case 'var': {
        const idx = this.inp.varIndex.get(n.name)
        if (idx === undefined) return new Map()
        if (idx < this.inp.statCount) return new Map([[idx, UP]])
        return this.derivedDir.get(idx) ?? new Map()
      }
      case 'un': {
        const a = this.dir(n.a)
        if (n.op === '-') return neg(a)
        // !x = (x == 0): no creciente si x >= 0, no decreciente si x <= 0.
        const s = signOf(this.range(n.a))
        return s === 1 ? neg(a) : s === -1 ? a : unknownAll(a)
      }
      case 'bin': return this.binary(n.op, n.a, n.b)
      case 'call': return this.call(n.name, n.args)
    }
  }

  private binary(op: string, A: FormulaNode, B: FormulaNode): Dir {
    const a = this.dir(A), b = this.dir(B)
    const ra = this.range(A), rb = this.range(B)
    switch (op) {
      case '+': return merge(a, b)
      case '-': return merge(a, neg(b))
      case '*': {
        // Multiplicar por un cero exacto anula la dependencia (el selector de
        // elemento que vale 0), siempre que el otro factor sea finito.
        if (this.constant(A) === 0 && finite(rb)) return new Map()
        if (this.constant(B) === 0 && finite(ra)) return new Map()
        // d(ab) = a'b + ab'
        return merge(scale(a, signOf(rb)), scale(b, signOf(ra)))
      }
      case '/': {
        if (this.constant(A) === 0 && rb.lo > 0) return new Map()
        const sb = rb.lo > 0 ? 1 : rb.hi < 0 ? -1 : 0
        if (sb === 0) return unknownAll(a, b)
        // a / b = a · (1/b); 1/b va en sentido contrario a b y tiene el signo de b.
        return merge(scale(a, sb), scale(neg(b), signOf(ra)))
      }
      case '^': return this.power(A, B)
      case '<': case '<=': return merge(neg(a), b)
      case '>': case '>=': return merge(a, neg(b))
      case '&&': case '||': {
        // Con argumentos >= 0, "es verdadero" equivale a "> 0", que es no decreciente.
        if (ra.lo >= 0 && rb.lo >= 0) return merge(a, b)
        if (ra.hi <= 0 && rb.hi <= 0) return merge(neg(a), neg(b))
        return unknownAll(a, b)
      }
      default: return unknownAll(a, b) // %, ==, !=
    }
  }

  private power(A: FormulaNode, B: FormulaNode): Dir {
    const a = this.dir(A), b = this.dir(B)
    const ra = this.range(A)
    const e = this.constant(B)
    if (e !== undefined) {
      if (e === 0) return new Map()
      if (ra.lo >= 0) return e > 0 ? a : neg(a)
      if (Number.isInteger(e) && e > 0) {
        if (e % 2 === 1) return a
        const s = signOf(ra)
        return s === -1 ? neg(a) : unknownAll(a)
      }
      return unknownAll(a)
    }
    const c = this.constant(A)
    if (c !== undefined && c > 0) return c > 1 ? b : c < 1 ? neg(b) : new Map()
    if (ra.lo >= 1 && this.range(B).lo >= 0) return merge(a, b)
    return unknownAll(a, b)
  }

  private call(name: string, args: FormulaNode[]): Dir {
    const ds = args.map((x) => this.dir(x))
    switch (name) {
      case 'min': case 'max': case 'clamp':
        return ds.reduce(merge, new Map())
      case 'floor': case 'ceil': case 'round': case 'exp': case 'sqrt': case 'log': case 'log10':
        return ds[0]
      case 'abs': return scale(ds[0], signOf(this.range(args[0])))
      case 'pow': return this.power(args[0], args[1])
      case 'if': {
        const [C, A, B] = args
        const t = truth(this.range(C))
        if (t === 1) return ds[1]
        if (t === 0) return ds[2]
        // Si la condicion pasa de falsa a verdadera, el valor salta de b a a:
        // el salto tiene el signo de (a - b).
        const rc = this.range(C)
        const tc = rc.lo >= 0 ? ds[0] : rc.hi <= 0 ? neg(ds[0]) : unknownAll(ds[0])
        const ra = this.range(A), rb = this.range(B)
        const gap = ra.lo >= rb.hi ? 1 : ra.hi <= rb.lo ? -1 : 0
        return merge(merge(ds[1], ds[2]), scale(tc, gap))
      }
      default: return unknownAll(...ds)
    }
  }
}

// ------------------------------------------------- derivadas sobre intervalos

type Iv = [number, number]
const TOP: Iv = [-Infinity, Infinity]
const ZERO: Iv = [0, 0]
const mulE = (x: number, y: number) => (x === 0 || y === 0 ? 0 : x * y)
const ivAdd = (a: Iv, b: Iv): Iv => [a[0] + b[0], a[1] + b[1]]
const ivNeg = (a: Iv): Iv => [-a[1], -a[0]]
const ivMul = (a: Iv, b: Iv): Iv => {
  const p = [mulE(a[0], b[0]), mulE(a[0], b[1]), mulE(a[1], b[0]), mulE(a[1], b[1])]
  return [Math.min(...p), Math.max(...p)]
}
const ivDiv = (a: Iv, b: Iv): Iv => (b[0] <= 0 && b[1] >= 0 ? TOP : ivMul(a, [1 / b[1], 1 / b[0]]))
const ivHull = (...xs: Iv[]): Iv => [Math.min(...xs.map((x) => x[0])), Math.max(...xs.map((x) => x[1]))]
/** Solo el signo: para funciones escalonadas (floor, comparaciones) no hay derivada util. */
const signOnly = (d: Iv): Iv => (d[0] >= 0 ? [0, Infinity] : d[1] <= 0 ? [-Infinity, 0] : TOP)
const clean = (d: Iv): Iv => (d[0] !== d[0] || d[1] !== d[1] ? TOP : d)

/**
 * Derivada parcial del nodo respecto de la estadistica `s`, acotada sobre toda
 * la caja. Si su extremo inferior es >= 0, el nodo es no decreciente en `s` en
 * TODA la caja (teorema del valor medio; en las funciones a trozos, min/max o
 * floor, el razonamiento se hace por tramos y el resultado se mantiene).
 *
 * Es mas fina que las reglas de signo: sabe que x / (x + 1400) sube con x,
 * aunque numerador y denominador suban a la vez.
 */
class Deriv {
  private memo = new Map<FormulaNode, Iv>()
  constructor(private an: Analyzer, private inp: AnalysisInput, private s: number) {}

  of(n: FormulaNode): Iv {
    let d = this.memo.get(n)
    if (!d) {
      d = this.an.dir(n).has(this.s) ? clean(this.compute(n)) : ZERO
      this.memo.set(n, d)
    }
    return d
  }

  private V(n: FormulaNode): Iv { const r = this.an.range(n); return r.nan ? TOP : [r.lo, r.hi] }

  private compute(n: FormulaNode): Iv {
    switch (n.k) {
      case 'num': return ZERO
      case 'var': {
        const idx = this.inp.varIndex.get(n.name)
        if (idx === undefined) return ZERO
        if (idx < this.inp.statCount) return idx === this.s ? [1, 1] : ZERO
        const tree = this.an.derivedOf(idx)
        return tree ? this.of(tree) : ZERO
      }
      case 'un':
        if (n.op === '-') return ivNeg(this.of(n.a))
        return this.stepOf(n)
      case 'bin': {
        const A = n.a, B = n.b
        switch (n.op) {
          case '+': return ivAdd(this.of(A), this.of(B))
          case '-': return ivAdd(this.of(A), ivNeg(this.of(B)))
          case '*': return ivAdd(ivMul(this.of(A), this.V(B)), ivMul(this.V(A), this.of(B)))
          case '/': {
            const vb = this.V(B)
            // (a' b - a b') / b^2
            const num = ivAdd(ivMul(this.of(A), vb), ivNeg(ivMul(this.V(A), this.of(B))))
            return ivDiv(num, ivMul(vb, vb))
          }
          case '^': return this.power(A, B)
          default: return this.stepOf(n)
        }
      }
      case 'call': {
        const [A, B] = n.args
        switch (n.name) {
          case 'min': case 'max': case 'clamp': return ivHull(...n.args.map((x) => this.of(x)))
          case 'exp': { const v = this.V(A); return ivMul(this.of(A), [Math.exp(v[0]), Math.exp(v[1])]) }
          case 'log': case 'log10': {
            const v = this.V(A)
            if (v[0] <= 0) return signOnly(this.of(A))
            const k = n.name === 'log' ? 1 : Math.LN10
            return ivMul(this.of(A), [1 / (v[1] * k), 1 / (v[0] * k)])
          }
          case 'sqrt': {
            const v = this.V(A)
            if (v[0] <= 0) return signOnly(this.of(A))
            return ivMul(this.of(A), [1 / (2 * Math.sqrt(v[1])), 1 / (2 * Math.sqrt(v[0]))])
          }
          case 'abs': {
            const v = this.V(A), d = this.of(A)
            return v[0] >= 0 ? d : v[1] <= 0 ? ivNeg(d) : ivHull(d, ivNeg(d))
          }
          case 'pow': return this.power(A, B)
          default: return this.stepOf(n) // floor, ceil, round, if
        }
      }
    }
  }

  private power(A: FormulaNode, B: FormulaNode): Iv {
    const e = this.an.constant(B)
    const va = this.V(A)
    if (e !== undefined) {
      if (e === 0) return ZERO
      // d(a^e) = e · a^(e-1) · a'
      if (va[0] > 0 || (va[0] >= 0 && e >= 1)) {
        const p1 = Math.pow(va[0], e - 1), p2 = Math.pow(va[1], e - 1)
        return ivMul(ivMul([e, e], [Math.min(p1, p2), Math.max(p1, p2)]), this.of(A))
      }
      return this.stepOf({ k: 'bin', op: '^', a: A, b: B })
    }
    const c = this.an.constant(A)
    if (c !== undefined && c > 0) {
      // d(c^b) = ln(c) · c^b · b'
      const vb = this.V(B)
      const p1 = Math.pow(c, vb[0]), p2 = Math.pow(c, vb[1])
      return ivMul(ivMul([Math.log(c), Math.log(c)], [Math.min(p1, p2), Math.max(p1, p2)]), this.of(B))
    }
    return this.stepOf({ k: 'bin', op: '^', a: A, b: B })
  }

  /**
   * Nodos escalonados o sin derivada util: se reusa la direccion de las
   * reglas de signo, pero con las derivadas de los hijos ya refinadas.
   */
  private stepOf(n: FormulaNode): Iv {
    const d = this.an.dir(n).get(this.s)
    if (d === UP) return [0, Infinity]
    if (d === DOWN) return [-Infinity, 0]
    // Refinar floor/ceil/round y los escalones de if/comparaciones con las
    // derivadas de sus argumentos.
    if (n.k === 'call' && (n.name === 'floor' || n.name === 'ceil' || n.name === 'round')) return signOnly(this.of(n.args[0]))
    if (n.k === 'bin' && (n.op === '<' || n.op === '<=')) return signOnly(ivAdd(this.of(n.b), ivNeg(this.of(n.a))))
    if (n.k === 'bin' && (n.op === '>' || n.op === '>=')) return signOnly(ivAdd(this.of(n.a), ivNeg(this.of(n.b))))
    if (n.k === 'call' && n.name === 'if') {
      const [C, A, B] = n.args
      const branches = ivHull(this.of(A), this.of(B))
      if (!this.an.dir(C).has(this.s)) return branches
      const rc = this.an.range(C)
      const tc = rc.lo >= 0 ? this.of(C) : rc.hi <= 0 ? ivNeg(this.of(C)) : TOP
      const ra = this.an.range(A), rb = this.an.range(B)
      const gap = ra.lo >= rb.hi ? 1 : ra.hi <= rb.lo ? -1 : 0
      const jump = gap === 0 ? TOP : signOnly(gap === 1 ? tc : ivNeg(tc))
      return signOnly(ivHull(branches, jump))
    }
    return TOP
  }
}

/**
 * Direccion del objetivo respecto de cada estadistica: UP, DOWN o UNKNOWN.
 * Las que no aparecen estan DEMOSTRADAMENTE fuera del objetivo.
 *
 * Primero las reglas de signo (baratas); para las estadisticas que quedan en
 * "depende", la derivada sobre intervalos, que es mas fina.
 */
export function analyzeDirections(inp: AnalysisInput): Map<number, number> {
  const an = new Analyzer({ ...inp, lo: inp.lo.slice(), hi: inp.hi.slice() })
  const root = parseFormula(inp.objective)
  const dirs = new Map(an.dir(root))
  for (const [s, d] of dirs) {
    if (d !== UNKNOWN) continue
    const [lo, hi] = new Deriv(an, inp, s).of(root)
    if (lo >= 0) dirs.set(s, UP)
    else if (hi <= 0) dirs.set(s, DOWN)
  }
  return dirs
}

// ------------------------------------------------------------------- fusion

/**
 * Forma de un nodo respecto de un grupo de estadistcas G:
 *  none → no depende de ninguna de G
 *  aff  → sum(coef_i · g_i) + (algo que no depende de G), coeficientes constantes
 *  sym  → depende de G solo a traves de la suma g_1 + ... + g_m
 *  bad  → depende de G de otra forma: no se puede fusionar
 */
type Lin =
  | { k: 'none' }
  | { k: 'aff'; c: number[] }
  | { k: 'sym' }
  | { k: 'bad' }

const NONE: Lin = { k: 'none' }
const SYM: Lin = { k: 'sym' }
const BAD: Lin = { k: 'bad' }

const toSym = (x: Lin): Lin => {
  if (x.k !== 'aff') return x
  return x.c.every((v) => v === x.c[0]) ? (x.c[0] === 0 ? NONE : SYM) : BAD
}
const addLin = (x: Lin, y: Lin): Lin => {
  if (x.k === 'bad' || y.k === 'bad') return BAD
  if (x.k === 'none') return y
  if (y.k === 'none') return x
  if (x.k === 'aff' && y.k === 'aff') return { k: 'aff', c: x.c.map((v, i) => v + y.c[i]) }
  // sym + (sym | aff): solo vale si el aff tambien es simetrico.
  const other = x.k === 'sym' ? y : x
  return toSym(other).k === 'bad' ? BAD : SYM
}
const scaleLin = (x: Lin, s: number): Lin => {
  if (s === 0) return NONE
  if (x.k === 'aff') return { k: 'aff', c: x.c.map((v) => v * s) }
  return x
}

/**
 * ¿El objetivo depende de las estadisticas del grupo solo a traves de su suma?
 * Si es asi, se pueden colapsar en un unico eje sin cambiar ningun resultado.
 */
export function canMergeGroup(inp: AnalysisInput, group: number[]): boolean {
  const an = new Analyzer({ ...inp, lo: inp.lo.slice(), hi: inp.hi.slice() })
  const pos = new Map(group.map((g, i) => [g, i]))
  const memo = new Map<FormulaNode, Lin>()
  const derivedLin = new Map<number, Lin>()

  const lin = (n: FormulaNode): Lin => {
    let r = memo.get(n)
    if (!r) { r = compute(n); memo.set(n, r) }
    return r
  }
  const touches = (n: FormulaNode) => { for (const k of an.dir(n).keys()) if (pos.has(k)) return true; return false }

  const compute = (n: FormulaNode): Lin => {
    if (!touches(n)) return NONE
    switch (n.k) {
      case 'num': return NONE
      case 'var': {
        const idx = inp.varIndex.get(n.name)!
        const p = pos.get(idx)
        if (p !== undefined) { const c = group.map(() => 0); c[p] = 1; return { k: 'aff', c } }
        let d = derivedLin.get(idx)
        if (!d) { const tree = an.derivedOf(idx); d = tree ? lin(tree) : NONE; derivedLin.set(idx, d) }
        return d
      }
      case 'un':
        return n.op === '-' ? scaleLin(lin(n.a), -1) : toSym(lin(n.a))
      case 'bin': {
        const a = lin(n.a), b = lin(n.b)
        if (n.op === '+') return addLin(a, b)
        if (n.op === '-') return addLin(a, scaleLin(b, -1))
        if (n.op === '*') {
          const ca = an.constant(n.a), cb = an.constant(n.b)
          if (ca !== undefined) return scaleLin(b, ca)
          if (cb !== undefined) return scaleLin(a, cb)
        }
        if (n.op === '/') {
          const cb = an.constant(n.b)
          if (cb !== undefined && cb !== 0) return scaleLin(a, 1 / cb)
        }
        return nonlinear([a, b])
      }
      case 'call': return nonlinear(n.args.map(lin))
    }
  }
  const nonlinear = (xs: Lin[]): Lin => {
    let any = false
    for (const x of xs) {
      const s = toSym(x)
      if (s.k === 'bad') return BAD
      if (s.k === 'sym') any = true
    }
    return any ? SYM : NONE
  }

  const r = toSym(lin(parseFormula(inp.objective)))
  return r.k !== 'bad'
}
