import { useMemo, useRef, useState, type PointerEvent } from 'react';

import {
  canLower,
  canRaise,
  costOf,
  indexSkills,
  maxRankOf,
  pointsSpent,
} from '@zenith/core-engine';
import type { GameTemplate, SkillNode, SkillSelection, SkillTreeDef } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { skillIconUrls } from '../../lib/images';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { skillCopy } from './copy';
import { effectText } from './skillText';

const NODE_W = 200;
const NODE_H = 108;
const NODE_SCALE = 0.9;
const PAD = 16;
const COL_W = 246;

interface Placed {
  node: SkillNode;
  x: number;
  y: number;
}

interface PositionedLayout {
  placed: Placed[];
  width: number;
  height: number;
}

const warnClass = 'text-[oklch(0.78_0.16_25)]';

const depthOf = (tree: SkillTreeDef, template: GameTemplate): Map<string, number> => {
  const ix = indexSkills(template);
  const memo = new Map<string, number>();

  const visit = (id: string, stack: Set<string>): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const node = ix.node.get(id);
    if (!node || stack.has(id)) return 0;
    stack.add(id);
    const requirements = [...(node.requires ?? []), ...(node.requiresAny ?? [])].filter(
      (requirement) => ix.treeOf.get(requirement) === tree,
    );
    const depth = requirements.length
      ? Math.max(...requirements.map((requirement) => visit(requirement, stack) + 1))
      : 0;
    stack.delete(id);
    memo.set(id, depth);
    return depth;
  };

  for (const node of tree.nodes) visit(node.id, new Set());
  return memo;
};

const columnsOf = (tree: SkillTreeDef, template: GameTemplate): SkillNode[][] => {
  const depths = depthOf(tree, template);
  const columns: SkillNode[][] = [];
  for (const node of tree.nodes) {
    const depth = depths.get(node.id) ?? 0;
    (columns[depth] ??= []).push(node);
  }
  return columns.filter(Boolean);
};

const positionedLayout = (tree: SkillTreeDef): PositionedLayout | null => {
  const withPositions = tree.nodes.filter(
    (node): node is SkillNode & { x: number; y: number } =>
      node.x !== undefined && node.y !== undefined,
  );
  if (withPositions.length !== tree.nodes.length) return null;

  const minX = Math.min(...withPositions.map((node) => node.x));
  const minY = Math.min(...withPositions.map((node) => node.y));
  const placed = withPositions.map((node) => ({
    node,
    x: PAD + (node.x - minX) * NODE_SCALE,
    y: PAD + (node.y - minY) * NODE_SCALE,
  }));

  return {
    placed,
    width: Math.max(...placed.map((entry) => entry.x)) + NODE_W + PAD,
    height: Math.max(...placed.map((entry) => entry.y)) + NODE_H + PAD,
  };
};

const edgePath = (source: Placed, target: Placed): string => {
  const rightward = target.x >= source.x + NODE_W / 2;

  if (rightward) {
    const x1 = source.x + NODE_W;
    const y1 = source.y + NODE_H / 2;
    const x2 = target.x;
    const y2 = target.y + NODE_H / 2;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  }

  const x1 = source.x + NODE_W / 2;
  const y1 = source.y + NODE_H;
  const x2 = target.x + NODE_W / 2;
  const y2 = target.y;
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
};

