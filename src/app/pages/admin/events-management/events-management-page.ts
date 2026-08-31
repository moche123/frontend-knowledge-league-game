import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BehaviorSubject, forkJoin, map, of, switchMap } from 'rxjs';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { EventDto, EventStatus } from '../../../shared/dto/tournament.dto';
import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { ProgressBar, ProgressTone } from '../../../shared/ui/progress-bar/progress-bar';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TopBar } from '../../../shared/ui/top-bar/top-bar';

const STATUS_BADGE: Record<EventStatus, BadgeVariant> = {
  registration_open: 'gold',
  in_progress: 'accent',
  finished: 'neutral',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  registration_open: 'Open Registration',
  in_progress: 'Live',
  finished: 'Finished',
};

const STATUS_PROGRESS_TONE: Record<EventStatus, ProgressTone> = {
  registration_open: 'gold',
  in_progress: 'accent',
  finished: 'neutral',
};

const PLAYER_COUNTS = [4, 8, 16, 32] as const;

// Must match the drawer's `duration-300` class in the template.
const DRAWER_TRANSITION_MS = 300;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time — Date#toISOString() is
// UTC and would shift the value, so this formats by local field, not by string.
function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface EventRow {
  id: string;
  name: string;
  theme: string;
  status: EventStatus;
  startLabel: string;
  endLabel: string;
  enrolled: number;
  capacity: number;
  progress: number;
  refereeAssigned: boolean;
}

interface EventWithRegistrationCount {
  event: EventDto;
  enrolled: number;
}

@Component({
  selector: 'app-events-management-page',
  imports: [
    Badge,
    Button,
    Icon,
    NavItem,
    ProgressBar,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './events-management-page.html',
})
export class EventsManagementPage {
  private readonly tournamentApi = inject(TournamentApi);
  private readonly toastService = inject(ToastService);

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusProgressTone = STATUS_PROGRESS_TONE;
  protected readonly playerCounts = PLAYER_COUNTS;

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly eventsWithCounts = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.tournamentApi.listEvents()),
      switchMap((events) =>
        events.length === 0
          ? of<EventWithRegistrationCount[]>([])
          : forkJoin(
              events.map((event) =>
                this.tournamentApi
                  .listRegistrations(event.id)
                  .pipe(map((registrations) => ({ event, enrolled: registrations.length }))),
              ),
            ),
      ),
    ),
    { initialValue: [] as EventWithRegistrationCount[] },
  );

  protected readonly events = computed<EventRow[]>(() =>
    this.eventsWithCounts()
      .map(({ event, enrolled }) => ({
        id: event.id,
        name: event.name,
        theme: event.theme,
        status: event.status,
        startLabel: DATE_TIME_FORMAT.format(new Date(event.startDate)),
        endLabel: DATE_TIME_FORMAT.format(new Date(event.endDate)),
        enrolled,
        capacity: event.maxPlayers,
        progress: Math.round((enrolled / event.maxPlayers) * 100),
        refereeAssigned: event.refereeId !== null,
      }))
      .sort((a, b) => a.startLabel.localeCompare(b.startLabel)),
  );

  // The drawer is not mounted in the DOM at all until first opened (panelVisible),
  // so there is nothing on screen to flash on initial page load. panelOpen only
  // toggles the transform once the element already exists, so the slide-in/out
  // transition always animates between two real, painted frames instead of racing
  // the element's very first style commit.
  protected panelVisible = signal(false);
  protected panelOpen = signal(false);
  protected eventName = signal('');
  protected theme = signal('');
  protected startDate = signal('');
  protected endDate = signal('');
  protected maxPlayers = signal(8);
  protected questionsPerMatch = signal(5);
  protected maxScore = signal(100);

  protected creating = signal(false);
  protected createError = signal('');

  // Recomputed each time the drawer opens (see openPanel) rather than once at
  // module load, so a drawer left open across midnight still enforces "tomorrow"
  // against the current day.
  protected readonly minStartDate = signal(toDateTimeLocal(startOfTomorrow()));

  protected readonly minEndDate = computed(() => this.startDate() || this.minStartDate());

  // datetime-local values are "YYYY-MM-DDTHH:mm" — same-length zero-padded fields,
  // so plain string comparison is a valid (and timezone-safe) ordering check.
  protected readonly dateError = computed(() => {
    const start = this.startDate();
    const end = this.endDate();

    if (start && start < this.minStartDate()) {
      return 'Start date must be tomorrow or later.';
    }
    if (start && end && end <= start) {
      return 'End date must be after the start date.';
    }
    return '';
  });

  protected readonly canCreate = computed(
    () =>
      this.eventName().trim().length > 0 &&
      this.theme().trim().length > 0 &&
      this.startDate().length > 0 &&
      this.endDate().length > 0 &&
      !this.dateError() &&
      !this.creating(),
  );

  // questionsPerMatch is @IsInt() on the backend — a bare valueAsNumber from the
  // input lets someone type "5.5" and get rejected with an opaque 400. Round and
  // guard NaN (empty field) here instead of trusting native number input parsing.
  protected setQuestionsPerMatch(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this.questionsPerMatch.set(Math.max(1, Math.round(value)));
  }

  protected setMaxScore(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this.maxScore.set(Math.min(100, Math.max(1, value)));
  }

  protected togglePanel(): void {
    if (this.panelOpen()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    this.createError.set('');
    this.minStartDate.set(toDateTimeLocal(startOfTomorrow()));
    this.panelVisible.set(true);
    // Mount closed first, then flip to open on the next frame so the browser
    // has an actual painted "closed" frame to transition from.
    requestAnimationFrame(() => this.panelOpen.set(true));
  }

  private closePanel(): void {
    this.panelOpen.set(false);
    setTimeout(() => this.panelVisible.set(false), DRAWER_TRANSITION_MS);
  }

  protected createEvent(): void {
    if (!this.canCreate()) {
      return;
    }

    this.creating.set(true);
    this.createError.set('');
    const name = this.eventName().trim();

    this.tournamentApi
      .createEvent({
        name,
        theme: this.theme().trim(),
        startDate: new Date(this.startDate()).toISOString(),
        endDate: new Date(this.endDate()).toISOString(),
        maxPlayers: this.maxPlayers(),
        questionsPerMatch: this.questionsPerMatch(),
        maxScorePerMatch: this.maxScore(),
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.resetForm();
          this.closePanel();
          this.refresh$.next();
          this.toastService.success(`Event "${name}" created.`);
        },
        error: (error: { status?: number }) => {
          this.creating.set(false);
          const message =
            error.status === 409
              ? 'An event with this name already exists.'
              : 'Could not create the event. Check the data and try again.';
          this.createError.set(message);
          this.toastService.error(message);
        },
      });
  }

  private resetForm(): void {
    this.eventName.set('');
    this.theme.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.maxPlayers.set(8);
    this.questionsPerMatch.set(5);
    this.maxScore.set(100);
  }
}
