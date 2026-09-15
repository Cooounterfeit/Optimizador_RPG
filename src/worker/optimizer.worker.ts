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
 */

import { solve } from '../core/optimizer'
import type { SolveRequest, SolveResponse } from '../core/types'

export type WorkerIn = { type: 'solve'; request: SolveRequest; deadlineMs?: number }
export type WorkerOut =
  | { type: 'progress'; evaluated: number; pruned: number; elapsedMs: number; bestScore: number }
  | { type: 'done'; result: SolveResponse }
  | { type: 'error'; message: string }

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data
  if (msg.type !== 'solve') return
  try {
    const result = solve(msg.request, {
      deadlineMs: msg.deadlineMs,
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
