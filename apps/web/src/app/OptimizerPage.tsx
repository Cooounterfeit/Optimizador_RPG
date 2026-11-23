import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BuildResult, Constraint, Equipment, Item, SolveRequest } from '@zenith/shared-types';

import { CharacterPickerDialog } from '../features/game/CharacterPicker';
import { gameCopy } from '../features/game/copy';
import { getInventoryRepository } from '../features/game/repositories';
import { useEquipment } from '../features/game/useEquipment';
import { useProfileBase } from '../features/game/useProfileBase';
import { buildSolveRequest } from '../features/optimizer/request';
import { equippedBuild, hasEquipped } from '../features/optimizer/equipped-build';
import { skillPoints } from '../features/optimizer/skill-points';
import { useOptimizer } from '../features/optimizer/useOptimizer';
import { SetupBar } from '../features/optimizer/cockpit/SetupBar';
import { SetupSheet } from '../features/optimizer/cockpit/SetupSheet';
import {
  EmptyInventoryPanel,
  RunningPanel,
  TemplateGapPanel,
} from '../features/optimizer/cockpit/ResultStates';
import { OptimizerResult } from '../features/optimizer/OptimizerResult';
import { useOptimizerWorkspace } from '../features/optimizer/workspace/OptimizerWorkspaceProvider';

/** Lista vacia estable: `inventory.items ?? []` crearia un array nuevo en cada render. */
const NO_ITEMS: Item[] = [];

const DEFAULT_RESULTS = '5';

const clampResults = (raw: string): number => {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(1, value));
};

