/** "Espada Larga · Nv. 90" -> "espada larga". Sirve para claves de imagen y busquedas. */
export function normalizeKey(name: string): string {
  return name
    .split('·')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Mi Juego 2" -> "mi-juego-2". */
export function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'juego'
  );
}

/** Id libre dentro de los ya usados. */
export function freeId(base: string, taken: Set<string>): string {
  let id = slugify(base);
  let n = 2;
  while (taken.has(id)) id = `${slugify(base)}-${n++}`;
  return id;
}
