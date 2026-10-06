/**
 * Portada de un juego
 * ===================
 * Un catalogo de juegos sin caratulas no parece un catalogo. Pero las imagenes
 * de los juegos no las podemos distribuir nosotros: son material con derechos y
 * no hay una fuente legitima para 300 titulos. Asi que la portada la pone quien
 * crea la plantilla, y esta pantalla es la que se lo permite.
 *
 * Detalle importante: la imagen NO se guarda tal cual. Se redibuja en un canvas
 * a 640x360 y se comprime a JPEG antes de tocar el almacenamiento. Sin eso, un
 * PNG de 4 MB arrastrado desde el escritorio llenaria la cuota de localStorage
 * de golpe y el usuario perderia sus juegos por haber elegido una foto bonita.
 */

import { useEffect, useRef, useState } from 'react'

const W = 640
const H = 360

/** Redibuja cualquier imagen a 640x360 recortando por el centro y comprime. */
export function shrinkCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Eso no es una imagen.')); return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const ctx = c.getContext('2d')
      if (!ctx) { reject(new Error('Este navegador no permite redimensionar.')); return }
      // Recorte "cover": llena el rectangulo sin deformar, sobra por el lado largo.
      const escala = Math.max(W / img.width, H / img.height)
      const w = img.width * escala
      const h = img.height * escala
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      let out = c.toDataURL('image/jpeg', 0.78)
      // Segunda pasada si aun asi pesa mucho: mas vale fea que perder el juego.
      if (out.length > 220_000) out = c.toDataURL('image/jpeg', 0.55)
      resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')) }
    img.src = url
  })
}

export const COLORES = [
  '#7c8cff', '#5cc8a8', '#d8a860', '#e06c75', '#b07cff', '#4aa3df', '#e0895a', '#6fbf5a',
]

/** Degradado deterministico a partir del id: dos juegos distintos, colores distintos. */
export function colorDe(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLORES[h % COLORES.length]
}

/**
 * El rectangulo de portada. Si no hay imagen, dibuja un degradado con las
 * iniciales: una tarjeta sin portada tiene que seguir siendo reconocible.
 */
export function Cover(
  { src, name, accent, id, height = 132, children }:
  { src?: string; name: string; accent?: string; id: string; height?: number; children?: React.ReactNode },
) {
  const [roto, setRoto] = useState(false)
  useEffect(() => setRoto(false), [src])
  const c = accent || colorDe(id)
  // Solo palabras que empiecen por letra: "Souls (simplificado)" da "S", no "S(".
  const iniciales = (name.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ][\w]*/g) ?? [])
    .map((w) => w[0]).slice(0, 3).join('').toUpperCase() || '?'
  return (
    <div className="cover" style={{ height, background: `linear-gradient(135deg, ${c}44, ${c}14 55%, #0b0e15)` }}>
      {src && !roto
        ? <img src={src} alt={name} loading="lazy" onError={() => setRoto(true)} />
        : <span className="cover-ini" style={{ color: c }}>{iniciales}</span>}
      <div className="cover-fade" />
      {children}
    </div>
  )
}

/**
 * Editor de portada. Acepta las tres vias por las que llega una imagen: un
 * archivo del disco, una URL pegada, o ninguna (color solido).
 */
export default function CoverPicker({
  name, id, cover, accent, category, onChange, onClose,
}: {
  name: string
  id: string
  cover?: string
  accent?: string
  category?: string
  onChange: (p: { cover?: string; accent?: string; category?: string }) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [sobre, setSobre] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function tomar(file: File) {
    setError(null); setCargando(true)
    try {
      onChange({ cover: await shrinkCover(file) })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  const peso = cover ? Math.round((cover.length * 0.75) / 1024) : 0

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          Portada de {name}
          <div style={{ flex: 1 }} />
          <button className="mini" onClick={onClose}>cerrar</button>
        </h2>

        <Cover src={cover} name={name} accent={accent} id={id} height={190} />

        <div
          className={`drop${sobre ? ' over' : ''}`}
          style={{ marginTop: 14 }}
          onDragOver={(e) => { e.preventDefault(); setSobre(true) }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            e.preventDefault(); setSobre(false)
            const f = e.dataTransfer.files?.[0]
            if (f) tomar(f)
          }}
          onClick={() => input.current?.click()}
          role="button" tabIndex={0}
        >
          {cargando ? 'procesando…' : 'Arrastra una imagen aqui'}<br />
          <span style={{ color: 'var(--muted)' }}>
            o haz clic para elegir un archivo · JPG, PNG o WebP
          </span>
          <input ref={input} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) tomar(f); e.target.value = '' }} />
        </div>

        <p className="hint" style={{ marginTop: 8 }}>
          Se reescala a 640×360 y se comprime antes de guardarla, para que una captura de
          4&nbsp;MB no llene el almacenamiento del navegador.
          {cover?.startsWith('data:') && <> Ahora ocupa <b>{peso}&nbsp;KB</b>.</>}
        </p>

        <label className="field">
          <span>…o pega la direccion de una imagen</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" placeholder="https://…" value={url}
              onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
            <button className="mini" disabled={!url.trim()}
              onClick={() => { onChange({ cover: url.trim() }); setUrl('') }}>usar</button>
          </div>
        </label>

        <label className="field">
          <span>Categoria — agrupa el juego en el menu lateral</span>
          <input type="text" list="zenith-cats" placeholder="Action RPG, Roguelike, Sandbox…"
            value={category ?? ''} onChange={(e) => onChange({ category: e.target.value })} />
          <datalist id="zenith-cats">
            {['Action RPG', 'MMORPG', 'Roguelike', 'Sandbox', 'Gacha', 'Souls-like', 'ARPG', 'Estrategia']
              .map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>

        <div className="field" style={{ marginBottom: 0 }}>
          <span>Color de la tarjeta — es el respaldo cuando no hay imagen</span>
          <div className="swatches">
            {COLORES.map((c) => (
              <button key={c} className={`swatch${(accent ?? colorDe(id)) === c ? ' on' : ''}`}
                style={{ background: c }} title={c} onClick={() => onChange({ accent: c })} />
            ))}
            {cover && (
              <button className="mini" style={{ marginLeft: 8 }}
                onClick={() => onChange({ cover: undefined })}>quitar imagen</button>
            )}
          </div>
        </div>

        {error && <div className="banner err" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )
}
