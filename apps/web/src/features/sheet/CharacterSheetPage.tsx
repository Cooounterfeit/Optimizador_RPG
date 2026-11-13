import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { currentLevel } from '@zenith/core-engine';
import type { Equipment, Item } from '@zenith/shared-types';

import { Button, buttonVariants } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { EmptyState } from '../catalog/components/EmptyState';
import { CharacterPickerDialog } from '../game/CharacterPicker';
import { useEquipment } from '../game/useEquipment';
import { useGame } from '../game/useGame';
import { useProfileBase } from '../game/useProfileBase';
import { useInventory } from '../inventory/useInventory';
import { LevelHistoryPanel } from '../optimizer/LevelHistoryPanel';
import { buildSolveRequest } from '../optimizer/request';
import { useOptimizer } from '../optimizer/useOptimizer';
import { useSkillSelection } from '../skills/useSkillSelection';
import { EquipmentDoll } from './EquipmentDoll';
import { SheetStats } from './SheetStats';
import { SlotPicker } from './SlotPicker';
import { sheetCopy } from './copy';

/** Lista vacia estable: `inventory.items ?? []` crearia un array nuevo en cada render. */
const NO_ITEMS: Item[] = [];

type Tab = 'equipment' | 'levels';

/**
 * Hoja de personaje: vestir por ranura y ver como rinde. Es la version nueva de
 * `demo/src/views/CharacterView.tsx`.
 *
 * Guarda solo decisiones (ranuras, base del perfil, habilidades, historial); los
 * numeros salen de `evaluar` en cada cambio. La evaluacion corre en el worker de
 * `useOptimizer`, con un worker propio: mirar la hoja no corta una busqueda.
 */
