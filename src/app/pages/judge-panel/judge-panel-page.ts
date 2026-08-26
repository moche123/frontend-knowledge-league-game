import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AssignmentCard, AssignmentStatus } from '../../shared/ui/assignment-card/assignment-card';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { ChatEntry, ChatPanel } from '../../shared/ui/chat-panel/chat-panel';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';

interface Assignment {
  id: string;
  status: AssignmentStatus;
  tournament: string;
  matchup: string;
  stage: string;
  metaLabel: string;
  time?: string;
}

const ARBITER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2Rnn5CDeIUxdxL5CzT3Kg8P-s7-4aTxcaX7sotprBE6iEgLAERgDyhMelQxIAfh2mtfq_yAwhLWlcDCQM4YD-cOQwp1cMpbxJ_bQSf8qe5QNDkFiSmFRCvJ0okBamddyMDdLtv1ly53MZqTYRrUWbUcn7dSatWV_ibzHKGJlpAHwAeQb2HDS4SHSJ6onrNr9J6Q8foX3TJf_anxZrUa1jckXUOaHq_0bCyT8Y0sWR1-cw7aGiToTX';

let nextMessageId = 0;

@Component({
  selector: 'app-judge-panel-page',
  imports: [AssignmentCard, Avatar, ChatPanel, Icon, NavItem, SideNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './judge-panel-page.html',
})
export class JudgePanelPage {
  protected readonly arbiterAvatar = ARBITER_AVATAR;

  protected readonly assignments: Assignment[] = [
    { id: 'a1', status: 'live', tournament: 'Olimpiada de Historia', matchup: 'Alejandro Silva vs Sofia Mendez', stage: 'Cuartos de final', metaLabel: 'Hoy', time: '14:30' },
    { id: 'a2', status: 'pending', tournament: 'Copa de Ciencias', matchup: 'Mateo Ruiz vs Clara Ortiz', stage: 'Semifinal', metaLabel: 'Mañana', time: '10:00' },
    { id: 'a3', status: 'closed', tournament: 'Debate Literario', matchup: 'Diego Torres vs Laura Gomez', stage: 'Fase de grupos', metaLabel: 'Ayer' },
    { id: 'a4', status: 'walkover', tournament: 'Torneo de Matemáticas', matchup: 'Andres Vega vs Carlos Pico', stage: 'Ronda 1', metaLabel: 'Revisión requerida' },
  ];

  protected messages = signal<ChatEntry[]>([
    { id: 'sys-1', tone: 'system', align: 'left', text: 'Disputa abierta: Hoy 14:35' },
    {
      id: 'msg-1',
      tone: 'self',
      align: 'left',
      author: 'Alejandro Silva',
      time: '14:36',
      avatarInitial: 'A',
      text: 'Árbitro, la pregunta 4 sobre la Revolución Francesa tiene una ambigüedad en la fecha límite de la Asamblea Constituyente. Mis fuentes indican 1791.',
    },
    {
      id: 'msg-2',
      tone: 'opponent',
      align: 'right',
      author: 'Sofia Mendez',
      time: '14:38',
      avatarInitial: 'S',
      text: 'Estoy en desacuerdo. El texto oficial del torneo especifica septiembre de 1791, lo cual marqué correctamente en mi opción.',
    },
    {
      id: 'msg-3',
      tone: 'arbiter',
      align: 'right',
      author: 'Dr. Julian Arango',
      time: '14:42',
      verified: true,
      text: 'Revisando el manual oficial de la Liga del Saber (Ed. 2023), capítulo 4. La respuesta de Sofia es la aceptada por el comité académico. La puntuación se mantiene.',
    },
  ]);

  protected onSend(text: string): void {
    this.messages.update((current) => [
      ...current,
      { id: `msg-${nextMessageId++}`, tone: 'arbiter', align: 'right', author: 'Dr. Julian Arango', time: 'Ahora', verified: true, text },
    ]);
  }
}
