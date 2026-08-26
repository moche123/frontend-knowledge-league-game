import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Badge, BadgeVariant } from '../badge/badge';
import { Icon } from '../icon/icon';

export type AssignmentStatus = 'live' | 'pending' | 'closed' | 'walkover';

interface StatusTheme {
  badgeVariant: BadgeVariant;
  badgeLabel: string;
  cardBorder: string;
  glow: string;
  interactive: string;
  fadeText: string;
}

const THEME: Record<AssignmentStatus, StatusTheme> = {
  live: {
    badgeVariant: 'accent',
    badgeLabel: 'En curso',
    cardBorder: 'border-tertiary',
    glow: 'shadow-[0_0_10px_rgba(100,255,218,0.2)]',
    interactive: 'cursor-pointer',
    fadeText: '',
  },
  pending: {
    badgeVariant: 'gold',
    badgeLabel: 'Pendiente',
    cardBorder: 'border-outline-variant hover:border-secondary-container',
    glow: '',
    interactive: 'cursor-pointer',
    fadeText: '',
  },
  closed: {
    badgeVariant: 'neutral',
    badgeLabel: 'Cerrado',
    cardBorder: 'border-outline-variant/50',
    glow: '',
    interactive: 'cursor-not-allowed',
    fadeText: 'opacity-60',
  },
  walkover: {
    badgeVariant: 'error',
    badgeLabel: 'Walkover',
    cardBorder: 'border-error/30 hover:border-error/60',
    glow: '',
    interactive: 'cursor-pointer',
    fadeText: '',
  },
};

/** Assigned-match summary card for the arbiter's list — status drives border, badge and glow. */
@Component({
  selector: 'app-assignment-card',
  imports: [Badge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group bg-surface p-4 rounded border transition-all"
      [class]="theme().cardBorder + ' ' + theme().glow + ' ' + theme().interactive"
    >
      <div class="flex justify-between items-start mb-2" [class]="theme().fadeText">
        <span class="font-label-caps text-label-caps text-primary uppercase">{{ tournament() }}</span>
        <app-badge [variant]="theme().badgeVariant" [dot]="status() === 'live' || status() === 'pending'" [pulse]="status() === 'live'">
          {{ theme().badgeLabel }}
        </app-badge>
      </div>
      <h3 class="font-title-sm text-title-sm text-on-surface mb-1" [class]="theme().fadeText">{{ matchup() }}</h3>
      <p class="font-body-sm text-body-sm text-on-surface-variant mb-3" [class]="theme().fadeText">{{ stage() }}</p>
      <div
        class="flex justify-between items-center font-body-sm text-body-sm border-t pt-3"
        [class]="status() === 'walkover' ? 'text-error border-outline-variant' : 'text-on-surface-variant border-outline-variant'"
        [class.opacity-60]="status() === 'closed'"
      >
        <div class="flex items-center gap-1">
          <app-icon [name]="metaIcon()" size="sm" />
          {{ metaLabel() }}
        </div>
        @if (time(); as t) {
          <div class="flex items-center gap-1">
            <app-icon name="schedule" size="sm" />
            {{ t }}
          </div>
        }
      </div>
    </div>
  `,
  host: { class: 'contents' },
})
export class AssignmentCard {
  status = input.required<AssignmentStatus>();
  tournament = input.required<string>();
  matchup = input.required<string>();
  stage = input.required<string>();
  metaLabel = input.required<string>();
  time = input<string>();

  protected theme = computed(() => THEME[this.status()]);
  protected metaIcon = computed(() => {
    switch (this.status()) {
      case 'closed':
        return 'done_all';
      case 'walkover':
        return 'warning';
      default:
        return 'calendar_today';
    }
  });
}
