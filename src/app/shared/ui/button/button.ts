import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'outline-neutral' | 'accent' | 'gold' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-fixed-dim shadow-[0_0_15px_rgba(185,199,228,0.2)] hover:shadow-[0_0_20px_rgba(185,199,228,0.4)]',
  secondary: 'bg-secondary-container text-on-secondary-container hover:brightness-110',
  outline: 'bg-transparent text-primary border border-primary hover:bg-primary/10',
  'outline-neutral':
    'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-variant',
  accent:
    'bg-accent text-on-primary-fixed hover:bg-accent/90 shadow-[0_0_10px_rgba(100,255,218,0.3)]',
  gold: 'bg-gold text-on-tertiary-fixed hover:brightness-105',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
  danger: 'bg-error-container text-on-error-container hover:brightness-110',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 font-body-sm text-body-sm gap-1.5',
  md: 'py-2.5 px-6 font-title-sm text-title-sm gap-2',
  lg: 'py-3 px-8 font-title-sm text-title-sm gap-2',
};

/** Base action control — every filled/outline/ghost button in the product shares this shape. */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      class="inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      [class]="classes()"
    >
      <ng-content />
    </button>
  `,
  host: { class: 'contents' },
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  fullWidth = input(false);

  protected readonly classes = computed(() =>
    [VARIANT_CLASS[this.variant()], SIZE_CLASS[this.size()], this.fullWidth() ? 'w-full' : '']
      .filter(Boolean)
      .join(' '),
  );
}
