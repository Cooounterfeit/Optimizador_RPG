/**
 * Motor de formulas (RF.2)
 * ------------------------
 * Interpreta expresiones matematicas escritas en la plantilla del juego,
 * SIN usar eval() ni new Function(): las plantillas vienen de la comunidad y
 * ejecutarlas como codigo seria una vulnerabilidad de ejecucion remota.
 *
 * La expresion se analiza UNA vez a un arbol (AST) y de ese arbol salen dos
 * compiladores:
 *
 *  - compileFormula: evalua sobre numeros. Es el que corre en las hojas del
 *    optimizador, asi que compila a un arbol de closures sin asignaciones.
 *
 *  - compileFormulaInterval: evalua sobre INTERVALOS. Dada una caja de valores
 *    posibles para cada variable, devuelve un intervalo que contiene seguro
 *    todos los resultados. Es lo que permite podar de forma exacta aunque el
 *    objetivo no sea monotono (topes, penalizaciones por peso, "recarga
 *    exacta 200%"): el maximo del intervalo es una cota superior valida.
 *
 * Gramatica:
 *   or      := and ('||' and)*
 *   and     := cmp ('&&' cmp)*
 *   cmp     := sum (('<' | '<=' | '>' | '>=' | '==' | '!=') sum)?
 *   sum     := term (('+' | '-') term)*
 *   term    := unary (('*' | '/' | '%') unary)*
 *   unary   := ('-' | '+' | '!') unary | power
 *   power   := primary ('^' unary)?
 *   primary := numero | ident | ident '(' args ')' | '(' or ')'
 *
 * Los valores logicos son numeros: 0 es falso, cualquier otro es verdadero, y
 * las comparaciones devuelven 1 o 0. `if(c, a, b)` elige sin evaluar la rama
 * descartada.
 */

/** Programa compilado: lee variables de un Float64Array por indice. */
export type CompiledFormula = (vars: Float64Array) => number

/**
 * Programa compilado sobre intervalos. Lee la caja [lo, hi] de cada variable,
 * devuelve el extremo inferior del resultado y deja el superior en `out.hi`.
 * Asi no reserva memoria por evaluacion, que importa en el bucle caliente.
 */
export type IntervalFormula = (lo: Float64Array, hi: Float64Array, out: IntervalOut) => number

export type FormulaNode =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'un'; op: '-' | '!'; a: FormulaNode }
  | { k: 'bin'; op: string; a: FormulaNode; b: FormulaNode }
  | { k: 'call'; name: string; args: FormulaNode[] }

/** Aridad de cada funcion: numero exacto o 'any' (una o mas). */
const ARITY: Record<string, number | 'any'> = {
  min: 'any', max: 'any',
  floor: 1, ceil: 1, round: 1, abs: 1, sqrt: 1,
  log: 1, log10: 1, exp: 1, pow: 2,
  clamp: 3, if: 3,
}

/** Nombres reservados del lenguaje: no son variables. Unica fuente de verdad. */
export const FUNCTION_NAMES: readonly string[] = Object.keys(ARITY)

export class FormulaError extends Error {
  constructor(message: string, public expression: string) {
    super(`${message}  —  en la formula: "${expression}"`)
    this.name = 'FormulaError'
  }
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: string }

const TWO_CHAR_OPS = new Set(['<=', '>=', '==', '!=', '&&', '||'])
const ONE_CHAR_OPS = '+-*/%^(),<>!'

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9'

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    // Numeros: 12, 1.5, .5, 1e-3, 2.5E+4
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i
      while (isDigit(src[j])) j++
      if (src[j] === '.') { j++; while (isDigit(src[j])) j++ }
      if ((src[j] === 'e' || src[j] === 'E') &&
          (isDigit(src[j + 1]) || ((src[j + 1] === '+' || src[j + 1] === '-') && isDigit(src[j + 2])))) {
        j += 2
        while (isDigit(src[j])) j++
      }
      const n = Number(src.slice(i, j))
      if (Number.isNaN(n) || src[j] === '.') {
        throw new FormulaError(`Numero invalido "${src.slice(i, j + 1)}"`, src)
      }
      out.push({ t: 'num', v: n })
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ t: 'ident', v: src.slice(i, j) })
      i = j
      continue
    }
    const two = src.slice(i, i + 2)
    if (TWO_CHAR_OPS.has(two)) { out.push({ t: 'op', v: two }); i += 2; continue }
    if (ONE_CHAR_OPS.includes(c)) { out.push({ t: 'op', v: c }); i++; continue }
    throw new FormulaError(`Caracter inesperado "${c}" en la posicion ${i}`, src)
  }
  return out
}

