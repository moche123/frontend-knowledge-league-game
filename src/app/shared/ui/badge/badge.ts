import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type BadgeVariant = 'primary' | 'secondary' | 'gold' | 'accent' | 'error' | 'neutral';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  primary: 'bg-primary-container text-primary border-primary/30',
  secondary: 'bg-secondary-container text-secondary border-secondary/20',
  gold: 'bg-gold/10 text-gold border-gold/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  error: 'bg-error-container text-on-error-container border-error/50',
  neutral: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
};

const DOT_CLASS: Record<BadgeVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  gold: 'bg-gold',
  accent: 'bg-accent',
  error: 'bg-error',
  neutral: 'bg-outline',
};

/** Pill status/category indicator — the "chip" used across tables, tags and live-status markers. */
@Component({
  selector: 'app-badge',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-label-caps text-label-caps uppercase whitespace-nowrap"
      [class]="variantClass()"
    >
      @if (dot()) {
        <span
          class="w-1.5 h-1.5 rounded-full"
          [class]="dotClass()"
          [class.animate-pulse]="pulse()"
        ></span>
      }
      @if (icon(); as name) {
        <app-icon [name]="name" size="sm" />
      }
      <ng-content />
    </span>
  `,
  host: { class: 'contents' },
})
export class Badge {
  variant = input<BadgeVariant>('neutral');
  icon = input<string>();
  dot = input(false);
  pulse = input(false);

  protected variantClass = computed(() => VARIANT_CLASS[this.variant()]);
  protected dotClass = computed(() => DOT_CLASS[this.variant()]);
}
