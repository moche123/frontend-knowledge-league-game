import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, forkJoin, map, merge, of, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { MatchApi } from '../../core/match/match-api.service';
import { ToastService } from '../../core/toast/toast.service';
import { TournamentApi } from '../../core/tournament/tournament-api.service';
import { DisputeChatMessageDto } from '../../shared/dto/dispute-chat.dto';
import { MatchDto, MatchStatus } from '../../shared/dto/stage.dto';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { ChatEntry, ChatPanel } from '../../shared/ui/chat-panel/chat-panel';
import { ChatMessageTone } from '../../shared/ui/chat-message/chat-message';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';

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

// No WS/push yet (same gap as answer-question-page/event-questions-page) —
// short poll so an active back-and-forth feels reasonably live.
const POLL_INTERVAL_MS = 5000;

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
  imports: [Avatar, Badge, ChatPanel, Icon, NavItem, SideNav, SideNavCommon, SideNavHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dispute-chat-page.html',
})
export class DisputeChatPage {
  private readonly authService = inject(AuthService);
  private readonly tournamentApi = inject(TournamentApi);
  private readonly matchApi = inject(MatchApi);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  private readonly matchId = this.route.snapshot.paramMap.get('matchId') ?? '';
  private readonly currentUserId = this.authService.currentUser()?.id ?? null;

  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly homeUrl = computed(() => {
    const user = this.authService.currentUser();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });

  // Match summary — players, referee, event name — fetched once (doesn't
  // change while chatting). Errors here (not a participant, match not
  // found) surface as a page-level message instead of an empty shell.
  protected readonly summaryError = signal<string | null>(null);

  protected readonly summary = toSignal(
    forkJoin({
      match: this.matchApi.getMatch(this.eventId, this.matchId),
      event: this.tournamentApi.getEvent(this.eventId),
    }).pipe(
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

  // Messages — polled, plus refreshed immediately after a successful send.
  private readonly refresh$ = new Subject<void>();
  private readonly poll$ = merge(timer(0, POLL_INTERVAL_MS), this.refresh$);

  private readonly rawMessages = toSignal(
    this.poll$.pipe(
      switchMap(() =>
        this.matchApi.getChatMessages(this.eventId, this.matchId).pipe(catchError(() => of(null))),
      ),
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

  protected sending = signal(false);

  protected onSend(text: string): void {
    this.sending.set(true);
    this.matchApi
      .sendChatMessage(this.eventId, this.matchId, { text })
      .pipe(tap(() => this.refresh$.next()))
      .subscribe({
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
