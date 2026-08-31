import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Minimal reusable modal — backdrop + centered panel, content via projection.
 *  Not mounted at all while closed, so there's nothing to flash on page load. */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <button
        type="button"
        aria-label="Close"
        class="fixed inset-0 z-40 block w-full appearance-none border-0 bg-background/60 p-0 backdrop-blur-sm"
        (click)="closed.emit()"
      ></button>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          class="pointer-events-auto w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        >
          <ng-content />
        </div>
      </div>
    }
  `,
  host: { class: 'contents' },
})
export class Modal {
  open = input(false);
  closed = output<void>();
}
