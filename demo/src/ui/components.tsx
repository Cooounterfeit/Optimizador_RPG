import { useState } from 'react'

export function Metric(
  { k, v, s, tone }: { k: string; v: string; s?: string; tone?: 'accent' | 'good' },
) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v${tone ? ` ${tone}` : ''}`}>{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}

/** Icono con degradado por rareza y respaldo tipografico si la imagen no carga. */
export function Icon(
  { src, alt, rarity = 4, size = 52 }:
  { src: string | null; alt: string; rarity?: number; size?: number },
) {
  const [broken, setBroken] = useState(false)
  const initials = alt.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
  return (
    <div className={`icon r${rarity}`} style={{ width: size, height: size }} title={alt}>
      {src && !broken
        ? <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
        : <span>{initials}</span>}
    </div>
  )
}

export function Banner({ kind, children }: { kind: 'ok' | 'warn' | 'err' | 'info'; children: React.ReactNode }) {
  return <div className={`banner ${kind}`}>{children}</div>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>
}
