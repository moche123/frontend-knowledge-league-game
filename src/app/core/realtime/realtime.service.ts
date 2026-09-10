import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, merge } from 'rxjs';
import { fromEvent } from 'rxjs';
import { finalize, map, share } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { DisputeChatMessageDto, SendChatMessageDto } from '../../shared/dto/dispute-chat.dto';

export interface BattleStateEvent {
  matchId: string;
  status: string;
  currentQuestionPosition: number | null;
  currentQuestionDeadline: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
}

export interface ChatTypingEvent {
  authorId: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;
  private readonly joinedRooms = new Map<string, number>();

  connect(): Socket {
    if (this.socket) {
      this.socket.auth = { token: this.authService.getAccessToken() };
      if (!this.socket.connected) this.socket.connect();
      return this.socket;
    }
    const socket = io(`${environment.apiUrl}/realtime`, {
      autoConnect: false,
      auth: { token: this.authService.getAccessToken() },
      transports: ['websocket'],
      reconnection: true,
    });
    socket.connect();
    socket.on('connect', () => {
      for (const room of this.joinedRooms.keys()) {
        const [eventId, matchId] = room.split(':');
        socket.emit('match:join', { eventId, matchId });
      }
    });
    this.socket = socket;
    return socket;
  }

  matchEvents(
    eventId: string,
    matchId: string,
  ): Observable<{
    chat?: DisputeChatMessageDto;
    battle?: BattleStateEvent;
    typing?: ChatTypingEvent;
  }> {
    return defer(() => {
      const socket = this.connect();
      const chat$ = fromEvent<DisputeChatMessageDto>(socket, 'chat:message').pipe(
        map((chat) => ({ chat })),
      );
      const battle$ = fromEvent<BattleStateEvent>(socket, 'battle.state').pipe(
        map((battle) => ({ battle })),
      );
      const typing$ = fromEvent<ChatTypingEvent>(socket, 'chat:typing').pipe(
        map((typing) => ({ typing })),
      );
      const room = `${eventId}:${matchId}`;
      this.joinedRooms.set(room, (this.joinedRooms.get(room) ?? 0) + 1);
      socket.emit('match:join', { eventId, matchId });
      return merge(chat$, battle$, typing$);
    }).pipe(
      share(),
      finalize(() => {
        this.socket?.emit('match:leave', { eventId, matchId });
        const room = `${eventId}:${matchId}`;
        const count = this.joinedRooms.get(room) ?? 0;
        if (count <= 1) this.joinedRooms.delete(room);
        else this.joinedRooms.set(room, count - 1);
      }),
    );
  }

  sendChatMessage(
    eventId: string,
    matchId: string,
    message: SendChatMessageDto,
  ): Observable<DisputeChatMessageDto> {
    return defer(() =>
      from(this.connect().emitWithAck('chat:send', { eventId, matchId, message })),
    );
  }

  typing(eventId: string, matchId: string): void {
    this.connect().emit('chat:typing', { eventId, matchId });
  }
}
