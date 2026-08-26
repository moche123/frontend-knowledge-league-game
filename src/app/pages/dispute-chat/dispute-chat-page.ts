import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { ChatEntry, ChatPanel } from '../../shared/ui/chat-panel/chat-panel';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';

const PLAYER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBeOiAifDuYskPpc7psT9sp0STD4I8m-P_A9xh6KpyYlSIfI6SHhdnGrgM6cF2-YKcNaLvuVo6ApFJZB-i9iji224tP2pSezoKIcQFSPHXERmnIC-6z1uJE1ohpBxp315d8KPZzHG0weE731J93h_TNYkvQYfOJ3YGiWwVfUSXmW2cECnAHzipjnsr0NAtLDMXs15dRWB0gTIjrbPEWRhhIYtWuczIboeeVI1QB3fucZnaLYxIOTKiK';
const OPPONENT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAPQuhe52r7DdJUfvnptb-m5PN-b8MKo9un6F6Ik6HEs9P6QUkgnCSRd5nzAJDH1HNH6RCgpDpRdOK980ZDPQbA-2UqnMumBibzC1vaN12_vW8AOOidozlMYscqKyymYIaWypQWQQJ9GWsthrB4GgsVQ-0Hb4zfDcMmx2LaOmu-mx0h1G2hXus3V5Fl_YoWIGmFPtjWVb0ijgUHSL9pVhlaa_xzKm1FVm2t28Ey6XpriQvdIlHqsiyG';

let nextMessageId = 0;

@Component({
  selector: 'app-dispute-chat-page',
  imports: [Avatar, ChatPanel, Icon, NavItem, SideNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dispute-chat-page.html',
})
export class DisputeChatPage {
  protected readonly playerAvatar = PLAYER_AVATAR;
  protected readonly opponentAvatar = OPPONENT_AVATAR;

  protected messages = signal<ChatEntry[]>([
    { id: 'sys-1', tone: 'system', align: 'left', text: 'Disputa abierta: Hoy 14:35' },
    {
      id: 'msg-1',
      tone: 'self',
      align: 'left',
      author: 'Tú (Elite)',
      time: '14:36',
      avatarInitial: 'T',
      text: 'Árbitro, la pregunta 4 sobre la Revolución Francesa tiene una ambigüedad en la fecha límite de la Asamblea Constituyente. Mis fuentes indican 1791.',
    },
    {
      id: 'msg-2',
      tone: 'opponent',
      align: 'right',
      author: 'Oponente',
      time: '14:38',
      avatarInitial: 'O',
      text: 'Estoy en desacuerdo. El texto oficial del torneo especifica septiembre de 1791, lo cual marqué correctamente en mi opción.',
    },
    {
      id: 'msg-3',
      tone: 'arbiter',
      align: 'left',
      author: 'Dr. Julian Arango',
      time: '14:42',
      verified: true,
      text: 'Revisando el manual oficial de la Liga del Saber (Ed. 2023), capítulo 4. La respuesta de Sofia es la aceptada por el comité académico. La puntuación se mantiene.',
    },
  ]);

  protected onSend(text: string): void {
    this.messages.update((current) => [
      ...current,
      { id: `msg-${nextMessageId++}`, tone: 'self', align: 'left', author: 'Tú (Elite)', time: 'Ahora', avatarInitial: 'T', text },
    ]);
  }
}
