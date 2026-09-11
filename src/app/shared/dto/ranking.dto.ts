export interface LeaderboardRowDto {
  userId: string;
  name: string;
  totalPoints: number;
  matchesPlayed: number;
  eventsPlayed: number;
  winRate: number;
}
