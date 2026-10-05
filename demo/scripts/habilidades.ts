/**
 * Pruebas del arbol de habilidades. Sale con codigo 1 si algo falla.
 *   npx tsx scripts/habilidades.ts
 *
 *   1. Reglas de seleccion: rangos, requisitos (todos / al menos uno), puntos
 *      gastados, presupuesto, y que se puede subir o bajar.
 *   2. Efectos: suman o multiplican segun la estadistica.
 *   3. Integracion con el optimizador: los efectos y las variables skill_*
 *      cambian el resultado, y el branch and bound coincide con la fuerza bruta.
 *   4. Validacion de plantillas con arboles mal armados.
 *   5. Fuzz: plantillas, arboles y selecciones aleatorias contra fuerza bruta.
 */
import {
  canLower, canRaise, checkSelection, checkSkillTrees, sanitizeSelection, skillContribution,
} from '../src/core/skills'
import { solve, solveBruteForceTop } from '../src/core/optimizer'
import { validateTemplate } from '../src/core/validate'
import type { GameTemplate, Item, SkillSelection, SkillTreeDef } from '../src/core/types'

let fallos = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) fallos++
  console.log(`  [${ok ? 'OK ' : 'FALLO'}] ${label}${detail ? `  ${detail}` : ''}`)
}
const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b))

const arbol: SkillTreeDef = {
  id: 'guerrero', name: 'Guerrero', budget: 6,
  nodes: [
    { id: 'fuerza', name: 'Fuerza', maxRank: 3, effects: { atk: 5 } },
    { id: 'agilidad', name: 'Agilidad', maxRank: 2, effects: { crit: 2 } },
    { id: 'golpe', name: 'Golpe brutal', requires: ['fuerza'], cost: 2, effects: { more: 10 } },
    { id: 'tajo', name: 'Tajo', requiresAny: ['fuerza', 'agilidad'], effects: { atk: 1 } },
    { id: 'maestria', name: 'Maestria', requiresPoints: 4, effects: { more: 10 } },
  ],
}
const tpl = (over: Partial<GameTemplate> = {}): GameTemplate => ({
  schemaVersion: '0.1', gameId: 't', name: 't', description: '',
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'crit', name: 'Critico', unit: 'percent' },
    { id: 'more', name: 'Mas dano', unit: 'percent', aggregate: 'multiply' },
  ],
  slots: [{ id: 'arma', name: 'Arma' }],
  sets: [], derived: [],
  objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear', formula: '(base_atk + atk) * (1 + crit / 100) * more' }],
  baseProfiles: [{ id: 'p', name: 'p', base: { atk: 100, crit: 0, more: 1 } }],
  constrainableStats: [], skillTrees: [arbol], ...over,
})
const T = tpl()

console.log('\n1. REGLAS DE SELECCION')
check(checkSelection(T, {}).length === 0, 'seleccion vacia es valida')
check(canRaise(T, {}, 'fuerza') === null, 'se puede tomar un nodo sin requisitos')
check(canRaise(T, {}, 'golpe')?.includes('Requiere') ?? false, 'golpe pide fuerza', String(canRaise(T, {}, 'golpe')))
check(canRaise(T, { fuerza: 1 }, 'golpe') === null, 'con fuerza, golpe se puede')
check(canRaise(T, {}, 'tajo')?.includes('al menos uno') ?? false, 'tajo pide fuerza O agilidad')
check(canRaise(T, { agilidad: 1 }, 'tajo') === null, 'con agilidad basta para tajo')
check(canRaise(T, { fuerza: 3 }, 'fuerza') === 'Ya esta al maximo.', 'rango maximo')
check(canRaise(T, { fuerza: 3 }, 'maestria')?.includes('puntos gastados') ?? false, 'maestria pide 4 puntos', String(canRaise(T, { fuerza: 3 }, 'maestria')))
check(canRaise(T, { fuerza: 3, agilidad: 1 }, 'maestria') === null, 'con 4 puntos, maestria se puede')
check(canRaise(T, { fuerza: 3, agilidad: 1, golpe: 1 }, 'maestria')?.includes('No quedan puntos') ?? false, 'presupuesto de 6 agotado')
check(canLower(T, { fuerza: 1, golpe: 1 }, 'fuerza')?.includes('depende') ?? false, 'no se puede quitar fuerza si golpe depende de ella')
check(canLower(T, { fuerza: 2, golpe: 1 }, 'fuerza') === null, 'si queda un rango de fuerza, si se puede bajar')
check(canLower(T, { fuerza: 3, agilidad: 1, maestria: 1 }, 'agilidad')?.includes('depende') ?? false, 'bajar agilidad dejaria a maestria sin sus 4 puntos')
check(canLower(T, { fuerza: 1, agilidad: 1, tajo: 1 }, 'fuerza') === null, 'tajo sigue valido con solo agilidad')
check(checkSelection(T, { golpe: 1 }).length > 0, 'seleccion con requisito faltante es invalida')
check(checkSelection(T, { fuerza: 3, agilidad: 2, golpe: 1 }).some((p) => p.treeId === 'guerrero'), 'seleccion sobre presupuesto es invalida')
const san = sanitizeSelection(T, { golpe: 1, agilidad: 9, tajo: 1, fantasma: 2 } as SkillSelection)
check(JSON.stringify(san, Object.keys(san).sort()) === JSON.stringify({ agilidad: 2, tajo: 1 }), 'sanear: recorta rangos, quita lo que no existe y lo que queda sin requisito', JSON.stringify(san))