/** Analiza una expresion y devuelve su arbol. Lanza FormulaError si no es valida. */
export function parseFormula(expr: string): FormulaNode {
  const tokens = tokenize(expr)
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]
  const isOp = (v: string) => { const t = peek(); return t !== undefined && t.t === 'op' && t.v === v }
  const eat = (v: string) => {
    if (!isOp(v)) throw new FormulaError(`Se esperaba "${v}"`, expr)
    pos++
  }

  function parseOr(): FormulaNode {
    let left = parseAnd()
    while (isOp('||')) { pos++; left = { k: 'bin', op: '||', a: left, b: parseAnd() } }
    return left
  }

  function parseAnd(): FormulaNode {
    let left = parseCmp()
    while (isOp('&&')) { pos++; left = { k: 'bin', op: '&&', a: left, b: parseCmp() } }
    return left
  }

  function parseCmp(): FormulaNode {
    const left = parseSum()
    for (const op of ['<=', '>=', '==', '!=', '<', '>']) {
      if (isOp(op)) {
        pos++
        const right = parseSum()
        for (const again of ['<=', '>=', '==', '!=', '<', '>']) {
          if (isOp(again)) throw new FormulaError('Las comparaciones no se encadenan: usa "&&" (a < b && b < c)', expr)
        }
        return { k: 'bin', op, a: left, b: right }
      }
    }
    return left
  }

  function parseSum(): FormulaNode {
    let left = parseTerm()
    for (;;) {
      if (isOp('+')) { pos++; left = { k: 'bin', op: '+', a: left, b: parseTerm() } }
      else if (isOp('-')) { pos++; left = { k: 'bin', op: '-', a: left, b: parseTerm() } }
      else return left
    }
  }

  function parseTerm(): FormulaNode {
    let left = parseUnary()
    for (;;) {
      if (isOp('*')) { pos++; left = { k: 'bin', op: '*', a: left, b: parseUnary() } }
      else if (isOp('/')) { pos++; left = { k: 'bin', op: '/', a: left, b: parseUnary() } }
      else if (isOp('%')) { pos++; left = { k: 'bin', op: '%', a: left, b: parseUnary() } }
      else return left
    }
  }

  function parseUnary(): FormulaNode {
    if (isOp('-')) { pos++; return { k: 'un', op: '-', a: parseUnary() } }
    if (isOp('!')) { pos++; return { k: 'un', op: '!', a: parseUnary() } }
    if (isOp('+')) { pos++; return parseUnary() }
    return parsePower()
  }

  function parsePower(): FormulaNode {
    const base = parsePrimary()
    if (isOp('^')) { pos++; return { k: 'bin', op: '^', a: base, b: parseUnary() } }
    return base
  }

  function parsePrimary(): FormulaNode {
    const t = peek()
    if (t === undefined) throw new FormulaError('Formula incompleta', expr)

    if (t.t === 'num') { pos++; return { k: 'num', v: t.v } }

    if (t.t === 'ident') {
      pos++
      const name = t.v
      if (isOp('(')) {
        pos++
        const args: FormulaNode[] = []
        if (!isOp(')')) {
          args.push(parseOr())
          while (isOp(',')) { pos++; args.push(parseOr()) }
        }
        eat(')')
        const arity = ARITY[name]
        if (arity === undefined) throw new FormulaError(`Funcion desconocida "${name}"`, expr)
        if (arity === 'any' ? args.length === 0 : arity !== args.length) {
          throw new FormulaError(`"${name}" espera ${arity === 'any' ? 'al menos 1' : arity} argumento(s), recibio ${args.length}`, expr)
        }
        return { k: 'call', name, args }
      }
      if (ARITY[name] !== undefined) throw new FormulaError(`"${name}" es una funcion: falta "(...)"`, expr)
      return { k: 'var', name }
    }

    if (t.t === 'op' && t.v === '(') { pos++; const inner = parseOr(); eat(')'); return inner }

    throw new FormulaError(`Token inesperado "${t.v}"`, expr)
  }

  const tree = parseOr()
  if (pos !== tokens.length) throw new FormulaError('Sobra contenido al final de la formula', expr)
  return tree
}

