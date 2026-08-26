import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ChatMessage, ChatMessageAlign, ChatMessageTone } from '../chat-message/chat-message';
import { Icon } from '../icon/icon';
import { Textarea } from '../textarea/textarea';

export interface ChatEntry {
  id: string;
  tone: ChatMessageTone;
  align: ChatMessageAlign;
  author?: string;
  time?: string;
  text: string;
  avatarInitial?: string;
  verified?: boolean;
}

export type ChatSendTone = 'primary' | 'gold';

/** The dispute-chat thread: header, scrollable message log and a composer.
 *  Message history is owned by the parent page (`messages` input); this component
 *  only renders it and emits `send` when the viewer submits a new one. */
@Component({
  selector: 'app-chat-panel',
  imports: [ChatMessage, Icon, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-panel.html',
  host: { class: 'contents' },
})
export class ChatPanel {
  title = input('Dispute Chat');
  matchLabel = input('');
  messages = input.required<ChatEntry[]>();
  composerPlaceholder = input('Write a message...');
  sendTone = input<ChatSendTone>('primary');
  showAiHint = input(false);

  send = output<string>();

  protected draft = signal('');

  protected sendClass = computed(() =>
    this.sendTone() === 'gold'
      ? 'bg-tertiary text-on-tertiary hover:bg-tertiary-fixed shadow-[0_0_10px_rgba(231,191,153,0.2)]'
      : 'bg-primary text-on-primary hover:opacity-90 shadow-[0_0_10px_rgba(185,199,228,0.2)]',
  );

  protected submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.send.emit(text);
    this.draft.set('');
  }
}