function NodeCard({
  node,
  template,
  selection,
  onRank,
  compact = false,
}: {
  node: SkillNode;
  template: GameTemplate;
  selection: SkillSelection;
  onRank: (node: SkillNode, rank: number) => void;
  compact?: boolean;
}) {
  const rank = selection[node.id] ?? 0;
  const maxRank = maxRankOf(node);
  const raiseBlock = canRaise(template, selection, node.id);
  const lowerBlock = canLower(template, selection, node.id);
  const blocked = rank === 0 && raiseBlock !== null;
  const active = rank > 0;

  const ix = indexSkills(template);
  const nameOf = (id: string) => ix.node.get(id)?.name ?? id;
  const rules: string[] = [];
  if (node.requires?.length) rules.push(skillCopy.requiresAll(node.requires.map(nameOf).join(', ')));
  if (node.requiresAny?.length) {
    rules.push(skillCopy.requiresAnyOf(node.requiresAny.map(nameOf).join(', ')));
  }
  if (node.requiresPoints) rules.push(skillCopy.requiresPoints(node.requiresPoints));
  if (node.choiceGroup) {
    const siblings = [...ix.node.values()]
      .filter((entry) => entry.id !== node.id && entry.choiceGroup === node.choiceGroup)
      .map((entry) => entry.name);
    if (siblings.length > 0) rules.push(skillCopy.choiceWith(siblings.join(' / ')));
  }
  const effects = effectText(template, node);
  const effectLine = effects === skillCopy.noEffects ? skillCopy.mechanic : effects;
  const costLine = costOf(node) === 1 ? '' : skillCopy.cost(costOf(node));
  const tooltip = [
    node.description,
    effectLine,
    costLine,
    rules.join(' · '),
    blocked ? raiseBlock : null,
  ]
    .filter(Boolean)
    .join('\n');

  const rankButtons = (small: boolean) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={cn(
          'grid place-items-center rounded-[2px] border border-line text-[12px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-35',
          small ? 'h-6 w-6' : 'h-7 w-7',
        )}
        onClick={() => onRank(node, rank - 1)}
        disabled={Boolean(lowerBlock)}
        title={lowerBlock ?? undefined}
        aria-label={skillCopy.removeRank(node.name)}
      >
        −
      </button>
      <button
        type="button"
        className={cn(
          'grid place-items-center rounded-[2px] border border-line text-[12px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-35',
          small ? 'h-6 w-6' : 'h-7 w-7',
        )}
        onClick={() => onRank(node, rank + 1)}
        disabled={Boolean(raiseBlock)}
        title={raiseBlock ?? undefined}
        aria-label={skillCopy.addRank(node.name)}
      >
        +
      </button>
    </div>
  );

  if (compact) {
    return (
      <article
        className={cn(
          'flex h-full flex-col gap-1.5 rounded-[4px] border bg-surface p-2.5 transition-colors',
          active ? 'border-foreground' : 'border-line',
          blocked && 'border-dashed opacity-70',
          node.choiceGroup && !active && 'border-dashed',
        )}
        title={tooltip}
      >
        <div className="flex items-start gap-1.5">
          <ItemGlyph
            name={node.name}
            sources={skillIconUrls(template.assets, node)}
            className="h-6 w-6 shrink-0 text-[7px]"
          />
          <p className="line-clamp-2 flex-1 text-[11.5px] font-semibold leading-tight">{node.name}</p>
          <span className="shrink-0 rounded-[1px] border border-line px-1 py-0.5 font-mono text-[8.5px] text-muted-foreground">
            {skillCopy.rank(rank, maxRank)}
          </span>
        </div>

        <p className={cn('truncate font-mono text-[9.5px]', active ? 'text-foreground' : 'text-muted-foreground')}>
          {effectLine}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
            {[node.category, node.type].filter(Boolean).join(' · ') || 'Skill'}
          </span>
          {rankButtons(true)}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-[4px] border bg-surface p-3 transition-colors',
        active ? 'border-foreground' : 'border-line',
        blocked && 'opacity-70',
        node.choiceGroup && !active && 'border-dashed',
      )}
      title={tooltip}
    >
      <div className="flex items-start gap-2.5">
        <ItemGlyph
          name={node.name}
          sources={skillIconUrls(template.assets, node)}
          className="h-9 w-9 shrink-0 text-[8px]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug">{node.name}</p>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            {[node.category, node.type].filter(Boolean).join(' · ') || 'Skill'}
          </p>
        </div>
        <span className="shrink-0 rounded-[1px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {skillCopy.rank(rank, maxRank)}
        </span>
      </div>

      <p className={cn('font-mono text-[10.5px]', active ? 'text-foreground' : 'text-muted-foreground')}>
        {effectLine}
        {maxRank > 1 ? ` · ${skillCopy.perRank}` : ''}
      </p>

      {node.description ? (
        <p className="text-[11.5px] leading-snug text-muted-foreground">{node.description}</p>
      ) : null}

      {rules.length > 0 ? (
        <p className="font-mono text-[9.5px] leading-snug text-muted-foreground">{rules.join(' · ')}</p>
      ) : null}

      {blocked ? <p className={cn('text-[10px] leading-snug', warnClass)}>{raiseBlock}</p> : null}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          {skillCopy.cost(costOf(node))}
        </span>
        {rankButtons(false)}
      </div>
    </article>
  );
}