/**
 * Variables que usa una formula, sin funciones ni duplicados, en orden de
 * aparicion. Sale del mismo analizador que la evaluacion: una expresion regular
 * sobre el texto confundiria `1e5` con una variable `e5`.
 */
export function formulaVariables(expr: string): string[] {
  const out = new Set<string>()
  const walk = (n: FormulaNode): void => {
    if (n.k === 'var') out.add(n.name)
    else if (n.k === 'un') walk(n.a)
    else if (n.k === 'bin') { walk(n.a); walk(n.b) }
    else if (n.k === 'call') n.args.forEach(walk)
  }
  walk(parseFormula(expr))
  return [...out]
}

function resolveVar(name: string, varIndex: Map<string, number>, expr: string): number {
  const idx = varIndex.get(name)
  if (idx === undefined) {
    const known = [...varIndex.keys()].sort().slice(0, 12).join(', ')
    throw new FormulaError(`Variable desconocida "${name}". Disponibles: ${known}...`, expr)
  }
  return idx
}

// ============================================================ evaluacion puntual

/**
 * Compila `expr` a una closure evaluable.
 * @param varIndex nombre de variable -> indice dentro del Float64Array.
 */
export function compileFormula(expr: string, varIndex: Map<string, number>): CompiledFormula {
  return compileNode(parseFormula(expr), varIndex, expr)
}

/** Compila un arbol ya analizado. `expr` solo se usa en los mensajes de error. */
export function compileNode(root: FormulaNode, varIndex: Map<string, number>, expr = ''): CompiledFormula {
  const build = (n: FormulaNode): CompiledFormula => {
    switch (n.k) {
      case 'num': { const c = n.v; return () => c }
      case 'var': { const idx = resolveVar(n.name, varIndex, expr); return (v) => v[idx] }
      case 'un': {
        const a = build(n.a)
        return n.op === '-' ? (v) => -a(v) : (v) => (a(v) === 0 ? 1 : 0)
      }
      case 'bin': {
        const a = build(n.a), b = build(n.b)
        switch (n.op) {
          case '+': return (v) => a(v) + b(v)
          case '-': return (v) => a(v) - b(v)
          case '*': return (v) => a(v) * b(v)
          case '/': return (v) => a(v) / b(v)
          case '%': return (v) => a(v) % b(v)
          case '^': return (v) => Math.pow(a(v), b(v))
          case '<': return (v) => (a(v) < b(v) ? 1 : 0)
          case '<=': return (v) => (a(v) <= b(v) ? 1 : 0)
          case '>': return (v) => (a(v) > b(v) ? 1 : 0)
          case '>=': return (v) => (a(v) >= b(v) ? 1 : 0)
          case '==': return (v) => (a(v) === b(v) ? 1 : 0)
          case '!=': return (v) => (a(v) !== b(v) ? 1 : 0)
          case '&&': return (v) => (a(v) !== 0 && b(v) !== 0 ? 1 : 0)
          case '||': return (v) => (a(v) !== 0 || b(v) !== 0 ? 1 : 0)
        }
        throw new FormulaError(`Operador desconocido "${n.op}"`, expr)
      }
      case 'call': {
        const args = n.args.map(build)
        const [a, b, c] = args
        switch (n.name) {
          case 'min': return args.length === 1 ? a : (v) => {
            let m = args[0](v)
            for (let k = 1; k < args.length; k++) m = Math.min(m, args[k](v))
            return m
          }
          case 'max': return args.length === 1 ? a : (v) => {
            let m = args[0](v)
            for (let k = 1; k < args.length; k++) m = Math.max(m, args[k](v))
            return m
          }
          case 'floor': return (v) => Math.floor(a(v))
          case 'ceil': return (v) => Math.ceil(a(v))
          case 'round': return (v) => Math.round(a(v))
          case 'abs': return (v) => Math.abs(a(v))
          case 'sqrt': return (v) => Math.sqrt(a(v))
          case 'log': return (v) => Math.log(a(v))
          case 'log10': return (v) => Math.log10(a(v))
          case 'exp': return (v) => Math.exp(a(v))
          case 'pow': return (v) => Math.pow(a(v), b(v))
          case 'clamp': return (v) => Math.min(Math.max(a(v), b(v)), c(v))
          case 'if': return (v) => (a(v) !== 0 ? b(v) : c(v))
        }
        throw new FormulaError(`Funcion desconocida "${n.name}"`, expr)
      }
    }
  }
  return build(root)
}

