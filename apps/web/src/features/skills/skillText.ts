import { indexSkills } from '@zenith/core-engine';
import type { GameTemplate, SkillNode } from '@zenith/shared-types';

import { skillCopy } from './copy';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const effectText = (template: GameTemplate, node: SkillNode): string => {
  const entries = Object.entries(node.effects ?? {});
  if (entries.length === 0) return skillCopy.noEffects;
  return entries
    .map(([statId, value]) => {
      const stat = template.stats.find((entry) => entry.id === statId);
      const unit = stat?.unit === 'percent' ? '%' : '';
      return `${value > 0 ? '+' : ''}${numberFormat.format(value)} ${stat?.name ?? statId}${unit}`;
    })
    .join(' · ');
};

export const requirementText = (template: GameTemplate, node: SkillNode): string => {
  const ix = indexSkills(template);
  const name = (id: string) => ix.node.get(id)?.name ?? id;
  const parts: string[] = [];
  if (node.requires?.length) parts.push(skillCopy.requiresAll(node.requires.map(name).join(', ')));
  if (node.requiresAny?.length) {
    parts.push(skillCopy.requiresAnyOf(node.requiresAny.map(name).join(', ')));
  }
  if (node.requiresPoints) parts.push(skillCopy.requiresPoints(node.requiresPoints));
  return parts.length > 0 ? parts.join(' · ') : skillCopy.noRequires;
};
