import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatchApi } from '../../../core/match/match-api.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { MatchStatus, StageType } from '../../../shared/dto/stage.dto';
import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { EventTiming } from '../../../shared/ui/event-timing/event-timing';
import { Icon } from '../../../shared/ui/icon/icon';

const STAGE_LABEL: Record<StageType, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Third Place',
};

const STATUS_BADGE: Record<MatchStatus, BadgeVariant> = {
  pending: 'gold',
  in_progress: 'accent',
  closed: 'neutral',
  walkover: 'error',
  expired: 'error',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: 'Pending',
  in_progress: 'Live',
  closed: 'Closed',
  walkover: 'Walkover',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

// The player's own outcome for a closed/walkover match — 'won'/'lost' when
// there's a real winnerId, 'tie' for the rare exact-tie edge case
// (winnerId left null, see match-scoring.service.ts), null while the match
// hasn't reached a terminal result yet.
type MatchOutcome = 'won' | 'lost' | 'tie' | null;

interface MyMatchRow {
  matchId: string;
  stageLabel: string;
  stagePosition: number;
  status: MatchStatus;
  opponentName: string;
  outcome: MatchOutcome;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
}

@Component({
  selector: 'app-my-matches-page',
  imports: [Badge, Button, EventTiming, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-matches-page.html',
})
export class MyMatchesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchApi = inject(MatchApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly authService = inject(AuthService);

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;
  private readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  private readonly userId = this.authService.currentUser()?.id ?? null;

  protected readonly view = toSignal(
    forkJoin({
      event: this.tournamentApi.getEvent(this.eventId),
      stages: this.matchApi.listStages(this.eventId),
    }).pipe(
      switchMap(({ event, stages }) => {
        const ownMatches = stages.flatMap((stage) =>
          stage.matches
            .filter((match) => match.playerAId === this.userId || match.playerBId === this.userId)
            .map((match) => ({
              matchId: match.id,
              stageLabel: STAGE_LABEL[stage.type],
              stagePosition: stage.position,
              status: match.status,
              outcome: this.deriveOutcome(match.status, match.winnerId),
              opponentId: match.playerAId === this.userId ? match.playerBId : match.playerAId,
              scheduledStartAt: match.scheduledStartAt,
              scheduledEndAt: match.scheduledEndAt,
            })),
        );
        if (ownMatches.length === 0) {
          return of({ eventName: event.name, rows: [] as MyMatchRow[] });
        }
        return forkJoin(
          ownMatches.map((match) =>
            match.opponentId
              ? this.authService
                  .getUserName(match.opponentId)
                  .pipe(map((user) => ({ ...match, opponentName: user.name })))
              : of({ ...match, opponentName: 'TBD' }),
          ),
        ).pipe(
          map((rows) => ({
            eventName: event.name,
            rows: rows.sort((a, b) => a.stagePosition - b.stagePosition),
          })),
        );
      }),
    ),
    { initialValue: null },
  );

  private deriveOutcome(status: MatchStatus, winnerId: string | null): MatchOutcome {
    if (status !== 'closed' && status !== 'walkover') return null;
    if (winnerId === null) return 'tie';
    return winnerId === this.userId ? 'won' : 'lost';
  }

  protected enterMatch(matchId: string): void {
    this.router.navigateByUrl(`/answer-question/${this.eventId}/${matchId}`);
  }

  protected viewResult(matchId: string): void {
    this.router.navigateByUrl(`/match-result/${this.eventId}/${matchId}`);
  }

  protected goToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }
}
