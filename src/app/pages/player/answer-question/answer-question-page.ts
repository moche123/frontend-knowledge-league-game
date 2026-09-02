import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, catchError, interval, merge, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatchApi } from '../../../core/match/match-api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { CurrentQuestionDto } from '../../../shared/dto/match-play.dto';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { CountdownTimer } from '../../../shared/ui/countdown-timer/countdown-timer';
import { Icon } from '../../../shared/ui/icon/icon';
import { Textarea } from '../../../shared/ui/textarea/textarea';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1XINWzavwId3se-vwYMWWTdNIGQdnsy4L-3LGMVD39EqMIVWE5xnJz2j0PS4RBibmyc-6FXsDSTzqsqrvHhLWAcbzlEs_ILdKri7jd8bUlC4jWS79mfrq1R3c6hCCVumwb1ijJDhLoqEcOYei1EVY7Mj5fCDkAv70ut7Vs-b9DNb3dxNMJxe0ptzE-uP1LkSZl7cerpV_Pqzp_7r8mlytXE6PS9LSAbOZAMXCmyx_hNkNiktK5HDHlLYtw';

// Polling stand-in for a WS/push mechanism (none in the MVP monolith yet —
// see CLAUDE.md/knowledge/... for the same gap elsewhere). Short enough to
// feel responsive against the backend's own 10s advance-question cron and
// per-question deadlines (30s default).
const POLL_INTERVAL_MS = 3000;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

@Component({
  selector: 'app-answer-question-page',
  imports: [Avatar, Badge, Button, CountdownTimer, Icon, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './answer-question-page.html',
})
export class AnswerQuestionPage {
  protected readonly logoUrl = LOGO_URL;
  protected readonly authService = inject(AuthService);
  private readonly matchApi = inject(MatchApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  private readonly matchId = this.route.snapshot.paramMap.get('matchId') ?? '';

  private navigatedToResult = false;

  private goToResult(): void {
    if (this.navigatedToResult) return;
    this.navigatedToResult = true;
    this.router.navigateByUrl(`/match-result/${this.eventId}/${this.matchId}`);
  }

  // Event theme — same topic for every question in the match (CLAUDE.md).
  protected readonly theme = toSignal(
    this.tournamentApi.getEvent(this.eventId).pipe(catchError(() => EMPTY)),
    { initialValue: null },
  );

  // Polls the active question: immediately on load, every POLL_INTERVAL_MS
  // after, and right after a successful submit (this.refresh$). A failed
  // fetch means the match is no longer in_progress (closed/walkover/expired/
  // cancelled) — see CLAUDE.md, no other reason getCurrentQuestion 409s once
  // we've already loaded it successfully once — so that's the signal to move
  // on to the result view.
  private readonly refresh$ = new Subject<void>();
  private readonly poll$ = merge(timer(0, POLL_INTERVAL_MS), this.refresh$);

  protected readonly currentQuestion = toSignal<CurrentQuestionDto | null>(
    this.poll$.pipe(
      switchMap(() =>
        this.matchApi.getCurrentQuestion(this.eventId, this.matchId).pipe(
          catchError(() => {
            this.goToResult();
            return EMPTY;
          }),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected answer = signal('');
  protected submitting = signal(false);

  constructor() {
    // Reset the draft answer whenever the active question actually changes
    // (new position) — never on every poll tick, which would wipe an
    // in-progress draft each time.
    let lastPosition: number | null = null;
    effect(() => {
      const position = this.currentQuestion()?.position ?? null;
      if (position !== null && position !== lastPosition) {
        lastPosition = position;
        this.answer.set('');
      }
    });
  }

  // Ticks once a second purely to force remainingSeconds()/timerLabel() to
  // recompute — the actual value is always derived fresh from the deadline
  // and wall-clock time, never accumulated client-side.
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  protected readonly remainingSeconds = computed(() => {
    this.tick();
    const deadline = this.currentQuestion()?.deadline;
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
  });

  protected readonly timerLabel = computed(() => {
    const total = this.remainingSeconds();
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  });

  protected readonly urgent = computed(() => this.remainingSeconds() <= 30);

  protected readonly canSubmit = computed(
    () =>
      this.answer().trim().length > 0 &&
      !this.submitting() &&
      !this.currentQuestion()?.youAnswered &&
      this.remainingSeconds() > 0,
  );

  protected submitAnswer(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.matchApi
      .submitPlayerAnswer(this.eventId, this.matchId, { answerText: this.answer() })
      .pipe(tap(() => this.refresh$.next()))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toastService.success('Answer submitted.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.toastService.error(error.error?.message ?? 'Could not submit your answer.');
        },
      });
  }
}
