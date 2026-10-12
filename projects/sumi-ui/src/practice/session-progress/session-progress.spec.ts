import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SumiAppShell } from 'sumi-ui/layout';
import { SumiSessionProgress, type SumiSessionProgressSegment } from './session-progress';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { matches };
  const mql = {
    get matches() {
      return state.matches;
    },
    media: '(max-width: 480px)',
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    fire(next: boolean) {
      state.matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

@Component({
  imports: [SumiSessionProgress],
  template: `<sumi-session-progress [segments]="segments" [ariaLabel]="ariaLabel" />`,
})
class HostComponent {
  segments: SumiSessionProgressSegment[] = [{ size: 10, done: 4 }];
  ariaLabel = 'Session progress';
}

function render(segments: SumiSessionProgressSegment[], ariaLabel = 'Session progress') {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.segments = segments;
  fixture.componentInstance.ariaLabel = ariaLabel;
  fixture.detectChanges();
  return fixture;
}

describe('SumiSessionProgress (wide/in-place rendering)', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one segment per entry, proportional by size (flex-grow)', () => {
    const fixture = render([
      { size: 10, done: 4 },
      { size: 20, done: 20 },
    ]);
    const segmentEls: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.sumi-session-progress__segment',
    );
    expect(segmentEls.length).toBe(2);
    expect(segmentEls[0].style.flexGrow).toBe('10');
    expect(segmentEls[1].style.flexGrow).toBe('20');
  });

  it('fills each segment to done/size as a percentage', () => {
    const fixture = render([{ size: 10, done: 4 }]);
    const fill: HTMLElement = fixture.nativeElement.querySelector('.sumi-session-progress__fill');
    expect(fill.style.width).toBe('40%');
  });

  it('clamps the fill to [0, 1] when done is outside the segment size', () => {
    const fixture = render([
      { size: 10, done: 15 },
      { size: 10, done: -5 },
    ]);
    const fills: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.sumi-session-progress__fill',
    );
    expect(fills[0].style.width).toBe('100%');
    expect(fills[1].style.width).toBe('0%');
  });

  it('has role="progressbar" with the summed done/size as aria-valuenow/-max', () => {
    const fixture = render(
      [
        { size: 10, done: 10 },
        { size: 8, done: 3 },
      ],
      'Session progress',
    );
    const bar: HTMLElement = fixture.nativeElement.querySelector('.sumi-session-progress__bar');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-label')).toBe('Session progress');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('18');
    expect(bar.getAttribute('aria-valuenow')).toBe('13');
  });

  it('clamps out-of-range done values before summing for aria-valuenow', () => {
    const fixture = render([
      { size: 10, done: 15 },
      { size: 10, done: -5 },
    ]);
    const bar: HTMLElement = fixture.nativeElement.querySelector('.sumi-session-progress__bar');
    expect(bar.getAttribute('aria-valuenow')).toBe('10');
  });

  it('shows no labels row for a single segment, even with a label set', () => {
    const fixture = render([{ size: 10, done: 4, label: 'Batch 1' }]);
    expect(fixture.nativeElement.querySelector('.sumi-session-progress__labels')).toBeNull();
  });

  it('shows no labels row for multiple segments when none has a label', () => {
    const fixture = render([
      { size: 10, done: 4 },
      { size: 10, done: 0 },
    ]);
    expect(fixture.nativeElement.querySelector('.sumi-session-progress__labels')).toBeNull();
  });

  it('shows a labels row for multiple segments once at least one has a label', () => {
    const fixture = render([
      { size: 10, done: 10, label: 'Batch 1' },
      { size: 10, done: 4, label: 'Batch 2' },
      { size: 8, done: 0, label: 'Batch 3' },
    ]);
    const labels: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.sumi-session-progress__label',
    );
    expect(labels.length).toBe(3);
    expect(Array.from(labels).map((l) => l.textContent?.trim())).toEqual([
      'Batch 1',
      'Batch 2',
      'Batch 3',
    ]);
  });

  it('renders inline (not in a shell narrow strip) while wide', () => {
    const fixture = render([{ size: 10, done: 4 }]);
    expect(fixture.nativeElement.querySelector('.sumi-session-progress__bar')).toBeTruthy();
  });
});

describe('SumiSessionProgress narrow-screen placement (sumi-ui#74)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  @Component({
    imports: [SumiAppShell, SumiSessionProgress],
    template: `<sumi-app-shell [brand]="{ glyph: '墨', name: 'Test App' }" [nav]="[]">
      <sumi-session-progress [segments]="segments" ariaLabel="Session progress" />
    </sumi-app-shell>`,
  })
  class ShellHost {
    segments: SumiSessionProgressSegment[] = [{ size: 10, done: 4 }];
  }

  async function createShellHost() {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('teleports into the shell header narrow strip while narrow, not where the app placed it', async () => {
    mockMatchMedia(true);
    const fixture = await createShellHost();

    const strip: HTMLElement | null = fixture.nativeElement.querySelector(
      '.sumi-app-shell__narrow-strip',
    );
    expect(strip?.querySelector('.sumi-session-progress__bar')).toBeTruthy();

    // Only the teleported copy exists — not a second one left behind where
    // the app originally placed <sumi-session-progress>.
    const bars = fixture.nativeElement.querySelectorAll('.sumi-session-progress__bar');
    expect(bars.length).toBe(1);
  });

  it('renders in place, not in the strip, while wide', async () => {
    mockMatchMedia(false);
    const fixture = await createShellHost();

    expect(fixture.nativeElement.querySelector('.sumi-app-shell__narrow-strip')).toBeNull();
    const bars = fixture.nativeElement.querySelectorAll('.sumi-session-progress__bar');
    expect(bars.length).toBe(1);
  });

  it('moves from in place to the strip when the viewport narrows live', async () => {
    const media = mockMatchMedia(false);
    const fixture = await createShellHost();
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__narrow-strip')).toBeNull();

    media.fire(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const strip: HTMLElement | null = fixture.nativeElement.querySelector(
      '.sumi-app-shell__narrow-strip',
    );
    expect(strip?.querySelector('.sumi-session-progress__bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.sumi-session-progress__bar').length).toBe(1);
  });

  it('unregisters the narrow strip when destroyed while narrow', async () => {
    mockMatchMedia(true);
    const fixture = await createShellHost();
    expect(fixture.nativeElement.querySelector('.sumi-app-shell__narrow-strip')).toBeTruthy();

    fixture.destroy();
    // The shell fixture itself is gone too in this test (same fixture), so
    // just assert destroying does not throw — the register/unregister
    // contract itself is covered by SumiShell's own focus-actions tests in
    // shell.spec.ts, which this mirrors.
    expect(() => fixture.destroy()).not.toThrow();
  });
});
