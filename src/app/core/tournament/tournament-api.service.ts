import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateEventDto, EventDto } from '../../shared/dto/tournament.dto';
import { RegistrationDto } from '../../shared/dto/registration.dto';

@Injectable({ providedIn: 'root' })
export class TournamentApi {
  private readonly baseUrl = `${environment.apiUrl}/tournament`;
  private readonly http = inject(HttpClient);

  listEvents(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(`${this.baseUrl}/events`);
  }

  getEvent(eventId: string): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.baseUrl}/events/${eventId}`);
  }

  createEvent(dto: CreateEventDto): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.baseUrl}/events`, dto);
  }

  listRegistrations(eventId: string): Observable<RegistrationDto[]> {
    return this.http.get<RegistrationDto[]>(`${this.baseUrl}/events/${eventId}/registrations`);
  }

  registerSelf(eventId: string): Observable<RegistrationDto> {
    return this.http.post<RegistrationDto>(`${this.baseUrl}/events/${eventId}/registrations`, {});
  }

  registerByAdmin(eventId: string, userId: string): Observable<RegistrationDto> {
    return this.http.post<RegistrationDto>(
      `${this.baseUrl}/events/${eventId}/registrations/${userId}`,
      {},
    );
  }

  unregisterByAdmin(eventId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}/registrations/${userId}`);
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
  }

  drawFirstStage(eventId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/events/${eventId}/stages/draw`, {});
  }
}
