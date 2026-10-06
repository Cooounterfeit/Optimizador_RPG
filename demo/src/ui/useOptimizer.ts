import { useCallback, useEffect, useRef, useState } from 'react'
import type { SolveRequest, SolveResponse } from '../core/types'
import type { WorkerIn, WorkerOut } from '../worker/optimizer.worker'

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

  const kill = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => () => kill(), [kill])

  const run = useCallback((request: SolveRequest, deadlineMs = 30_000) => {
    kill()
    setPhase('running')
    setProgress(null)
    setResult(null)
    setError(null)

    const worker = new Worker(new URL('../worker/optimizer.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress({ evaluated: msg.evaluated, pruned: msg.pruned, elapsedMs: msg.elapsedMs, bestScore: msg.bestScore })
      } else if (msg.type === 'done') {
        setResult(msg.result)
        setPhase('done')
        kill()
      } else {
        setError(msg.message)
        setPhase('error')
        kill()
      }
    }
    worker.onerror = (e) => {
      setError(e.message || 'Error en el worker')
      setPhase('error')
      kill()
    }

    const payload: WorkerIn = { type: 'solve', request, deadlineMs }
    worker.postMessage(payload)
  }, [kill])

  const cancel = useCallback(() => {
    kill()
    setPhase('cancelled')
  }, [kill])

  return { phase, progress, result, error, run, cancel }
}
