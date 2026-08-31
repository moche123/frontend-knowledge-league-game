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
  map,
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
};

interface MatchOption {
  id: string;
  stageLabel: string;
  status: MatchStatus;
  matchup: string;
  playerAId: string | null;
  playerBId: string | null;
  refereeId: string | null;
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

  private readonly stagesRefresh$ = new BehaviorSubject<void>(undefined);

  private readonly stages = toSignal(
    this.stagesRefresh$.pipe(switchMap(() => this.matchApi.listStages(this.eventId))),
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
      .slice()
      .sort((a, b) => a.position - b.position)
      .flatMap((stage) =>
        stage.matches.map((match) => ({
          id: match.id,
          stageLabel: STAGE_LABEL[stage.type],
          status: match.status,
          matchup: `${label(match.playerAId)} vs ${label(match.playerBId)}`,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          refereeId: match.refereeId,
          scheduledStartAt: match.scheduledStartAt,
          scheduledEndAt: match.scheduledEndAt,
        })),
      );
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

  // Scheduling (start time + duration) is the trigger for AI question
  // generation — one action, one button (2026-08-31, explicit user decision:
  // a same-day earlier version split these into "Schedule" + a separate
  // participants/referee-gated "Create questions" step; reverted). The
  // question list/editor only shows once a match has been scheduled at least
  // once (hasSchedule) — see the template.
  protected scheduleStartAt = signal('');
  protected scheduleDurationMinutes = signal(30);
  protected scheduling = signal(false);

  protected readonly hasSchedule = computed(() => !!this.selectedMatch()?.scheduledStartAt);

  protected readonly canSchedule = computed(
    () =>
      this.isEditable() &&
      !this.scheduling() &&
      this.scheduleStartAt().length > 0 &&
      this.scheduleDurationMinutes() > 0,
  );

  protected scheduleMatch(): void {
    const matchId = this.selectedMatchId();
    if (!matchId || !this.canSchedule()) {
      return;
    }
    this.scheduling.set(true);
    this.matchApi
      .schedule(this.eventId, matchId, {
        scheduledStartAt: new Date(this.scheduleStartAt()).toISOString(),
        durationMinutes: this.scheduleDurationMinutes(),
      })
      .subscribe({
        next: () => {
          this.scheduling.set(false);
          this.stagesRefresh$.next();
          this.loadQuestions(matchId);
          this.toastService.success('Match scheduled — questions generated by AI.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.scheduling.set(false);
          this.toastService.error(
            error.error?.message ?? 'Could not schedule the match. Check MOONSHOT_API_KEY.',
          );
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

  protected removePlayer(registration: RegistrationDto & { label: string }): void {
    if (!confirm(`Remove ${registration.label} from this event?`)) {
      return;
    }
    this.tournamentApi.unregisterByAdmin(this.eventId, registration.userId).subscribe({
      next: () => {
        this.registrationsRefresh$.next();
        this.toastService.success(`${registration.label} removed from this event.`);
      },
      error: (error: { error?: { message?: string } }) => {
        this.toastService.error(error.error?.message ?? 'Could not remove this player.');
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
