import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { currentLevel } from '@zenith/core-engine';
import type { BuildResult, Constraint, Equipment, Item, SolveRequest } from '@zenith/shared-types';

import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';
import { CharacterPickerDialog } from '../features/game/CharacterPicker';
import { gameCopy } from '../features/game/copy';
import { useEquipment } from '../features/game/useEquipment';
import { useProfileBase } from '../features/game/useProfileBase';
import { ItemGlyph } from '../features/inventory/ItemGlyph';
import { inventoryCopy } from '../features/inventory/copy';
import { getInventoryRepository } from '../features/game/repositories';
import { ConstraintEditor } from '../features/optimizer/ConstraintEditor';
import { CurrentBuildPanel } from '../features/optimizer/CurrentBuildPanel';
import { LevelHistoryPanel } from '../features/optimizer/LevelHistoryPanel';
import { OptimizerResult } from '../features/optimizer/OptimizerResult';
import { buildSolveRequest } from '../features/optimizer/request';
import { StatsPanel } from '../features/optimizer/StatsPanel';
import { useOptimizer } from '../features/optimizer/useOptimizer';
import { useOptimizerWorkspace } from '../features/optimizer/workspace/OptimizerWorkspaceProvider';
import { itemIconUrls, characterIconUrls, characterRarityOf } from '../lib/images';

/** Lista vacia estable: `inventory.items ?? []` crearia un array nuevo en cada render. */
const NO_ITEMS: Item[] = [];

