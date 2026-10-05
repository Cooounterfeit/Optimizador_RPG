import { useEffect, useState } from 'react'
import { onToast, type Toast } from './errors'

/**
 * Avisos breves en la esquina: errores de red, importaciones, guardados.
 * Se van solos a los 6 s (los errores a los 9 s) y se pueden cerrar.
 * `aria-live` hace que un lector de pantalla los lea sin mover el foco.
 */
export default function Toasts() {
  const [lista, setLista] = useState<Toast[]>([])
  useEffect(() => onToast((t) => {
    setLista((l) => [...l.slice(-3), t])
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== t.id)), t.kind === 'error' ? 9000 : 6000)
  }), [])
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {lista.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span>{t.text}</span>
          <button aria-label="Cerrar aviso" onClick={() => setLista((l) => l.filter((x) => x.id !== t.id))}>×</button>
        </div>
      ))}
    </div>
  )
}
