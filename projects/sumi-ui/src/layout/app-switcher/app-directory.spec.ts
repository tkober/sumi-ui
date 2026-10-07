import { TestBed } from '@angular/core/testing';
import { SUMI_CONFIG, type SumiConfig } from 'sumi-ui/core';
import {
  SUMI_APP_DIRECTORY_WINDOW,
  SumiAppDirectory,
  type SumiAppDirectoryEntry,
  type SumiAppDirectoryWindowLike,
} from './app-directory';

const SIBLINGS: SumiAppDirectoryEntry[] = [
  {
    id: 'kanji-trainer',
    name: 'Kanji Trainer',
    url: 'http://app.test:8086',
    group: 'Japanisch',
    accent: '#2b4c7e',
  },
  {
    id: 'katakana-reading',
    name: 'Katakana Reading',
    url: 'http://app.test:8083',
    group: 'Japanisch',
  },
];
const OTHER: SumiAppDirectoryEntry = {
  id: 'trip-planner',
  name: 'Trip Planner',
  url: 'http://app.test:8080',
  group: 'Tools',
};

function makeResponse(apps: unknown[] = SIBLINGS, title = 'Kanazawa') {
  return { title, apps };
}

class FakeStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function okFetch(body: unknown = makeResponse()): typeof fetch {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;
}

function makeWindow(
  overrides: Partial<SumiAppDirectoryWindowLike> = {},
): SumiAppDirectoryWindowLike {
  return {
    location: {
      protocol: 'http:',
      hostname: 'app.test',
      origin: 'http://app.test:8086',
      port: '8086',
    },
    localStorage: new FakeStorage(),
    fetch: okFetch(),
    ...overrides,
  };
}

function inject(
  win: SumiAppDirectoryWindowLike,
  config: Partial<SumiConfig> = {},
): SumiAppDirectory {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SUMI_CONFIG,
        useValue: {
          accent: { light: {}, dark: {} },
          motif: 'mountains',
          dashboardPort: 8087,
          ...config,
        },
      },
      { provide: SUMI_APP_DIRECTORY_WINDOW, useValue: win },
    ],
  });
  return TestBed.inject(SumiAppDirectory);
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('SumiAppDirectory', () => {
  it('resolves the dashboard URL from location and the configured port', () => {
    const directory = inject(makeWindow());
    expect(directory.dashboardUrl()).toBe('http://app.test:8087/');
  });

  it('fetches /api/apps at the resolved base URL with a timeout signal', async () => {
    const win = makeWindow();
    inject(win);
    await flush();
    expect(win.fetch).toHaveBeenCalledWith(
      'http://app.test:8087/api/apps',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('ignores malformed entries in the response defensively', async () => {
    const directory = inject(
      makeWindow({
        fetch: okFetch({
          title: 'Kanazawa',
          apps: [
            { id: 'ok', name: 'Ok App', url: 'http://app.test:8086', group: 'Japanisch' },
            { id: 'missing-url', name: 'No URL' },
            { name: 'No id', url: 'http://app.test:8089' },
            null,
            'not an object',
            { id: 'ok2', name: 'Ok 2', url: 'http://app.test:8090', group: 'Japanisch' },
          ],
        }),
      }),
    );
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['ok', 'ok2']);
  });

  it('treats a non-object or apps-less response as invalid, keeping the cache', async () => {
    const storage = new FakeStorage();
    storage.setItem('sumi-app-directory', JSON.stringify(makeResponse()));
    const directory = inject(makeWindow({ localStorage: storage, fetch: okFetch({ title: 'x' }) }));
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('detects the current app by the origin of its url', async () => {
    const directory = inject(
      makeWindow({
        location: {
          protocol: 'http:',
          hostname: 'app.test',
          origin: 'http://app.test:8086',
          port: '8086',
        },
      }),
    );
    await flush();
    expect(directory.current()?.id).toBe('kanji-trainer');
  });

  it('falls back to matching the port when no url origin matches', async () => {
    const directory = inject(
      makeWindow({
        // Reached under a different hostname than the one in apps.yaml, but
        // the same port.
        location: {
          protocol: 'http:',
          hostname: '127.0.0.1',
          origin: 'http://127.0.0.1:8086',
          port: '8086',
        },
      }),
    );
    await flush();
    expect(directory.current()?.id).toBe('kanji-trainer');
  });

  it('is undefined when neither origin nor port match anything', async () => {
    const directory = inject(
      makeWindow({
        location: {
          protocol: 'http:',
          hostname: 'elsewhere.test',
          origin: 'http://elsewhere.test:9999',
          port: '9999',
        },
      }),
    );
    await flush();
    expect(directory.current()).toBeUndefined();
  });

  it('siblings includes every entry in the current app group, in order, including itself', async () => {
    const directory = inject(makeWindow({ fetch: okFetch(makeResponse([...SIBLINGS, OTHER])) }));
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('siblings is empty when there is no current app and no switcherGroup override', async () => {
    const directory = inject(
      makeWindow({
        location: {
          protocol: 'http:',
          hostname: 'elsewhere.test',
          origin: 'http://elsewhere.test:9999',
          port: '9999',
        },
      }),
    );
    await flush();
    expect(directory.siblings()).toEqual([]);
  });

  it('switcherGroup overrides group resolution when the app is not itself in the list', async () => {
    const directory = inject(
      makeWindow({
        location: {
          protocol: 'http:',
          hostname: 'elsewhere.test',
          origin: 'http://elsewhere.test:9999',
          port: '9999',
        },
        fetch: okFetch(makeResponse([...SIBLINGS, OTHER])),
      }),
      { switcherGroup: 'Japanisch' },
    );
    await flush();
    expect(directory.current()).toBeUndefined();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('caches a good response, readable by a later instance even once the fetch fails', async () => {
    const storage = new FakeStorage();
    inject(makeWindow({ localStorage: storage }));
    await flush();
    expect(storage.getItem('sumi-app-directory')).not.toBeNull();

    TestBed.resetTestingModule();
    const directory = inject(
      makeWindow({
        localStorage: storage,
        fetch: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
      }),
    );
    // Cache is read synchronously at construction, before the (failing) refresh resolves.
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('a failed fetch keeps the existing cache instead of clearing it', async () => {
    const storage = new FakeStorage();
    storage.setItem('sumi-app-directory', JSON.stringify(makeResponse()));
    const directory = inject(
      makeWindow({
        localStorage: storage,
        fetch: vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch,
      }),
    );
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('reads the cache defensively when localStorage.getItem throws', () => {
    const storage = new FakeStorage();
    storage.getItem = () => {
      throw new Error('blocked');
    };
    expect(() => inject(makeWindow({ localStorage: storage }))).not.toThrow();
  });

  it('a throwing localStorage.setItem does not break the refresh', async () => {
    const storage = new FakeStorage();
    storage.setItem = () => {
      throw new Error('quota exceeded');
    };
    const directory = inject(makeWindow({ localStorage: storage }));
    await flush();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });

  it('aborts the fetch after the timeout, keeping the cache', async () => {
    vi.useFakeTimers();
    const storage = new FakeStorage();
    storage.setItem('sumi-app-directory', JSON.stringify(makeResponse()));
    const neverResolvingFetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const directory = inject(makeWindow({ localStorage: storage, fetch: neverResolvingFetch }));
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();
    expect(directory.siblings().map((e) => e.id)).toEqual(['kanji-trainer', 'katakana-reading']);
  });
});
