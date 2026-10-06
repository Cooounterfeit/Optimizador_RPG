/**
 * Web Worker del Core Engine (RNF.1)
 * -----------------------------------
 * El optimizador corre en un hilo aparte. Sin esto, una busqueda de varios
 * segundos congelaria por completo la interfaz: nada de animaciones, ni scroll,
 * ni siquiera un boton de cancelar que responda.
 *
 * La cancelacion se resuelve terminando el worker desde el hilo principal
 * (ver useOptimizer.ts). Un worker ocupado no puede leer mensajes entrantes,
 * asi que mandarle un "para" no serviria de nada.
 *
 * Consecuencia de eso: al matarlo, el `return` de solve() nunca llega. Por eso
 * cada aviso de progreso arrastra las mejores builds encontradas hasta el
 * momento, y el hilo principal las va guardando. Asi detener una busqueda —de
 * treinta segundos o de cuatro horas— devuelve siempre el mejor resultado
 * hallado, en vez de tirarlo a la basura.
 */

import { solve } from '../core/optimizer'
import type { BuildResult, SolveRequest, SolveResponse } from '../core/types'

/** Cifras que se conocen antes de buscar y ya no cambian. */
export type Setup = Parameters<NonNullable<Parameters<typeof solve>[1]>['onSetup'] & object>[0]

export type WorkerIn = { type: 'solve'; request: SolveRequest; deadlineMs?: number }
export type WorkerOut =
  | { type: 'setup'; setup: Setup }
  | {
      type: 'progress'; evaluated: number; pruned: number; elapsedMs: number; bestScore: number
      /** Las mejores builds encontradas hasta este instante, ya completas. */
      builds: BuildResult[]
    }
  | { type: 'done'; result: SolveResponse }
  | { type: 'error'; message: string }

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data
  if (msg.type !== 'solve') return
  try {
    const result = solve(msg.request, {
      deadlineMs: msg.deadlineMs,
      onSetup: (setup) => {
        const out: WorkerOut = { type: 'setup', setup }
        self.postMessage(out)
      },
      onProgress: (p) => {
        const out: WorkerOut = { type: 'progress', ...p }
        self.postMessage(out)
      },
    })
    const out: WorkerOut = { type: 'done', result }
    self.postMessage(out)
  } catch (err) {
    const out: WorkerOut = { type: 'error', message: err instanceof Error ? err.message : String(err) }
    self.postMessage(out)
  }
}
