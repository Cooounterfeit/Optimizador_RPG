/**
 * Helpers que tocan el DOM. Viven aparte de los repos para que estos se puedan
 * probar en Node sin navegador.
 */

/** Descarga un objeto como JSON. */
export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Redibuja la imagen en un rectangulo de `width` x `height`, ENTERA y centrada
 * (sin recortar: un icono de espada alargado no puede perder la punta), con
 * fondo transparente. Comprime a WebP con dos pasadas.
 */
export function shrinkImage(file: File, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" no es una imagen.`));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Este navegador no permite redimensionar.'));
        return;
      }
      const scale = Math.min(width / image.width, height / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
      let out = canvas.toDataURL('image/webp', 0.86);
      if (out.length > 160_000) out = canvas.toDataURL('image/webp', 0.6);
      resolve(out);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer "${file.name}".`));
    };
    image.src = url;
  });
}