console.log('\n2. EFECTOS')
const c1 = skillContribution(T, { fuerza: 3, agilidad: 2 })
check(c1.atk === 15 && c1.crit === 4, 'sumas por rango', JSON.stringify(c1))
const c2 = skillContribution(T, { fuerza: 1, golpe: 1, agilidad: 1, maestria: 1 } as SkillSelection)
check(close(c2.more, 21), 'dos +10% "more" multiplican: +21%, no +20%', String(c2.more))

console.log('\n3. CON EL OPTIMIZADOR')
const items: Item[] = [
  { id: 'espada', slot: 'arma', setId: null, name: 'Espada', stats: { atk: 50 } },
  { id: 'daga', slot: 'arma', setId: null, name: 'Daga', stats: { atk: 30, crit: 25 } },
]
const req = (skills: SkillSelection, template = T) => ({ template, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 2, skills })
const r0 = solve(req({}))
check(r0.builds[0].itemIds.join() === 'daga' && close(r0.builds[0].score, 162.5), 'sin habilidades: daga 130 x 1,25 = 162,5', `${r0.builds[0].itemIds} ${r0.builds[0].score}`)
// Con fuerza 1 (+5 atk), agilidad 2 (+4 crit) y golpe (+10% more)
const sel = { fuerza: 1, agilidad: 2, golpe: 1 }
const r1 = solve(req(sel))
const espada = (100 + 50 + 5) * 1.04 * 1.1, daga = (100 + 30 + 5) * 1.29 * 1.1
check(r1.builds[0].itemIds.length === 1, 'la ranura sintetica no aparece en el resultado', JSON.stringify(r1.builds[0].itemIds))
check(r1.builds[0].itemIds[0] === 'daga' && close(r1.builds[0].score, daga), 'con habilidades: daga 135 x 1,29 x 1,1', `${r1.builds[0].itemIds} ${r1.builds[0].score} esperado ${daga}`)
check(close(r1.builds[1].score, espada), 'segundo puesto correcto (espada)', String(r1.builds[1].score))
check(close(r1.builds[0].finalStats.atk, 135) && close(r1.builds[0].finalStats.crit, 29) && close(r1.builds[0].finalStats.more, 1.1), 'las estadisticas finales incluyen las habilidades', JSON.stringify(r1.builds[0].finalStats))
check(!r1.stats.candidatesPerSlot.some((c) => c.slotId === '__skills'), 'las metricas no muestran la ranura sintetica')
const bf = solveBruteForceTop(req(sel))
check(bf.length === 2 && close(bf[0].score, r1.builds[0].score) && bf[0].itemIds.join() === 'daga', 'coincide con fuerza bruta')
let lanzo = false
try { solve(req({ golpe: 1 })) } catch { lanzo = true }
check(lanzo, 'una seleccion invalida se rechaza en vez de calcular algo falso')
// Variable skill_* en la formula: activa una mecanica
const Tf = tpl({ objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear', formula: 'if(skill_tajo > 0, (base_atk + atk) * 2, base_atk + atk) + crit' }] })
const f0 = solve(req({}, Tf)).builds[0], f1 = solve(req({ agilidad: 1, tajo: 1 }, Tf)).builds[0]
check(f0.itemIds[0] === 'daga' && close(f0.score, 155), 'skill_tajo = 0: sin la mecanica gana la daga (130 + 25)', `${f0.itemIds} ${f0.score}`)
check(f1.itemIds[0] === 'espada' && close(f1.score, 151 * 2 + 2), 'skill_tajo = 1: la mecanica duplica el ataque y ahora gana la espada', `${f1.itemIds} ${f1.score}`)
// Requisitos contra la build final: una habilidad de fuerza habilita un arma
const Tr = tpl({ requirementsFrom: 'final' })
const itemsR: Item[] = [...items, { id: 'mandoble', slot: 'arma', setId: null, name: 'Mandoble', stats: { atk: 90 }, requires: { crit: 4 } }]
check(solve({ ...req({}, Tr), items: itemsR }).builds[0].itemIds[0] === 'daga', 'sin habilidades el mandoble (pide 4 de critico) no se puede equipar')
check(solve({ ...req({ agilidad: 2 }, Tr), items: itemsR }).builds[0].itemIds[0] === 'mandoble', 'agilidad 2 (+4 critico) habilita el mandoble: requisito contra la build final')

console.log('\n4. VALIDACION DE PLANTILLAS')
const ok = validateTemplate({ ...T, selfTests: [{ name: 'golpe', profileId: 'p', objectiveId: 'o', items: [items[1]], skills: sel, expectScore: daga }] })
check(ok.ok && ok.selfTests[0]?.passed, 'plantilla con arbol valida y autoprueba con habilidades pasa', ok.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | '))
const conErr = (t: Partial<GameTemplate>, frag: string, label: string) => {
  const r = validateTemplate(tpl(t))
  const msgs = r.issues.filter((i) => i.severity === 'error').map((i) => i.message)
  check(!r.ok && msgs.some((m) => m.includes(frag)), label, msgs.join(' | ').slice(0, 160))
}
const n = (over: object) => ({ id: 'x', name: 'X', effects: { atk: 1 }, ...over })
conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'x', requires: ['y'] }), n({ id: 'y', requires: ['x'] })] }] }, 'nunca se puede tomar', 'ciclo de requisitos')
conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ effects: { mana: 3 } })] }] }, 'no es una estadistica', 'efecto sobre una estadistica que no existe')
conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'golpe-brutal' })] }] }, 'solo puede tener', 'id que no sirve como variable')
conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ requires: ['nadie'] })] }] }, 'que no existe', 'requisito que no existe')
conErr({ skillTrees: [{ id: 'a', name: 'A', budget: 3, nodes: [n({ id: 'x' }), n({ id: 'y', requiresPoints: 5 })] }] }, 'nunca se puede tomar', 'umbral de puntos imposible')
conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'x' })] }, { id: 'b', name: 'B', nodes: [n({ id: 'x' })] }] }, 'repetido', 'id de nodo repetido entre arboles')
conErr({ objectives: [{ id: 'o', name: 'o', description: '', kind: 'linear', formula: 'atk + skill_fantasma' }] }, 'no hay ninguna habilidad', 'formula que usa una habilidad inexistente')
const anyCiclo = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'r' }), n({ id: 'x', requiresAny: ['r', 'y'] }), n({ id: 'y', requiresAny: ['x'] })] }] }))
check(anyCiclo.ok, '"al menos uno" circular pero con salida (r → x → y) es valido')
const inutil = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [{ id: 'nada', name: 'Nada' }] }] }))
check(inutil.issues.some((i) => i.code === 'I_HABILIDAD_SIN_EFECTO'), 'informa de los nodos que no cambian el calculo')
check(checkSkillTrees(tpl({ skillTrees: undefined })).errors.length === 0, 'una plantilla sin arboles sigue siendo valida')

