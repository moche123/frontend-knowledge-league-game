import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { RankingApi } from '../../core/ranking/ranking-api.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';
import { RegistrationDto } from '../../shared/dto/registration.dto';
import { EventDto } from '../../shared/dto/tournament.dto';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';
import { Tabs, TabItem } from '../../shared/ui/tabs/tabs';
import {
  TournamentCard,
  TournamentCardState,
} from '../../shared/ui/tournament-card/tournament-card';

const CARD_TONES: { categoryTone: 'primary' | 'secondary' | 'neutral'; glowClass: string }[] = [
  { categoryTone: 'primary', glowClass: 'bg-primary' },
  { categoryTone: 'secondary', glowClass: 'bg-secondary' },
  { categoryTone: 'neutral', glowClass: 'bg-outline' },
];

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

interface EventWithRegistrations {
  event: EventDto;
  registrations: RegistrationDto[];
}

interface TournamentCardModel {
  id: string;
  category: string;
  categoryTone: 'primary' | 'secondary' | 'neutral';
  glowClass: string;
  title: string;
  points: number;
  date: string;
  enrolled: number;
  capacity: number;
  progress: number;
  state: TournamentCardState;
}

@Component({
  selector: 'app-player-dashboard-page',
  imports: [
    Avatar,
    Button,
    Icon,
    NavItem,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    Tabs,
    TournamentCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-dashboard-page.html',
})
export class PlayerDashboardPage {
  public authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly rankingApi = inject(RankingApi);
  private readonly router = inject(Router);

  protected readonly tabs: TabItem[] = [
    { id: 'registered', label: 'My Registrations' },
    { id: 'open', label: 'Open Registration' },
    { id: 'ongoing', label: 'Ongoing' },
  ];
  protected activeTab = signal('open');

  protected readonly registeringEventId = signal<string | null>(null);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly eventsWithRegistrations = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.tournamentApi.listEvents()),
      switchMap((events) =>
        events.length === 0
          ? of<EventWithRegistrations[]>([])
          : forkJoin(
              events.map((event) =>
                this.tournamentApi
                  .listRegistrations(event.id)
                  .pipe(map((registrations) => ({ event, registrations }))),
              ),
            ),
      ),
    ),
    { initialValue: [] as EventWithRegistrations[] },
  );

  private readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  private readonly leaderboard = toSignal(this.rankingApi.getGlobalLeaderboard(), {
    initialValue: [] as LeaderboardRowDto[],
  });

  protected readonly rankPosition = computed(() => {
    const index = this.leaderboard().findIndex((row) => row.userId === this.currentUserId());
    return index === -1 ? null : index + 1;
  });

  protected readonly totalPoints = computed(
    () => this.leaderboard().find((row) => row.userId === this.currentUserId())?.totalPoints ?? 0,
  );

  protected readonly openEvents = computed(() =>
    this.eventsWithRegistrations()
      .filter((entry) => entry.event.status === 'registration_open')
      .map((entry, index) => this.toCardModel(entry, index)),
  );

  protected readonly ongoingEvents = computed(() =>
    this.eventsWithRegistrations()
      .filter((entry) => entry.event.status === 'in_progress')
      .map((entry, index) => this.toCardModel(entry, index)),
  );

  protected readonly registeredEvents = computed(() => {
    const userId = this.currentUserId();
    return this.eventsWithRegistrations()
      .filter(
        (entry) =>
          entry.event.status !== 'finished' &&
          entry.registrations.some((registration) => registration.userId === userId),
      )
      .map((entry, index) => this.toCardModel(entry, index));
  });

  protected readonly activeEvents = computed(() => {
    switch (this.activeTab()) {
      case 'registered':
        return this.registeredEvents();
      case 'ongoing':
        return this.ongoingEvents();
      default:
        return this.openEvents();
    }
  });

  protected goToProfile(): void {
    this.router.navigateByUrl('/profile');
  }

  protected register(eventId: string): void {
    this.registeringEventId.set(eventId);
    this.tournamentApi.registerSelf(eventId).subscribe({
      next: () => {
        this.registeringEventId.set(null);
        this.refresh$.next();
      },
      error: () => this.registeringEventId.set(null),
    });
  }

  private toCardModel(entry: EventWithRegistrations, index: number): TournamentCardModel {
    const enrolledCount = entry.registrations.length;
    const isRegistered = entry.registrations.some(
      (registration) => registration.userId === this.currentUserId(),
    );
    const tone = CARD_TONES[index % CARD_TONES.length];

    return {
      id: entry.event.id,
      category: entry.event.theme,
      categoryTone: tone.categoryTone,
      glowClass: tone.glowClass,
      title: entry.event.name,
      points: entry.event.maxScorePerMatch,
      date: DATE_FORMAT.format(new Date(entry.event.startDate)),
      enrolled: enrolledCount,
      capacity: entry.event.maxPlayers,
      progress: Math.round((enrolledCount / entry.event.maxPlayers) * 100),
      state: this.stateFor(entry.event, enrolledCount, isRegistered),
    };
  }

  private stateFor(
    event: EventDto,
    enrolledCount: number,
    isRegistered: boolean,
  ): TournamentCardState {
    if (event.status === 'in_progress') {
      return 'ongoing';
    }
    if (isRegistered) {
      return 'registered';
    }
    if (enrolledCount >= event.maxPlayers) {
      return 'full';
    }
    return 'register';
  }
}