// ======================================================= evaluacion por intervalos

const INF = Infinity

/**
 * Estado que devuelve cada nodo ademas de su extremo inferior.
 *  hi     → extremo superior.
 *  nan    → el resultado PUEDE ser NaN para algun punto de la caja.
 *  varNaN → (entrada) que variables pueden llegar ya como NaN; lo usan los
 *           derivados que dependen de otros derivados.
 *
 * El intervalo [lo, hi] cubre los resultados que son numeros; `nan` avisa del
 * resto. Hace falta llevarlo aparte porque JavaScript "traga" NaN en algunos
 * sitios: `NaN > 3` es falso, asi que una comparacion puede devolver un 0
 * perfectamente valido a partir de una raiz de un negativo.
 */
export interface IntervalOut { hi: number; nan: boolean; varNaN?: Uint8Array }

/** Producto de extremos: 0 * infinito cuenta como 0 (el NaN va por `nan`). */
const mulE = (x: number, y: number) => (x === 0 || y === 0 ? 0 : x * y)
const hasInf = (a: number, b: number) => a === -INF || b === INF
const hasZero = (a: number, b: number) => a <= 0 && b >= 0

/**
 * Valor logico: 1 si es seguro verdadero, 0 si es seguro falso, -1 si puede
 * ser cualquiera. En la evaluacion puntual NaN cuenta como verdadero
 * (`NaN !== 0`), asi que la posibilidad de NaN solo quita el "seguro falso".
 */
const truth = (lo: number, hi: number, nan: boolean) =>
  (lo > 0 || hi < 0 ? 1 : lo === 0 && hi === 0 && !nan ? 0 : -1)

/**
 * Compila `expr` a una evaluacion sobre intervalos.
 *
 * La garantia es de CONTENCION: para cualquier punto de la caja cuyo valor sea
 * un numero, ese valor cae dentro del intervalo devuelto. Puede ser holgado —la
 * aritmetica de intervalos no sabe que `x - x` es cero—, pero nunca demasiado
 * estrecho, que es lo unico que haria perder el optimo al podar. Ante cualquier
 * caso dudoso devuelve (-inf, +inf): no poda nada, pero no miente.
 */
export function compileFormulaInterval(expr: string, varIndex: Map<string, number>): IntervalFormula {
  return compileNodeInterval(parseFormula(expr), varIndex, expr)
}

