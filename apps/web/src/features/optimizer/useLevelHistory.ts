import { useCallback, useEffect, useState } from 'react';

import type { LevelSnapshot } from '@zenith/data-access';

import { getLevelHistoryRepository } from '../game/repositories';

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : 'No se pudo leer el historial.';

export interface UseLevelHistoryResult {
  history: LevelSnapshot[] | null;
  error: string | null;
  record: (level: number, base: Record<string, number>) => Promise<LevelSnapshot[]>;
}

export function useLevelHistory(
  gameId: string | undefined,
  profileId: string | undefined,
): UseLevelHistoryResult {
  const [history, setHistory] = useState<LevelSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId || !profileId) {
      setHistory([]);
      setError(null);
      return;
    }

    let alive = true;
    setHistory(null);
    setError(null);

    getLevelHistoryRepository()
      .list(gameId, profileId)
      .then((list) => {
        if (alive) setHistory(list);
      })
      .catch((cause) => {
        if (alive) setError(messageOf(cause));
      });

    return () => {
      alive = false;
    };
  }, [gameId, profileId]);

  const record = useCallback(
    async (level: number, base: Record<string, number>) => {
      if (!gameId || !profileId) return [];
      const list = await getLevelHistoryRepository().recordLevel(gameId, profileId, level, base);
      setHistory(list);
      setError(null);
      return list;
    },
    [gameId, profileId],
  );

  return { history, error, record };
}
