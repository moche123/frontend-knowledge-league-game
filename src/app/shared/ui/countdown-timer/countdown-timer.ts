import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** Big glowing per-question countdown. Switches to the error tone once `urgent`
 *  (design-system.md: the timer turns red in the last 30 seconds). */
@Component({
  selector: 'app-countdown-timer',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center">
      <div class="flex items-center justify-center gap-3">
        <app-icon name="timer" size="xl" [class]="urgent() ? 'text-error' : 'text-gold'" />
        <span
          class="font-display text-[48px] font-bold tracking-[2px]"
          [class]="urgent() ? 'text-error' : 'text-gold'"
          style="text-shadow: 0 0 10px currentColor"
          >{{ label() }}</span
        >
      </div>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-2 text-center opacity-70">
        The timer turns red in the last 30 seconds.
      </p>
    </div>
  `,
  host: { class: 'contents' },
})
export class CountdownTimer {
  label = input.required<string>();
  urgent = input(false);
}
