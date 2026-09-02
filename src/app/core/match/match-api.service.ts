import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMatchQuestionDto,
  MatchQuestionDto,
  UpdateMatchQuestionDto,
} from '../../shared/dto/match-question.dto';
import { DisputeChatMessageDto, SendChatMessageDto } from '../../shared/dto/dispute-chat.dto';
import {
  AnswerDto,
  AnswerWithQuestionDto,
  CurrentQuestionDto,
  PublicMatchQuestionDto,
  SubmitAnswerDto,
} from '../../shared/dto/match-play.dto';
import { MatchDto, StageWithMatchesDto } from '../../shared/dto/stage.dto';

@Injectable({ providedIn: 'root' })
export class MatchApi {
  private readonly baseUrl = `${environment.apiUrl}/tournament`;
  private readonly http = inject(HttpClient);

  listStages(eventId: string): Observable<StageWithMatchesDto[]> {
    return this.http.get<StageWithMatchesDto[]>(`${this.baseUrl}/events/${eventId}/stages`);
  }

  getMatch(eventId: string, matchId: string): Observable<MatchDto> {
    return this.http.get<MatchDto>(`${this.baseUrl}/events/${eventId}/matches/${matchId}`);
  }

  // Player, one of the match's two — no rubric. 409 once the match is no
  // longer in_progress (closed/walkover/expired/cancelled) — the caller
  // treats that as "the match ended, go to the result view".
  getCurrentQuestion(eventId: string, matchId: string): Observable<CurrentQuestionDto> {
    return this.http.get<CurrentQuestionDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/current-question`,
    );
  }

  submitPlayerAnswer(
    eventId: string,
    matchId: string,
    dto: SubmitAnswerDto,
  ): Observable<AnswerDto> {
    return this.http.post<AnswerDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/answers`,
      dto,
    );
  }

  // Participants only once the match is closed/walkover; admin/referee any
  // time. Each answer comes with the question it belongs to (text, no
  // rubric) — enough to build the match-result view in one call.
  getMatchAnswers(eventId: string, matchId: string): Observable<AnswerWithQuestionDto[]> {
    return this.http.get<AnswerWithQuestionDto[]>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/answers`,
    );
  }

  // Same access rule as getMatchAnswers — but the full question list (no
  // rubric), including ones nobody answered, so match-result-page can show
  // a card for every question in the match, not just the answered ones.
  getPublicQuestions(eventId: string, matchId: string): Observable<PublicMatchQuestionDto[]> {
    return this.http.get<PublicMatchQuestionDto[]>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/questions-public`,
    );
  }

  // Sets start time + duration AND generates (or regenerates) the match's
  // AI question set in the same call — no separate "generate" step.
  schedule(
    eventId: string,
    matchId: string,
    dto: { scheduledStartAt: string; durationMinutes: number },
  ): Observable<MatchDto> {
    return this.http.patch<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/schedule`,
      dto,
    );
  }

  listQuestions(eventId: string, matchId: string): Observable<MatchQuestionDto[]> {
    return this.http.get<MatchQuestionDto[]>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/questions`,
    );
  }

  createQuestion(
    eventId: string,
    matchId: string,
    dto: CreateMatchQuestionDto,
  ): Observable<MatchQuestionDto> {
    return this.http.post<MatchQuestionDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/questions`,
      dto,
    );
  }

  updateQuestion(
    eventId: string,
    matchId: string,
    questionId: string,
    dto: UpdateMatchQuestionDto,
  ): Observable<MatchQuestionDto> {
    return this.http.patch<MatchQuestionDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/questions/${questionId}`,
      dto,
    );
  }

  deleteQuestion(eventId: string, matchId: string, questionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/questions/${questionId}`,
    );
  }

  editParticipants(
    eventId: string,
    matchId: string,
    dto: { playerAId?: string; playerBId?: string },
  ): Observable<MatchDto> {
    return this.http.patch<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/participants`,
      dto,
    );
  }

  setReferee(eventId: string, matchId: string, refereeId: string): Observable<MatchDto> {
    return this.http.patch<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/referee`,
      { refereeId },
    );
  }

  // Live match only — blocks that player's further answers, match keeps
  // running for the opponent.
  disqualifyPlayer(eventId: string, matchId: string, playerId: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/disqualify`,
      { playerId },
    );
  }

  // Undoes a disqualification — only while the match is still in_progress.
  // Once it's closed, the disqualification is final for this event (409).
  reinstatePlayer(eventId: string, matchId: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/reinstate`,
      {},
    );
  }

  // Pending or expired only — it will never be played. Doesn't touch bracket
  // advancement (backend-decided limitation, same as override/reopen).
  cancelMatch(eventId: string, matchId: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/cancel`,
      {},
    );
  }

  // Admin or referee — activates the already-generated questions and starts
  // the first one's timer. Rejects if scheduledStartAt hasn't arrived yet,
  // scheduledEndAt has already passed, or there are no generated questions.
  startMatch(eventId: string, matchId: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/start`,
      {},
    );
  }

  // Admin or referee — closes an in_progress match early (scores whatever
  // was answered so far, same as a natural close). Also the way to unstick
  // a match stuck in a bad state (e.g. no active deadline) — end it, then
  // reopen() becomes available to replay it properly.
  endMatch(eventId: string, matchId: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${this.baseUrl}/events/${eventId}/matches/${matchId}/end`, {});
  }

  // Admin, Fase 10 — closed/walkover only. Full reset: answers, questions,
  // score/winner, ranking entry all cleared, back to pending. Reason is
  // required (min 1 char) and gets logged as a system message in the
  // match's dispute chat.
  reopenMatch(eventId: string, matchId: string, reason: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${this.baseUrl}/events/${eventId}/matches/${matchId}/reopen`, {
      reason,
    });
  }

  // Participants: the match's two players, its assigned referee, or admin —
  // no static role restriction, the backend validates per-match/event.
  // Stays open after the match closes.
  getChatMessages(eventId: string, matchId: string): Observable<DisputeChatMessageDto[]> {
    return this.http.get<DisputeChatMessageDto[]>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/chat`,
    );
  }

  sendChatMessage(
    eventId: string,
    matchId: string,
    dto: SendChatMessageDto,
  ): Observable<DisputeChatMessageDto> {
    return this.http.post<DisputeChatMessageDto>(
      `${this.baseUrl}/events/${eventId}/matches/${matchId}/chat`,
      dto,
    );
  }
}