export function CharacterSheetPage() {
  const { id = '' } = useParams();
  const { state, retry } = useGame(id);
  const template = state.status === 'ready' ? state.template : undefined;
  const inventory = useInventory(template?.gameId);
  const inventoryForGame =
    template && inventory.loadedFor === template.gameId ? inventory.items : null;
  const { selection: skillSelection } = useSkillSelection(template);

  const [profileId, setProfileId] = useState('');
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('equipment');
  const [saveError, setSaveError] = useState<string | null>(null);

  const { evaluation, evaluationError, evaluating, evaluate } = useOptimizer();

  const templateProfile =
    template?.baseProfiles.find((entry) => entry.id === profileId) ?? template?.baseProfiles[0];
  const {
    base: profileBase,
    save: saveProfileBase,
    ready: profileBaseReady,
  } = useProfileBase(template?.gameId, templateProfile);
  const {
    equipment,
    save: saveEquipment,
    ready: equipmentReady,
  } = useEquipment(template?.gameId, templateProfile?.id, inventoryForGame);

  /**
   * El perfil con la base efectiva del jugador (nivel subido incluido), no la
   * publicada en la plantilla. Es la misma que viaja al motor: si la hoja
   * mostrara la de la plantilla, el nivel y los numeros se contradirian.
   */
  const profile = templateProfile ? { ...templateProfile, base: profileBase } : undefined;

  const items = inventory.items ?? NO_ITEMS;
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  useEffect(() => {
    setProfileId('');
    setOpenSlot(null);
    setPickerOpen(false);
    setTab('equipment');
    setSaveError(null);
  }, [id]);

  const request = useMemo(() => {
    if (!template || !templateProfile || !profileBaseReady) return null;
    return buildSolveRequest({
      template,
      profileId: templateProfile.id,
      profileBase,
      items,
      objectiveId: template.objectives[0]?.id ?? '',
      constraints: [],
      skills: skillSelection,
    });
  }, [template, templateProfile, profileBaseReady, profileBase, items, skillSelection]);

  useEffect(() => {
    if (!request || !equipmentReady) return;
    evaluate(request, equipment);
  }, [request, equipment, equipmentReady, evaluate]);

  if (state.status === 'loading') {
    return (
      <p className="px-6 py-24 text-center text-sm text-muted-foreground">{sheetCopy.loading}</p>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={sheetCopy.errorTitle} body={state.message}>
          <Button variant="outline" onClick={retry}>
            {sheetCopy.retry}
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!template) return null;

  if (!template.baseProfiles.length) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={sheetCopy.eyebrow} body={sheetCopy.noProfiles} />
      </div>
    );
  }

  if (!profile) return null;

  const level = currentLevel(template, profile);
  const openSlotDef = template.slots.find((slot) => slot.id === openSlot);
  const picked = openSlotDef
    ? items.filter(
        (item) => item.slot === openSlotDef.id || item.slots?.includes(openSlotDef.id),
      )
    : [];
  const save = async (next: Equipment) => {
    setOpenSlot(null);
    setSaveError(null);
    try {
      await saveEquipment(next);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : sheetCopy.saveFailed);
    }
  };

  const pick = (slotId: string, itemId: string) => {
    const next: Equipment = { ...equipment };
    if (!itemId) {
      delete next[slotId];
    } else {
      for (const slot of template.slots) {
        if (slot.id !== slotId && next[slot.id] === itemId) delete next[slot.id];
      }
      next[slotId] = itemId;
    }
    void save(next);
  };

  return (
    <div className="mx-auto max-w-[1080px] px-6 pb-20 pt-6 max-[860px]:px-4">
      <Link
        to={`/optimizer/${id}`}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span>
        {sheetCopy.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <p className="label-caps m-0">{sheetCopy.eyebrow}</p>
        <Link
          to={`/optimizer/${id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {sheetCopy.findBest}
        </Link>
      </div>

      <div role="tablist" aria-label={sheetCopy.tabs.label} className="mt-4 flex gap-5 border-b border-line">
        {(
          [
            ['equipment', sheetCopy.tabs.equipment],
            ['levels', sheetCopy.tabs.levels],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            aria-controls={`sheet-panel-${key}`}
            className={cn(
              'border-b-2 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
              tab === key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {inventoryForGame !== null && inventoryForGame.length === 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-dashed border-line-strong px-4 py-3">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-semibold">{sheetCopy.emptyInventoryTitle}</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-muted-foreground">
              {sheetCopy.emptyInventoryBody}
            </p>
          </div>
          <Link
            to={`/optimizer/${id}/inventario`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {sheetCopy.openInventory}
          </Link>
        </div>
      ) : null}

      {tab === 'equipment' ? (
        <div
          id="sheet-panel-equipment"
          role="tabpanel"
          aria-label={sheetCopy.tabs.equipment}
          className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"
        >
          <div className="min-w-0">
            <EquipmentDoll
              template={template}
              profile={profile}
              level={level}
              equipment={equipment}
              itemsById={itemsById}
              openSlot={openSlot}
              disabled={!equipmentReady}
              onOpenSlot={(slotId) => setOpenSlot((current) => (current === slotId ? null : slotId))}
              onOpenPicker={() => setPickerOpen(true)}
              onRemoveAll={() => void save({})}
            />
            {openSlotDef ? (
              <SlotPicker
                template={template}
                slot={openSlotDef}
                items={picked}
                equipment={equipment}
                onPick={(itemId) => pick(openSlotDef.id, itemId)}
                onClose={() => setOpenSlot(null)}
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <SheetStats
              template={template}
              profile={profile}
              equipment={equipment}
              itemsById={itemsById}
              evaluation={evaluation}
              evaluating={evaluating}
              error={evaluationError ?? saveError}
            />
            {template.objectives.length === 0 ? (
              <p className="mt-3 text-[11.5px] text-muted-foreground">{sheetCopy.noObjectives}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          id="sheet-panel-levels"
          role="tabpanel"
          aria-label={sheetCopy.tabs.levels}
          className="mt-4"
        >
          <LevelHistoryPanel
            template={template}
            profile={profile}
            onLevelUp={async (base) => {
              await saveProfileBase(base);
            }}
          />
        </div>
      )}

      <CharacterPickerDialog
        template={template}
        currentId={profile.id}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(next) => {
          setProfileId(next);
          setOpenSlot(null);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