/** Version por intervalos de `compileNode`. */
export function compileNodeInterval(root: FormulaNode, varIndex: Map<string, number>, expr = ''): IntervalFormula {
  const build = (n: FormulaNode): IntervalFormula => {
    switch (n.k) {
      case 'num': { const c = n.v; return (_l, _h, out) => { out.hi = c; out.nan = false; return c } }
      case 'var': {
        const idx = resolveVar(n.name, varIndex, expr)
        return (l, h, out) => { out.hi = h[idx]; out.nan = out.varNaN ? out.varNaN[idx] === 1 : false; return l[idx] }
      }
      case 'un': {
        const a = build(n.a)
        if (n.op === '-') return (l, h, out) => { const lo = a(l, h, out); const hi = out.hi; out.hi = -lo; return -hi }
        return (l, h, out) => {
          // !x vale 1 si x es 0, y 0 en otro caso (incluido NaN).
          const t = truth(a(l, h, out), out.hi, out.nan)
          return setBool(t === 1 ? 0 : t === 0 ? 1 : -1, out)
        }
      }
      case 'bin': return guard(binary(n.op, build(n.a), build(n.b)))
      case 'call': return guard(call(n.name, n.args.map(build)))
    }
  }

  /** Si los extremos salieron NaN (inf - inf...), el resultado honesto es "cualquier valor". */
  const guard = (f: IntervalFormula): IntervalFormula => (l, h, out) => {
    const lo = f(l, h, out)
    if (lo !== lo || out.hi !== out.hi) { out.hi = INF; out.nan = true; return -INF }
    return lo
  }

  const binary = (op: string, A: IntervalFormula, B: IntervalFormula): IntervalFormula => {
    switch (op) {
      case '+': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi
        out.nan = na || out.nan || (hasInf(a, b) && hasInf(c, d))
        out.hi = b + d
        return a + c
      }
      case '-': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi
        out.nan = na || out.nan || (hasInf(a, b) && hasInf(c, d))
        out.hi = b - c
        return a - d
      }
      case '*': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi
        out.nan = na || out.nan || (hasZero(a, b) && hasInf(c, d)) || (hasZero(c, d) && hasInf(a, b))
        const p1 = mulE(a, c), p2 = mulE(a, d), p3 = mulE(b, c), p4 = mulE(b, d)
        out.hi = Math.max(p1, p2, p3, p4)
        return Math.min(p1, p2, p3, p4)
      }
      case '/': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi
        out.nan = na || out.nan || (hasZero(a, b) && hasZero(c, d)) || (hasInf(a, b) && hasInf(c, d))
        if (hasZero(c, d)) { out.hi = INF; return -INF }
        const r1 = 1 / d, r2 = 1 / c
        const p1 = mulE(a, r1), p2 = mulE(a, r2), p3 = mulE(b, r1), p4 = mulE(b, r2)
        out.hi = Math.max(p1, p2, p3, p4)
        return Math.min(p1, p2, p3, p4)
      }
      case '%': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi
        out.nan = na || out.nan || hasZero(c, d) || hasInf(a, b)
        if (a === b && c === d) { const r = a % c; out.hi = r; return r }
        const m = Math.max(Math.abs(c), Math.abs(d))
        // El resto conserva el signo del dividendo y es menor que el divisor.
        if (a >= 0) { out.hi = Math.min(b, m); return 0 }
        if (b <= 0) { out.hi = 0; return Math.max(a, -m) }
        out.hi = Math.min(b, m); return Math.max(a, -m)
      }
      case '^': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi, nb = out.nan
        return powInterval(a, b, c, d, na || nb, out)
      }
      case '<': return cmp(A, B, false, (a, b, c, d) => (b < c ? 1 : a >= d ? 0 : -1))
      case '<=': return cmp(A, B, false, (a, b, c, d) => (b <= c ? 1 : a > d ? 0 : -1))
      case '>': return cmp(A, B, false, (a, b, c, d) => (a > d ? 1 : b <= c ? 0 : -1))
      case '>=': return cmp(A, B, false, (a, b, c, d) => (a >= d ? 1 : b < c ? 0 : -1))
      case '==': return cmp(A, B, false, (a, b, c, d) => (a === b && c === d && a === c ? 1 : b < c || d < a ? 0 : -1))
      case '!=': return cmp(A, B, true, (a, b, c, d) => (a === b && c === d && a === c ? 0 : b < c || d < a ? 1 : -1))
      case '&&': return logic(A, B, (x, y) => (x === 0 || y === 0 ? 0 : x === 1 && y === 1 ? 1 : -1))
      case '||': return logic(A, B, (x, y) => (x === 1 || y === 1 ? 1 : x === 0 && y === 0 ? 0 : -1))
    }
    throw new FormulaError(`Operador desconocido "${op}"`, expr)
  }

  const setBool = (r: number, out: IntervalOut) => {
    out.nan = false
    if (r === 1) { out.hi = 1; return 1 }
    if (r === 0) { out.hi = 0; return 0 }
    out.hi = 1; return 0
  }

  /**
   * Comparaciones: 1, 0, o "no se sabe" = [0, 1]. Con un operando NaN la
   * comparacion puntual da 0 (o 1 en el caso de "!="), asi que ese resultado
   * tambien tiene que quedar dentro.
   */
  const cmp = (A: IntervalFormula, B: IntervalFormula, nanIsTrue: boolean,
               decide: (a: number, b: number, c: number, d: number) => number): IntervalFormula =>
    (l, h, out) => {
      const a = A(l, h, out), b = out.hi, na = out.nan
      const c = B(l, h, out), d = out.hi
      let r = decide(a, b, c, d)
      if ((na || out.nan) && r !== (nanIsTrue ? 1 : 0)) r = -1
      return setBool(r, out)
    }

  const logic = (A: IntervalFormula, B: IntervalFormula, decide: (x: number, y: number) => number): IntervalFormula =>
    (l, h, out) => {
      const x = truth(A(l, h, out), out.hi, out.nan)
      const y = truth(B(l, h, out), out.hi, out.nan)
      return setBool(decide(x, y), out)
    }

  /** Funcion monotona creciente de un argumento: basta con los extremos. */
  const mono = (F: IntervalFormula, f: (x: number) => number, nanBelowZero = false): IntervalFormula => (l, h, out) => {
    const lo = F(l, h, out)
    if (nanBelowZero && lo < 0) out.nan = true
    out.hi = f(out.hi)
    return f(lo)
  }

  const call = (name: string, args: IntervalFormula[]): IntervalFormula => {
    const [A, B, C] = args
    switch (name) {
      case 'min':
      case 'max': {
        const pick = name === 'min' ? Math.min : Math.max
        return (l, h, out) => {
          let lo = args[0](l, h, out), hi = out.hi, nan = out.nan
          for (let k = 1; k < args.length; k++) {
            const x = args[k](l, h, out)
            lo = pick(lo, x); hi = pick(hi, out.hi); nan ||= out.nan
          }
          out.hi = hi; out.nan = nan
          return lo
        }
      }
      case 'floor': return mono(A, Math.floor)
      case 'ceil': return mono(A, Math.ceil)
      case 'round': return mono(A, Math.round)
      case 'exp': return mono(A, Math.exp)
      case 'sqrt': return mono(A, (x) => (x <= 0 ? 0 : Math.sqrt(x)), true)
      case 'log': return mono(A, (x) => (x <= 0 ? -INF : Math.log(x)), true)
      case 'log10': return mono(A, (x) => (x <= 0 ? -INF : Math.log10(x)), true)
      case 'abs': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi
        if (a >= 0) { out.hi = b; return a }
        if (b <= 0) { out.hi = -a; return -b }
        out.hi = Math.max(-a, b); return 0
      }
      case 'pow': return (l, h, out) => {
        const a = A(l, h, out), b = out.hi, na = out.nan
        const c = B(l, h, out), d = out.hi, nb = out.nan
        return powInterval(a, b, c, d, na || nb, out)
      }
      case 'clamp': return (l, h, out) => {
        const x = A(l, h, out), X = out.hi, n1 = out.nan
        const lo = B(l, h, out), LO = out.hi, n2 = out.nan
        const hi = C(l, h, out), HI = out.hi
        out.nan = n1 || n2 || out.nan
        out.hi = Math.min(Math.max(X, LO), HI)
        return Math.min(Math.max(x, lo), hi)
      }
      case 'if': return (l, h, out) => {
        const t = truth(A(l, h, out), out.hi, out.nan)
        if (t === 1) return B(l, h, out)
        if (t === 0) return C(l, h, out)
        const b = B(l, h, out), bh = out.hi, bn = out.nan
        const c = C(l, h, out)
        out.hi = Math.max(bh, out.hi)
        out.nan = bn || out.nan
        return Math.min(b, c)
      }
    }
    throw new FormulaError(`Funcion desconocida "${name}"`, expr)
  }

  return build(root)
}

