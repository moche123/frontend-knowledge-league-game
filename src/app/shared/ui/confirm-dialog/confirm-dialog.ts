import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Modal } from '../modal/modal';

export type ConfirmDialogVariant = 'danger' | 'primary';

/** Reusable "are you sure?" confirmation — wraps app-modal so every destructive
 *  action (delete a user, delete an event, ...) shares the same look and the
 *  same guard against dismissing/double-firing while the action is in flight. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" (closed)="cancel()">
      <div class="p-6 flex flex-col gap-stack-lg">
        <div class="flex items-center gap-3">
          <app-icon name="warning" size="lg" [class]="iconClass()" />
          <h3 class="font-title-lg text-title-lg text-on-surface font-bold">{{ title() }}</h3>
        </div>
        <p class="text-on-surface-variant font-body-md text-body-md whitespace-pre-line">
          {{ message() }}
        </p>
        <div class="flex justify-end gap-3">
          <app-button variant="ghost" [disabled]="loading()" (click)="cancel()">
            {{ cancelLabel() }}
          </app-button>
          <app-button [variant]="variant()" [disabled]="loading()" (click)="confirm()">
            {{ loading() ? loadingLabel() : confirmLabel() }}
          </app-button>
        </div>
      </div>
    </app-modal>
  `,
  host: { class: 'contents' },
})
export class ConfirmDialog {
  open = input(false);
  title = input('Are you sure?');
  message = input('');
  confirmLabel = input('Confirm');
  cancelLabel = input('Cancel');
  loadingLabel = input('Working…');
  loading = input(false);
  variant = input<ConfirmDialogVariant>('danger');

  confirmed = output<void>();
  cancelled = output<void>();

  protected readonly iconClass = () =>
    this.variant() === 'danger' ? 'text-error' : 'text-primary';

  protected confirm(): void {
    if (!this.loading()) {
      this.confirmed.emit();
    }
  }

  protected cancel(): void {
    if (!this.loading()) {
      this.cancelled.emit();
    }
  }
}
