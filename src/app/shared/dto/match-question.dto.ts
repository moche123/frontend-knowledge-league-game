export interface MatchQuestionDto {
  id: string;
  matchId: string;
  position: number;
  text: string;
  rubric: string;
  maxScore: number;
  timeLimit: number;
  createdAt: string;
  activatedAt: string | null;
}

export interface CreateMatchQuestionDto {
  text: string;
  rubric: string;
  maxScore: number;
  timeLimit: number;
}

export interface UpdateMatchQuestionDto {
  text?: string;
  rubric?: string;
  maxScore?: number;
  timeLimit?: number;
}
