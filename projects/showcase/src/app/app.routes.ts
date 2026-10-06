import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'core', pathMatch: 'full' },
  {
    path: 'core',
    loadComponent: () => import('./pages/core/core').then((m) => m.CorePage),
  },
  {
    path: 'forms',
    loadComponent: () => import('./pages/forms/forms').then((m) => m.FormsPage),
  },
  {
    path: 'practice',
    loadComponent: () => import('./pages/practice/practice').then((m) => m.PracticePage),
  },
  {
    path: 'charts',
    loadComponent: () => import('./pages/charts/charts').then((m) => m.ChartsPage),
  },
  {
    path: 'layout',
    loadComponent: () => import('./pages/layout/layout').then((m) => m.LayoutPage),
  },
];
