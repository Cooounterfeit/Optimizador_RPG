import { AuthError } from './auth-service';

export const MAX_AVATAR_BYTES = 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateAvatar(file: File): void {
  if (!AVATAR_MIME_TYPES.includes(file.type)) throw new AuthError('avatar-type');
  if (file.size > MAX_AVATAR_BYTES) throw new AuthError('avatar-size');
}

const MAX_SIDE = 512;

/**
 * Reduce la foto a 512 px y la convierte a WebP. Si el navegador no puede
 * decodificarla, se sube el archivo original (ya validado).
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  validateAvatar(file);

  try {
    const bitmap = await createBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );

    return blob ?? file;
  } catch {
    return file;
  }
}

function createBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('no se pudo leer la imagen'));
    };
    image.src = url;
  });
}
