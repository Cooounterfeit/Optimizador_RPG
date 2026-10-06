import { useCallback, useEffect, useRef, useState } from 'react'
import type { BuildResult, SolveRequest, SolveResponse, SolveStats } from '../core/types'
import type { Setup, WorkerIn, WorkerOut } from '../worker/optimizer.worker'
import { reportError } from './errors'

export interface Progress {
  evaluated: number
  pruned: number
  elapsedMs: number
  bestScore: number
}

export type Phase = 'idle' | 'running' | 'done' | 'error' | 'cancelled'

export function useOptimizer() {
  const workerRef = useRef<Worker | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<SolveResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  /**
   * Ultimo estado parcial recibido del worker.
   *
   * Es una ref y no un estado porque `cancel` tiene que leerlo en el instante
   * en que se pulsa: con `useState` leeria el valor de la ultima renderizacion,
   * que en una busqueda larga puede ser de hace un rato. Con la ref siempre es
   * lo ultimo que llego.
   */
  const parcial = useRef<{ builds: BuildResult[]; p: Progress } | null>(null)
  /** Cifras fijas del problema, recibidas antes de que empiece la busqueda. */
  const setup = useRef<Setup | null>(null)

  const kill = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => () => kill(), [kill])

  /**
   * `deadlineMs` sin valor = sin limite. Es el modo normal: la busqueda dura lo
   * que el usuario quiera y para cuando el la pare. Un limite automatico solo
   * tiene sentido cuando no hay nadie mirando (las autopruebas del validador).
   */
  const run = useCallback((request: SolveRequest, deadlineMs?: number) => {
    kill()
    parcial.current = null
    setup.current = null
    setPhase('running')
    setProgress(null)
    setResult(null)
    setError(null)

    const worker = new Worker(new URL('../worker/optimizer.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const msg = e.data
      if (msg.type === 'setup') {
        setup.current = msg.setup
      } else if (msg.type === 'progress') {
        const p = {
          evaluated: msg.evaluated, pruned: msg.pruned,
          elapsedMs: msg.elapsedMs, bestScore: msg.bestScore,
        }
        parcial.current = { builds: msg.builds, p }
        setProgress(p)
      } else if (msg.type === 'done') {
        setResult(msg.result)
        setPhase('done')
        kill()
      } else {
        reportError(new Error(msg.message), 'optimizador (worker)')
        setError(msg.message)
        setPhase('error')
        kill()
      }
    }
    worker.onerror = (e) => {
      reportError(new Error(e.message || 'Error en el worker'), 'optimizador (worker)')
      setError(e.message || 'Error en el worker')
      setPhase('error')
      kill()
    }

    const payload: WorkerIn = { type: 'solve', request, deadlineMs }
    worker.postMessage(payload)
  }, [kill])

  /**
   * Detiene la busqueda QUEDANDOSE con lo mejor encontrado.
   *
   * Matar el worker impide que solve() devuelva nada, asi que el resultado se
   * arma aqui con el ultimo parcial recibido. Se marca `provenOptimal: false` y
   * `stoppedBy: 'usuario'`: la build es real y esta bien calculada, lo unico que
   * falta es la demostracion de que no habia otra mejor.
   */
  const cancel = useCallback(() => {
    kill()
    const ult = parcial.current
    const s = setup.current
    if (ult && s && ult.builds.length > 0) {
      // Las cifras fijas vienen del `setup` real del motor; las variables, del
      // ultimo progreso. Ningun campo se rellena con un cero inventado.
      const stats: SolveStats = {
        ...s,
        evaluated: ult.p.evaluated, pruned: ult.p.pruned,
        elapsedMs: ult.p.elapsedMs, feasible: true,
        provenOptimal: false, stoppedBy: 'usuario',
      }
      setResult({ builds: ult.builds, stats })
      setPhase('done')
      return
    }
    setPhase('cancelled')
  }, [kill])

  return { phase, progress, result, error, run, cancel }
}
