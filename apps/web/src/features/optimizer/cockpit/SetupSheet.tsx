import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import type { Evaluacion } from '@zenith/core-engine';
import type {
  BaseProfile,
  Constraint,
  Equipment,
  GameTemplate,
  Item,
  SkillSelection,
} from '@zenith/shared-types';

import { gameCopy } from '../../game/copy';
import { ItemGlyph } from '../../inventory/ItemGlyph';
import { ItemHoverCard } from '../../inventory/ItemHoverCard';
import { itemIconUrls } from '../../../lib/images';
import { CharacterPanel } from '../CharacterPanel';
import { ConstraintEditor } from '../ConstraintEditor';
import { formatStat } from '../stat-format';
import type { SkillPoints } from '../skill-points';

interface SetupSheetProps {
  id: string;
  template: GameTemplate;
  profile: (BaseProfile & { base: Record<string, number> }) | undefined;
  open: boolean;
  focusBlock: 'character' | 'constraints' | null;
  objectiveId: string;
  onObjective: (id: string) => void;
  constraints: Constraint[];
  onConstraints: (next: Constraint[]) => void;
  equipment: Equipment;
  items: Item[];
  equipmentReady: boolean;
  evaluation: Evaluacion | null;
  skillsSelection: SkillSelection | undefined;
  skillPoints: SkillPoints | undefined;
  running: boolean;
  onChangeCharacter: () => void;
  onSaveBase: (base: Record<string, number>) => Promise<void> | void;
}

/**
 * Hoja de setup: los tres bloques que no se editan a diario (personaje, equipo
 * puesto y reglas completas). Se abre desde la barra y crece hacia abajo; en
 * pantallas altas scrollea sola para no empujar la lista fuera de vista.
 */
