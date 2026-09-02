import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { MatchApi } from '../../core/match/match-api.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { MatchDto, MatchStatus, StageType, StageWithMatchesDto } from '../../shared/dto/stage.dto';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';

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

// Live matches float to the top — the ones most likely to need a dispute
// resolved right now.
const STATUS_RANK: Record<MatchStatus, number> = {
  in_progress: 0,
  pending: 1,
  closed: 2,
  walkover: 3,
  expired: 4,
  cancelled: 5,
};

interface InboxRow {
  eventId: string;
  matchId: string;
  eventName: string;
  stageLabel: string;
  matchup: string;
  status: MatchStatus;
}

@Component({
  selector: 'app-dispute-inbox-page',
  imports: [Badge, NavItem, SideNav, SideNavCommon, SideNavHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dispute-inbox-page.html',
})
export class DisputeInboxPage {
  private readonly authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly matchApi = inject(MatchApi);
  private readonly router = inject(Router);

  private readonly currentUser = this.authService.currentUser();
  private readonly userId = this.currentUser?.id ?? null;
  private readonly role = this.currentUser?.role ?? 'player';

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly homeUrl = computed(() => {
    const user = this.currentUser;
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  // Same participant rule the backend enforces per-match (DisputeChatService):
  // the match's two players, its assigned referee, or admin (unrestricted).
  private isRelevant(match: MatchDto): boolean {
    if (this.role === 'admin') return true;
    if (this.role === 'referee') return match.refereeId === this.userId;
    return match.playerAId === this.userId || match.playerBId === this.userId;
  }

  private matchupLabel(match: MatchDto, names: Record<string, string>): string {
    const label = (id: string | null) => (id ? (names[id] ?? '…') : 'TBD');
    if (this.role === 'player') {
      const opponentId = match.playerAId === this.userId ? match.playerBId : match.playerAId;
      return `vs ${label(opponentId)}`;
    }
    return `${label(match.playerAId)} vs ${label(match.playerBId)}`;
  }

  protected readonly rows = toSignal(
    this.tournamentApi.listEvents().pipe(
      switchMap((events) =>
        events.length === 0
          ? of<InboxRow[]>([])
          : forkJoin(
              events.map((event) =>
                (event.status === 'registration_open'
                  ? of<StageWithMatchesDto[]>([])
                  : this.matchApi.listStages(event.id)
                ).pipe(
                  switchMap((stages) => {
                    const entries = stages.flatMap((stage) =>
                      stage.matches
                        .filter((match) => this.isRelevant(match))
                        .map((match) => ({ stage, match })),
                    );
                    if (entries.length === 0) return of<InboxRow[]>([]);

                    const ids = new Set<string>();
                    entries.forEach(({ match }) => {
                      if (match.playerAId) ids.add(match.playerAId);
                      if (match.playerBId) ids.add(match.playerBId);
                    });

                    return forkJoin(
                      [...ids].map((id) =>
                        this.authService
                          .getUserName(id)
                          .pipe(map((user) => [id, user.name] as const)),
                      ),
                    ).pipe(
                      map((pairs) => Object.fromEntries(pairs)),
                      map((names) =>
                        entries.map(({ stage, match }): InboxRow => ({
                          eventId: event.id,
                          matchId: match.id,
                          eventName: event.name,
                          stageLabel: STAGE_LABEL[stage.type],
                          matchup: this.matchupLabel(match, names),
                          status: match.status,
                        })),
                      ),
                    );
                  }),
                ),
              ),
            ).pipe(map((rowsPerEvent) => rowsPerEvent.flat())),
      ),
      map((rows) => rows.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])),
    ),
    { initialValue: [] as InboxRow[] },
  );

  protected openChat(row: InboxRow): void {
    this.router.navigateByUrl(`/disputes/${row.eventId}/${row.matchId}`);
  }

  protected goHome(): void {
    this.router.navigateByUrl(this.homeUrl());
  }
}
