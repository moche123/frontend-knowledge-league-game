import { Signal, computed } from '@angular/core';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';

export interface RankStats {
  rankPosition: Signal<number | null>;
  totalPoints: Signal<number>;
}

/** Current user's position + points within a leaderboard signal — shared so every
 *  consumer (side-nav header, top bar, profile stats) reads the same derivation. */
export function computeRankStats(
  leaderboard: Signal<LeaderboardRowDto[]>,
  userId: () => string | null | undefined,
): RankStats {
  const rankPosition = computed(() => {
    const index = leaderboard().findIndex((row) => row.userId === userId());
    return index === -1 ? null : index + 1;
  });

  const totalPoints = computed(
    () => leaderboard().find((row) => row.userId === userId())?.totalPoints ?? 0,
  );

  return { rankPosition, totalPoints };
}
