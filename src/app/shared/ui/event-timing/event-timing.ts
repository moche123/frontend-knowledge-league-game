import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { interval } from 'rxjs';
import { Icon } from '../icon/icon';

// No `timeZone` option and no fixed locale (`undefined`) — Intl picks the
// browser's own locale and local timezone automatically. This is the fix
// for "muestra GMT 0" (2026-09-01): the app never hardcoded UTC anywhere,
// but nothing surfaced start/end/remaining prominently either, so debugging
// meant reading raw UTC timestamps straight from the DB instead.
const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(iso: string | null): string {
  return iso ? DATE_TIME_FORMAT.format(new Date(iso)) : '—';
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Start / end / time-remaining, always rendered in the viewer's own local
 *  timezone. Used on every event/match card and table row (2026-09-01,
 *  explicit user request) so nobody has to cross-reference raw UTC
 *  timestamps from the DB to debug timing. Wraps naturally (flex-wrap) so it
 *  fits both a wide card and a narrow table cell without a separate layout. */
@Component({
  selector: 'app-event-timing',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-sm text-body-sm text-on-surface-variant"
    >
      <span class="flex items-center gap-1">
        <app-icon name="play_arrow" size="sm" />
        {{ startLabel() }}
      </span>
      <span class="flex items-center gap-1">
        <app-icon name="flag" size="sm" />
        {{ endLabel() }}
      </span>
      @switch (phase()) {
        @case ('upcoming') {
          <span class="flex items-center gap-1 font-medium text-primary">
            <app-icon name="hourglass_top" size="sm" />
            Starts in {{ remainingLabel() }}
          </span>
        }
        @case ('ongoing') {
          <span class="flex items-center gap-1 font-medium text-accent">
            <app-icon name="hourglass_top" size="sm" />
            {{ remainingLabel() }}
          </span>
        }
        @case ('ended') {
          <span class="flex items-center gap-1 font-medium text-error">
            <app-icon name="hourglass_top" size="sm" />
            0
          </span>
        }
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class EventTiming {
  startAt = input<string | null>(null);
  endAt = input<string | null>(null);

  // Ticks once a second purely to force remainingMs()/remainingLabel() to
  // recompute — same pattern as answer-question-page's countdown, the value
  // itself is always derived fresh from wall-clock time, never accumulated.
  private readonly tick = toSignal(interval(1000), { initialValue: 0 });

  protected readonly startLabel = computed(() => formatDateTime(this.startAt()));
  protected readonly endLabel = computed(() => formatDateTime(this.endAt()));

  // 'upcoming' (before startAt — counts down to the start, not the end,
  // 2026-09-02 fix: was always counting down to endAt regardless of
  // whether the event/match had even started, showing a live-looking green
  // countdown for something that hadn't started yet), 'ongoing' (between
  // start and end — counts down to end, as before), 'ended' (past endAt).
  protected readonly phase = computed<'upcoming' | 'ongoing' | 'ended' | null>(() => {
    this.tick();
    const end = this.endAt();
    if (!end) return null;
    const now = Date.now();
    const start = this.startAt();
    if (start && now < new Date(start).getTime()) return 'upcoming';
    if (now < new Date(end).getTime()) return 'ongoing';
    return 'ended';
  });

  private readonly remainingMs = computed(() => {
    this.tick();
    const target = this.phase() === 'upcoming' ? this.startAt() : this.endAt();
    if (!target) return 0;
    return Math.max(0, new Date(target).getTime() - Date.now());
  });

  protected readonly remainingLabel = computed(() => formatRemaining(this.remainingMs()));
}
