import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectVariant = 'underline' | 'filled';

/** Dropdown select — "underline" matches the technical form style, "filled" matches
 *  the rounded filter control used on data-heavy list views. */
@Component({
  selector: 'app-select',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <select
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        class="w-full appearance-none bg-surface-container text-on-surface pr-10 focus:ring-0 transition-colors font-body-sm text-body-sm"
        [class]="variant() === 'underline'
          ? 'border-0 border-b-2 border-outline-variant focus:border-accent px-4 py-3 rounded-t'
          : 'border border-outline-variant focus:border-gold focus:ring-2 focus:ring-gold rounded-lg pl-4 py-2.5'"
      >
        @if (placeholder(); as ph) {
          <option value="" disabled selected>{{ ph }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
      <app-icon
        name="expand_more"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
      />
    </div>
  `,
  host: { class: 'contents' },
})
export class Select {
  options = input.required<SelectOption[]>();
  placeholder = input<string>();
  variant = input<SelectVariant>('underline');

  value = model('');
}
