/**
 * Motor de formulas (RF.2)
 * ------------------------
 * Interpreta expresiones matematicas escritas en la plantilla del juego,
 * SIN usar eval() ni new Function(): las plantillas vienen de la comunidad y
 * ejecutarlas como codigo seria una vulnerabilidad de ejecucion remota.
 *
 * En su lugar, un parser descendente recursivo compila la expresion a un arbol
 * de closures. Evaluar cuesta lo mismo que llamar funciones anidadas, asi que
 * sirve dentro del bucle caliente del optimizador.
 *
 * Gramatica:
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/' | '%') unary)*
 *   unary   := '-' unary | power
 *   power   := primary ('^' unary)?
 *   primary := numero | ident | ident '(' args ')' | '(' expr ')'
 */

/** Programa compilado: lee variables de un Float64Array por indice. */
export type CompiledFormula = (vars: Float64Array) => number

type Fn = (args: number[]) => number

const FUNCTIONS: Record<string, { arity: number | 'any'; fn: Fn }> = {
  min: { arity: 'any', fn: (a) => Math.min(...a) },
  max: { arity: 'any', fn: (a) => Math.max(...a) },
  floor: { arity: 1, fn: (a) => Math.floor(a[0]) },
  ceil: { arity: 1, fn: (a) => Math.ceil(a[0]) },
  round: { arity: 1, fn: (a) => Math.round(a[0]) },
  abs: { arity: 1, fn: (a) => Math.abs(a[0]) },
  sqrt: { arity: 1, fn: (a) => Math.sqrt(a[0]) },
  clamp: { arity: 3, fn: (a) => Math.min(Math.max(a[0], a[1]), a[2]) },
}

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

function tokenize(src: string, expr: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    if (c >= '0' && c <= '9') {
      let j = i
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++
      const n = Number(src.slice(i, j))
      if (Number.isNaN(n)) throw new FormulaError(`Numero invalido "${src.slice(i, j)}"`, expr)
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
    if ('+-*/%^(),'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue }
    throw new FormulaError(`Caracter inesperado "${c}" en la posicion ${i}`, expr)
  }
  return out
}

/**
 * Compila `expr` a una closure evaluable.
 * @param varIndex nombre de variable -> indice dentro del Float64Array.
 */
export function compileFormula(expr: string, varIndex: Map<string, number>): CompiledFormula {
  const tokens = tokenize(expr, expr)
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]
  const isOp = (v: string) => { const t = peek(); return t !== undefined && t.t === 'op' && t.v === v }
  const eat = (v: string) => {
    if (!isOp(v)) throw new FormulaError(`Se esperaba "${v}"`, expr)
    pos++
  }

  function parseExpr(): CompiledFormula {
    let left = parseTerm()
    for (;;) {
      if (isOp('+')) { pos++; const r = parseTerm(); const l = left; left = (v) => l(v) + r(v) }
      else if (isOp('-')) { pos++; const r = parseTerm(); const l = left; left = (v) => l(v) - r(v) }
      else return left
    }
  }

  function parseTerm(): CompiledFormula {
    let left = parseUnary()
    for (;;) {
      if (isOp('*')) { pos++; const r = parseUnary(); const l = left; left = (v) => l(v) * r(v) }
      else if (isOp('/')) { pos++; const r = parseUnary(); const l = left; left = (v) => l(v) / r(v) }
      else if (isOp('%')) { pos++; const r = parseUnary(); const l = left; left = (v) => l(v) % r(v) }
      else return left
    }
  }

  function parseUnary(): CompiledFormula {
    if (isOp('-')) { pos++; const r = parseUnary(); return (v) => -r(v) }
    if (isOp('+')) { pos++; return parseUnary() }
    return parsePower()
  }

  function parsePower(): CompiledFormula {
    const base = parsePrimary()
    if (isOp('^')) { pos++; const e = parseUnary(); return (v) => Math.pow(base(v), e(v)) }
    return base
  }

  function parsePrimary(): CompiledFormula {
    const t = peek()
    if (t === undefined) throw new FormulaError('Formula incompleta', expr)

    if (t.t === 'num') { pos++; const c = t.v; return () => c }

    if (t.t === 'ident') {
      pos++
      const name = t.v
      if (isOp('(')) {
        pos++
        const args: CompiledFormula[] = []
        if (!isOp(')')) {
          args.push(parseExpr())
          while (isOp(',')) { pos++; args.push(parseExpr()) }
        }
        eat(')')
        const def = FUNCTIONS[name]
        if (!def) throw new FormulaError(`Funcion desconocida "${name}"`, expr)
        if (def.arity !== 'any' && def.arity !== args.length) {
          throw new FormulaError(`"${name}" espera ${def.arity} argumento(s), recibio ${args.length}`, expr)
        }
        const fn = def.fn
        const buf = new Array<number>(args.length)
        return (v) => {
          for (let k = 0; k < args.length; k++) buf[k] = args[k](v)
          return fn(buf)
        }
      }
      const idx = varIndex.get(name)
      if (idx === undefined) {
        const known = [...varIndex.keys()].sort().slice(0, 12).join(', ')
        throw new FormulaError(`Variable desconocida "${name}". Disponibles: ${known}...`, expr)
      }
      return (v) => v[idx]
    }

    if (t.t === 'op' && t.v === '(') { pos++; const inner = parseExpr(); eat(')'); return inner }

    throw new FormulaError(`Token inesperado "${t.v}"`, expr)
  }

  const program = parseExpr()
  if (pos !== tokens.length) throw new FormulaError('Sobra contenido al final de la formula', expr)
  return program
}
