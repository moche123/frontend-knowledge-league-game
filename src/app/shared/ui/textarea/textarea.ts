import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type TextareaVariant = 'paper' | 'chat';

const VARIANT_CLASS: Record<TextareaVariant, string> = {
  paper:
    'bg-surface border-2 border-outline-variant focus:border-primary rounded-lg p-4 text-body-md resize-y',
  chat: 'bg-transparent border-none resize-none p-2 text-sm',
};

/** Multi-line input — "paper" is the focus-mode answer box, "chat" is the message composer. */
@Component({
  selector: 'app-textarea',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      [placeholder]="placeholder()"
      [rows]="rows()"
      [disabled]="disabled()"
      [ngModel]="value()"
      (ngModelChange)="value.set($event)"
      class="w-full font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 transition-colors disabled:opacity-50"
      [class]="variantClass()"
    ></textarea>
  `,
  host: { class: 'contents' },
})
export class Textarea {
  placeholder = input('');
  rows = input(4);
  variant = input<TextareaVariant>('paper');
  disabled = input(false);

  value = model('');

  protected variantClass = computed(() => VARIANT_CLASS[this.variant()]);
}
