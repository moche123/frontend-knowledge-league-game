import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => req.url.includes(path));
  const accessToken = authService.getAccessToken();

  const authorizedReq =
    isApiRequest && !isAuthEndpoint && accessToken
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      const shouldRetryWithRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isAuthEndpoint &&
        !!authService.getRefreshToken();

      if (!shouldRetryWithRefresh) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap((session) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })),
        ),
        catchError((refreshError: unknown) => {
          authService.clearSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
