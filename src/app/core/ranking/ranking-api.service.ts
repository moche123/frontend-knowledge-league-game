import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LeaderboardRowDto } from '../../shared/dto/ranking.dto';

@Injectable({ providedIn: 'root' })
export class RankingApi {
  private readonly baseUrl = `${environment.apiUrl}/ranking`;
  private readonly http = inject(HttpClient);

  getGlobalLeaderboard(): Observable<LeaderboardRowDto[]> {
    return this.http.get<LeaderboardRowDto[]>(this.baseUrl);
  }
}
