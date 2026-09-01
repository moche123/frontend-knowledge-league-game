export type StageType = 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place';

export type MatchStatus =
  'pending' | 'in_progress' | 'closed' | 'walkover' | 'expired' | 'cancelled';

export interface MatchDto {
  id: string;
  stageId: string;
  playerAId: string | null;
  playerBId: string | null;
  status: MatchStatus;
  winnerId: string | null;
  refereeId: string | null;
  disqualifiedPlayerId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  createdAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface StageWithMatchesDto {
  id: string;
  eventId: string;
  type: StageType;
  position: number;
  seed: string | null;
  matches: MatchDto[];
}
