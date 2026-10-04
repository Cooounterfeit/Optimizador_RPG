import { useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { Empty, Icon } from '../ui/components'
import { nf } from '../ui/format'
import { characterIcon, characterRarity, itemIcon, itemRarity } from '../adapters/genshinAssets'
import ItemImporter from './ItemImporter'

const PAGE = 96

export default function InventoryView({
  gameId, template, items, onItemsChange,
}: {
  gameId: string
  template: GameTemplate
  items: Item[]
  onItemsChange: (items: Item[]) => void
}) {
  // Los personajes seleccionables son los perfiles de la plantilla.
  const perfiles = template.baseProfiles

  const [tab, setTab] = useState<'items' | 'chars' | 'cargar'>('items')
  const [slotFilter, setSlotFilter] = useState('')
  const [setFilter, setSetFilter] = useState('')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((it) => {
      if (slotFilter && it.slot !== slotFilter) return false
      if (setFilter && it.setId !== setFilter) return false
      if (q) {
        const setName = template.sets.find((s) => s.id === it.setId)?.name ?? ''
        if (!`${it.name} ${setName}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, slotFilter, setFilter, query, template.sets])

  const chars = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? perfiles.filter((c) => c.name.toLowerCase().includes(q)) : perfiles
  }, [perfiles, query])

  const reset = (fn: () => void) => { fn(); setShown(PAGE) }

  return (
    <>
      <div className="card">
        <h2>
          Inventario de {template.name}
          <span className="chip n">{nf.format(items.length)} objetos cargados</span>
        </h2>

        <div className="invbar">
          <button className={`mini${tab === 'items' ? ' on' : ''}`} onClick={() => reset(() => setTab('items'))}>
            {gameId === 'genshin' ? 'Artefactos' : 'Objetos'} ({nf.format(items.length)})
          </button>
          <button className={`mini${tab === 'cargar' ? ' on' : ''}`} onClick={() => reset(() => setTab('cargar'))}>
            + cargar mis objetos
          </button>
          <button className={`mini${tab === 'chars' ? ' on' : ''}`} onClick={() => reset(() => setTab('chars'))}>
            Personajes ({nf.format(perfiles.length)})
          </button>
          <div style={{ flex: 1 }} />
          <input type="text" placeholder="Buscar…" value={query}
            onChange={(e) => reset(() => setQuery(e.target.value))} />
        </div>

        {tab === 'items' && (
          <div className="invbar">
            <select value={slotFilter} onChange={(e) => reset(() => setSlotFilter(e.target.value))}>
              <option value="">Todas las ranuras</option>
              {template.slots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={setFilter} onChange={(e) => reset(() => setSetFilter(e.target.value))}>
              <option value="">Todos los conjuntos</option>
              {[...template.sets].sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>
              {nf.format(filtered.length)} coinciden
            </span>
          </div>
        )}
      </div>

      {tab === 'cargar' && (
        <ItemImporter
          template={template}
          existing={items}
          onImport={(nuevos, modo) => {
            onItemsChange(modo === 'reemplazar' ? nuevos : [...items, ...nuevos])
            setTab('items')
          }}
        />
      )}

      {tab !== 'cargar' && (
      <div className="card">
        {tab === 'items' && (
          filtered.length === 0
            ? <Empty>Ningun objeto coincide con el filtro.</Empty>
            : <>
                <div className="invgrid">
                  {filtered.slice(0, shown).map((it) => (
                    <ItemCard key={it.id} it={it} gameId={gameId} template={template} />
                  ))}
                </div>
                {shown < filtered.length && (
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button className="mini" onClick={() => setShown(shown + PAGE * 2)}>
                      Mostrar mas ({nf.format(filtered.length - shown)} restantes)
                    </button>
                  </div>
                )}
              </>
        )}

        {tab === 'chars' && (
          <>
            <div className="invgrid">
              {chars.slice(0, shown).map((c) => {
                const key = (c.assetKey ?? c.id) as string
                return (
                  <div className="invcard" key={c.id}>
                    <Icon src={characterIcon(gameId, key)} alt={c.name} rarity={characterRarity(key)} size={48} />
                    <div className="meta">
                      <div className="t">{c.name}</div>
                      <div className="m">
                        Vida {nf.format(Math.round(c.base.hp ?? 0))} · ATQ {Math.round(c.base.atk ?? 0)} · DEF {Math.round(c.base.def ?? 0)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {shown < chars.length && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button className="mini" onClick={() => setShown(shown + PAGE * 2)}>
                  Mostrar mas ({nf.format(chars.length - shown)} restantes)
                </button>
              </div>
            )}
            <p className="hint" style={{ marginTop: 14, marginBottom: 0 }}>
              Los {nf.format(perfiles.length)} personajes de la plantilla, con sus estadisticas
              base a nivel 90 calculadas desde las curvas reales del juego. Cualquiera de ellos se
              puede elegir en el optimizador, y su tipo de arma decide que armas puede equipar.
            </p>
          </>
        )}
      </div>
      )}
    </>
  )
}

function ItemCard({ it, gameId, template }: { it: Item; gameId: string; template: GameTemplate }) {
  const setName = it.setId ? template.sets.find((s) => s.id === it.setId)?.name ?? it.setId : null
  const slotName = template.slots.find((s) => s.id === it.slot)?.name ?? it.slot
  void slotName
  const entries = Object.entries(it.stats)
  const statLabel = (k: string) => template.stats.find((s) => s.id === k)?.name ?? k
  const unit = (k: string) => (template.stats.find((s) => s.id === k)?.unit === 'percent' ? '%' : '')
  const main = entries[0]
  const subs = entries.slice(1)
  return (
    <div className="invcard">
      <Icon src={itemIcon(gameId, it)} alt={setName ?? it.name} rarity={itemRarity(it)} size={48} />
      <div className="meta">
        <div className="t">{setName ?? it.name}</div>
        {main && (
          <div className="m">
            {statLabel(main[0])} {main[1].toFixed(1)}{unit(main[0])}
            {it.level !== undefined && <span style={{ color: 'var(--dim)' }}> · +{it.level}</span>}
          </div>
        )}
        {subs.length > 0 && (
          <div className="subs">
            {subs.map(([k, v]) => `${statLabel(k)} ${v.toFixed(1)}${unit(k)}`).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
