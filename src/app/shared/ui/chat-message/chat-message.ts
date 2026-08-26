import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type ChatMessageTone = 'self' | 'opponent' | 'arbiter' | 'system';
export type ChatMessageAlign = 'left' | 'right';

const AVATAR_CLASS: Record<ChatMessageTone, string> = {
  self: 'bg-secondary-container text-on-secondary-container',
  opponent: 'bg-primary-container text-primary border border-primary/30',
  arbiter: 'bg-gold text-on-tertiary-fixed shadow-[0_0_8px_rgba(241,196,15,0.4)]',
  system: '',
};

const BUBBLE_CLASS: Record<ChatMessageTone, string> = {
  self: 'bg-surface-container-highest border border-outline-variant/30 text-on-surface',
  opponent: 'bg-primary-container/40 border border-primary/20 text-on-surface',
  arbiter: 'bg-surface border border-gold/50 text-on-surface relative overflow-hidden',
  system: '',
};

const AUTHOR_CLASS: Record<ChatMessageTone, string> = {
  self: 'text-secondary',
  opponent: 'text-primary',
  arbiter: 'text-gold',
  system: '',
};

/** One chat bubble in a dispute thread. Tone picks the color story (self / opponent /
 *  arbiter-authority / system notice); align places it left or right for the current viewer. */
@Component({
  selector: 'app-chat-message',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tone() === 'system') {
      <div class="flex justify-center">
        <div
          class="bg-surface-container px-4 py-1 rounded-full border border-outline-variant/50 font-label-caps text-label-caps text-on-surface-variant"
        >
          {{ text() }}
        </div>
      </div>
    } @else {
      <div
        class="flex gap-3 max-w-[85%] relative z-10"
        [class.ml-auto]="align() === 'right'"
        [class.flex-row-reverse]="align() === 'right'"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
          [class]="avatarClass()"
        >
          @if (tone() === 'arbiter') {
            <app-icon name="admin_panel_settings" size="sm" />
          } @else {
            {{ avatarInitial() }}
          }
        </div>
        <div [class.text-right]="align() === 'right'">
          <div class="flex items-baseline gap-2 mb-1" [class.justify-end]="align() === 'right'">
            @if (align() === 'right') {
              <span class="text-[10px] text-on-surface-variant">{{ time() }}</span>
            }
            <span class="font-title-sm text-sm flex items-center gap-1" [class]="authorClass()">
              {{ author() }}
              @if (verified()) {
                <app-icon name="verified" size="sm" />
              }
            </span>
            @if (align() === 'left') {
              <span class="text-[10px] text-on-surface-variant">{{ time() }}</span>
            }
          </div>
          <div
            class="p-3 rounded-lg text-sm text-left"
            [class]="bubbleClass()"
            [class.rounded-tl-none]="align() === 'left'"
            [class.rounded-tr-none]="align() === 'right'"
          >
            @if (tone() === 'arbiter') {
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-gold"></div>
            }
            {{ text() }}
          </div>
        </div>
      </div>
    }
  `,
  host: { class: 'contents' },
})
export class ChatMessage {
  tone = input<ChatMessageTone>('self');
  align = input<ChatMessageAlign>('left');
  author = input('');
  time = input('');
  text = input.required<string>();
  avatarInitial = input('');
  verified = input(false);

  protected avatarClass = computed(() => AVATAR_CLASS[this.tone()]);
  protected bubbleClass = computed(() => BUBBLE_CLASS[this.tone()]);
  protected authorClass = computed(() => AUTHOR_CLASS[this.tone()]);
}
