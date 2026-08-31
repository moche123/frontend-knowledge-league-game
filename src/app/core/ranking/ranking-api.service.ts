import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Injectable, Signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';

@Injectable({ providedIn: 'root' })
export class RankingApi {
  private readonly baseUrl = `${environment.apiUrl}/ranking`;
  private readonly http = inject(HttpClient);

  // Shared across every consumer on the page (side-nav header, top bar, profile
  // stats can all mount at once) — fetched once per app lifetime instead of once
  // per component.
  readonly leaderboard: Signal<LeaderboardRowDto[]> = toSignal(this.getGlobalLeaderboard(), {
    initialValue: [],
  });

  getGlobalLeaderboard(): Observable<LeaderboardRowDto[]> {
    return this.http.get<LeaderboardRowDto[]>(this.baseUrl);
  }
}
