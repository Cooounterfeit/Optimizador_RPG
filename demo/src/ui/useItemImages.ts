import { useCallback, useEffect, useState } from 'react'
import type { Item } from '../core/types'
import { getImages, imageKeyOf, onImagesChanged, type ImageMap } from '../store/itemImages'

/**
 * Imagenes subidas por el usuario para un juego, siempre al dia: si otra vista
 * agrega o quita una, esta se refresca sola.
 */
export function useItemImages(gameId: string) {
  const [images, setImages] = useState<ImageMap>({})

  useEffect(() => {
    let vivo = true
    const cargar = () => { getImages(gameId).then((m) => { if (vivo) setImages(m) }).catch(() => { if (vivo) setImages({}) }) }
    cargar()
    const off = onImagesChanged((id) => { if (id === gameId) cargar() })
    return () => { vivo = false; off() }
  }, [gameId])

  /** Imagen propia del objeto, o null si no tiene. */
  const imageOf = useCallback((it: Item): string | null => images[imageKeyOf(it)] ?? null, [images])

  return { images, imageOf }
}
