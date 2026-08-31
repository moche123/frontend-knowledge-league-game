import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventDto } from '../../shared/dto/tournament.dto';
import { RegistrationDto } from '../../shared/dto/registration.dto';

@Injectable({ providedIn: 'root' })
export class TournamentApi {
  private readonly baseUrl = `${environment.apiUrl}/tournament`;
  private readonly http = inject(HttpClient);

  listEvents(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(`${this.baseUrl}/events`);
  }

  listRegistrations(eventId: string): Observable<RegistrationDto[]> {
    return this.http.get<RegistrationDto[]>(`${this.baseUrl}/events/${eventId}/registrations`);
  }

  registerSelf(eventId: string): Observable<RegistrationDto> {
    return this.http.post<RegistrationDto>(`${this.baseUrl}/events/${eventId}/registrations`, {});
  }
}
