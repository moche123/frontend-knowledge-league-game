export type EventStatus = 'registration_open' | 'in_progress' | 'finished';

export interface EventDto {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  maxPlayers: number;
  questionsPerMatch: number;
  maxScorePerMatch: number;
  status: EventStatus;
  createdAt: string;
}

export interface CreateEventDto {
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  maxPlayers: number;
  questionsPerMatch: number;
  maxScorePerMatch?: number;
}
