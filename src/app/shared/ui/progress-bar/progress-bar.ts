import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProgressTone = 'primary' | 'secondary' | 'gold' | 'accent' | 'error' | 'neutral';

const TONE_CLASS: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  gold: 'bg-gold',
  accent: 'bg-accent',
  error: 'bg-error',
  neutral: 'bg-outline',
};

/** Slim capacity/progress indicator — event seat fill, question completion, etc. */
@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
      <div
        class="h-full rounded-full transition-all"
        [class]="toneClass()"
        [style.width.%]="clamped()"
      ></div>
    </div>
  `,
  host: { class: 'contents' },
})
export class ProgressBar {
  value = input(0);
  tone = input<ProgressTone>('primary');

  protected toneClass = computed(() => TONE_CLASS[this.tone()]);
  protected clamped = computed(() => Math.min(100, Math.max(0, this.value())));
}
