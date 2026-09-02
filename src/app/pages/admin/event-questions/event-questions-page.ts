import { DatePipe } from '@angular/common';
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
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  forkJoin,
  interval,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatchApi } from '../../../core/match/match-api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { PublicUserDto } from '../../../shared/dto/auth-response.dto';
import { MatchQuestionDto } from '../../../shared/dto/match-question.dto';
import { RegistrationDto } from '../../../shared/dto/registration.dto';
import { MatchStatus, StageType, StageWithMatchesDto } from '../../../shared/dto/stage.dto';
import { EventDto } from '../../../shared/dto/tournament.dto';
import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { EventTiming } from '../../../shared/ui/event-timing/event-timing';
import { Icon } from '../../../shared/ui/icon/icon';
import { Modal } from '../../../shared/ui/modal/modal';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { Select } from '../../../shared/ui/select/select';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';
import { Textarea } from '../../../shared/ui/textarea/textarea';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TopBar } from '../../../shared/ui/top-bar/top-bar';

const STAGE_LABEL: Record<StageType, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Third Place',
};

const MATCH_STATUS_BADGE: Record<MatchStatus, BadgeVariant> = {
  pending: 'gold',
  in_progress: 'accent',
  closed: 'neutral',
  walkover: 'error',
  expired: 'error',
  cancelled: 'neutral',
};

// Sort order for the Matches list — live matches first, then whatever's still
// pending, closed/finished stuff last (2026-08-31 explicit user requirement:
// "la parte superior debería tener los matches de instancias más actuales, o
// las que están en vivo").
const MATCH_GROUP_RANK: Record<MatchStatus, number> = {
  in_progress: 0,
  pending: 1,
  closed: 2,
  walkover: 2,
  expired: 2,
  cancelled: 3,
};

interface MatchOption {
  id: string;
  stageId: string;
  stageLabel: string;
  stagePosition: number;
  status: MatchStatus;
  matchup: string;
  playerAId: string | null;
  playerBId: string | null;
  refereeId: string | null;
  disqualifiedPlayerId: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
}

