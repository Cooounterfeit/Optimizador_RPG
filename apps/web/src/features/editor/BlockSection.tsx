import { useMemo, useState } from 'react';

import type { GameTemplate } from '@zenith/shared-types';

import { fieldClass } from '../../components/ui/form';

import { BLOCK_EDITORS } from './block-editors';
import type { ConfigBlock } from './blocks';
import { editorCopy } from './copy';

/**
 * Una parte de la plantilla, listada (CFG-02)
 * ===========================================
 * Era un trozo dentro de `ConfigurationPage`, y sale aqui porque ahora tiene
 * estado propio: cada bloque recuerda su busqueda y su orden por separado.
 *
 * Buscar y ordenar no estan atados a las estadisticas. El bloque lo declara
 * con `searchable` y la pagina no necesita saber cual es cual: cuando otra
 * parte crezca lo suficiente, se enciende el booleano y ya.
 *
 * El orden alfabetico por defecto sale del criterio de aceptacion. Por eso
 * la otra opcion es volver al ORDEN DE LA PLANTILLA y no una fecha: el
 * criterio pedia ordenar por creacion y por modificacion, y este sistema no
 * guarda esas fechas por atributo. El orden del autor si existe y es util.
 */

type Order = 'name' | 'template';

interface BlockSectionProps {
  block: ConfigBlock;
  template: GameTemplate;
  /** Si lo guardado se va a poder volver a leer. Decide si se ofrece editar. */
  editable: boolean;
}

export function BlockSection({ block, template, editable }: BlockSectionProps) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order>('name');
  const [editing, setEditing] = useState<string | null>(null);

  const { Create, Edit } = BLOCK_EDITORS[block.id] ?? {};
  const canEdit = editable && Edit !== undefined;

  /**
   * Las entradas cuestan: las de estadisticas preguntan al motor quien usa
   * cada una, lo que recorre las formulas de la plantilla. Se calculan al
   * cambiar la plantilla, no en cada tecla del buscador.
   */
  const all = useMemo(() => block.entries(template), [block, template]);

  const shown = useMemo(() => {
    if (!block.searchable) return all;

    const needle = query.trim().toLocaleLowerCase();
    const found = needle
      ? all.filter((entry) => entry.name.toLocaleLowerCase().includes(needle))
      : all;

    return order === 'name'
      ? [...found].sort((a, b) => a.name.localeCompare(b.name))
      : found;
  }, [all, block.searchable, query, order]);

  const filtering = block.searchable && query.trim().length > 0;

  return (
    <section className="mb-8" aria-labelledby={`block-${block.id}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-border pb-2">
        <h2 id={`block-${block.id}`} className="text-base font-bold tracking-[-0.02em]">
          {block.label}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">{all.length}</span>
        {block.required ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {editorCopy.config.required}
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[13px] text-muted-foreground">{block.hint}</p>

      {block.searchable && all.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="sr-only" htmlFor={`search-${block.id}`}>
              {editorCopy.config.search}
            </label>
            <input
              id={`search-${block.id}`}
              className={fieldClass}
              type="search"
              placeholder={editorCopy.config.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor={`sort-${block.id}`}>
              {editorCopy.config.sort}
            </label>
            <select
              id={`sort-${block.id}`}
              className={`${fieldClass} w-auto`}
              value={order}
              onChange={(event) => setOrder(event.target.value as Order)}
            >
              <option value="name">{editorCopy.config.sortName}</option>
              <option value="template">{editorCopy.config.sortTemplate}</option>
            </select>
          </div>
          {filtering ? (
            <p className="m-0 text-[12px] text-muted-foreground" role="status">
              {editorCopy.config.matches
                .replace('{n}', String(shown.length))
                .replace('{total}', String(all.length))}
            </p>
          ) : null}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted-foreground">
          {filtering ? editorCopy.config.noMatches : (block.empty ?? editorCopy.config.empty)}
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((entry) =>
            Edit && editing === entry.id ? (
              <li key={entry.id} className="py-2">
                <Edit id={entry.id} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 py-2.5"
              >
                <span className="min-w-[160px] text-sm font-medium">{entry.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{entry.id}</span>
                {entry.detail ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {entry.detail}
                  </span>
                ) : null}
                <span className="ms-auto flex items-baseline gap-4">
                  {entry.usedIn === undefined ? null : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {entry.usedIn > 0
                        ? editorCopy.config.usedIn.replace('{n}', String(entry.usedIn))
                        : editorCopy.config.unused}
                    </span>
                  )}
                  {canEdit ? (
                    <button
                      type="button"
                      // Con el nombre dentro: hay un boton por fila, y "Edit" a
                      // secas no distingue cual. El texto visible se queda corto
                      // a proposito, el nombre completo va al arbol accesible.
                      aria-label={`${editorCopy.stats.edit} ${entry.name}`}
                      onClick={() => setEditing(entry.id)}
                      className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      {editorCopy.stats.edit}
                    </button>
                  ) : null}
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      {/* Un bloque solo se edita si tiene editor Y si lo guardado se va a poder
          volver a leer. Un optimizador del catalogo no cumple lo segundo, y
          ofrecer un boton que no persiste seria mentir. */}
      {Create && editable ? <Create /> : null}
      {Create && !editable ? (
        <p className="mt-3 text-[12px] text-muted-foreground">{editorCopy.config.readOnly}</p>
      ) : null}
    </section>
  );
}
