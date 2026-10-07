import { TestBed } from '@angular/core/testing';
import { SUMI_CONFIG } from 'sumi-ui/core';
import { SumiAppSwitcher } from './app-switcher';
import { SUMI_APP_DIRECTORY_WINDOW, type SumiAppDirectoryWindowLike } from './app-directory';

const SIBLINGS = [
  {
    id: 'kanji-trainer',
    name: 'Kanji Trainer',
    url: 'http://app.test:8086',
    group: 'Japanisch',
    accent: '#2b4c7e',
    icon: '漢',
    description: 'Kanji lernen',
  },
  {
    id: 'katakana-reading',
    name: 'Katakana Reading',
    url: 'http://app.test:8083',
    group: 'Japanisch',
    icon: 'ア',
    description: 'Katakana lesen üben',
  },
];

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
    fetch: vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Kanazawa', apps: SIBLINGS }),
    }) as unknown as typeof fetch,
    ...overrides,
  };
}

async function createSwitcher(win: SumiAppDirectoryWindowLike = makeWindow()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: SUMI_CONFIG, useValue: { accent: {}, motif: 'mountains', dashboardPort: 8087 } },
      { provide: SUMI_APP_DIRECTORY_WINDOW, useValue: win },
    ],
  });
  const fixture = TestBed.createComponent(SumiAppSwitcher);
  fixture.detectChanges();
  await flush();
  fixture.detectChanges();
  return fixture;
}

/** Lets the directory's fetch-then-cache promise chain (plain, unzoned) settle. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('SumiAppSwitcher', () => {
  it('renders nothing when there is no data', async () => {
    const win = makeWindow({
      fetch: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
    });
    const fixture = await createSwitcher(win);
    expect(fixture.nativeElement.querySelector('.sumi-app-switcher__trigger')).toBeNull();
  });

  it('renders the trigger and, once opened, every sibling with the current one marked', async () => {
    const fixture = await createSwitcher();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.sumi-app-switcher__trigger',
    );
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = fixture.nativeElement.querySelector('.sumi-app-switcher__menu');
    expect(menu).toBeTruthy();

    const current = menu.querySelector('.sumi-app-switcher__item--current');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.textContent).toContain('Kanji Trainer');
    expect(current.tagName).not.toBe('A');

    const links: NodeListOf<HTMLAnchorElement> = menu.querySelectorAll('a[role="menuitem"]');
    // Katakana Reading sibling + the "All apps" dashboard link.
    expect(links.length).toBe(2);
    expect(links[0].textContent).toContain('Katakana Reading');
    expect(links[0].getAttribute('href')).toBe('http://app.test:8083');
  });

  it('links to the dashboard with its title', async () => {
    const fixture = await createSwitcher();
    (
      fixture.nativeElement.querySelector('.sumi-app-switcher__trigger') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dashboardLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.sumi-app-switcher__item--dashboard',
    );
    expect(dashboardLink.getAttribute('href')).toBe('http://app.test:8087/');
    expect(dashboardLink.textContent).toContain('Kanazawa');
  });

  it('keyboard: opens, arrow keys move between items, Esc closes and returns focus to the trigger', async () => {
    const fixture = await createSwitcher();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.sumi-app-switcher__trigger',
    );

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const menu: HTMLElement = fixture.nativeElement.querySelector('.sumi-app-switcher__menu');
    const items: HTMLAnchorElement[] = Array.from(menu.querySelectorAll('a[role="menuitem"]'));
    expect(document.activeElement).toBe(items[0]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[1]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[0]); // wraps around

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[1]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sumi-app-switcher__menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when a click lands outside the component', async () => {
    const fixture = await createSwitcher();
    (
      fixture.nativeElement.querySelector('.sumi-app-switcher__trigger') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-app-switcher__menu')).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-app-switcher__menu')).toBeNull();
  });
});
