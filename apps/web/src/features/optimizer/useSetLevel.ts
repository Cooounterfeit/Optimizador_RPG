import { useCallback, useMemo, useState } from 'react';

import { currentLevel, isPointsMode, projectProfile } from '@zenith/core-engine';
import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { gameCopy } from '../game/copy';

interface UseSetLevelOptions {
  template: GameTemplate;
  profile: BaseProfile;
  onSave: (base: Record<string, number>) => Promise<void> | void;
  /** Se ejecuta antes de guardar: sirve al historial para anotar el nivel que se deja. */
  beforeSave?: (level: number, base: Record<string, number>) => Promise<void> | void;
}

/**
 * Fija el nivel del personaje en cualquiera de la escala del juego.
 *
 * El perfil canonico es el de la plantilla: su base esta en el nivel minimo y de
 * ahi salen todas las demas. Asi se puede subir y bajar sin invertir curvas ni
 * depender del historial: se guarda la decision (el nivel) y se derivan las
 * consecuencias (la base).
 */
export function useSetLevel({ template, profile, onSave, beforeSave }: UseSetLevelOptions) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = currentLevel(template, profile);
  const canonical =
    (template.baseProfiles ?? []).find((entry) => entry.id === profile.id) ??
    template.baseProfiles?.[0];
  const canonicalLevel = canonical ? currentLevel(template, canonical) : null;
  const pointsMode = isPointsMode(template);

  const levels = useMemo(() => {
    const leveling = template.leveling;
    if (!leveling) return [];
    const out: number[] = [];
    for (let level = leveling.min; level <= leveling.max; level += 1) out.push(level);
    return out;
  }, [template.leveling]);

  const baseAtLevel = useCallback(
    (level: number): Record<string, number> | null => {
      if (!template.leveling || !canonical || canonicalLevel === null) return null;
      if (level === canonicalLevel) return { ...canonical.base };
      if (level < canonicalLevel || pointsMode) return null;
      const projection = projectProfile(template, canonical, level);
      return projection.ok ? projection.base : null;
    },
    [canonical, canonicalLevel, pointsMode, template],
  );

  const setLevel = useCallback(
    async (level: number): Promise<boolean> => {
      if (current === null) return false;
      const base = baseAtLevel(level);
      if (!base) {
        setError(gameCopy.cockpit.levelUnavailable);
        return false;
      }

      setSaving(true);
      setError(null);
      try {
        await beforeSave?.(current, profile.base);
        await onSave(base);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : gameCopy.cockpit.historyError);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [baseAtLevel, beforeSave, current, onSave, profile.base],
  );

  return {
    current,
    levels,
    pointsMode,
    canSet: levels.length > 0 && canonicalLevel !== null && !pointsMode,
    saving,
    error,
    setLevel,
  };
}