console.log('\n4b. ELECCIONES, NODOS COMPLETOS Y NODOS GRATIS (estilo WoW)')
const W = tpl({ skillTrees: [{
  id: 'w', name: 'W', budget: 3, requireFullRanks: true,
  nodes: [
    { id: 'raiz', name: 'Raiz', cost: 0, effects: { atk: 1 } },
    { id: 'base2', name: 'Base', maxRank: 2, requiresAny: ['raiz'], effects: { atk: 2 } },
    { id: 'opA', name: 'Opcion A', choiceGroup: 'c1', requiresAny: ['base2'], effects: { atk: 10 } },
    { id: 'opB', name: 'Opcion B', choiceGroup: 'c1', requiresAny: ['base2'], effects: { crit: 10 } },
    { id: 'hijo', name: 'Hijo', requiresAny: ['opA', 'opB'], effects: { atk: 1 } },
  ],
}] })
check(canRaise(W, {}, 'raiz') === null && canRaise(W, { raiz: 1 }, 'base2') === null, 'un nodo gratis (coste 0) se toma y no gasta puntos')
check(canRaise(W, { raiz: 1, base2: 1 }, 'opA')?.includes('completo') ?? false, 'con requireFullRanks, "Base" a medias no habilita la opcion', String(canRaise(W, { raiz: 1, base2: 1 }, 'opA')))
check(canRaise(W, { raiz: 1, base2: 2 }, 'opA') === null, 'con "Base" completo, si')
check(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'opB')?.includes('eleccion') ?? false, 'eleccion: con A tomada, B queda bloqueada', String(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'opB')))
check(checkSelection(W, { raiz: 1, base2: 2, opA: 1, opB: 1 }).length > 0, 'una seleccion con las dos opciones es invalida')
check(canLower(W, { raiz: 1, base2: 2, opA: 1 }, 'base2')?.includes('depende') ?? false, 'bajar "Base" dejaria a la opcion sin requisito completo')
check(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'hijo')?.includes('No quedan puntos') ?? false, 'el gratis no cuenta: 2 + 1 = 3 puntos, presupuesto agotado')
const w1 = solve({ template: W, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 1, skills: { raiz: 1, base2: 2, opB: 1 } })
const wbf = solveBruteForceTop({ template: W, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 1, skills: { raiz: 1, base2: 2, opB: 1 } })
check(close(w1.builds[0].score, wbf[0].score) && close(w1.builds[0].finalStats.crit, 35), 'la opcion elegida suma sus efectos y coincide con fuerza bruta', String(w1.builds[0].finalStats.crit))
check(validateTemplate(W).ok, 'la plantilla con elecciones y nodos gratis es valida')
const solo = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [{ id: 'x', name: 'X', choiceGroup: 'g', effects: { atk: 1 } }] }] }))
check(solo.issues.some((i) => i.message.includes('no tiene alternativa')), 'avisa de una eleccion sin alternativa')

