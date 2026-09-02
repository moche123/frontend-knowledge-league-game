import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { MatchApi } from '../../core/match/match-api.service';
import { computeRankStats } from '../../core/ranking/rank-stats';
import { RankingApi } from '../../core/ranking/ranking-api.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { StageWithMatchesDto } from '../../shared/dto/stage.dto';
import { EventDto, EventStatus } from '../../shared/dto/tournament.dto';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';
import { TopBar } from '../../shared/ui/top-bar/top-bar';

const STATUS_BADGE: Record<EventStatus, BadgeVariant> = {
  registration_open: 'gold',
  in_progress: 'accent',
  finished: 'neutral',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  registration_open: 'Open Registration',
  in_progress: 'Ongoing',
  finished: 'Finished',
};

// The player's own standing WITHIN the event — distinct from the event's own
// status (2026-09-02, explicit user request): an event being "Ongoing" says
// nothing about whether THIS player is still alive in it, already lost, or
// got disqualified. Derived from their own matches across the bracket, not
// stored anywhere.
type ParticipantStatus =
  'registered' | 'competing' | 'eliminated' | 'disqualified' | 'champion' | 'thirdPlace';

const PARTICIPANT_STATUS_BADGE: Record<ParticipantStatus, BadgeVariant> = {
  registered: 'neutral',
  competing: 'accent',
  eliminated: 'error',
  disqualified: 'error',
  champion: 'gold',
  thirdPlace: 'secondary',
};

const PARTICIPANT_STATUS_LABEL: Record<ParticipantStatus, string> = {
  registered: 'Registered',
  competing: 'Competing',
  eliminated: 'Eliminated',
  disqualified: 'Disqualified',
  champion: 'Champion',
  thirdPlace: '3rd Place',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

interface MyEventRow {
  id: string;
  name: string;
  theme: string;
  status: EventStatus;
  participantStatus: ParticipantStatus;
  // The stage the player's most-advanced match belongs to — null when there's
  // no bracket match to point at yet (still just 'registered').
  stageLabel: string | null;
  date: string;
}

const STAGE_LABEL: Record<StageWithMatchesDto['type'], string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Third Place',
};

// Looks at the player's own matches across every stage (most-advanced stage
// they appear in wins — that's always their current or final standing in a
// single-elimination bracket) to decide their real standing, independent of
// the event's own status.
function deriveParticipantStanding(
  userId: string,
  eventStatus: EventStatus,
  stages: StageWithMatchesDto[],
): { status: ParticipantStatus; stageLabel: string | null } {
  if (eventStatus === 'registration_open') return { status: 'registered', stageLabel: null };

  const ownMatches = stages
    .flatMap((stage) => stage.matches.map((match) => ({ stage, match })))
    .filter(({ match }) => match.playerAId === userId || match.playerBId === userId)
    .sort((a, b) => b.stage.position - a.stage.position);

  if (ownMatches.length === 0) return { status: 'registered', stageLabel: null };

  const { stage, match } = ownMatches[0];
  const stageLabel = STAGE_LABEL[stage.type];

  if (match.disqualifiedPlayerId === userId) return { status: 'disqualified', stageLabel };
  if (match.status === 'pending' || match.status === 'in_progress') {
    return { status: 'competing', stageLabel };
  }
  if (match.status === 'expired' || match.status === 'cancelled') {
    return { status: 'competing', stageLabel };
  }

  // closed or walkover
  if (match.winnerId !== userId) return { status: 'eliminated', stageLabel };
  if (stage.type === 'final') return { status: 'champion', stageLabel };
  if (stage.type === 'third_place') return { status: 'thirdPlace', stageLabel };
  // Won this stage — checkAndAdvance() should already have drawn their next
  // match (so it would already be the most-advanced one found above), but
  // guard against the brief window right after closing where it hasn't yet.
  return { status: 'competing', stageLabel };
}

@Component({
  selector: 'app-profile-page',
  imports: [Badge, Icon, NavItem, SideNav, SideNavCommon, SideNavHeader, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rankingApi = inject(RankingApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly matchApi = inject(MatchApi);

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly participantStatusBadge = PARTICIPANT_STATUS_BADGE;
  protected readonly participantStatusLabel = PARTICIPANT_STATUS_LABEL;

  protected readonly user = this.authService.currentUser;
  private readonly userId = this.user()?.id ?? null;

  protected readonly homeUrl = computed(() => {
    const user = this.user();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  protected readonly memberSince = computed(() => {
    const user = this.user();
    return user ? DATE_FORMAT.format(new Date(user.createdAt)) : '';
  });

  private readonly rankStats = computeRankStats(this.rankingApi.leaderboard, () => this.user()?.id);
  protected readonly rankPosition = this.rankStats.rankPosition;
  protected readonly totalPoints = this.rankStats.totalPoints;

  protected readonly myEvents = toSignal(
    this.tournamentApi.listEvents().pipe(
      switchMap((events) =>
        events.length === 0
          ? of<EventDto[]>([])
          : forkJoin(
              events.map((event) =>
                this.tournamentApi
                  .listRegistrations(event.id)
                  .pipe(
                    map((registrations) =>
                      this.userId && registrations.some((r) => r.userId === this.userId)
                        ? event
                        : null,
                    ),
                  ),
              ),
            ).pipe(map((results) => results.filter((event): event is EventDto => event !== null))),
      ),
      switchMap((registeredEvents) =>
        registeredEvents.length === 0
          ? of<MyEventRow[]>([])
          : forkJoin(
              registeredEvents.map((event) =>
                (event.status === 'registration_open'
                  ? of<StageWithMatchesDto[]>([])
                  : this.matchApi.listStages(event.id)
                ).pipe(
                  map((stages): MyEventRow => {
                    const standing = this.userId
                      ? deriveParticipantStanding(this.userId, event.status, stages)
                      : { status: 'registered' as const, stageLabel: null };
                    return {
                      id: event.id,
                      name: event.name,
                      theme: event.theme,
                      status: event.status,
                      participantStatus: standing.status,
                      stageLabel: standing.stageLabel,
                      date: DATE_FORMAT.format(new Date(event.startDate)),
                    };
                  }),
                ),
              ),
            ),
      ),
    ),
    { initialValue: [] as MyEventRow[] },
  );

  protected goHome(): void {
    this.router.navigateByUrl(this.homeUrl());
  }
}
