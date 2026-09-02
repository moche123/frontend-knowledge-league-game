import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'answer-question/:eventId/:matchId',
    canActivate: [authGuard, roleGuard('player')],
    loadComponent: () =>
      import('./pages/player/answer-question/answer-question-page').then(
        (m) => m.AnswerQuestionPage,
      ),
  },
  {
    path: 'match-result/:eventId/:matchId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/player/match-result/match-result-page').then((m) => m.MatchResultPage),
  },
  {
    path: 'my-matches/:eventId',
    canActivate: [authGuard, roleGuard('player')],
    loadComponent: () =>
      import('./pages/player/my-matches/my-matches-page').then((m) => m.MyMatchesPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard('player')],
    loadComponent: () =>
      import('./pages/player/player-dashboard/player-dashboard-page').then(
        (m) => m.PlayerDashboardPage,
      ),
  },
  {
    path: 'disputes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dispute-chat/dispute-inbox-page').then((m) => m.DisputeInboxPage),
  },
  {
    path: 'disputes/:eventId/:matchId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dispute-chat/dispute-chat-page').then((m) => m.DisputeChatPage),
  },
  {
    path: 'judge-panel',
    canActivate: [authGuard, roleGuard('referee')],
    loadComponent: () =>
      import('./pages/referee/judge-panel/judge-panel-page').then((m) => m.JudgePanelPage),
  },
  {
    path: 'ranking',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/global-ranking/global-ranking-page').then((m) => m.GlobalRankingPage),
  },
  {
    path: 'events',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/events-management/events-management-page').then(
        (m) => m.EventsManagementPage,
      ),
  },
  {
    path: 'events/:eventId/questions',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/event-questions/event-questions-page').then(
        (m) => m.EventQuestionsPage,
      ),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/users/admin-users-page').then((m) => m.AdminUsersPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
