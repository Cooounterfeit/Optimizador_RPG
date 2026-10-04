/**
 * Prueba de expresividad del lenguaje de plantillas
 * ==================================================
 * No opina: toma mecanicas reales de varios juegos, intenta escribirlas en el
 * formato de la plantilla y reporta que aguanta y que no.
 *
 * Comprueba dos cosas por mecanica:
 *   1. COMPILA  — el interprete puede parsear y evaluar la expresion.
 *   2. MONOTONA — el objetivo es no-decreciente en cada variable. Es el
 *      requisito que hace que la poda del branch and bound sea exacta. Si falla,
 *      la formula se puede escribir pero el optimizador actual NO puede
 *      garantizar el optimo sobre ella.
 *
 *   npx tsx scripts/expresividad.ts
 */
import { compileFormula, FormulaError } from '../src/core/formula'

interface Caso {
  juego: string
  nombre: string
  vars: string[]
  formula: string
  nota?: string
}

const CASOS: Caso[] = [
  // ---------------------------------------------------------------- gacha
  {
    juego: 'ZZZ', nombre: 'Dano con critico multiplicativo',
    vars: ['atk', 'critRate_', 'critDMG_', 'dmg_'],
    formula: 'atk * (1 + min(critRate_,100)/100 * critDMG_/100) * (1 + dmg_/100)',
  },
  {
    juego: 'ZZZ', nombre: 'Acumulacion de anomalia (atributo x dominio)',
    vars: ['anomalyProf', 'anomalyMastery'],
    formula: 'anomalyProf/100 * (1 + anomalyMastery/100)',
  },
  {
    juego: 'Endfield', nombre: 'Equipo + arma con escalado porcentual',
    vars: ['base_atk', 'atk_', 'atk', 'weaponMult'],
    formula: '(base_atk * (1 + atk_/100) + atk) * (1 + weaponMult/100)',
  },
  // ------------------------------------------------------------------ WoW
  {
    juego: 'WoW', nombre: 'Pesos de estadistica lineales',
    vars: ['str', 'crit', 'haste', 'mastery', 'vers'],
    formula: 'str*1.0 + crit*0.72 + haste*0.68 + mastery*0.81 + vers*0.65',
  },
  {
    juego: 'WoW', nombre: 'Rendimientos decrecientes por tramos en secundarias',
    vars: ['crit'],
    formula:
      'min(crit,30) + min(max(crit-30,0),9)*0.9 + min(max(crit-39,0),10)*0.8 ' +
      '+ min(max(crit-49,0),13)*0.7 + max(crit-62,0)*0.55',
    nota: 'Se arma con min/max encadenados, sin necesidad de un if',
  },
  {
    juego: 'WoW', nombre: 'Umbrales de celeridad (GCD por escalones)',
    vars: ['haste'],
    formula: 'floor(haste/100 * 8) / 8',
    nota: 'floor es no-decreciente, asi que la poda sigue siendo valida',
  },
  {
    juego: 'WoW', nombre: 'Bono de conjunto condicional a una habilidad',
    vars: ['atk', 'setBonus', 'base_usa_habilidad'],
    formula: 'atk * (1 + setBonus/100 * base_usa_habilidad)',
    nota: 'La condicion se declara como bandera 0/1 en el perfil base',
  },
  // ------------------------------------------------------------------ PoE
  {
    juego: 'PoE', nombre: '"increased" (suma) vs "more" (multiplica)',
    vars: ['baseDmg', 'increased', 'more1', 'more2'],
    formula: 'baseDmg * (1 + increased/100) * (1 + more1/100) * (1 + more2/100)',
    nota: 'LA FORMULA se escribe. El problema es otro: ver informe',
  },
  {
    juego: 'PoE', nombre: 'Conversion de dano fisico a fuego',
    vars: ['phys', 'convPct', 'physInc', 'fireInc'],
    formula:
      'phys * (1 - convPct/100) * (1 + physInc/100) + ' +
      'phys * (convPct/100) * (1 + physInc/100 + fireInc/100)',
  },
  {
    juego: 'PoE', nombre: 'Modificador condicional "a vida completa"',
    vars: ['dmg', 'condBonus', 'base_vida_completa'],
    formula: 'dmg * (1 + condBonus/100 * base_vida_completa)',
  },
  {
    juego: 'PoE', nombre: 'Dano por segundo con velocidad y precision',
    vars: ['hit', 'aps', 'hitChance'],
    formula: 'hit * aps * min(hitChance,100)/100',
  },
  // ----------------------------------------------------- casos problematicos
  {
    juego: 'Genshin', nombre: 'Objetivo con optimo interior (recarga exacta 200%)',
    vars: ['enerRech_', 'atk'],
    formula: 'atk * (1 - abs(enerRech_ - 200)/200)',
    nota: 'Pasarse de 200% es desperdicio: la funcion sube y luego BAJA',
  },
  {
    juego: 'PoE', nombre: 'Penalizacion por exceso de coste de mana',
    vars: ['dmg', 'manaCost', 'manaRegen'],
    formula: 'dmg * min(manaRegen / max(manaCost,1), 1)',
    nota: 'Decreciente en manaCost',
  },
]

// -------------------------------------------------------------------------
const rnd = (() => { let s = 42; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 })()

function analizar(c: Caso) {
  const idx = new Map(c.vars.map((v, i) => [v, i]))
  let fn
  try {
    fn = compileFormula(c.formula, idx)
  } catch (e) {
    return { compila: false, monotona: false, razon: e instanceof FormulaError ? e.message : String(e), culpable: '' }
  }

  // Monotonia: muestrear puntos y comprobar que subir una variable nunca baja el resultado.
  const n = c.vars.length
  let culpable = ''
  for (let iter = 0; iter < 4000 && !culpable; iter++) {
    const v = new Float64Array(n)
    for (let i = 0; i < n; i++) v[i] = rnd() * 300
    const base = fn(v)
    if (!Number.isFinite(base)) continue
    for (let i = 0; i < n; i++) {
      const old = v[i]
      v[i] = old + 1 + rnd() * 50
      const up = fn(v)
      v[i] = old
      if (Number.isFinite(up) && up < base - 1e-9) { culpable = c.vars[i]; break }
    }
  }
  return { compila: true, monotona: !culpable, razon: '', culpable }
}

console.log('\n  PRUEBA DE EXPRESIVIDAD DEL LENGUAJE DE PLANTILLAS\n')
console.log('  ' + 'JUEGO'.padEnd(9) + 'MECANICA'.padEnd(47) + 'COMPILA  MONOTONA  VEREDICTO')
console.log('  ' + '-'.repeat(96))
let ok = 0, noMono = 0, noComp = 0
for (const c of CASOS) {
  const r = analizar(c)
  let veredicto: string
  if (!r.compila) { veredicto = 'NO EXPRESABLE'; noComp++ }
  else if (!r.monotona) { veredicto = `optimizable NO (baja con ${r.culpable})`; noMono++ }
  else { veredicto = 'listo'; ok++ }
  console.log(
    '  ' + c.juego.padEnd(9) + c.nombre.slice(0, 45).padEnd(47) +
    (r.compila ? '  si  ' : '  NO  ').padEnd(9) +
    (r.monotona ? ' si  ' : ' NO  ').padEnd(10) + veredicto,
  )
  if (c.nota) console.log('  ' + ' '.repeat(9) + '↳ ' + c.nota)
}
console.log('\n  ' + `${ok} listas · ${noMono} se escriben pero rompen la poda · ${noComp} no expresables\n`)
