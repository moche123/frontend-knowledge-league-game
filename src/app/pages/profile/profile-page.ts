import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { RankingApi } from '../../core/ranking/ranking-api.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';
import { EventDto, EventStatus } from '../../shared/dto/tournament.dto';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';

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

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

interface EventWithRegistrants {
  event: EventDto;
  registeredUserIds: string[];
}

interface MyEventRow {
  id: string;
  name: string;
  theme: string;
  status: EventStatus;
  date: string;
}

@Component({
  selector: 'app-profile-page',
  imports: [Badge, Icon, NavItem, SideNav, SideNavCommon, SideNavHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rankingApi = inject(RankingApi);
  private readonly tournamentApi = inject(TournamentApi);

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly user = this.authService.currentUser;

  protected readonly homeUrl = computed(() => {
    const user = this.user();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  protected readonly memberSince = computed(() => {
    const user = this.user();
    return user ? DATE_FORMAT.format(new Date(user.createdAt)) : '';
  });

  private readonly leaderboard = toSignal(this.rankingApi.getGlobalLeaderboard(), {
    initialValue: [] as LeaderboardRowDto[],
  });

  protected readonly rankPosition = computed(() => {
    const userId = this.user()?.id;
    const index = this.leaderboard().findIndex((row) => row.userId === userId);
    return index === -1 ? null : index + 1;
  });

  protected readonly totalPoints = computed(
    () => this.leaderboard().find((row) => row.userId === this.user()?.id)?.totalPoints ?? 0,
  );

  private readonly eventsWithRegistrants = toSignal(
    this.tournamentApi.listEvents().pipe(
      switchMap((events) =>
        events.length === 0
          ? of<EventWithRegistrants[]>([])
          : forkJoin(
              events.map((event) =>
                this.tournamentApi.listRegistrations(event.id).pipe(
                  map((registrations) => ({
                    event,
                    registeredUserIds: registrations.map((registration) => registration.userId),
                  })),
                ),
              ),
            ),
      ),
    ),
    { initialValue: [] as EventWithRegistrants[] },
  );

  protected readonly myEvents = computed<MyEventRow[]>(() => {
    const userId = this.user()?.id;
    return this.eventsWithRegistrants()
      .filter((entry) => userId != null && entry.registeredUserIds.includes(userId))
      .map((entry) => ({
        id: entry.event.id,
        name: entry.event.name,
        theme: entry.event.theme,
        status: entry.event.status,
        date: DATE_FORMAT.format(new Date(entry.event.startDate)),
      }));
  });

  protected goHome(): void {
    this.router.navigateByUrl(this.homeUrl());
  }
}