export function OptimizerPage() {
  const { id, template, sampleItems, inventory, skills } = useOptimizerWorkspace();
  const inventoryForGame =
    template && inventory.loadedFor === template.gameId ? inventory.items : null;
  const { selection: skillSelection } = skills;
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [objectiveId, setObjectiveId] = useState('');
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [deadlineSeconds, setDeadlineSeconds] = useState('0');
  const {
    phase,
    progress,
    result,
    ranFor,
    error: optimizerError,
    evaluation,
    evaluationError,
    evaluating,
    run,
    evaluate,
    cancel,
    reset,
  } = useOptimizer();

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
  const [equipError, setEquipError] = useState<string | null>(null);

  /**
   * Peticion al motor con el estado completo del jugador. La usan la busqueda y
   * la evaluacion de la build actual: asi lo que se ve y lo que se calcula
   * salen del mismo sitio.
   */
  const buildRequest = useCallback((): SolveRequest | null => {
    if (!template || !templateProfile || !profileBaseReady) return null;

    return buildSolveRequest({
      template,
      profileId: templateProfile.id,
      profileBase,
      items: inventory.items ?? NO_ITEMS,
      objectiveId,
      constraints,
      skills: skillSelection,
      topN: 3,
    });
  }, [
    template,
    templateProfile,
    profileBaseReady,
    profileBase,
    objectiveId,
    inventory.items,
    constraints,
    skillSelection,
  ]);

  useEffect(() => {
    setProfileId('');
    setObjectiveId('');
    setConstraints([]);
    reset();
  }, [id, reset]);

  /**
   * El resultado pertenece a la peticion que lo produjo. Si cambia cualquiera de
   * las entradas de la busqueda, se descarta: mostrar el podio viejo junto a un
   * objetivo o un inventario nuevos es justo el bug de coherencia que se cierra.
   *
   * El inventario se compara por su contenido serializado (incluye stats y
   * nivel), no por identidad del array ni solo por ids: un objeto editado con el
   * mismo id tambien invalida. Cada `reload()` devuelve un array nuevo aunque
   * los objetos sean los mismos, y resetear en cada uno mataria una busqueda
   * recien lanzada (los avisos de escritura llegan con retraso). `profileBase` tampoco entra: su identidad
   * cambia al resolver Dexie; la carga la cubre el gate `ready` y la subida de
   * nivel se invalida en `onLevelUp`.
   */
  const inventoryKey = useMemo(
    () => JSON.stringify(inventory.items ?? []),
    [inventory.items],
  );
  useEffect(() => {
    reset();
  }, [profileId, objectiveId, constraints, inventoryKey, reset]);

  /**
   * "Mi build" se evalua sola cuando cambia el equipo, el perfil, el objetivo, la
   * base o el inventario. No se guardan sus numeros: se recalculan con las reglas
   * vigentes, igual que los del optimizador.
   */
  useEffect(() => {
    if (!equipmentReady) return;
    const hasEquipped = Object.values(equipment).some((itemId) => itemId !== '');
    if (!hasEquipped) return;
    const request = buildRequest();
    if (!request) return;
    evaluate(request, equipment);
  }, [equipment, equipmentReady, buildRequest, evaluate]);

  if (!template) return null;

  const profile = templateProfile ? { ...templateProfile, base: profileBase } : undefined;
  const objective =
    template.objectives.find((entry) => entry.id === objectiveId) ?? template.objectives[0];
  const resultObjective = ranFor
    ? template.objectives.find((entry) => entry.id === ranFor.objectiveId)
    : undefined;

  const items = inventory.items ?? NO_ITEMS;
  const canRun =
    items.length > 0 &&
    !loadingSamples &&
    profileBaseReady &&
    Boolean(profile) &&
    Boolean(objective) &&
    phase !== 'running';

  /** Puntaje de la mejor build para el objetivo que se esta mirando. */
  const bestScore =
    result && resultObjective && resultObjective.id === objective?.id
      ? result.builds[0]?.score
      : undefined;

  /** Traduce las piezas de la build a ranuras y las guarda como equipo puesto. */
  const equip = async (build: BuildResult) => {
    if (!template || !profile) return;
    const slots: Equipment = {};
    template.slots.forEach((slot, index) => {
      slots[slot.id] = build.itemIds[index] ?? '';
    });

    setEquipError(null);
    try {
      await saveEquipment(slots);
    } catch (cause) {
      setEquipError(cause instanceof Error ? cause.message : gameCopy.cockpit.equipFailed);
    }
  };

  const loadSamples = async () => {
    if (!template || sampleItems.length === 0) return;
    setLoadingSamples(true);
    try {
      for (const item of sampleItems) {
        await getInventoryRepository().addItem(item, template.gameId);
      }
      await inventory.reload();
    } finally {
      setLoadingSamples(false);
    }
  };

  const start = () => {
    const request = buildRequest();
    if (!request) return;
    const seconds = Number.parseInt(deadlineSeconds, 10);
    run(request, Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-6 max-[860px]:px-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-4">
        <p className="label-caps m-0">{gameCopy.eyebrow}</p>
        <h1 className="m-0 text-lg font-extrabold tracking-[-0.02em]">{template.name}</h1>
        {templateProfile ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {templateProfile.name}
          </span>
        ) : null}
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">01 · {gameCopy.cockpit.character}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.characterHint}</p>
            {profile ? (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setPickerOpen(true)}
                className="group mt-3 flex w-full items-center gap-3 rounded-[2px] border border-line bg-background px-2.5 py-2 text-start transition-colors hover:border-line-strong focus-visible:border-line-strong"
              >
                <ItemGlyph
                  name={profile.name}
                  rarity={template.assets ? characterRarityOf(template.assets, profile) : undefined}
                  sources={template.assets ? characterIconUrls(template.assets, profile) : []}
                  className="h-10 w-10 text-[12px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{profile.name}</span>
                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    {currentLevel(template, profile) === null
                      ? gameCopy.cockpit.noLevel
                      : `${gameCopy.cockpit.level} ${currentLevel(template, profile)}`}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:text-foreground">
                  {gameCopy.cockpit.changeCharacter}
                </span>
              </button>
            ) : null}
          </section>

          {profile ? (
            <StatsPanel
              template={template}
              profile={profile}
              onSaveBase={async (base) => {
                try {
                  await saveProfileBase(base);
                } finally {
                  reset();
                }
              }}
            />
          ) : null}

          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">02 · {gameCopy.cockpit.objective}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.objectiveHint}</p>
            <div className="mt-3 flex flex-col gap-1" role="radiogroup" aria-label={gameCopy.cockpit.objective}>
              {template.objectives.map((entry) => {
                const active = entry.id === objective?.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setObjectiveId(entry.id)}
                    className={cn(
                      'rounded-[3px] border px-3 py-2 text-left transition-colors duration-150',
                      active
                        ? 'border-foreground bg-raised'
                        : 'border-transparent hover:border-line hover:bg-raised',
                    )}
                  >
                    <span className="block text-[13px] font-semibold leading-snug">{entry.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {entry.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">03 · {gameCopy.cockpit.constraints}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.constraintsHint}</p>
            <ConstraintEditor
              template={template}
              constraints={constraints}
              onChange={setConstraints}
            />
          </section>

          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">04 · {gameCopy.cockpit.timeLimit}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.timeLimitHint}</p>
            <label className="sr-only" htmlFor="optimizer-deadline">
              {gameCopy.cockpit.timeLimit}
            </label>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="optimizer-deadline"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="h-10 w-24 rounded-[2px] border border-line bg-background px-3 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-60"
                value={deadlineSeconds}
                disabled={phase === 'running'}
                onChange={(event) => {
                  const next = event.target.value;
                  if (/^\d*$/.test(next)) setDeadlineSeconds(next);
                }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {gameCopy.cockpit.timeUnit}
              </span>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[4px] border border-line bg-surface p-5">
            <p className="label-caps">{gameCopy.cockpit.ready}</p>
            <p className="mt-1 max-w-[60ch] text-[13px] text-muted-foreground">
              {gameCopy.cockpit.readyBody}
            </p>

            <ol className="mt-5 flex flex-col gap-3">
              {gameCopy.cockpit.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="w-6 shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold leading-snug">{step.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {template.baseProfiles.length === 0 || template.objectives.length === 0 ? (
              <div className="mt-4 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted-foreground">
                {template.baseProfiles.length === 0 ? (
                  <p className="m-0">{gameCopy.cockpit.missingProfiles}</p>
                ) : null}
                {template.objectives.length === 0 ? (
                  <p className="m-0 mt-1">{gameCopy.cockpit.missingObjectives}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {phase === 'running' ? (
                <Button variant="outline" onClick={cancel}>
                  {gameCopy.cockpit.stop}
                </Button>
              ) : (
                <Button onClick={start} disabled={!canRun}>
                  {gameCopy.cockpit.optimize}
                </Button>
              )}
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {phase === 'running' ? gameCopy.cockpit.running : gameCopy.cockpit.optimizeNote}
              </span>
            </div>

            {phase === 'running' ? (
              <div className="mt-3 rounded-[2px] border border-line px-3 py-2">
                <p className="m-0 font-mono text-[10.5px] text-muted-foreground">
                  {progress
                    ? `${progress.evaluated.toLocaleString('en-US')} evaluated · ${progress.pruned.toLocaleString('en-US')} pruned · ${Math.round(progress.elapsedMs / 1000)}s · ${gameCopy.cockpit.bestScore} ${progress.bestScore.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                    : gameCopy.cockpit.running}
                </p>
                <p className="m-0 mt-1 text-[11px] leading-snug text-muted-foreground">
                  {gameCopy.cockpit.stopNote}
                </p>
              </div>
            ) : null}

            {optimizerError ? (
              <p
                role="alert"
                className="mt-3 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12px] text-[oklch(0.78_0.16_25)]"
              >
                {optimizerError}
              </p>
            ) : null}

            {phase === 'cancelled' ? (
              <p
                role="status"
                className="mt-3 rounded-[2px] border border-line px-3 py-2 text-[12px] text-muted-foreground"
              >
                {gameCopy.cockpit.cancelled}
              </p>
            ) : null}

            {inventory.items !== null && items.length === 0 ? (
              <div className="mt-3 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted-foreground">
                <p className="m-0">
                  <strong className="text-foreground">{gameCopy.cockpit.emptyInventoryTitle}.</strong>{' '}
                  {gameCopy.cockpit.emptyInventoryBody}
                </p>
                {sampleItems.length > 0 ? (
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => void loadSamples()}
                    disabled={loadingSamples}
                  >
                    {loadingSamples ? inventoryCopy.loadingSamples : inventoryCopy.loadSamples}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>

          {profile && objective ? (
            <CurrentBuildPanel
              template={template}
              objective={objective}
              equipment={equipment}
              items={new Map(items.map((item) => [item.id, item]))}
              evaluation={evaluation}
              evaluating={evaluating}
              error={evaluationError ?? equipError}
              bestScore={bestScore}
              loading={!equipmentReady}
            />
          ) : null}

          {result && resultObjective ? (
            <OptimizerResult
              template={template}
              objective={resultObjective}
              result={result}
              items={items}
              equipment={equipment}
              onEquip={(build) => void equip(build)}
            />
          ) : null}

          {profile ? (
            <LevelHistoryPanel
              template={template}
              profile={profile}
              onLevelUp={async (base) => {
                try {
                  await saveProfileBase(base);
                } finally {
                  reset();
                }
              }}
            />
          ) : null}

          <section className="rounded-[4px] border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label-caps">{gameCopy.cockpit.inventory}</p>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {inventory.items === null ? '…' : gameCopy.cockpit.items(items.length)}
              </span>
            </div>

            {inventory.items === null ? (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {gameCopy.loading}
              </p>
            ) : items.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                {gameCopy.cockpit.inventoryEmpty}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0">
                    <ItemGlyph
                      name={item.name}
                      rarity={item.rarity}
                      sources={itemIconUrls(template.assets, item)}
                      className="h-9 w-9 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{item.name}</p>
                      <p className="truncate font-mono text-[9.5px] text-muted-foreground">
                        {template.slots.find((slot) => slot.id === item.slot)?.name ?? item.slot}
                        {item.level !== undefined ? ` · Lv. ${item.level}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link
                to={`/optimizer/${id}/inventario`}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {gameCopy.viewAllItems} →
              </Link>
              <Link
                to={`/optimizer/${id}/inventario?tab=catalog`}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {gameCopy.browseCatalog} →
              </Link>
            </div>
          </section>
        </div>
      </div>

      {profile ? (
        <CharacterPickerDialog
          template={template}
          currentId={profile.id}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(nextId) => {
            setProfileId(nextId);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
