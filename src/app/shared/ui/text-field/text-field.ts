import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

/** Underline-style dark input — icon on the left, glow-on-focus border. Used for
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
        class="w-full bg-transparent border-0 border-b-2 border-outline-variant pb-2 pt-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-0 transition-colors"
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

  value = model('');
}
