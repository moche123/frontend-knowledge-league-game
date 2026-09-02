import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatchApi } from '../../../core/match/match-api.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { AnswerWithQuestionDto } from '../../../shared/dto/match-play.dto';
import { MatchDto } from '../../../shared/dto/stage.dto';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';

interface QuestionRow {
  position: number;
  questionText: string;
  maxScore: number;
  a: AnswerWithQuestionDto | null;
  b: AnswerWithQuestionDto | null;
}

interface MatchResultView {
  match: MatchDto;
  theme: string;
  playerAName: string;
  playerBName: string;
  questions: QuestionRow[];
}

@Component({
  selector: 'app-match-result-page',
  imports: [Avatar, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-result-page.html',
})
export class MatchResultPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchApi = inject(MatchApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly authService = inject(AuthService);

  private readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  private readonly matchId = this.route.snapshot.paramMap.get('matchId') ?? '';

  // Set on any load failure (e.g. the match hasn't actually closed yet —
  // getMatchAnswers 409s for a participant until status is closed/walkover)
  // — without this, an unhandled error in the pipe leaves the page stuck on
  // "Loading result…" forever (toSignal doesn't update the signal on error,
  // it just logs it).
  protected readonly loadError = signal<string | null>(null);

  protected readonly result = toSignal(
    this.matchApi.getMatch(this.eventId, this.matchId).pipe(
      switchMap((match) =>
        forkJoin({
          match: of(match),
          theme: this.tournamentApi.getEvent(this.eventId).pipe(map((event) => event.theme)),
          questions: this.matchApi.getPublicQuestions(this.eventId, this.matchId),
          answers: this.matchApi.getMatchAnswers(this.eventId, this.matchId),
          playerAName: match.playerAId
            ? this.authService.getUserName(match.playerAId).pipe(map((user) => user.name))
            : of('TBD'),
          playerBName: match.playerBId
            ? this.authService.getUserName(match.playerBId).pipe(map((user) => user.name))
            : of('TBD'),
        }),
      ),
      map(
        ({
          match,
          theme,
          questions: publicQuestions,
          answers,
          playerAName,
          playerBName,
        }): MatchResultView => {
          // One card per question in the match (2026-09-01 fix — was deriving
          // the list from answers.questionPosition alone, so a question
          // nobody answered at all silently never got a card, even though it
          // was very much part of the match).
          const questions: QuestionRow[] = publicQuestions
            .slice()
            .sort((x, y) => x.position - y.position)
            .map((question) => ({
              position: question.position,
              questionText: question.text,
              maxScore: question.maxScore,
              a:
                answers.find(
                  (answer) =>
                    answer.questionPosition === question.position &&
                    answer.playerId === match.playerAId,
                ) ?? null,
              b:
                answers.find(
                  (answer) =>
                    answer.questionPosition === question.position &&
                    answer.playerId === match.playerBId,
                ) ?? null,
            }));
          return { match, theme, playerAName, playerBName, questions };
        },
      ),
      catchError((error: { error?: { message?: string } }) => {
        this.loadError.set(
          error.error?.message ?? "Couldn't load this match's result — it may not have closed yet.",
        );
        return of(null);
      }),
    ),
    { initialValue: null },
  );

  protected goToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }

  protected goToDisputes(): void {
    this.router.navigateByUrl(`/disputes/${this.eventId}/${this.matchId}`);
  }
}
