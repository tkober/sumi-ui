import { Injectable, InjectionToken, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SUMI_CONFIG } from 'sumi-ui/core';

/** One app as returned by kanazawa-dashboard's `GET /api/apps`. */
export interface SumiAppDirectoryEntry {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
  group?: string;
  accent?: string;
}

/** The parts of kanazawa-dashboard's response `sumi-app-switcher` uses. */
interface SumiAppDirectoryResponse {
  title: string;
  apps: SumiAppDirectoryEntry[];
}

const CACHE_KEY = 'sumi-app-directory';
const FETCH_TIMEOUT_MS = 3000;

/** The small slice of `window` `SumiAppDirectory` reads, so a test can fake it. */
export interface SumiAppDirectoryWindowLike {
  location: { protocol: string; hostname: string; origin: string; port: string };
  localStorage: Storage;
  fetch: typeof fetch;
}

/** Injection token for the window-like object, overridable in tests. */
export const SUMI_APP_DIRECTORY_WINDOW = new InjectionToken<SumiAppDirectoryWindowLike>(
  'SUMI_APP_DIRECTORY_WINDOW',
  {
    factory: () =>
      typeof window !== 'undefined'
        ? (window as unknown as SumiAppDirectoryWindowLike)
        : {
            location: { protocol: 'http:', hostname: 'localhost', origin: '', port: '' },
            localStorage: undefined as unknown as Storage,
            fetch: undefined as unknown as typeof fetch,
          },
  },
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates and narrows one entry from the response. Defensive by design:
 * the dashboard's `apps.yaml` is edited by hand, so a malformed entry (a
 * missing field, a stray type) is dropped instead of breaking the whole
 * switcher.
 */
function parseEntry(raw: unknown): SumiAppDirectoryEntry | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  if (
    !isNonEmptyString(entry['id']) ||
    !isNonEmptyString(entry['name']) ||
    !isNonEmptyString(entry['url'])
  ) {
    return null;
  }
  const parsed: SumiAppDirectoryEntry = { id: entry['id'], name: entry['name'], url: entry['url'] };
  if (isNonEmptyString(entry['description'])) {
    parsed.description = entry['description'];
  }
  if (isNonEmptyString(entry['icon'])) {
    parsed.icon = entry['icon'];
  }
  if (isNonEmptyString(entry['group'])) {
    parsed.group = entry['group'];
  }
  if (isNonEmptyString(entry['accent'])) {
    parsed.accent = entry['accent'];
  }
  return parsed;
}

/** Validates the whole `/api/apps` payload, dropping malformed app entries. */
function parseResponse(raw: unknown): SumiAppDirectoryResponse | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body['apps'])) {
    return null;
  }
  const apps = body['apps']
    .map(parseEntry)
    .filter((entry): entry is SumiAppDirectoryEntry => entry !== null);
  const title = isNonEmptyString(body['title']) ? body['title'] : 'Dashboard';
  return { title, apps };
}

/** The origin of `url`, or `null` when `url` does not parse as an absolute URL. */
function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** The port of `url` ('' for the scheme's default port), or `null` when invalid. */
function portOf(url: string): string | null {
  try {
    return new URL(url).port;
  } catch {
    return null;
  }
}

/**
 * Resolves the app switcher's data: the current app, its siblings and the
 * dashboard link, sourced from kanazawa-dashboard's `GET /api/apps` (see
 * docs/concept.md#app-umschalter and the sumi-ui README).
 *
 * The last good response is cached in `localStorage` so the switcher has
 * something to show immediately on startup; a background refresh then
 * either confirms or replaces it. A failed refresh (dashboard unreachable,
 * timeout, malformed response) silently keeps whatever is cached — this
 * service never surfaces an error, since the switcher is expected to just
 * disappear when kanazawa-dashboard is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class SumiAppDirectory {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly config = inject(SUMI_CONFIG);
  private readonly win = inject(SUMI_APP_DIRECTORY_WINDOW);

  private readonly entriesSignal = signal<SumiAppDirectoryEntry[]>([]);
  private readonly titleSignal = signal<string>('Dashboard');

  constructor() {
    const cached = this.readCache();
    if (cached) {
      this.entriesSignal.set(cached.apps);
      this.titleSignal.set(cached.title);
    }
    if (this.isBrowser) {
      void this.refresh();
    }
  }

  /** `{protocol}//{hostname}:{dashboardPort}` — no trailing slash. */
  private baseUrl(): string {
    const { protocol, hostname } = this.win.location;
    return `${protocol}//${hostname}:${this.config.dashboardPort}`;
  }

  /** The dashboard's own URL, e.g. to link to "All apps". */
  readonly dashboardUrl = computed(() => `${this.baseUrl()}/`);

  /** The dashboard's title, from the response (or the cache), `'Dashboard'` by default. */
  readonly title = this.titleSignal.asReadonly();

  /**
   * The entry for this app: the one whose `url`'s origin matches
   * `location.origin`, or — if none matches (e.g. the server is reached
   * under a different hostname than the one in `apps.yaml`) — the one
   * whose `url`'s port equals `location.port`.
   */
  readonly current = computed(() => {
    const entries = this.entriesSignal();
    const loc = this.win.location;
    const byOrigin = entries.find((entry) => originOf(entry.url) === loc.origin);
    if (byOrigin) {
      return byOrigin;
    }
    if (!loc.port) {
      return undefined;
    }
    return entries.find((entry) => portOf(entry.url) === loc.port);
  });

  /**
   * Entries in the current app's group, including the current app itself,
   * in the order the dashboard listed them. Falls back to `switcherGroup`
   * from `provideSumi()` when no current app was detected (e.g. an app not
   * yet listed in `apps.yaml`). Empty when there is no group either way —
   * `sumi-app-switcher` renders nothing in that case.
   */
  readonly siblings = computed(() => {
    const group = this.current()?.group ?? this.config.switcherGroup;
    if (!group) {
      return [];
    }
    return this.entriesSignal().filter((entry) => entry.group === group);
  });

  private async refresh(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await this.win.fetch(`${this.baseUrl()}/api/apps`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        return;
      }
      const parsed = parseResponse(await response.json());
      if (!parsed) {
        return;
      }
      this.entriesSignal.set(parsed.apps);
      this.titleSignal.set(parsed.title);
      this.writeCache(parsed);
    } catch {
      // Unreachable, aborted (timeout) or malformed — keep the cache as is.
    } finally {
      clearTimeout(timeout);
    }
  }

  private readCache(): SumiAppDirectoryResponse | null {
    try {
      const raw = this.win.localStorage.getItem(CACHE_KEY);
      return raw ? parseResponse(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  private writeCache(data: SumiAppDirectoryResponse): void {
    try {
      this.win.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Private browsing, quota exceeded, ... — the in-memory signals still
      // hold the fresh data for this session.
    }
  }
}
