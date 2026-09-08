import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Subject, catchError, filter, forkJoin, map, merge, of, scan, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MatchApi } from '../../../core/match/match-api.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentApi } from '../../../core/tournament/tournament-api.service';
import { DisputeChatMessageDto } from '../../../shared/dto/dispute-chat.dto';
import {
  MatchDto,
  MatchStatus,
  StageType,
  StageWithMatchesDto,
} from '../../../shared/dto/stage.dto';
import {
  AssignmentCard,
  AssignmentStatus,
} from '../../../shared/ui/assignment-card/assignment-card';
import { Button } from '../../../shared/ui/button/button';
import { ChatEntry, ChatPanel } from '../../../shared/ui/chat-panel/chat-panel';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';

const STAGE_LABEL: Record<StageType, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Third Place',
};

// AssignmentCard only knows 4 visual states — expired/cancelled fold into
// "closed" (faded, nothing left to officiate), matching how a referee
// actually cares about these: is it live, waiting, or done.
const ASSIGNMENT_STATUS: Record<MatchStatus, AssignmentStatus> = {
  pending: 'pending',
  in_progress: 'live',
  closed: 'closed',
  walkover: 'walkover',
  expired: 'closed',
  cancelled: 'closed',
};

// Same ordering rule as dispute-inbox-page: live floats to the top.
const STATUS_RANK: Record<MatchStatus, number> = {
  in_progress: 0,
  pending: 1,
  walkover: 2,
  expired: 3,
  closed: 4,
  cancelled: 5,
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

interface AssignmentRow {
  eventId: string;
  matchId: string;
  tournament: string;
  matchup: string;
  stage: string;
  status: MatchStatus;
  scheduledStartAt: string | null;
}

@Component({
  selector: 'app-judge-panel-page',
  imports: [
    AssignmentCard,
    Button,
    ChatPanel,
    ConfirmDialog,
    Icon,
    NavItem,
    SideNav,
    SideNavCommon,
    SideNavHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './judge-panel-page.html',
})
export class JudgePanelPage {
  private readonly authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly matchApi = inject(MatchApi);
  private readonly realtime = inject(RealtimeService);
  private readonly toastService = inject(ToastService);

  private readonly currentUserId = this.authService.currentUser()?.id ?? null;

  protected readonly assignmentStatus = ASSIGNMENT_STATUS;

  private matchupLabel(match: MatchDto, names: Record<string, string>): string {
    const label = (id: string | null) => (id ? (names[id] ?? '…') : 'TBD');
    return `${label(match.playerAId)} vs ${label(match.playerBId)}`;
  }

  // Every match across every event where this referee is assigned
  // (match.refereeId) — same participant rule the backend enforces.
  protected readonly rows = toSignal(
    this.tournamentApi.listEvents().pipe(
      switchMap((events) =>
        events.length === 0
          ? of<AssignmentRow[]>([])
          : forkJoin(
              events.map((event) =>
                (event.status === 'registration_open'
                  ? of<StageWithMatchesDto[]>([])
                  : this.matchApi.listStages(event.id)
                ).pipe(
                  switchMap((stages) => {
                    const entries = stages.flatMap((stage) =>
                      stage.matches
                        .filter((match) => match.refereeId === this.currentUserId)
                        .map((match) => ({ stage, match })),
                    );
                    if (entries.length === 0) return of<AssignmentRow[]>([]);

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
                        entries.map(({ stage, match }): AssignmentRow => ({
                          eventId: event.id,
                          matchId: match.id,
                          tournament: event.name,
                          matchup: this.matchupLabel(match, names),
                          stage: STAGE_LABEL[stage.type],
                          status: match.status,
                          scheduledStartAt: match.scheduledStartAt,
                        })),
                      ),
                    );
                  }),
                ),
              ),
            ).pipe(map((rowsPerEvent) => rowsPerEvent.flat())),
      ),
      map((rows) => rows.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])),
      catchError(() => of<AssignmentRow[]>([])),
    ),
    { initialValue: [] as AssignmentRow[] },
  );

  protected metaLabel(row: AssignmentRow): string {
    return row.scheduledStartAt
      ? DATE_FORMAT.format(new Date(row.scheduledStartAt))
      : 'Not scheduled';
  }

  protected timeLabel(row: AssignmentRow): string | undefined {
    return row.scheduledStartAt ? TIME_FORMAT.format(new Date(row.scheduledStartAt)) : undefined;
  }

  // Selected assignment — defaults to the top of the (already live-first
  // sorted) list as soon as it loads, so the chat panel isn't empty on open.
  // Skips anything the referee has locally "ignored" (see ignoreAndClose).
  protected readonly selectedMatchId = signal<string | null>(null);
  private readonly ignoredMatchIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      const rows = this.rows();
      const ignored = this.ignoredMatchIds();
      if (this.selectedMatchId() === null) {
        const next = rows.find((row) => !ignored.has(row.matchId));
        if (next) this.selectedMatchId.set(next.matchId);
      }
    });
  }

  protected selectRow(row: AssignmentRow): void {
    this.selectedMatchId.set(row.matchId);
  }

  protected readonly selectedRow = computed(
    () => this.rows().find((row) => row.matchId === this.selectedMatchId()) ?? null,
  );

  private readonly selection$ = toObservable(this.selectedRow);

  // Match itself, refetched whenever the selection changes, and again on
  // demand (matchRefresh$) right after declareWinner succeeds — needed to
  // know which player id is which for message tone, and to reflect a
  // corrected winnerId immediately.
  private readonly matchRefresh$ = new Subject<void>();

  protected readonly selectedMatch = toSignal(
    this.selection$.pipe(
      switchMap((row) => {
        if (!row) return of<MatchDto | null>(null);
        return merge(of(undefined), this.matchRefresh$).pipe(
          switchMap(() =>
            this.matchApi.getMatch(row.eventId, row.matchId).pipe(catchError(() => of(null))),
          ),
        );
      }),
    ),
    { initialValue: null as MatchDto | null },
  );

  // Hydrate once, then receive messages from the selected match room.
  private readonly rawMessages = toSignal(
    this.selection$.pipe(
      switchMap((row) => {
        if (!row) return of<DisputeChatMessageDto[] | null>(null);
        return this.matchApi.getChatMessages(row.eventId, row.matchId).pipe(
          switchMap((initial) =>
            merge(
              of(initial),
              this.realtime.matchEvents(row.eventId, row.matchId).pipe(
                filter((event) => event.chat !== undefined),
                map((event) => [event.chat!]),
              ),
            ).pipe(
              scan((messages, next) => {
                const existing = new Set(messages.map((message) => message.id));
                return [...messages, ...next.filter((message) => !existing.has(message.id))];
              }, initial),
            ),
          ),
          catchError(() => of(null)),
        );
      }),
    ),
    { initialValue: null as DisputeChatMessageDto[] | null },
  );

  protected readonly authorNames = signal<Record<string, string>>({});
  private readonly resolvedAuthorIds = new Set<string>();

  private resolveAuthorNames(ids: string[]): void {
    const missing = ids.filter((id) => !this.resolvedAuthorIds.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => this.resolvedAuthorIds.add(id));
    missing.forEach((id) => {
      this.authService.getUserName(id).subscribe({
        next: (user) => this.authorNames.update((names) => ({ ...names, [id]: user.name })),
        error: () => {
          /* leave unresolved — falls back to "Loading…" below */
        },
      });
    });
  }

  protected readonly messages = computed<ChatEntry[]>(() => {
    const raw = this.rawMessages();
    const match = this.selectedMatch();
    if (!raw) return [];

    this.resolveAuthorNames([...new Set(raw.map((message) => message.authorId))]);
    const names = this.authorNames();

    return raw.map((message): ChatEntry => {
      if (message.text.startsWith('[System]')) {
        return {
          id: message.id,
          tone: 'system',
          align: 'left',
          text: message.text.replace(/^\[System\]\s*/, ''),
        };
      }

      const authorName = names[message.authorId] ?? 'Loading…';
      const isSelf = this.currentUserId !== null && message.authorId === this.currentUserId;
      const isPlayerA = match != null && message.authorId === match.playerAId;
      const isPlayerB = match != null && message.authorId === match.playerBId;

      if (isSelf) {
        return {
          id: message.id,
          tone: 'arbiter',
          align: 'right',
          author: authorName,
          time: TIME_FORMAT.format(new Date(message.createdAt)),
          verified: true,
          text: message.text,
        };
      }
      if (isPlayerA) {
        return {
          id: message.id,
          tone: 'self',
          align: 'left',
          author: authorName,
          time: TIME_FORMAT.format(new Date(message.createdAt)),
          avatarInitial: authorName.slice(0, 1).toUpperCase(),
          text: message.text,
        };
      }
      if (isPlayerB) {
        return {
          id: message.id,
          tone: 'opponent',
          align: 'right',
          author: authorName,
          time: TIME_FORMAT.format(new Date(message.createdAt)),
          avatarInitial: authorName.slice(0, 1).toUpperCase(),
          text: message.text,
        };
      }
      // Not a player, not this referee — the only other role that can post
      // here is admin (see DisputeChatService's participant check).
      return {
        id: message.id,
        tone: 'arbiter',
        align: 'right',
        author: `${authorName} (Admin)`,
        time: TIME_FORMAT.format(new Date(message.createdAt)),
        verified: true,
        text: message.text,
      };
    });
  });

  protected sending = signal(false);

  protected onSend(text: string): void {
    const row = this.selectedRow();
    if (!row) return;
    this.sending.set(true);
    this.realtime.sendChatMessage(row.eventId, row.matchId, { text }).subscribe({
      next: () => {
        this.sending.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.sending.set(false);
        this.toastService.error(error.error?.message ?? 'Could not send message.');
      },
    });
  }

  protected matchLabel(row: AssignmentRow | null): string {
    return row ? `${row.tournament} · ${row.matchup}` : 'No assignment selected';
  }

  // Winner / claim-author / loser, for the "resolve this dispute" header —
  // resolves whatever names are missing through the same authorNames cache
  // the chat messages use.
  protected readonly disputeSummary = computed(() => {
    const match = this.selectedMatch();
    if (!match) return null;

    const ids: string[] = [];
    if (match.playerAId) ids.push(match.playerAId);
    if (match.playerBId) ids.push(match.playerBId);
    if (match.winnerId) ids.push(match.winnerId);

    // The dispute's opening message — first non-system entry in the thread.
    const claimMessage = this.rawMessages()?.find((m) => !m.text.startsWith('[System]')) ?? null;
    if (claimMessage) ids.push(claimMessage.authorId);

    this.resolveAuthorNames(ids);
    const names = this.authorNames();

    const loserId = match.winnerId
      ? match.winnerId === match.playerAId
        ? match.playerBId
        : match.playerAId
      : null;

    return {
      winnerName: match.winnerId ? (names[match.winnerId] ?? '…') : null,
      loserId,
      loserName: loserId ? (names[loserId] ?? '…') : null,
      claimAuthorName: claimMessage ? (names[claimMessage.authorId] ?? '…') : null,
    };
  });

  // "Solo cierra el thread visualmente" — local-only, doesn't touch the
  // backend. Deselects the current dispute and excludes it from
  // auto-selection going forward; the referee can still reopen it by
  // clicking its card again.
  protected ignoreAndClose(): void {
    const id = this.selectedMatchId();
    if (id) this.ignoredMatchIds.update((current) => new Set(current).add(id));
    this.selectedMatchId.set(null);
  }

  protected readonly declareWinnerPending = signal<{
    eventId: string;
    matchId: string;
    loserId: string;
    loserName: string;
  } | null>(null);
  protected readonly declareWinnerSubmitting = signal(false);

  protected askDeclareWinner(): void {
    const row = this.selectedRow();
    const summary = this.disputeSummary();
    if (!row || !summary?.loserId) return;
    this.declareWinnerPending.set({
      eventId: row.eventId,
      matchId: row.matchId,
      loserId: summary.loserId,
      loserName: summary.loserName ?? 'the other player',
    });
  }

  protected cancelDeclareWinner(): void {
    if (this.declareWinnerSubmitting()) return;
    this.declareWinnerPending.set(null);
  }

  protected confirmDeclareWinner(): void {
    const pending = this.declareWinnerPending();
    if (!pending) return;
    this.declareWinnerSubmitting.set(true);
    this.matchApi.declareWinner(pending.eventId, pending.matchId, pending.loserId).subscribe({
      next: () => {
        this.declareWinnerSubmitting.set(false);
        this.declareWinnerPending.set(null);
        this.matchRefresh$.next();
      },
      error: (error: { error?: { message?: string } }) => {
        this.declareWinnerSubmitting.set(false);
        this.toastService.error(error.error?.message ?? 'Could not update the winner.');
      },
    });
  }
}
