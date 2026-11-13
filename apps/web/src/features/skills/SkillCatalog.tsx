import { useMemo, useState } from 'react';

import { maxRankOf } from '@zenith/core-engine';
import type { GameTemplate, SkillSelection } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { skillIconUrls } from '../../lib/images';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { skillCopy } from './copy';
import { effectText, requirementText } from './skillText';

interface SkillCatalogProps {
  template: GameTemplate;
  selection: SkillSelection;
}

export function SkillCatalog({ template, selection }: SkillCatalogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');

  const rows = useMemo(
    () =>
      (template.skillTrees ?? []).flatMap((tree) =>
        tree.nodes.map((node) => ({ tree, node })),
      ),
    [template],
  );

  const categories = useMemo(
    () => [...new Set(rows.map(({ node }) => node.category).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const types = useMemo(
    () => [...new Set(rows.map(({ node }) => node.type).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(({ tree, node }) => {
    if (category && node.category !== category) return false;
    if (type && node.type !== type) return false;
    if (!needle) return true;
    return `${node.name} ${node.description ?? ''} ${tree.name}`.toLowerCase().includes(needle);
  });

  return (
    <div className="rounded-[4px] border border-line bg-surface">
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-4">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
            {skillCopy.search}
          </span>
          <input
            type="search"
            className="h-9 w-full rounded-[2px] border border-line bg-background px-3 text-[12.5px] text-foreground outline-none transition-colors focus:border-line-strong"
            placeholder={skillCopy.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label>
          <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
            {skillCopy.category}
          </span>
          <select
            className="h-9 rounded-[2px] border border-line bg-background px-2.5 text-[12.5px] text-foreground outline-none transition-colors focus:border-line-strong"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">{skillCopy.allCategories}</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
            {skillCopy.type}
          </span>
          <select
            className="h-9 rounded-[2px] border border-line bg-background px-2.5 text-[12.5px] text-foreground outline-none transition-colors focus:border-line-strong"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">{skillCopy.allTypes}</option>
            {types.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-[12.5px] text-muted-foreground">{skillCopy.empty}</p>
      ) : (
        <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ tree, node }) => {
            const rank = selection[node.id] ?? 0;
            return (
              <li
                key={`${tree.id}-${node.id}`}
                className={cn(
                  'flex flex-col rounded-[3px] border p-3',
                  rank > 0 ? 'border-foreground' : 'border-line',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <ItemGlyph
                    name={node.name}
                    sources={skillIconUrls(template.assets, node)}
                    className="h-9 w-9 text-[9px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold leading-snug">{node.name}</p>
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      {skillCopy.treeOf(tree.name)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-[1px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {skillCopy.rank(rank, maxRankOf(node))}
                  </span>
                </div>

                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {[node.category, node.type].filter(Boolean).join(' · ') || 'Skill'}
                </p>

                {node.description ? (
                  <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{node.description}</p>
                ) : null}

                <dl className="mt-2 grid gap-1 border-t border-line pt-2 text-[10.5px]">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">{skillCopy.effects}</dt>
                    <dd className="m-0">{effectText(template, node)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">{skillCopy.requires}</dt>
                    <dd className="m-0">{requirementText(template, node)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
