import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'display' | 'decorative' | 'watermark';

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
  xl: 'text-[32px]',
  display: 'text-[48px]',
  decorative: 'text-[120px]',
  watermark: 'text-[200px]',
};

/** Wraps a Material Symbols glyph so weight/fill/size stay consistent everywhere. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="material-symbols-outlined leading-none select-none"
      [class]="sizeClass()"
      [style.font-variation-settings]="fontVariation()"
      >{{ name() }}</span
    >
  `,
  host: { class: 'inline-flex' },
})
export class Icon {
  name = input.required<string>();
  size = input<IconSize>('md');
  fill = input(false);

  protected sizeClass = computed(() => SIZE_CLASS[this.size()]);
  protected fontVariation = computed(() => `'FILL' ${this.fill() ? 1 : 0}`);
}
