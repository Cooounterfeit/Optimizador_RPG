/**
 * Evaluador generico de calculadoras de juego.
 *
 * La definicion viene de `template.damageCalculator`: campos, limites y
 * formulas. El motor no conoce ataque, critico ni defensa; solo compila las
 * expresiones declaradas y las evalua en orden.
 */

import type { DamageCalculator } from '@zenith/shared-types'

import { compileFormula, FormulaError } from './formula.js'

export interface CalculatorValue {
  id: string
  label: string
  value: number
  unit?: string
  decimals?: number
}

export interface CalculatorResult {
  outputs: CalculatorValue[]
}

const checkNumber = (value: number, id: string): number => {
  if (!Number.isFinite(value)) {
    throw new FormulaError(`El campo "${id}" no es un numero valido.`, id)
  }
  return value
}

/** Ajusta un valor a los limites declarados por el campo. */
export function clampCalculatorValue(
  value: number,
  min: number | undefined,
  max: number | undefined,
): number {
  let result = value
  if (min !== undefined) result = Math.max(min, result)
  if (max !== undefined) result = Math.min(max, result)
  return result
}

/**
 * Evalua una calculadora con los valores del usuario.
 *
 * Los campos ausentes usan su `default` o cero. Las salidas se compilan una a
 * una contra los campos y las salidas anteriores, asi una referencia hacia
 * adelante falla en vez de leer un valor viejo.
 */
export function evaluateCalculator(
  definition: DamageCalculator,
  input: Readonly<Record<string, number>> = {},
): CalculatorResult {
  const variables = new Float64Array(definition.fields.length + definition.outputs.length)
  const indexes = new Map<string, number>()

  definition.fields.forEach((field, index) => {
    if (indexes.has(field.id)) {
      throw new FormulaError(`El campo "${field.id}" esta repetido.`, field.id)
    }

    const raw = input[field.id] ?? field.default ?? 0
    const value = clampCalculatorValue(checkNumber(raw, field.id), field.min, field.max)
    variables[index] = value
    indexes.set(field.id, index)
  })

  const outputs = definition.outputs.map((output, offset) => {
    if (indexes.has(output.id)) {
      throw new FormulaError(`El id "${output.id}" esta repetido en la calculadora.`, output.id)
    }

    const formula = compileFormula(output.formula, indexes)
    const value = formula(variables)
    if (!Number.isFinite(value)) {
      throw new FormulaError(`La salida "${output.id}" no produjo un numero valido.`, output.formula)
    }

    const index = definition.fields.length + offset
    variables[index] = value
    indexes.set(output.id, index)

    return {
      id: output.id,
      label: output.label,
      value,
      unit: output.unit,
      decimals: output.decimals,
    }
  })

  return { outputs }
}