export function SkillTreeCanvas({
  tree,
  template,
  selection,
  onChange,
}: {
  tree: SkillTreeDef;
  template: GameTemplate;
  selection: SkillSelection;
  onChange: (next: SkillSelection) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const columns = useMemo(() => columnsOf(tree, template), [tree, template]);
  const layout = useMemo(() => positionedLayout(tree), [tree]);
  const positions = useMemo(
    () => new Map((layout?.placed ?? []).map((entry) => [entry.node.id, entry])),
    [layout],
  );

  const spent = pointsSpent(tree, selection);

  const setRank = (node: SkillNode, rank: number) => {
    const next = { ...selection };
    if (rank <= 0) delete next[node.id];
    else next[node.id] = rank;
    onChange(next);
  };

  const reset = () => {
    const next = { ...selection };
    for (const node of tree.nodes) delete next[node.id];
    onChange(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const scroller = scrollerRef.current;
    if (!drag || !scroller) return;
    scroller.scrollLeft = drag.left - (event.clientX - drag.x);
    scroller.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <section className="rounded-[4px] border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{tree.name}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {skillCopy.points(spent, tree.budget)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {layout ? (
            <>
              <button
                type="button"
                className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="w-12 text-center font-mono text-[10.5px] text-muted-foreground tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(2))))}
                aria-label="Zoom in"
              >
                +
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="h-8 rounded-[2px] border border-line px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
            onClick={reset}
          >
            {skillCopy.resetTree}
          </button>
        </div>
      </header>

      {layout ? (
        <div
          ref={scrollerRef}
          className="max-h-[70vh] overflow-auto bg-background/40"
          aria-label={`${tree.name} tree canvas`}
        >
          <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
            <div
              className="relative cursor-grab active:cursor-grabbing"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <svg
                width={layout.width}
                height={layout.height}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {layout.placed.map((entry) =>
                  [...(entry.node.requires ?? []), ...(entry.node.requiresAny ?? [])].map(
                    (requirement) => {
                      const source = positions.get(requirement);
                      if (!source) return null;
                      const active =
                        (selection[requirement] ?? 0) > 0 && (selection[entry.node.id] ?? 0) > 0;
                      return (
                        <path
                          key={`${requirement}-${entry.node.id}`}
                          d={edgePath(source, entry)}
                          fill="none"
                          stroke="currentColor"
                          className={active ? 'text-foreground' : 'text-line-strong'}
                          strokeWidth={active ? 2 : 1.5}
                        />
                      );
                    },
                  ),
                )}
              </svg>

              {layout.placed.map(({ node, x, y }) => (
                <div
                  key={node.id}
                  className="absolute"
                  style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                >
                  <NodeCard
                    node={node}
                    template={template}
                    selection={selection}
                    onRank={setRank}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto p-4" aria-label={`${tree.name} tree columns`}>
          <div className="flex items-start gap-3">
            {columns.map((column, index) => (
              <div key={index} className="flex shrink-0 flex-col gap-2.5" style={{ width: COL_W }}>
                {column.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    template={template}
                    selection={selection}
                    onRank={setRank}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