function shortId(id: string): string {
  return `Player #${id.slice(0, 8)}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time — Date#toISOString()
// is UTC and would shift the value, so this formats by local field.
function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

@Component({
  selector: 'app-event-questions-page',
  imports: [
    Badge,
    Button,
    ConfirmDialog,
    DatePipe,
    EventTiming,
    Icon,
    Modal,
    NavItem,
    Select,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    Textarea,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-questions-page.html',
})
export class EventQuestionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchApi = inject(MatchApi);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  protected readonly matchStatusBadge = MATCH_STATUS_BADGE;

  // Refreshable (not just fetched once): drawing the bracket flips the
  // event's status server-side, and the "Start tournament" gating needs to
  // see that without a full page reload.
  private readonly eventRefresh$ = new BehaviorSubject<void>(undefined);

  private readonly event = toSignal<EventDto | null>(
    this.eventRefresh$.pipe(switchMap(() => this.tournamentApi.getEvent(this.eventId))),
    { initialValue: null },
  );

  protected readonly eventName = computed(() => this.event()?.name ?? '');
  protected readonly maxScorePerMatch = computed(() => this.event()?.maxScorePerMatch ?? 0);
  protected readonly eventEndDate = computed(() => this.event()?.endDate ?? null);

  private readonly stagesRefresh$ = new BehaviorSubject<void>(undefined);

  // Later stages (semis, final, third place) draw themselves server-side as
  // prior matches close — via a cron, not a user click. Without a WS/push
  // mechanism yet (2026-09-01, explicit decision — no WS infra in the
  // monolith MVP), a short poll is the cheap stand-in so the admin sees new
  // matchups appear without having to manually refresh.
  private readonly stagesPoll$ = merge(this.stagesRefresh$, interval(15_000));

  private readonly stages = toSignal(
    this.stagesPoll$.pipe(switchMap(() => this.matchApi.listStages(this.eventId))),
    { initialValue: [] as StageWithMatchesDto[] },
  );

  // Resolved lazily via GET /auth/users/:id as new ids show up in stages/
  // registrations — no bulk lookup endpoint exists, so this is the one place
  // that fills in real names instead of showing a raw uuid everywhere.
  protected readonly playerNames = signal<Record<string, string>>({});

  protected readonly matchOptions = computed<MatchOption[]>(() => {
    const names = this.playerNames();
    const label = (id: string | null) => (id ? (names[id] ?? shortId(id)) : 'TBD');
    return this.stages()
      .flatMap((stage) =>
        stage.matches.map((match) => ({
          id: match.id,
          stageId: stage.id,
          stageLabel: STAGE_LABEL[stage.type],
          stagePosition: stage.position,
          status: match.status,
          matchup: `${label(match.playerAId)} vs ${label(match.playerBId)}`,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          refereeId: match.refereeId,
          disqualifiedPlayerId: match.disqualifiedPlayerId,
          scheduledStartAt: match.scheduledStartAt,
          scheduledEndAt: match.scheduledEndAt,
        })),
      )
      .sort((a, b) => {
        const rank = MATCH_GROUP_RANK[a.status] - MATCH_GROUP_RANK[b.status];
        return rank !== 0 ? rank : b.stagePosition - a.stagePosition;
      });
  });

  // Draw-bracket gate: only once every seat is filled and registration is
  // still open (so it can't be drawn twice).
  protected drawingBracket = signal(false);
  protected readonly canStartTournament = computed(
    () => this.event()?.status === 'registration_open' && this.eventFull(),
  );

  protected startTournament(): void {
    if (!this.canStartTournament() || this.drawingBracket()) {
      return;
    }
    this.drawingBracket.set(true);
    this.tournamentApi.drawFirstStage(this.eventId).subscribe({
      next: () => {
        this.drawingBracket.set(false);
        this.stagesRefresh$.next();
        this.eventRefresh$.next();
        this.toastService.success('Tournament started — bracket drawn.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.drawingBracket.set(false);
        this.toastService.error(error.error?.message ?? 'Could not start the tournament.');
      },
    });
  }

  // Referee picker — all referee accounts, fetched once (no time/calendar
  // filtering, assignment is fully manual, see MatchService.setReferee).
  protected readonly referees = toSignal(this.authService.listUsers('referee'), {
    initialValue: [] as PublicUserDto[],
  });
  protected readonly refereeOptions = computed(() =>
    this.referees().map((referee) => ({ value: referee.id, label: referee.name })),
  );

  // Registration — reuses the backend's existing admin-on-behalf endpoint
  // (RegistrationModule already supports self-service AND admin registering an
  // EXISTING player). Picking who to add uses the admin-only directory search
  // (GET /auth/users) — no account creation here, that's a separate feature.
  private readonly registrationsRefresh$ = new BehaviorSubject<void>(undefined);

  protected readonly registrations = toSignal(
    this.registrationsRefresh$.pipe(
      switchMap(() => this.tournamentApi.listRegistrations(this.eventId)),
    ),
    { initialValue: [] as RegistrationDto[] },
  );

  protected readonly registeredCount = computed(() => this.registrations().length);
  protected readonly capacity = computed(() => this.event()?.maxPlayers ?? 0);
  protected readonly eventFull = computed(() => this.registeredCount() >= this.capacity());
  protected readonly registeredIds = computed(
    () => new Set(this.registrations().map((registration) => registration.userId)),
  );

  protected readonly registrationRows = computed(() => {
    const names = this.playerNames();
    return this.registrations().map((registration) => ({
      ...registration,
      label: names[registration.userId] ?? shortId(registration.userId),
    }));
  });

  // Per-player "what's their current involvement" — drives the Players list
  // row action (Remove / Disqualify / Reinstate). Only pending or in_progress
  // matches matter here; a player only ever appears in one active match at a
  // time (single elimination). in_progress wins over pending if somehow both.
  protected readonly playerActiveMatch = computed(() => {
    const map: Record<string, { matchId: string; status: MatchStatus; disqualified: boolean }> = {};
    for (const match of this.matchOptions()) {
      if (match.status !== 'pending' && match.status !== 'in_progress') {
        continue;
      }
      for (const playerId of [match.playerAId, match.playerBId]) {
        if (!playerId) continue;
        const existing = map[playerId];
        if (!existing || (match.status === 'in_progress' && existing.status !== 'in_progress')) {
          map[playerId] = {
            matchId: match.id,
            status: match.status,
            disqualified: match.disqualifiedPlayerId === playerId,
          };
        }
      }
    }
    return map;
  });

  // Plain Set, NOT a signal — ids we've already requested (success or 404),
  // so a lookup failure never gets retried. This is deliberately outside the
  // reactive graph: reading playerNames() inside the effect below to compute
  // "missing" would make the effect depend on its own output signal, and on
  // every failed lookup the {...names} spread produces a new object reference
  // with identical content, which Angular still treats as a change — the
  // effect re-fires, "missing" is unchanged, and it refetches forever.
  private readonly attemptedPlayerIds = new Set<string>();

  constructor() {
    // Resolves any player id referenced by a match or a registration that we
    // haven't looked up yet — runs whenever either list changes.
    effect(() => {
      const ids = new Set<string>();
      for (const stage of this.stages()) {
        for (const match of stage.matches) {
          if (match.playerAId) ids.add(match.playerAId);
          if (match.playerBId) ids.add(match.playerBId);
        }
      }
      for (const registration of this.registrations()) {
        ids.add(registration.userId);
      }

      const missing = [...ids].filter((id) => !this.attemptedPlayerIds.has(id));
      if (missing.length === 0) {
        return;
      }
      missing.forEach((id) => this.attemptedPlayerIds.add(id));

      forkJoin(
        missing.map((id) =>
          this.authService.getUser(id).pipe(
            map((user) => [id, user.name] as const),
            catchError(() => of([id, null] as const)),
          ),
        ),
      ).subscribe((pairs) => {
        const resolved = pairs.filter((pair): pair is [string, string] => pair[1] !== null);
        if (resolved.length === 0) {
          return;
        }
        this.playerNames.update((names) => {
          const next = { ...names };
          for (const [id, name] of resolved) {
            next[id] = name;
          }
          return next;
        });
      });
    });

    // Pre-filling the participants/referee <select>s from selectMatch() alone
    // breaks when their option lists (registrations, referees — both one-shot
    // async fetches) haven't resolved yet at that moment: Angular writes the
    // model value, finds no matching <option> yet, and later — once the list
    // arrives — never re-syncs, because the underlying signal value itself
    // didn't change (a same-value .set() is a no-op, no re-render trigger).
    // Re-deriving here whenever the option lists become ready (or the
    // selected match changes) covers that race.
    effect(() => {
      const match = this.selectedMatch();
      const playersReady = this.playerOptions().length > 0;
      const refereesReady = this.refereeOptions().length > 0;
      if (!match) {
        return;
      }
      if (playersReady) {
        this.editPlayerAId.set(match.playerAId ?? '');
        this.editPlayerBId.set(match.playerBId ?? '');
      }
      if (refereesReady) {
        this.editRefereeId.set(match.refereeId ?? '');
      }
    });
  }

  // Bracket map modal — placeholder for now (2026-09-01), see
  // knowledge/drawings.md for how the real tree visualization gets built.
  protected bracketModalOpen = signal(false);

  protected openBracketModal(): void {
    this.bracketModalOpen.set(true);
  }

  protected closeBracketModal(): void {
    this.bracketModalOpen.set(false);
  }

  protected addPlayerModalOpen = signal(false);
  protected searchQuery = signal('');
  protected searching = signal(false);
  protected addingPlayerId = signal<string | null>(null);

  private readonly searchQuery$ = new Subject<string>();

  protected readonly playerResults = toSignal(
    this.searchQuery$.pipe(
      debounceTime(250),
      tap(() => this.searching.set(true)),
      switchMap((query) => this.authService.searchPlayers(query)),
      tap(() => this.searching.set(false)),
    ),
    { initialValue: [] as PublicUserDto[] },
  );

  protected selectedMatchId = signal<string | null>(null);
  protected questions = signal<MatchQuestionDto[]>([]);
  protected loadingQuestions = signal(false);

  protected readonly selectedMatch = computed(
    () => this.matchOptions().find((match) => match.id === this.selectedMatchId()) ?? null,
  );

  // Content editing mirrors the backend's own gate — a match already started
  // has locked-in questions (activatedAt is set), editing them after the fact
  // would silently invalidate a quiz already in progress or scored.
  protected readonly isEditable = computed(() => this.selectedMatch()?.status === 'pending');

  // Surfaces the disqualification here too, not just on the Players list row —
  // "esto debe sincronizarse en la vista del match" (2026-08-31 explicit
  // requirement). Same underlying field, just shown in both places.
  protected readonly disqualifiedPlayerLabel = computed(() => {
    const id = this.selectedMatch()?.disqualifiedPlayerId;
    if (!id) {
      return null;
    }
    return this.playerNames()[id] ?? shortId(id);
  });

  // Scheduling (start time + duration) is the trigger for AI question
  // generation — one action, one button (2026-08-31, explicit user decision:
  // a same-day earlier version split these into "Schedule" + a separate
  // participants/referee-gated "Create questions" step; reverted). The
  // question list/editor only shows once a match has been scheduled at least
  // once (hasSchedule) — see the template.
  protected scheduleStartAt = signal('');
  protected scheduleDurationMinutes = signal(30);

  // Tracks WHICH match is generating, not just whether one is (2026-08-31
  // bug fix — a single shared boolean disabled every other match's Schedule
  // button too while one was still generating, since the AI call can take a
  // while). `scheduling()` below only reads true for the currently selected
  // match, so switching to a different one shows it as free even mid-generation.
  protected schedulingMatchId = signal<string | null>(null);
  protected readonly scheduling = computed(
    () => this.schedulingMatchId() !== null && this.schedulingMatchId() === this.selectedMatchId(),
  );

  protected readonly hasSchedule = computed(() => !!this.selectedMatch()?.scheduledStartAt);

  // Computed end of the proposed schedule (start + duration) — used both to
  // gate the button and to explain why it's disabled.
  protected readonly scheduleEndPreview = computed(() => {
    const start = this.scheduleStartAt();
    const minutes = this.scheduleDurationMinutes();
    if (!start || !minutes || minutes <= 0) {
      return null;
    }
    return new Date(new Date(start).getTime() + minutes * 60_000);
  });

  protected readonly scheduleExceedsEventEnd = computed(() => {
    const end = this.scheduleEndPreview();
    const eventEnd = this.event()?.endDate;
    return !!end && !!eventEnd && end > new Date(eventEnd);
  });

  // 2026-08-31, explicit user decision: can't be clicked at all unless both
  // participants and the referee are already set, and the resulting window
  // can't run past the event's own end date.
  protected readonly canSchedule = computed(() => {
    const match = this.selectedMatch();
    return (
      this.isEditable() &&
      !this.scheduling() &&
      !!match?.playerAId &&
      !!match?.playerBId &&
      !!match?.refereeId &&
      this.scheduleStartAt().length > 0 &&
      this.scheduleDurationMinutes() > 0 &&
      !this.scheduleExceedsEventEnd()
    );
  });

  protected scheduleMatch(): void {
    const matchId = this.selectedMatchId();
    if (!matchId || !this.canSchedule()) {
      return;
    }
    this.schedulingMatchId.set(matchId);
    this.matchApi
      .schedule(this.eventId, matchId, {
        scheduledStartAt: new Date(this.scheduleStartAt()).toISOString(),
        durationMinutes: this.scheduleDurationMinutes(),
      })
      .subscribe({
        next: () => {
          this.schedulingMatchId.set(null);
          this.stagesRefresh$.next();
          this.loadQuestions(matchId);
          this.toastService.success('Match scheduled — questions generated by AI.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.schedulingMatchId.set(null);
          this.toastService.error(
            error.error?.message ?? 'Could not schedule the match. Check MOONSHOT_API_KEY.',
          );
        },
      });
  }

  // Starting the match — admin or referee, mirrors the backend's own gates
  // (start() in match.service.ts) so the button is disabled with a reason
  // instead of just failing on click. No trigger existed anywhere in the
  // frontend before this (2026-09-01, explicit user request) — matches had
  // to be started via curl/Swagger.
  protected readonly startBlockedReason = computed(() => {
    const match = this.selectedMatch();
    if (!match || match.status !== 'pending') return null; // not applicable, button hidden
    if (!match.scheduledStartAt || !match.scheduledEndAt) {
      return 'Schedule the match first.';
    }
    const now = new Date();
    if (now < new Date(match.scheduledStartAt)) {
      return `Can't start before ${new Date(match.scheduledStartAt).toLocaleString()}.`;
    }
    if (now > new Date(match.scheduledEndAt)) {
      return 'Past its scheduled end time — reschedule it first.';
    }
    if (this.budgetState() !== 'exact') {
      return 'Questions must add up to exactly the point budget first.';
    }
    return null;
  });

  protected readonly canStartMatch = computed(
    () => this.selectedMatch()?.status === 'pending' && this.startBlockedReason() === null,
  );

  protected startingMatchId = signal<string | null>(null);
  protected matchPendingStart = signal<MatchOption | null>(null);

  protected openStartMatch(): void {
    const match = this.selectedMatch();
    if (!match || !this.canStartMatch()) {
      return;
    }
    this.matchPendingStart.set(match);
  }

  protected cancelStartMatch(): void {
    if (this.startingMatchId()) {
      return;
    }
    this.matchPendingStart.set(null);
  }

  protected confirmStartMatch(): void {
    const match = this.matchPendingStart();
    if (!match || this.startingMatchId()) {
      return;
    }
    this.startingMatchId.set(match.id);
    this.matchApi.startMatch(this.eventId, match.id).subscribe({
      next: () => {
        this.startingMatchId.set(null);
        this.matchPendingStart.set(null);
        this.stagesRefresh$.next();
        this.toastService.success('Match started.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.startingMatchId.set(null);
        this.matchPendingStart.set(null);
        this.toastService.error(error.error?.message ?? 'Could not start the match.');
      },
    });
  }

  // Ending a live match early — admin or referee. Also the only way (short
  // of curl/Adminer) to unstick a match stuck in a bad in_progress state,
  // e.g. no active deadline — end it, then reopen() to replay properly.
  protected readonly canEndMatch = computed(() => this.selectedMatch()?.status === 'in_progress');

  protected endingMatchId = signal<string | null>(null);
  protected matchPendingEnd = signal<MatchOption | null>(null);

  protected openEndMatch(): void {
    const match = this.selectedMatch();
    if (!match || !this.canEndMatch()) {
      return;
    }
    this.matchPendingEnd.set(match);
  }

  protected cancelEndMatch(): void {
    if (this.endingMatchId()) {
      return;
    }
    this.matchPendingEnd.set(null);
  }

  protected confirmEndMatch(): void {
    const match = this.matchPendingEnd();
    if (!match || this.endingMatchId()) {
      return;
    }
    this.endingMatchId.set(match.id);
    this.matchApi.endMatch(this.eventId, match.id).subscribe({
      next: () => {
        this.endingMatchId.set(null);
        this.matchPendingEnd.set(null);
        this.stagesRefresh$.next();
        this.toastService.success('Match ended.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.endingMatchId.set(null);
        this.matchPendingEnd.set(null);
        this.toastService.error(error.error?.message ?? 'Could not end the match.');
      },
    });
  }

  // Reopen (Fase 10) — closed/walkover only. Full reset: answers, questions,
  // score/winner and ranking entry all cleared, back to pending. No frontend
  // trigger existed at all before this (2026-09-01, found while unsticking a
  // corrupted match — same gap as Start/End match). Uses its own small modal
  // (not app-confirm-dialog) because it needs a text field for the required
  // `reason`, which the shared confirm dialog doesn't support.
  protected readonly canReopenMatch = computed(() => {
    const status = this.selectedMatch()?.status;
    return status === 'closed' || status === 'walkover';
  });

  protected reopenModalOpen = signal(false);
  protected reopeningMatchId = signal<string | null>(null);
  protected reopenReason = signal('');
  private matchPendingReopen: MatchOption | null = null;

  protected readonly canConfirmReopen = computed(
    () => this.reopenReason().trim().length > 0 && this.reopeningMatchId() === null,
  );

  protected openReopenMatch(): void {
    const match = this.selectedMatch();
    if (!match || !this.canReopenMatch()) {
      return;
    }
    this.matchPendingReopen = match;
    this.reopenReason.set('');
    this.reopenModalOpen.set(true);
  }

  protected cancelReopenMatch(): void {
    if (this.reopeningMatchId()) {
      return;
    }
    this.reopenModalOpen.set(false);
    this.matchPendingReopen = null;
  }

  protected confirmReopenMatch(): void {
    const match = this.matchPendingReopen;
    if (!match || !this.canConfirmReopen()) {
      return;
    }
    this.reopeningMatchId.set(match.id);
    this.matchApi.reopenMatch(this.eventId, match.id, this.reopenReason().trim()).subscribe({
      next: () => {
        this.reopeningMatchId.set(null);
        this.reopenModalOpen.set(false);
        this.matchPendingReopen = null;
        this.stagesRefresh$.next();
        this.toastService.success('Match reopened — reschedule it to play again.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.reopeningMatchId.set(null);
        this.toastService.error(error.error?.message ?? 'Could not reopen the match.');
      },
    });
  }

  // Match cancellation — expired or live only; it will never be played.
  // NOT for a pending match (2026-08-31, explicit user correction) — a
  // pending match is meant to be *edited* (participants/referee/reschedule),
  // not cancelled, cancel doesn't add anything there. Separate confirm-dialog
  // from the Players list's remove/disqualify/reinstate one, since this
  // targets the whole match, not a specific player.
  protected readonly canCancelMatch = computed(() => {
    const status = this.selectedMatch()?.status;
    return status === 'expired' || status === 'in_progress';
  });

  protected cancellingMatchId = signal<string | null>(null);
  protected matchPendingCancel = signal<MatchOption | null>(null);

  protected openCancelMatch(): void {
    const match = this.selectedMatch();
    if (!match || !this.canCancelMatch()) {
      return;
    }
    this.matchPendingCancel.set(match);
  }

  protected cancelCancelMatch(): void {
    if (this.cancellingMatchId()) {
      return;
    }
    this.matchPendingCancel.set(null);
  }

  protected confirmCancelMatch(): void {
    const match = this.matchPendingCancel();
    if (!match || this.cancellingMatchId()) {
      return;
    }
    this.cancellingMatchId.set(match.id);
    this.matchApi.cancelMatch(this.eventId, match.id).subscribe({
      next: () => {
        this.cancellingMatchId.set(null);
        this.matchPendingCancel.set(null);
        this.stagesRefresh$.next();
        this.toastService.success('Match cancelled.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.cancellingMatchId.set(null);
        this.matchPendingCancel.set(null);
        this.toastService.error(error.error?.message ?? 'Could not cancel the match.');
      },
    });
  }

  // Redraw a whole stage's matchups (new seed, same participant pool) —
  // 2026-09-01, explicit user request. Only while EVERY match in the
  // selected match's stage is still pending — mirrors the backend guard in
  // StageService.redrawStage.
  protected readonly canRedrawStage = computed(() => {
    const stageId = this.selectedMatch()?.stageId;
    if (!stageId) {
      return false;
    }
    const stageMatches = this.matchOptions().filter((match) => match.stageId === stageId);
    return stageMatches.length > 0 && stageMatches.every((match) => match.status === 'pending');
  });

  protected redrawingStage = signal(false);
  protected stagePendingRedraw = signal<string | null>(null);

  protected openRedrawStage(): void {
    const stageId = this.selectedMatch()?.stageId;
    if (!stageId || !this.canRedrawStage()) {
      return;
    }
    this.stagePendingRedraw.set(stageId);
  }

  protected cancelRedrawStage(): void {
    if (this.redrawingStage()) {
      return;
    }
    this.stagePendingRedraw.set(null);
  }

  protected confirmRedrawStage(): void {
    const stageId = this.stagePendingRedraw();
    if (!stageId || this.redrawingStage()) {
      return;
    }
    this.redrawingStage.set(true);
    this.tournamentApi.redrawStage(this.eventId, stageId).subscribe({
      next: () => {
        this.redrawingStage.set(false);
        this.stagePendingRedraw.set(null);
        this.selectedMatchId.set(null);
        this.stagesRefresh$.next();
        this.toastService.success('Stage redrawn — new matchups.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.redrawingStage.set(false);
        this.stagePendingRedraw.set(null);
        this.toastService.error(error.error?.message ?? 'Could not redraw this stage.');
      },
    });
  }

  // Participants / referee — same "pending only" edit window as the questions.
  protected readonly playerOptions = computed(() =>
    this.registrationRows().map((row) => ({ value: row.userId, label: row.label })),
  );

  protected editPlayerAId = signal('');
  protected editPlayerBId = signal('');
  protected savingParticipants = signal(false);

  protected editRefereeId = signal('');
  protected savingReferee = signal(false);

  protected saveParticipants(): void {
    const matchId = this.selectedMatchId();
    const match = this.selectedMatch();
    if (!matchId || !match) {
      return;
    }
    const dto: { playerAId?: string; playerBId?: string } = {};
    if (this.editPlayerAId() && this.editPlayerAId() !== match.playerAId) {
      dto.playerAId = this.editPlayerAId();
    }
    if (this.editPlayerBId() && this.editPlayerBId() !== match.playerBId) {
      dto.playerBId = this.editPlayerBId();
    }
    if (!dto.playerAId && !dto.playerBId) {
      this.toastService.info('No changes to save.');
      return;
    }

    this.savingParticipants.set(true);
    this.matchApi.editParticipants(this.eventId, matchId, dto).subscribe({
      next: () => {
        this.savingParticipants.set(false);
        this.stagesRefresh$.next();
        this.toastService.success('Participants updated.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.savingParticipants.set(false);
        this.toastService.error(error.error?.message ?? 'Could not update participants.');
      },
    });
  }

  protected saveReferee(): void {
    const matchId = this.selectedMatchId();
    const match = this.selectedMatch();
    const refereeId = this.editRefereeId();
    if (!matchId || !match || !refereeId) {
      return;
    }
    if (refereeId === match.refereeId) {
      this.toastService.info('No changes to save.');
      return;
    }
    this.savingReferee.set(true);
    this.matchApi.setReferee(this.eventId, matchId, refereeId).subscribe({
      next: () => {
        this.savingReferee.set(false);
        this.stagesRefresh$.next();
        this.toastService.success('Referee assigned.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.savingReferee.set(false);
        this.toastService.error(error.error?.message ?? 'Could not assign the referee.');
      },
    });
  }

  protected readonly usedScore = computed(() =>
    round2(this.questions().reduce((sum, question) => sum + Number(question.maxScore), 0)),
  );

  protected readonly remainingScore = computed(() =>
    round2(this.maxScorePerMatch() - this.usedScore()),
  );

  protected readonly budgetState = computed<'under' | 'exact' | 'over'>(() => {
    const remaining = this.remainingScore();
    if (Math.abs(remaining) < 0.01) return 'exact';
    return remaining > 0 ? 'under' : 'over';
  });

  protected newText = signal('');
  protected newRubric = signal('');
  protected newMaxScore = signal(10);
  protected newTimeLimit = signal(30);
  protected adding = signal(false);

  protected readonly canAdd = computed(
    () =>
      this.isEditable() &&
      !this.adding() &&
      this.newText().trim().length > 0 &&
      this.newRubric().trim().length > 0 &&
      this.newMaxScore() > 0 &&
      this.newTimeLimit() > 0,
  );

  protected selectMatch(matchId: string): void {
    this.selectedMatchId.set(matchId);
    // editPlayerAId/editPlayerBId/editRefereeId are (re-)set by the effect in
    // the constructor, once their <select> option lists are actually ready.
    const match = this.matchOptions().find((option) => option.id === matchId);
    this.scheduleStartAt.set(
      match?.scheduledStartAt ? toDateTimeLocal(match.scheduledStartAt) : '',
    );
    this.scheduleDurationMinutes.set(
      match?.scheduledStartAt && match?.scheduledEndAt
        ? Math.round(
            (new Date(match.scheduledEndAt).getTime() -
              new Date(match.scheduledStartAt).getTime()) /
              60_000,
          )
        : 30,
    );
    this.loadQuestions(matchId);
  }

  // Sidebar "Questions" entry — jumps back to the match picker instead of
  // being a dead "you are here" marker, so drilling out of a match's editor
  // doesn't require scrolling back up.
  protected backToMatches(): void {
    this.selectedMatchId.set(null);
  }

  protected openAddPlayerModal(): void {
    this.addPlayerModalOpen.set(true);
    this.searchQuery.set('');
    this.searchQuery$.next('');
  }

  protected closeAddPlayerModal(): void {
    this.addPlayerModalOpen.set(false);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchQuery$.next(value);
  }

  protected addPlayer(user: PublicUserDto): void {
    this.addingPlayerId.set(user.id);
    this.tournamentApi.registerByAdmin(this.eventId, user.id).subscribe({
      next: () => {
        this.addingPlayerId.set(null);
        this.playerNames.update((names) => ({ ...names, [user.id]: user.name }));
        this.registrationsRefresh$.next();
        this.toastService.success(`${user.name} added to this event.`);
      },
      error: (error: { error?: { message?: string } }) => {
        this.addingPlayerId.set(null);
        this.toastService.error(error.error?.message ?? 'Could not register this player.');
      },
    });
  }

  // Which action the Players list row's button performs — see
  // playerActiveMatch(): "in a live match, not yet disqualified" is the only
  // case that isn't a plain remove (2026-08-31, explicit user decision).
  protected rowAction(userId: string): 'remove' | 'disqualify' {
    const active = this.playerActiveMatch()[userId];
    return active && active.status === 'in_progress' && !active.disqualified
      ? 'disqualify'
      : 'remove';
  }

  protected rowDisqualified(userId: string): boolean {
    return !!this.playerActiveMatch()[userId]?.disqualified;
  }

  protected playerActionPending = signal<{
    type: 'remove' | 'disqualify' | 'reinstate';
    registration: RegistrationDto & { label: string };
  } | null>(null);
  protected playerActionSubmitting = signal(false);

  protected readonly playerActionDialog = computed(() => {
    const pending = this.playerActionPending();
    if (!pending) {
      return null;
    }
    const name = pending.registration.label;
    if (pending.type === 'remove') {
      return {
        title: 'Remove player',
        message: `Remove ${name} from this event? If they're in a pending match, that match's slot will be cleared and you'll need to assign a replacement.`,
        confirmLabel: 'Remove',
      };
    }
    if (pending.type === 'disqualify') {
      return {
        title: 'Disqualify player',
        message: `Disqualify ${name} from their current live match? They won't be able to submit any more answers — the match keeps running for the opponent. You can reinstate them only while the match is still live; once it closes, the disqualification is final for this event.`,
        confirmLabel: 'Disqualify',
      };
    }
    return {
      title: 'Reinstate player',
      message: `Reinstate ${name}? This reverses the disqualification and lets them keep playing their current live match.`,
      confirmLabel: 'Reinstate',
    };
  });

  protected openPlayerAction(
    type: 'remove' | 'disqualify' | 'reinstate',
    registration: RegistrationDto & { label: string },
  ): void {
    this.playerActionPending.set({ type, registration });
  }

  protected cancelPlayerAction(): void {
    if (this.playerActionSubmitting()) {
      return;
    }
    this.playerActionPending.set(null);
  }

  protected confirmPlayerAction(): void {
    const pending = this.playerActionPending();
    if (!pending || this.playerActionSubmitting()) {
      return;
    }
    const { type, registration } = pending;
    this.playerActionSubmitting.set(true);

    if (type === 'remove') {
      this.tournamentApi.unregisterByAdmin(this.eventId, registration.userId).subscribe({
        next: () => {
          this.playerActionSubmitting.set(false);
          this.playerActionPending.set(null);
          this.registrationsRefresh$.next();
          this.stagesRefresh$.next();
          this.toastService.success(`${registration.label} removed from this event.`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.playerActionSubmitting.set(false);
          this.toastService.error(error.error?.message ?? 'Could not remove this player.');
        },
      });
      return;
    }

    const matchId = this.playerActiveMatch()[registration.userId]?.matchId;
    if (!matchId) {
      this.playerActionSubmitting.set(false);
      this.playerActionPending.set(null);
      return;
    }

    const request$ =
      type === 'disqualify'
        ? this.matchApi.disqualifyPlayer(this.eventId, matchId, registration.userId)
        : this.matchApi.reinstatePlayer(this.eventId, matchId);

    request$.subscribe({
      next: () => {
        this.playerActionSubmitting.set(false);
        this.playerActionPending.set(null);
        this.stagesRefresh$.next();
        this.toastService.success(
          type === 'disqualify'
            ? `${registration.label} disqualified.`
            : `${registration.label} reinstated.`,
        );
      },
      error: (error: { error?: { message?: string } }) => {
        this.playerActionSubmitting.set(false);
        this.toastService.error(
          error.error?.message ??
            (type === 'disqualify'
              ? 'Could not disqualify this player.'
              : 'Could not reinstate this player.'),
        );
      },
    });
  }

  private loadQuestions(matchId: string): void {
    this.loadingQuestions.set(true);
    this.matchApi.listQuestions(this.eventId, matchId).subscribe({
      next: (questions) => {
        this.questions.set([...questions].sort((a, b) => a.position - b.position));
        this.loadingQuestions.set(false);
      },
      error: () => {
        this.loadingQuestions.set(false);
        this.toastService.error('Could not load the match questions.');
      },
    });
  }

  protected updateDraftField(id: string, patch: Partial<MatchQuestionDto>): void {
    this.questions.update((questions) =>
      questions.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );
  }

  protected saveQuestion(question: MatchQuestionDto): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      return;
    }
    this.matchApi
      .updateQuestion(this.eventId, matchId, question.id, {
        text: question.text,
        rubric: question.rubric,
        maxScore: Number(question.maxScore),
        timeLimit: Number(question.timeLimit),
      })
      .subscribe({
        next: () => this.toastService.success(`Question ${question.position} saved.`),
        error: (error: { error?: { message?: string } }) => {
          this.toastService.error(error.error?.message ?? 'Could not save the question.');
          this.loadQuestions(matchId);
        },
      });
  }

  protected deleteQuestion(question: MatchQuestionDto): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      return;
    }
    if (!confirm(`Delete question ${question.position}? This cannot be undone.`)) {
      return;
    }
    this.matchApi.deleteQuestion(this.eventId, matchId, question.id).subscribe({
      next: () => {
        this.questions.update((questions) =>
          questions
            .filter((existing) => existing.id !== question.id)
            .map((existing, index) => ({ ...existing, position: index + 1 })),
        );
        this.toastService.success('Question removed.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.toastService.error(error.error?.message ?? 'Could not remove the question.');
      },
    });
  }

  protected addQuestion(): void {
    const matchId = this.selectedMatchId();
    if (!matchId || !this.canAdd()) {
      return;
    }
    this.adding.set(true);
    this.matchApi
      .createQuestion(this.eventId, matchId, {
        text: this.newText().trim(),
        rubric: this.newRubric().trim(),
        maxScore: this.newMaxScore(),
        timeLimit: this.newTimeLimit(),
      })
      .subscribe({
        next: (created) => {
          this.adding.set(false);
          this.questions.update((questions) => [...questions, created]);
          this.newText.set('');
          this.newRubric.set('');
          this.newMaxScore.set(10);
          this.newTimeLimit.set(30);
          this.toastService.success('Question added.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.adding.set(false);
          this.toastService.error(error.error?.message ?? 'Could not add the question.');
        },
      });
  }

  protected done(): void {
    this.router.navigateByUrl('/events');
  }

  protected goToUsers(): void {
    this.router.navigateByUrl('/admin/users');
  }
}
