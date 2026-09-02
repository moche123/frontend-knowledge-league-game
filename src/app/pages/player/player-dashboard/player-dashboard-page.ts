import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { RegistrationDto } from '../../../shared/dto/registration.dto';
import { EventDto } from '../../../shared/dto/tournament.dto';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';
import { Tabs, TabItem } from '../../../shared/ui/tabs/tabs';
import { TopBar } from '../../../shared/ui/top-bar/top-bar';
import {
  TournamentCard,
  TournamentCardState,
} from '../../../shared/ui/tournament-card/tournament-card';

const CARD_TONES: { categoryTone: 'primary' | 'secondary' | 'neutral'; glowClass: string }[] = [
  { categoryTone: 'primary', glowClass: 'bg-primary' },
  { categoryTone: 'secondary', glowClass: 'bg-secondary' },
  { categoryTone: 'neutral', glowClass: 'bg-outline' },
];

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
  startAt: string;
  endAt: string;
  enrolled: number;
  capacity: number;
  progress: number;
  state: TournamentCardState;
}

@Component({
  selector: 'app-player-dashboard-page',
  imports: [
    Button,
    Icon,
    NavItem,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    Tabs,
    TopBar,
    TournamentCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-dashboard-page.html',
})
export class PlayerDashboardPage {
  public authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly router = inject(Router);

  protected readonly tabs: TabItem[] = [
    { id: 'registered', label: 'My Registrations' },
    { id: 'open', label: 'Open Registration' },
    { id: 'ongoing', label: 'Ongoing' },
  ];
  protected activeTab = signal('registered');

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

  protected readonly openEvents = computed(() =>
    this.eventsWithRegistrations()
      .filter((entry) => entry.event.status === 'registration_open')
      .map((entry, index) => this.toCardModel(entry, index)),
  );

  // Requires isRegistered too (2026-09-01 fix) — was showing every
  // in-progress event platform-wide, not just the player's own.
  protected readonly ongoingEvents = computed(() => {
    const userId = this.currentUserId();
    return this.eventsWithRegistrations()
      .filter(
        (entry) =>
          entry.event.status === 'in_progress' &&
          entry.registrations.some((registration) => registration.userId === userId),
      )
      .map((entry, index) => this.toCardModel(entry, index));
  });

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

  // 'ongoing' state only — goes to the "my matches in this tournament" list
  // (my-matches-page), not straight into a specific match. The event being
  // in_progress doesn't mean this player has a live match right now (could
  // be eliminated, or waiting on their own match to start) — that's resolved
  // per-match on that page instead of pre-fetched here for every card.
  protected enterMatch(eventId: string): void {
    this.router.navigateByUrl(`/my-matches/${eventId}`);
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
      startAt: entry.event.startDate,
      endAt: entry.event.endDate,
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
    // Registration is only for registration_open events (RegistrationModule)
    // — a non-registered user never legitimately reaches this branch, since
    // every tab that can show an in_progress entry already filters by
    // isRegistered upstream. Kept as an explicit gate anyway, not just
    // relying on the caller: this is a shared helper, not just this page's
    // filtered views.
    if (event.status === 'in_progress' && isRegistered) {
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