console.log('\n5. FUZZ contra fuerza bruta')
let seed = 987654
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
let coinciden = 0
const N = 400
for (let k = 0; k < N; k++) {
  const nodes = Array.from({ length: ri(2, 7) }, (_, i) => {
    const prev = i > 0 && rnd() < 0.5 ? [`n${ri(0, i - 1)}`] : []
    const eff: Record<string, number> = {}
    for (const s of ['atk', 'crit', 'more']) if (rnd() < 0.5) eff[s] = ri(-5, 20)
    return { id: `n${i}`, name: `n${i}`, maxRank: ri(1, 3), cost: ri(1, 2), requires: prev, effects: eff }
  })
  const t = tpl({
    slots: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b', optional: rnd() < 0.3 }],
    skillTrees: [{ id: 'z', name: 'z', budget: ri(2, 8), nodes }],
    objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear',
      formula: rnd() < 0.5 ? '(base_atk + atk) * (1 + crit / 100) * more' : `if(skill_n0 > 0, atk * 2, atk) + crit * ${ri(1, 4)} - abs(crit - 10)` }],
  })
  // Seleccion aleatoria valida: subir rangos al azar mientras se pueda.
  let s: SkillSelection = {}
  for (let i = 0; i < 10; i++) {
    const id = `n${ri(0, nodes.length - 1)}`
    if (canRaise(t, s, id) === null) s = { ...s, [id]: (s[id] ?? 0) + 1 }
  }
  const its: Item[] = Array.from({ length: ri(2, 6) }, (_, i) => ({
    id: `i${i}`, slot: rnd() < 0.5 ? 'a' : 'b', setId: null, name: `i${i}`,
    stats: { atk: ri(0, 40), crit: ri(0, 20), ...(rnd() < 0.3 ? { more: ri(-20, 30) } : {}) },
  }))
  if (!its.some((i) => i.slot === 'a')) its.push({ id: 'ia', slot: 'a', setId: null, name: 'ia', stats: { atk: 1 } })
  if (!its.some((i) => i.slot === 'b')) its.push({ id: 'ib', slot: 'b', setId: null, name: 'ib', stats: { crit: 1 } })
  const rq = { template: t, items: its, profileId: 'p', objectiveId: 'o', constraints: [], topN: 3, skills: s }
  const a = solve(rq).builds.map((b) => b.score)
  const b = solveBruteForceTop(rq).map((x) => x.score)
  if (a.length === b.length && a.every((x, i) => close(x, b[i]))) coinciden++
  else if (coinciden + 3 > k) console.log('   discrepancia', k, JSON.stringify(s), a, b)
}
check(coinciden === N, `${coinciden} de ${N} instancias coinciden con la fuerza bruta (top 3)`)

console.log(fallos ? `\n${fallos} prueba(s) fallaron.` : '\nTodo en orden.')
process.exit(fallos ? 1 : 0)
