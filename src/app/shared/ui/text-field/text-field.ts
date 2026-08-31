import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

export type TextFieldTone = 'dark' | 'light';

// 'dark' text for a light host (the inverse-surface auth cards), 'light' text
// for a normal dark surface (admin/app panels) — text-inverse-on-surface is
// near-black and unreadable outside the light-card context it was built for.
const TEXT_CLASS: Record<TextFieldTone, string> = {
  dark: 'text-inverse-on-surface',
  light: 'text-on-surface',
};

/** Underline-style input — icon on the left, glow-on-focus border. Used for
 *  auth forms and any "technical" data-entry field per design-system.md. */
@Component({
  selector: 'app-text-field',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative group">
      @if (icon(); as name) {
        <app-icon
          [name]="name"
          class="absolute left-0 top-3 text-outline group-focus-within:text-primary transition-colors"
        />
      }
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [required]="required()"
        [id]="fieldId()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        class="w-full bg-transparent border-0 border-b-2 border-outline-variant pb-2 pt-3 font-body-md text-body-md placeholder:text-outline focus:border-primary focus:ring-0 transition-colors"
        [class]="textClass()"
        [class.pl-8]="!!icon()"
      />
    </div>
  `,
  host: { class: 'contents' },
})
export class TextField {
  type = input<'text' | 'email' | 'password' | 'number' | 'datetime-local'>('text');
  placeholder = input('');
  required = input(false);
  icon = input<string>();
  fieldId = input<string>();
  tone = input<TextFieldTone>('dark');

  value = model('');

  protected readonly textClass = computed(() => TEXT_CLASS[this.tone()]);
}
