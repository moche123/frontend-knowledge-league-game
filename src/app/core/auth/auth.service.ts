import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponseDto, PublicUserDto } from '../../shared/dto/auth-response.dto';
import { LoginDto } from '../../shared/dto/login.dto';
import { RegisterDto } from '../../shared/dto/register.dto';

const ACCESS_TOKEN_KEY = 'kl_access_token';
const REFRESH_TOKEN_KEY = 'kl_refresh_token';
const USER_KEY = 'kl_user';

function readStoredUser(): PublicUserDto | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as PublicUserDto) : null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly user = signal<PublicUserDto | null>(readStoredUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  private readonly http = inject(HttpClient);

  login(dto: LoginDto): Observable<PublicUserDto> {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/login`, dto).pipe(
      tap((response) => this.persistSession(response)),
      map((response) => response.user),
    );
  }

  register(dto: RegisterDto): Observable<PublicUserDto> {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/register`, dto).pipe(
      tap((response) => this.persistSession(response)),
      map((response) => response.user),
    );
  }

  refresh(): Observable<AuthResponseDto> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<AuthResponseDto>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => void 0 });
    this.clearSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  getLoggedInUser(): PublicUserDto | null {
    return this.user();
  }

  private persistSession(response: AuthResponseDto): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.user.set(response.user);
  }
}
