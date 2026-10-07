import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SumiAppShell, SumiNavItem } from './shell';
import { SumiShell } from './shell.service';
import { SumiFocusModeDirective } from './focus-mode.directive';
import { SumiNavLockDirective } from './nav-lock.directive';
import { SumiShellFocusActionsDirective } from './focus-actions.directive';

@Component({ template: 'dummy' })
class DummyPage {}

const ICONS = ['home', 'practice', 'review', 'lessons', 'stats', 'forecast'] as const;

function makeNav(count: number, withBadges = false): SumiNavItem[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Item ${i}`,
    link: `/item-${i}`,
    icon: ICONS[i % ICONS.length],
    badge: withBadges ? (i === 2 ? 3 : i === 1 ? 0 : null) : undefined,
  }));
}

async function createShell(nav: SumiNavItem[]) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: DummyPage }])],
  });
  const fixture = TestBed.createComponent(SumiAppShell);
  fixture.componentRef.setInput('brand', { glyph: '墨', name: 'Test App' });
  fixture.componentRef.setInput('nav', nav);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('SumiAppShell', () => {
  it('renders every nav item, hiding a badge that is 0 or null', () => {
    return createShell(makeNav(3, true)).then((fixture) => {
      const links = fixture.nativeElement.querySelectorAll('.sumi-app-shell__nav-link');
      expect(links.length).toBe(3);
      expect(links[0].querySelector('sumi-badge')).toBeNull(); // badge: null
      expect(links[1].querySelector('sumi-badge')).toBeNull(); // badge: 0
      expect(links[2].querySelector('sumi-badge')?.textContent).toContain('3');
    });
  });

  it('marks the active nav link via RouterLinkActive', async () => {
    const fixture = await createShell(makeNav(3));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/item-1');
    fixture.detectChanges();

    const links: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.sumi-app-shell__nav-link',
    );
    expect(links[1].classList.contains('sumi-app-shell__nav-link--active')).toBe(true);
    expect(links[0].classList.contains('sumi-app-shell__nav-link--active')).toBe(false);
  });

  it('shows at most 4 real tabs plus a More tab when there are more than 5 items', async () => {
    const fixture = await createShell(makeNav(6));

    const realTabs = fixture.nativeElement.querySelectorAll(
      '.sumi-app-shell__tab:not(.sumi-app-shell__tab--more)',
    );
    const moreButton = fixture.nativeElement.querySelector('.sumi-app-shell__tab--more');
    expect(realTabs.length).toBe(4);
    expect(moreButton).toBeTruthy();
  });

  it('shows all items as tabs with no More button when there are 5 or fewer', async () => {
    const fixture = await createShell(makeNav(5));
    const realTabs = fixture.nativeElement.querySelectorAll(
      '.sumi-app-shell__tab:not(.sumi-app-shell__tab--more)',
    );
    const moreButton = fixture.nativeElement.querySelector('.sumi-app-shell__tab--more');
    expect(realTabs.length).toBe(5);
    expect(moreButton).toBeNull();
  });

  it('More sheet: opens listing the overflow items, focuses the first one, Esc closes and returns focus', async () => {
    // The tab bar (and its "More" button) are only visible under 720px
    // (see shell.scss's media query); jsdom does apply that rule via
    // getComputedStyle, so a real `.focus()` on it silently no-ops at the
    // jsdom-default desktop width. Assert on the `.focus()` calls
    // themselves rather than on `document.activeElement`, so this test
    // does not depend on emulating a narrow viewport.
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const fixture = await createShell(makeNav(6));
    const moreButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.sumi-app-shell__tab--more',
    );

    moreButton.click();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const sheet: HTMLElement = fixture.nativeElement.querySelector('.sumi-app-shell__more-sheet');
    expect(sheet).toBeTruthy();
    const items = sheet.querySelectorAll('.sumi-app-shell__more-item');
    expect(items.length).toBe(2); // 6 items: 4 tabs + 2 overflow
    expect(focusSpy).toHaveBeenLastCalledWith();
    expect(focusSpy.mock.instances.at(-1)).toBe(items[0]);

    sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sumi-app-shell__more-sheet')).toBeNull();
    expect(focusSpy.mock.instances.at(-1)).toBe(moreButton);

    focusSpy.mockRestore();
  });

  it('skip link is the first focusable element and targets the main region', async () => {
    const fixture = await createShell(makeNav(2));
    const first = fixture.nativeElement.querySelector('a, button');
    expect(first.classList.contains('sumi-app-shell__skip-link')).toBe(true);
    const main = fixture.nativeElement.querySelector('main');
    expect('#' + main.id).toBe(first.getAttribute('href'));
  });
});

describe('SumiAppShell with focus mode', () => {
  // `show` is a signal: this harness's zoneless change detection only
  // re-checks a fixture on a signal write (or an event), not on an
  // arbitrary later mutation of a plain property.
  @Component({
    imports: [SumiFocusModeDirective],
    template: `@if (show()) {
      <div sumiFocusMode></div>
    }`,
  })
  class FocusHost {
    show = signal(true);
  }

  it('hides the desktop nav and tab bar while a sumiFocusMode host is rendered', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: DummyPage }])],
    });
    const shellFixture = TestBed.createComponent(SumiAppShell);
    shellFixture.componentRef.setInput('brand', { glyph: '墨', name: 'Test App' });
    shellFixture.componentRef.setInput('nav', makeNav(2));
    shellFixture.detectChanges();
    await shellFixture.whenStable();

    expect(shellFixture.nativeElement.querySelector('.sumi-app-shell__nav')).toBeTruthy();

    const focusFixture = TestBed.createComponent(FocusHost);
    focusFixture.detectChanges();
    shellFixture.detectChanges();
    expect(shellFixture.nativeElement.querySelector('.sumi-app-shell__nav')).toBeNull();
    expect(shellFixture.nativeElement.querySelector('.sumi-app-shell__tabbar')).toBeNull();

    focusFixture.componentInstance.show.set(false);
    focusFixture.detectChanges();
    shellFixture.detectChanges();
    expect(shellFixture.nativeElement.querySelector('.sumi-app-shell__nav')).toBeTruthy();
  });
});

describe('SumiAppShell with nav lock', () => {
  @Component({
    imports: [SumiNavLockDirective],
    template: `@if (show()) {
      <div [sumiNavLock]="reason"></div>
    }`,
  })
  class LockHost {
    show = signal(true);
    reason = 'A conversation is running';
  }

  it('disables nav links and shows the reason while locked', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: DummyPage }])],
    });
    const shellFixture = TestBed.createComponent(SumiAppShell);
    shellFixture.componentRef.setInput('brand', { glyph: '墨', name: 'Test App' });
    shellFixture.componentRef.setInput('nav', makeNav(2));
    shellFixture.detectChanges();
    await shellFixture.whenStable();

    const lockFixture = TestBed.createComponent(LockHost);
    lockFixture.detectChanges();
    shellFixture.detectChanges();

    const link: HTMLElement = shellFixture.nativeElement.querySelector('.sumi-app-shell__nav-link');
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(link.getAttribute('href')).toBeNull();
    expect(shellFixture.nativeElement.textContent).toContain('A conversation is running');

    lockFixture.componentInstance.show.set(false);
    lockFixture.detectChanges();
    shellFixture.detectChanges();
    const unlockedLink: HTMLElement = shellFixture.nativeElement.querySelector(
      '.sumi-app-shell__nav-link',
    );
    expect(unlockedLink.getAttribute('aria-disabled')).toBeNull();
    expect(shellFixture.nativeElement.textContent).not.toContain('A conversation is running');
  });
});

describe('SumiAppShell with focus actions', () => {
  @Component({
    imports: [SumiFocusModeDirective, SumiShellFocusActionsDirective],
    template: `@if (show()) {
      <div sumiFocusMode>
        <span *sumiShellFocusActions class="probe">{{ count() }}</span>
      </div>
    }`,
  })
  class FocusActionsHost {
    show = signal(true);
    count = signal(0);
  }

  @Component({
    imports: [SumiFocusModeDirective, SumiShellFocusActionsDirective],
    template: `<div sumiFocusMode>
      <span *sumiShellFocusActions class="probe-2">second</span>
    </div>`,
  })
  class SecondFocusActionsHost {}

  async function createShellWithFocusHost() {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: DummyPage }])],
    });
    const shellFixture = TestBed.createComponent(SumiAppShell);
    shellFixture.componentRef.setInput('brand', { glyph: '墨', name: 'Test App' });
    shellFixture.componentRef.setInput('nav', makeNav(2));
    shellFixture.detectChanges();
    await shellFixture.whenStable();
    return shellFixture;
  }

  it('renders the registered template only while in focus mode, with live bindings', async () => {
    const shellFixture = await createShellWithFocusHost();
    const hostFixture = TestBed.createComponent(FocusActionsHost);
    hostFixture.detectChanges();
    shellFixture.detectChanges();

    const area = (): HTMLElement | null =>
      shellFixture.nativeElement.querySelector('.sumi-app-shell__focus-actions');
    expect(area()?.querySelector('.probe')?.textContent).toBe('0');

    hostFixture.componentInstance.count.set(5);
    hostFixture.detectChanges();
    shellFixture.detectChanges();
    expect(area()?.querySelector('.probe')?.textContent).toBe('5');

    hostFixture.componentInstance.show.set(false);
    hostFixture.detectChanges();
    shellFixture.detectChanges();
    expect(shellFixture.nativeElement.querySelector('.sumi-app-shell__focus-actions')).toBeNull();
  });

  it('falls back to the projected slot when nothing is registered', async () => {
    @Component({
      imports: [SumiAppShell, SumiFocusModeDirective],
      template: `<sumi-app-shell [brand]="brand" [nav]="[]">
        <div sumiShellFocusActions class="fallback">Fallback content</div>
        <div sumiFocusMode></div>
      </sumi-app-shell>`,
    })
    class FallbackHost {
      brand = { glyph: '墨', name: 'Test App' };
    }

    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: DummyPage }])],
    });
    const fixture = TestBed.createComponent(FallbackHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const fallback: HTMLElement | null = fixture.nativeElement.querySelector('.fallback');
    expect(fallback?.textContent).toBe('Fallback content');
  });

  it('an older registration being destroyed after a newer one registers does not clear it', async () => {
    const shellFixture = await createShellWithFocusHost();

    const firstFixture = TestBed.createComponent(FocusActionsHost);
    firstFixture.detectChanges();
    await firstFixture.whenStable();
    shellFixture.detectChanges();
    await shellFixture.whenStable();
    expect(
      shellFixture.nativeElement.querySelector('.sumi-app-shell__focus-actions .probe'),
    ).toBeTruthy();

    const secondFixture = TestBed.createComponent(SecondFocusActionsHost);
    secondFixture.detectChanges();
    await secondFixture.whenStable();
    shellFixture.detectChanges();
    await shellFixture.whenStable();
    expect(
      shellFixture.nativeElement.querySelector('.sumi-app-shell__focus-actions .probe-2')
        ?.textContent,
    ).toBe('second');

    // Destroying the older (first) registration must not clear the newer
    // (second) one, even though both were registered against the same
    // SumiShell instance.
    firstFixture.destroy();
    shellFixture.detectChanges();
    await shellFixture.whenStable();
    expect(
      shellFixture.nativeElement.querySelector('.sumi-app-shell__focus-actions .probe-2')
        ?.textContent,
    ).toBe('second');
  });
});

describe('SumiShell', () => {
  it('focusMode handles overlapping enter/leave via a counter', () => {
    const shell = TestBed.inject(SumiShell);
    shell.enterFocusMode();
    shell.enterFocusMode();
    expect(shell.focusMode()).toBe(true);
    shell.leaveFocusMode();
    expect(shell.focusMode()).toBe(true);
    shell.leaveFocusMode();
    expect(shell.focusMode()).toBe(false);
  });
});
