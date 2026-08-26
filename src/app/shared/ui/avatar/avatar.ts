import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarRing = 'none' | 'primary' | 'gold' | 'outline';

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-2xl',
};

const RING_CLASS: Record<AvatarRing, string> = {
  none: '',
  primary: 'border-2 border-primary',
  gold: 'border-2 border-gold',
  outline: 'border border-outline-variant',
};

/** Player/arbiter/admin identity glyph — photo when available, initials otherwise. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-secondary-container text-on-secondary-container font-bold"
      [class]="[sizeClass(), ringClass()]"
    >
      @if (src(); as url) {
        <img [src]="url" [alt]="alt()" class="w-7 h-7 object-cover" />
      } @else {
        <span>{{ initials() }}</span>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class Avatar {
  src = input<string>();
  alt = input('');
  initials = input('');
  size = input<AvatarSize>('md');
  ring = input<AvatarRing>('none');

  protected sizeClass = computed(() => SIZE_CLASS[this.size()]);
  protected ringClass = computed(() => RING_CLASS[this.ring()]);
}
