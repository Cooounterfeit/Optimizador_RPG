export const nf = new Intl.NumberFormat('es-CL')

export function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e15) return n.toExponential(2).replace('e+', ' ×10^')
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: decimals }).format(n)
}

/** Notacion compacta para numeros enormes: 4.266.292.800 -> "4,27 mil millones". */
export function fmtBig(n: number): string {
  if (n >= 1e12) return `${fmt(n / 1e12, 2)} billones`
  if (n >= 1e9) return `${fmt(n / 1e9, 2)} mil millones`
  if (n >= 1e6) return `${fmt(n / 1e6, 2)} millones`
  return fmt(n)
}

export const secs = (ms: number) => `${(ms / 1000).toFixed(2)} s`
