import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
}

export type TabsVariant = 'segmented' | 'underline';

/** Two-state tab switcher — "segmented" spans full width (auth forms), "underline"
 *  sits left-aligned with gaps (dashboard section switches). */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex border-b border-outline-variant"
      [class]="variant() === 'underline' ? 'gap-8' : ''"
    >
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          (click)="active.set(tab.id)"
          class="pb-3 font-title-sm text-title-sm transition-colors duration-300 border-b-2 cursor-pointer"
          [class]="
            variant() === 'segmented' ? 'flex-1 text-center font-label-caps text-label-caps' : ''
          "
          [class.text-primary]="active() === tab.id"
          [class.font-bold]="active() === tab.id"
          [class.border-primary]="active() === tab.id"
          [class.text-on-surface-variant]="active() !== tab.id"
          [class.border-transparent]="active() !== tab.id"
          [class.hover:text-on-surface]="active() !== tab.id"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class Tabs {
  tabs = input.required<TabItem[]>();
  variant = input<TabsVariant>('underline');

  active = model<string>('');
}
