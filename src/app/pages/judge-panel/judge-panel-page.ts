import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AssignmentCard, AssignmentStatus } from '../../shared/ui/assignment-card/assignment-card';
import { ChatEntry, ChatPanel } from '../../shared/ui/chat-panel/chat-panel';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../shared/ui/side-nav-header/side-nav-header';

interface Assignment {
  id: string;
  status: AssignmentStatus;
  tournament: string;
  matchup: string;
  stage: string;
  metaLabel: string;
  time?: string;
}

let nextMessageId = 0;

@Component({
  selector: 'app-judge-panel-page',
  imports: [AssignmentCard, ChatPanel, Icon, NavItem, SideNav, SideNavCommon, SideNavHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './judge-panel-page.html',
})
export class JudgePanelPage {
  protected readonly assignments: Assignment[] = [
    {
      id: 'a1',
      status: 'live',
      tournament: 'History Olympiad',
      matchup: 'Alejandro Silva vs Sofia Mendez',
      stage: 'Quarterfinal',
      metaLabel: 'Today',
      time: '14:30',
    },
    {
      id: 'a2',
      status: 'pending',
      tournament: 'Science Cup',
      matchup: 'Mateo Ruiz vs Clara Ortiz',
      stage: 'Semifinal',
      metaLabel: 'Tomorrow',
      time: '10:00',
    },
    {
      id: 'a3',
      status: 'closed',
      tournament: 'Literary Debate',
      matchup: 'Diego Torres vs Laura Gomez',
      stage: 'Group stage',
      metaLabel: 'Yesterday',
    },
    {
      id: 'a4',
      status: 'walkover',
      tournament: 'Mathematics Tournament',
      matchup: 'Andres Vega vs Carlos Pico',
      stage: 'Round 1',
      metaLabel: 'Review required',
    },
  ];

  protected messages = signal<ChatEntry[]>([
    { id: 'sys-1', tone: 'system', align: 'left', text: 'Dispute opened: Today 14:35' },
    {
      id: 'msg-1',
      tone: 'self',
      align: 'left',
      author: 'Alejandro Silva',
      time: '14:36',
      avatarInitial: 'A',
      text: 'Referee, question 4 about the French Revolution has an ambiguity in the National Constituent Assembly deadline. My sources indicate 1791.',
    },
    {
      id: 'msg-2',
      tone: 'opponent',
      align: 'right',
      author: 'Sofia Mendez',
      time: '14:38',
      avatarInitial: 'S',
      text: "I disagree. The tournament's official text specifies September 1791, which I marked correctly in my answer.",
    },
    {
      id: 'msg-3',
      tone: 'arbiter',
      align: 'right',
      author: 'Dr. Julian Arango',
      time: '14:42',
      verified: true,
      text: "Reviewing the official Knowledge League manual (2023 Ed.), chapter 4. Sofia's answer is the one accepted by the academic committee. The score stands.",
    },
  ]);

  protected onSend(text: string): void {
    this.messages.update((current) => [
      ...current,
      {
        id: `msg-${nextMessageId++}`,
        tone: 'arbiter',
        align: 'right',
        author: 'Dr. Julian Arango',
        time: 'Now',
        verified: true,
        text,
      },
    ]);
  }
}
