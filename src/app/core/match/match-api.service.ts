import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMatchQuestionDto,
  MatchQuestionDto,
  UpdateMatchQuestionDto,
} from '../../shared/dto/match-question.dto';
import { StageWithMatchesDto } from '../../shared/dto/stage.dto';

@Injectable({ providedIn: 'root' })
export class MatchApi {
  private readonly baseUrl = `${environment.apiUrl}/tournament`;
  private readonly http = inject(HttpClient);

  listStages(eventId: string): Observable<StageWithMatchesDto[]> {
    return this.http.get<StageWithMatchesDto[]>(`${this.baseUrl}/events/${eventId}/stages`);
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
}
