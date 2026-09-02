// Player-facing quiz flow: current question (no rubric), submitting an
// answer, and the enriched answers used to build the match-result view.

export interface CurrentQuestionDto {
  position: number;
  totalQuestions: number;
  questionText: string;
  timeLimit: number;
  deadline: string | null;
  youAnswered: boolean;
  opponentAnswered: boolean;
}

export interface SubmitAnswerDto {
  answerText: string;
}

export interface AnswerDto {
  id: string;
  matchId: string;
  questionId: string;
  playerId: string;
  answerText: string;
  submittedAt: string;
  aiScore: number | null;
  aiJustification: string | null;
  adminOverrideScore: number | null;
}

// One answer plus the question it belongs to (text, not rubric) — what
// GET .../matches/:matchId/answers returns, enough to build the
// match-result view in a single call.
export interface AnswerWithQuestionDto extends AnswerDto {
  questionPosition: number;
  questionText: string;
  maxScore: number;
}

// GET .../matches/:matchId/questions-public — the full question list, no
// rubric, including ones nobody answered (unlike AnswerWithQuestionDto,
// which only ever has entries for questions someone actually answered).
export interface PublicMatchQuestionDto {
  position: number;
  text: string;
  maxScore: number;
}
