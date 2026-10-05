import { useEffect, useState } from 'react'
import { getSyncState, onSyncState, type SyncState } from './sync'

/** Estado de la sincronizacion para las vistas (se actualiza solo). */
export function useCloudSync(): SyncState {
  const [s, setS] = useState(getSyncState)
  useEffect(() => onSyncState(setS), [])
  return s
}
