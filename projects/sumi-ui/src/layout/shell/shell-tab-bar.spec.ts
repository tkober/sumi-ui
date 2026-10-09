import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { SumiAppShellTabBar } from './shell-tab-bar';
import { SumiNavItem } from './shell';
import { SumiShell } from './shell.service';

@Component({ template: 'dummy' })
class DummyPage {}

const ICONS = ['home', 'practice', 'review', 'lessons', 'stats', 'forecast'] as const;

function makeNav(count: number): SumiNavItem[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Item ${i}`,
    link: `/item-${i}`,
    icon: ICONS[i % ICONS.length],
  }));
}

async function createTabBar(nav: SumiNavItem[]) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: DummyPage }])],
  });
  const fixture = TestBed.createComponent(SumiAppShellTabBar);
  fixture.componentRef.setInput('nav', nav);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('SumiAppShellTabBar', () => {
  it('shows all items as tabs with no More button when there are 5 or fewer', async () => {
    const fixture = await createTabBar(makeNav(5));
    const realTabs = fixture.nativeElement.querySelectorAll(
      '.sumi-app-shell__tab:not(.sumi-app-shell__tab--more)',
    );
    expect(realTabs.length).toBe(5);
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__tab--more')).toBeNull();
  });

  it('shows at most 4 real tabs plus a More tab when there are more than 5 items', async () => {
    const fixture = await createTabBar(makeNav(6));
    const realTabs = fixture.nativeElement.querySelectorAll(
      '.sumi-app-shell__tab:not(.sumi-app-shell__tab--more)',
    );
    expect(realTabs.length).toBe(4);
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__tab--more')).toBeTruthy();
  });

  it('More sheet: opens listing the overflow items, focuses the first one, Esc closes and returns focus', async () => {
    // Same caveat as shell.spec.ts: the tab bar is only visible under 720px
    // via a media query jsdom does not apply at the default desktop width,
    // so a real `.focus()` would silently no-op. Assert on the `.focus()`
    // calls themselves instead.
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const fixture = await createTabBar(makeNav(6));
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

  it('disables tab links while SumiShell.navLock is set', async () => {
    const fixture = await createTabBar(makeNav(2));
    const shell = TestBed.inject(SumiShell);

    shell.lockNav('A conversation is running');
    fixture.detectChanges();

    const tab: HTMLElement = fixture.nativeElement.querySelector('.sumi-app-shell__tab');
    expect(tab.getAttribute('aria-disabled')).toBe('true');
    expect(tab.getAttribute('tabindex')).toBe('-1');
    expect(tab.getAttribute('href')).toBeNull();

    shell.unlockNav();
  });

  it('hides the tab bar while SumiShell.focusMode is on', async () => {
    const fixture = await createTabBar(makeNav(2));
    const shell = TestBed.inject(SumiShell);
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__tabbar')).toBeTruthy();

    shell.enterFocusMode();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__tabbar')).toBeNull();

    shell.leaveFocusMode();
  });

  it('marks the active tab via RouterLinkActive', async () => {
    const fixture = await createTabBar(makeNav(2));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/item-1');
    fixture.detectChanges();

    const tabs: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.sumi-app-shell__tab');
    expect(tabs[1].classList.contains('sumi-app-shell__tab--active')).toBe(true);
    expect(tabs[0].classList.contains('sumi-app-shell__tab--active')).toBe(false);
  });
});
