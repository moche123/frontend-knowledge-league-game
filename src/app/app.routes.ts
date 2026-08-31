import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'answer-question',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/answer-question/answer-question-page').then((m) => m.AnswerQuestionPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/player-dashboard/player-dashboard-page').then((m) => m.PlayerDashboardPage),
  },
  {
    path: 'disputes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dispute-chat/dispute-chat-page').then((m) => m.DisputeChatPage),
  },
  {
    path: 'judge-panel',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/judge-panel/judge-panel-page').then((m) => m.JudgePanelPage),
  },
  {
    path: 'ranking',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/global-ranking/global-ranking-page').then((m) => m.GlobalRankingPage),
  },
  {
    path: 'events',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/events-management/events-management-page').then(
        (m) => m.EventsManagementPage,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