/**
 * Potencia sobre intervalos. Con base positiva, x^y = exp(y * ln x) y el
 * producto de dos intervalos alcanza sus extremos en las esquinas. Con base
 * negativa solo se acota el caso de exponente entero fijo; lo demas es
 * (-inf, +inf), que es holgado pero correcto.
 */
function powInterval(a: number, b: number, c: number, d: number, nan: boolean, out: IntervalOut): number {
  // NaN puntual: base negativa con exponente no entero, o 1 elevado a infinito.
  out.nan = nan || (a < 0 && !(c === d && Number.isInteger(c))) || (hasInf(c, d) && a <= 1 && b >= 1)
  if (a === b && c === d) { const r = Math.pow(a, c); out.hi = r; return r }
  if (a >= 0) {
    const la = a === 0 ? -INF : Math.log(a), lb = b === 0 ? -INF : Math.log(b)
    const p1 = mulE(c, la), p2 = mulE(c, lb), p3 = mulE(d, la), p4 = mulE(d, lb)
    out.hi = Math.exp(Math.max(p1, p2, p3, p4))
    return Math.exp(Math.min(p1, p2, p3, p4))
  }
  if (c === d && Number.isInteger(c) && c > 0) {
    const pa = Math.pow(a, c), pb = Math.pow(b, c)
    if (c % 2 === 1) { out.hi = pb; return pa }
    if (b <= 0) { out.hi = pa; return pb }
    out.hi = Math.max(pa, pb); return 0
  }
  out.hi = INF
  return -INF
}