/**
 * Seccion Optimize: la barra de setup pegada arriba y la lista de resultados.
 * Todo lo que se decide cabe en la barra; la hoja esconde lo que se edita poco
 * (personaje, equipo puesto y reglas completas).
 */
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
  const [resultsCount, setResultsCount] = useState(DEFAULT_RESULTS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusBlock, setFocusBlock] = useState<'character' | 'constraints' | null>(null);
  const {
    phase,
    progress,
    result,
    ranFor,
    error: optimizerError,
    evaluation,
    evaluationError,
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

  const topN = clampResults(resultsCount);

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
      topN,
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
    topN,
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
   * recien lanzada (los avisos de escritura llegan con retraso).
   */
  const inventoryKey = useMemo(
    () => JSON.stringify(inventory.items ?? []),
    [inventory.items],
  );
  useEffect(() => {
    reset();
  }, [profileId, objectiveId, constraints, inventoryKey, topN, reset]);

  /**
   * "Mi build" se evalua sola cuando cambia el equipo, el perfil, el objetivo, la
   * base o el inventario. No se guardan sus numeros: se recalculan con las reglas
   * vigentes, igual que los del optimizador.
   */
  useEffect(() => {
    if (!equipmentReady) return;
    if (!hasEquipped(equipment)) return;
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
  const inventoryLoaded = inventory.items !== null;
  const templateGap =
    template.baseProfiles.length === 0 || template.objectives.length === 0;
  const canRun =
    items.length > 0 &&
    inventoryLoaded &&
    !loadingSamples &&
    profileBaseReady &&
    Boolean(profile) &&
    Boolean(objective) &&
    phase !== 'running';

  const equipped =
    hasEquipped(equipment) && objective
      ? equippedBuild(template, equipment, evaluation, objective.id)
      : null;

  const points =
    template.skillTrees && template.skillTrees.length > 0
      ? skillPoints(template, skillSelection)
      : undefined;

  const deadlineMs = (): number | undefined => {
    const seconds = Number.parseInt(deadlineSeconds, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
  };

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

  const start = (nextConstraints: Constraint[] = constraints) => {
    if (!template || !templateProfile || !profileBaseReady) return;
    setSheetOpen(false);
    setFocusBlock(null);
    const request = buildSolveRequest({
      template,
      profileId: templateProfile.id,
      profileBase,
      items,
      objectiveId,
      constraints: nextConstraints,
      skills: skillSelection,
      topN,
    });
    if (!request) return;
    run(request, deadlineMs());
  };

  const openSheet = (block: 'character' | 'constraints') => {
    setSheetOpen(true);
    setFocusBlock(block);
  };

  return (
    <div className="mx-auto max-w-[1560px] px-4 pb-10 pt-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 pb-2">
        <p className="label-caps m-0">{gameCopy.eyebrow}</p>
        <h1 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">{template.name}</h1>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {template.slots.length} slots · {template.sets.length} sets
        </span>
      </header>

      <SetupBar
        id={id}
        template={template}
        profile={profile}
        objectiveId={objective?.id ?? ''}
        onObjective={setObjectiveId}
        constraints={constraints}
        onConstraints={setConstraints}
        skills={points}
        resultsCount={resultsCount}
        onResultsCount={setResultsCount}
        deadlineSeconds={deadlineSeconds}
        onDeadlineSeconds={setDeadlineSeconds}
        running={phase === 'running'}
        canRun={canRun}
        onRun={() => start()}
        onStop={cancel}
        sheetOpen={sheetOpen}
        onToggleSheet={() => {
          setFocusBlock(null);
          setSheetOpen((current) => !current);
        }}
        onOpenSheet={openSheet}
      />

      <SetupSheet
        id={id}
        template={template}
        profile={profile}
        open={sheetOpen}
        focusBlock={focusBlock}
        objectiveId={objective?.id ?? ''}
        onObjective={setObjectiveId}
        constraints={constraints}
        onConstraints={setConstraints}
        equipment={equipment}
        items={items}
        equipmentReady={equipmentReady}
        evaluation={evaluation}
        skillsSelection={points ? skillSelection : undefined}
        skillPoints={points}
        running={phase === 'running'}
        onChangeCharacter={() => setPickerOpen(true)}
        onSaveBase={async (base) => {
          try {
            await saveProfileBase(base);
          } finally {
            reset();
          }
        }}
      />

      <div className="mt-2 flex min-w-0 flex-col gap-2.5">
        {optimizerError ? (
          <p
            role="alert"
            className="rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12px] text-[oklch(0.78_0.16_25)]"
          >
            {optimizerError}
          </p>
        ) : null}
        {equipError ? (
          <p
            role="alert"
            className="rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12px] text-[oklch(0.78_0.16_25)]"
          >
            {equipError}
          </p>
        ) : null}
        {phase === 'cancelled' ? (
          <p
            role="status"
            className="rounded-[2px] border border-line px-3 py-2 text-[12px] text-muted-foreground"
          >
            {gameCopy.cockpit.cancelled}
          </p>
        ) : null}
        {evaluationError ? (
          <p role="status" className="text-[12px] text-muted-foreground">
            {evaluationError}
          </p>
        ) : null}

        {templateGap ? (
          <TemplateGapPanel
            missingProfiles={template.baseProfiles.length === 0}
            missingObjectives={template.objectives.length === 0}
          />
        ) : phase === 'running' ? (
          <RunningPanel
            progress={progress}
            totalCombinations={result?.stats.totalCombinations}
            onStop={cancel}
          />
        ) : !inventoryLoaded ? (
          <p className="px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {gameCopy.loading}
          </p>
        ) : items.length === 0 ? (
          <EmptyInventoryPanel
            id={id}
            canLoadSamples={sampleItems.length > 0}
            loadingSamples={loadingSamples}
            onLoadSamples={() => void loadSamples()}
          />
        ) : result && resultObjective ? (
          <OptimizerResult
            template={template}
            objective={resultObjective}
            result={result}
            items={items}
            equipment={equipment}
            onEquip={(build) => void equip(build)}
            equipped={equipped}
            constraints={ranFor?.constraints}
            profileName={profile?.name}
            expected={ranFor?.topN ?? topN}
            onRunWithoutConstraints={
              ranFor && (ranFor.constraints?.length ?? 0) > 0
                ? () => start([])
                : undefined
            }
            onEditConstraints={() => openSheet('constraints')}
          />
        ) : equipped && objective ? (
          <OptimizerResult
            template={template}
            objective={objective}
            items={items}
            equipment={equipment}
            onEquip={(build) => void equip(build)}
            equipped={equipped}
            profileName={profile?.name}
          />
        ) : (
          <section className="rounded-[4px] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
                {gameCopy.cockpit.bestBuilds}
              </h2>
            </div>
            <p className="mt-2 max-w-[62ch] text-[12.5px] text-muted-foreground">
              {gameCopy.cockpit.runToSee}
            </p>
          </section>
        )}
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