export function SetupSheet({
  id,
  template,
  profile,
  open,
  focusBlock,
  objectiveId,
  onObjective,
  constraints,
  onConstraints,
  equipment,
  items,
  equipmentReady,
  evaluation,
  skillsSelection,
  skillPoints,
  running,
  onChangeCharacter,
  onSaveBase,
}: SetupSheetProps) {
  const character = useRef<HTMLDivElement | null>(null);
  const constraintsBlock = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !focusBlock) return;
    const target = focusBlock === 'character' ? character.current : constraintsBlock.current;
    target?.focus();
  }, [open, focusBlock]);

  const byId = new Map(items.map((item) => [item.id, item]));
  const pieces = template.slots.map((slot) => ({ slot, item: byId.get(equipment[slot.id] ?? '') }));
  const equippedCount = pieces.filter(({ item }) => item !== undefined).length;
  const objective =
    template.objectives.find((entry) => entry.id === objectiveId) ?? template.objectives[0];
  const nodes = (template.skillTrees ?? []).flatMap((tree) => tree.nodes);
  const chosen = Object.entries(skillsSelection ?? {})
    .filter(([, rank]) => rank > 0)
    .map(([nodeId, rank]) => {
      const node = nodes.find((entry) => entry.id === nodeId);
      return node ? { node, rank } : null;
    })
    .filter((entry): entry is { node: (typeof nodes)[number]; rank: number } => entry !== null);

  return (
    <div
      id="setup-sheet"
      className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        {open ? (
          <div className="grid gap-2.5 border-x border-b border-line bg-background p-2.5 rounded-b-[4px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:max-h-[min(54dvh,470px)] lg:overflow-y-auto">
          <div
            ref={character}
            id="setup-character"
            tabIndex={-1}
            className="min-w-0 rounded-[4px] border border-line bg-surface p-3.5 outline-none"
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.character}</span>
              <span className="label-caps">{gameCopy.cockpit.baseStats}</span>
            </div>

            {profile ? (
              <CharacterPanel
                template={template}
                profile={profile}
                onChangeCharacter={onChangeCharacter}
                onSaveBase={onSaveBase}
              />
            ) : null}
          </div>

          <div className="min-w-0 rounded-[4px] border border-line bg-surface p-3.5">
            <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.currentBuildTitle}</span>
              <span className="label-caps">
                {gameCopy.cockpit.currentBuildPieces(
                  equippedCount,
                  evaluation?.conjuntos.length ?? 0,
                )}
              </span>
            </div>

            {!equipmentReady ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {gameCopy.loading}
              </p>
            ) : equippedCount === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                {gameCopy.cockpit.nothingEquipped}{' '}
                <Link
                  to={`/optimizer/${id}/personaje`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {gameCopy.cockpit.equipPieces}
                </Link>
              </p>
            ) : (
              <div className="grid gap-2 min-[1241px]:grid-cols-2">
                {pieces.map(({ slot, item }) => (
                  <ItemHoverCard
                    key={slot.id}
                    as="div"
                    className="flex items-center gap-2.5 rounded-[2px] border border-line bg-background px-2.5 py-2"
                    template={template}
                    item={item}
                  >
                    <ItemGlyph
                      name={item?.name ?? slot.name}
                      rarity={item?.rarity}
                      sources={item ? itemIconUrls(template.assets, item) : []}
                      className="h-7 w-7 text-[8px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[12px] font-semibold leading-tight">
                        {item?.name ?? gameCopy.cockpit.emptySlot}
                      </p>
                      <p className="m-0 truncate font-mono text-[8.5px] uppercase tracking-[0.04em] text-muted-foreground">
                        {slot.name}
                        {item?.level === undefined ? '' : ` · Lv. ${item.level}`}
                      </p>
                    </div>
                    {item ? (
                      <span className="shrink-0 font-mono text-[10px] leading-tight text-muted-foreground">
                        {Object.entries(item.stats)
                          .slice(0, 2)
                          .map(([statId, value]) => (
                            <b key={statId} className="block font-normal text-foreground">
                              {formatStat(
                                value,
                                template.stats.find((stat) => stat.id === statId),
                              )}{' '}
                              {template.stats.find((stat) => stat.id === statId)?.name ?? statId}
                            </b>
                          ))}
                      </span>
                    ) : null}
                  </ItemHoverCard>
                ))}
              </div>
            )}

            {template.skillTrees && template.skillTrees.length > 0 ? (
              <>
                <div className="my-3 h-px bg-line" aria-hidden="true" />
                <div className="mb-2 flex items-baseline justify-between gap-2.5">
                  <span className="label-caps">{gameCopy.cockpit.skills}</span>
                  <Link
                    to={`/optimizer/${id}/habilidades`}
                    className="text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {gameCopy.cockpit.editSkills}
                  </Link>
                </div>

                {chosen.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">{gameCopy.cockpit.noSkills}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {chosen.map(({ node, rank }) => (
                      <span
                        key={node.id}
                        className="inline-flex h-[26px] items-center gap-1.5 rounded-[2px] border border-line bg-background px-2 text-[11.5px]"
                      >
                        {node.name}
                        <span className="font-mono text-[9.5px] text-muted-foreground">
                          {rank}/{Math.max(1, Math.floor(node.maxRank ?? 1))}
                        </span>
                      </span>
                    ))}
                    {skillPoints?.free ? (
                      <span className="inline-flex h-[26px] items-center rounded-[2px] border border-dashed border-line-strong px-2 text-[11.5px] text-muted-foreground">
                        {gameCopy.cockpit.freePoints(skillPoints.free)}
                      </span>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div
            ref={constraintsBlock}
            id="setup-constraints"
            tabIndex={-1}
            className="min-w-0 rounded-[4px] border border-line bg-surface p-3.5 outline-none lg:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex flex-col gap-1">
                <span className="label-caps">{gameCopy.cockpit.target}</span>
                {template.objectives.length > 1 ? (
                  <select
                    aria-label={gameCopy.cockpit.target}
                    className="h-7 min-w-[176px] rounded-[2px] border border-line bg-background px-2 text-[12.5px] font-semibold text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-60"
                    value={objective?.id ?? ''}
                    disabled={running}
                    onChange={(event) => onObjective(event.target.value)}
                  >
                    {template.objectives.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex h-7 items-center text-[12.5px] font-semibold">
                    {objective?.name ?? '—'}
                  </span>
                )}
              </div>

              <span className="hidden w-px self-stretch bg-line min-[861px]:block" aria-hidden="true" />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="label-caps">{gameCopy.cockpit.constraints}</span>
                <ConstraintEditor
                  template={template}
                  constraints={constraints}
                  onChange={onConstraints}
                />
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
