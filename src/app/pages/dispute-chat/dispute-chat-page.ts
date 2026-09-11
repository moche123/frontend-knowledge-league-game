import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  filter,
  forkJoin,
  map,
  merge,
  of,
  scan,
  Subject,
  switchMap,
  tap,
  throttleTime,
} from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { MatchApi } from '../../core/match/match-api.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ToastService } from '../../core/toast/toast.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { DisputeChatMessageDto } from '../../shared/dto/dispute-chat.dto';
import { MatchDto, MatchStatus } from '../../shared/dto/stage.dto';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { ChatMessageTone } from '../../shared/ui/chat-message/chat-message';
import { ChatEntry, ChatPanel } from '../../shared/ui/chat-panel/chat-panel';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';
import { SideNav } from '../../shared/ui/side-nav/side-nav';

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

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

interface MatchSummary {
  match: MatchDto;
  eventName: string;
  playerAName: string;
  playerBName: string;
  refereeName: string | null;
}

@Component({
  selector: 'app-dispute-chat-page',
  imports: [
    Avatar,
    Badge,
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
  templateUrl: './dispute-chat-page.html',
})
export class DisputeChatPage {
  private readonly authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly matchApi = inject(MatchApi);
  private readonly realtime = inject(RealtimeService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  private readonly matchId = this.route.snapshot.paramMap.get('matchId') ?? '';
  private readonly currentUser = this.authService.currentUser();
  private readonly currentUserId = this.currentUser?.id ?? null;
  private typingTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly typingEvents$ = new Subject<void>();
  private readonly summaryRefresh$ = new Subject<void>();

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly sending = signal(false);
  protected readonly typingLabel = signal('');

  protected readonly homeUrl = computed(() => {
    const user = this.authService.currentUser();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  constructor() {
    this.typingEvents$
      .pipe(throttleTime(300), takeUntilDestroyed())
      .subscribe(() => this.realtime.typing(this.eventId, this.matchId));
  }

  // Match summary — players, referee, event name — fetched once (doesn't
  // change while chatting). Errors here (not a participant, match not
  // found) surface as a page-level message instead of an empty shell.
  protected readonly summaryError = signal<string | null>(null);

  protected readonly summary = toSignal(
    merge(of(undefined), this.summaryRefresh$).pipe(
      switchMap(() =>
        forkJoin({
          match: this.matchApi.getMatch(this.eventId, this.matchId),
          event: this.tournamentApi.getEvent(this.eventId),
        }),
      ),
      switchMap(({ match, event }) =>
        forkJoin({
          match: of(match),
          eventName: of(event.name),
          playerAName: match.playerAId
            ? this.authService.getUserName(match.playerAId).pipe(map((u) => u.name))
            : of('TBD'),
          playerBName: match.playerBId
            ? this.authService.getUserName(match.playerBId).pipe(map((u) => u.name))
            : of('TBD'),
          refereeName: match.refereeId
            ? this.authService.getUserName(match.refereeId).pipe(map((u) => u.name))
            : of(null),
        }),
      ),
      map((summary): MatchSummary => summary),
      catchError((error: { error?: { message?: string } }) => {
        this.summaryError.set(error.error?.message ?? "Couldn't load this match.");
        return of(null);
      }),
    ),
    { initialValue: null },
  );

  // Hydrate once over REST, then append server-authenticated messages pushed
  // through the match room. The server also broadcasts the sender's message,
  // so there is no optimistic duplicate or refresh request.
  private readonly rawMessages = toSignal(
    this.matchApi.getChatMessages(this.eventId, this.matchId).pipe(
      switchMap((initial) =>
        merge(
          of(initial),
          this.realtime.matchEvents(this.eventId, this.matchId).pipe(
            tap((event) => {
              if (!event.typing || event.typing.authorId === this.currentUserId) return;
              this.authService.getUserName(event.typing.authorId).subscribe({
                next: (user) => this.typingLabel.set(`${user.name} is typing…`),
                error: () => this.typingLabel.set('Someone is typing…'),
              });
              if (this.typingTimeout) clearTimeout(this.typingTimeout);
              this.typingTimeout = setTimeout(() => this.typingLabel.set(''), 1500);
            }),
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
    ),
    { initialValue: null as DisputeChatMessageDto[] | null },
  );

  // Author display names resolved lazily as new ids show up — same pattern
  // as event-questions-page's playerNames (no bulk lookup endpoint exists).
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
          /* leave unresolved — falls back to a short id below */
        },
      });
    });
  }

  protected readonly messages = computed<ChatEntry[]>(() => {
    const raw = this.rawMessages();
    const match = this.summary()?.match;
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

      const isSelf = this.currentUserId !== null && message.authorId === this.currentUserId;
      const isReferee = match?.refereeId != null && message.authorId === match.refereeId;
      const isOtherParticipant =
        match != null &&
        (message.authorId === match.playerAId || message.authorId === match.playerBId);

      let tone: ChatMessageTone;
      let authorSuffix = '';
      if (isSelf) {
        tone = 'self';
      } else if (isReferee) {
        tone = 'arbiter';
        authorSuffix = ' (Referee)';
      } else if (isOtherParticipant) {
        tone = 'opponent';
      } else {
        // Not a player, not the referee — the only other role that can post
        // here is admin (see DisputeChatService's participant check).
        tone = 'arbiter';
        authorSuffix = ' (Admin)';
      }

      const authorName = names[message.authorId] ?? 'Loading…';

      return {
        id: message.id,
        tone,
        align: tone === 'opponent' ? 'right' : 'left',
        author: authorName + authorSuffix,
        time: TIME_FORMAT.format(new Date(message.createdAt)),
        avatarInitial: authorName.slice(0, 1).toUpperCase(),
        verified: tone === 'arbiter',
        text: message.text,
      };
    });
  });

  // Same dispute-resolution capability as judge-panel-page, surfaced here
  // too — this is the screen admin AND the referee actually use in practice
  // (reached via /disputes), judge-panel-page is a separate referee-only
  // "Assignments" screen. Admin, or the match's own assigned referee, on a
  // closed/walkover match — mirrors MatchService.declareWinner's own gate.
  protected readonly canDeclareWinner = computed(() => {
    const match = this.summary()?.match;
    const role = this.currentUser?.role;
    if (!match || !role) return false;
    if (match.status !== 'closed' && match.status !== 'walkover') return false;
    if (role === 'admin') return true;
    return role === 'referee' && match.refereeId === this.currentUserId;
  });

  // If there's already a winner, only offer to flip it to the other player
  // (matches judge-panel-page's "Hacer ganar a X (perdedor)"). If the match
  // closed in an exact tie (winnerId null — see CLAUDE.md), there's no
  // "loser" to flip, so both players are offered directly.
  protected readonly winnerChoices = computed<{ id: string; name: string }[]>(() => {
    const summary = this.summary();
    if (!summary || !this.canDeclareWinner()) return [];
    const { match, playerAName, playerBName } = summary;

    if (match.winnerId) {
      const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
      if (!loserId) return [];
      return [{ id: loserId, name: loserId === match.playerAId ? playerAName : playerBName }];
    }

    const choices: { id: string; name: string }[] = [];
    if (match.playerAId) choices.push({ id: match.playerAId, name: playerAName });
    if (match.playerBId) choices.push({ id: match.playerBId, name: playerBName });
    return choices;
  });

  protected readonly declareWinnerPending = signal<{ id: string; name: string } | null>(null);
  protected readonly declareWinnerSubmitting = signal(false);

  protected askDeclareWinner(choice: { id: string; name: string }): void {
    this.declareWinnerPending.set(choice);
  }

  protected cancelDeclareWinner(): void {
    if (this.declareWinnerSubmitting()) return;
    this.declareWinnerPending.set(null);
  }

  protected confirmDeclareWinner(): void {
    const pending = this.declareWinnerPending();
    if (!pending) return;
    this.declareWinnerSubmitting.set(true);
    this.matchApi.declareWinner(this.eventId, this.matchId, pending.id).subscribe({
      next: () => {
        this.declareWinnerSubmitting.set(false);
        this.declareWinnerPending.set(null);
        this.summaryRefresh$.next();
      },
      error: (error: { error?: { message?: string } }) => {
        this.declareWinnerSubmitting.set(false);
        this.toastService.error(error.error?.message ?? 'Could not update the winner.');
      },
    });
  }

  protected onTyping(): void {
    this.typingEvents$.next();
  }

  protected onSend(text: string): void {
    this.sending.set(true);
    this.realtime.sendChatMessage(this.eventId, this.matchId, { text }).subscribe({
      next: () => this.sending.set(false),
      error: (error: { error?: { message?: string } }) => {
        this.sending.set(false);
        this.toastService.error(error.error?.message ?? 'Could not send message.');
      },
    });
  }

  protected goHome(): void {
    this.router.navigateByUrl(this.homeUrl());
  }
}
