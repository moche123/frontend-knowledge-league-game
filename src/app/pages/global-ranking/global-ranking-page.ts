import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { RankingApi } from '../../core/ranking/ranking-api.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { PodiumRank, PodiumSlot } from '../../shared/ui/podium-slot/podium-slot';
import { Select, SelectOption } from '../../shared/ui/select/select';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';
import { TopBar } from '../../shared/ui/top-bar/top-bar';

interface Podium {
  rank: PodiumRank;
  name: string;
  points: string;
  winRate: number;
  matches: number;
  isSelf: boolean;
}

interface RankingRow {
  position: number;
  name: string;
  initials: string;
  tournaments: number;
  points: string;
  isSelf: boolean;
}

function formatPoints(value: number): string {
  return Math.round(value).toLocaleString();
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

@Component({
  selector: 'app-global-ranking-page',
  imports: [
    Avatar,
    Icon,
    NavItem,
    PodiumSlot,
    Select,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-ranking-page.html',
})
export class GlobalRankingPage {
  private readonly authService = inject(AuthService);
  private readonly rankingApi = inject(RankingApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly router = inject(Router);

  protected readonly homeUrl = computed(() => {
    const user = this.authService.currentUser();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  protected filter = signal('all');

  private readonly events = toSignal(this.tournamentApi.listEvents(), { initialValue: [] });
  protected readonly filterOptions = computed<SelectOption[]>(() => [
    { value: 'all', label: 'All tournaments' },
    ...this.events().map((event) => ({ value: event.id, label: event.name })),
  ]);

  // Re-fetches whenever the filter changes — 'all' for the global leaderboard,
  // an eventId for that one event's (see RankingModule / GET /ranking[/events/:id]).
  private readonly leaderboard = toSignal(
    toObservable(this.filter).pipe(
      switchMap((value) =>
        value === 'all'
          ? this.rankingApi.getGlobalLeaderboard()
          : this.rankingApi.getEventLeaderboard(value),
      ),
      catchError(() => of<LeaderboardRowDto[]>([])),
    ),
    { initialValue: [] },
  );

  private readonly selfId = computed(() => this.authService.currentUser()?.id ?? null);

  protected readonly podium = computed<Podium[]>(() =>
    this.leaderboard()
      .slice(0, 3)
      .map((row, index) => ({
        rank: (index + 1) as PodiumRank,
        name: row.name,
        points: formatPoints(row.totalPoints),
        winRate: row.winRate,
        matches: row.matchesPlayed,
        isSelf: row.userId === this.selfId(),
      })),
  );

  // Positions 4+ — the self row (if it falls in this range) is pulled out
  // and shown separately at the bottom instead, so it's never duplicated.
  protected readonly rows = computed<RankingRow[]>(() => {
    const selfId = this.selfId();
    return this.leaderboard()
      .slice(3)
      .map((row, index) => ({
        position: index + 4,
        name: row.name,
        initials: initialsOf(row.name),
        tournaments: row.eventsPlayed,
        points: formatPoints(row.totalPoints),
        isSelf: row.userId === selfId,
      }))
      .filter((row) => !row.isSelf);
  });

  protected readonly selfRow = computed<RankingRow | null>(() => {
    const selfId = this.selfId();
    if (!selfId) return null;
    const all = this.leaderboard();
    const index = all.findIndex((row) => row.userId === selfId);
    if (index === -1) return null;
    const row = all[index];
    return {
      position: index + 1,
      name: row.name,
      initials: initialsOf(row.name),
      tournaments: row.eventsPlayed,
      points: formatPoints(row.totalPoints),
      isSelf: true,
    };
  });

  protected goHome(): void {
    this.router.navigateByUrl(this.homeUrl());
  }
}
