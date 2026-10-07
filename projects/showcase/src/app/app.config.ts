import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSumi } from 'sumi-ui/core';
import { routes } from './app.routes';

/**
 * Dev-only override for the app switcher's dashboard port: append
 * `?dashboardPort=<port>` to the showcase's URL while running a local
 * kanazawa-dashboard backend for manual verification (see README.md,
 * "Trying the app switcher against a real dashboard"). Without the query
 * parameter, `provideSumi()` below falls back to its committed default
 * (8087) — nothing here is a hardcoded port to remember to revert.
 */
function devDashboardPort(): number | undefined {
  if (typeof location === 'undefined') {
    return undefined;
  }
  const raw = new URLSearchParams(location.search).get('dashboardPort');
  const port = raw ? Number(raw) : NaN;
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideSumi({ accent: 'ai', motif: 'mountains', dashboardPort: devDashboardPort() }),
  ],
};
