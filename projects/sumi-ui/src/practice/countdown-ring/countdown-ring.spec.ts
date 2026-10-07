import { TestBed } from '@angular/core/testing';
import { SumiCountdownRing } from './countdown-ring';

const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function render(elapsedMs: number, targetMs: number) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SumiCountdownRing] });
  const fixture = TestBed.createComponent(SumiCountdownRing);
  fixture.componentRef.setInput('elapsedMs', elapsedMs);
  fixture.componentRef.setInput('targetMs', targetMs);
  fixture.detectChanges();
  return fixture;
}

function host(fixture: ReturnType<typeof render>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function label(fixture: ReturnType<typeof render>): string {
  return host(fixture).querySelector('text')?.textContent?.trim() ?? '';
}

function offset(fixture: ReturnType<typeof render>): number {
  const circle = host(fixture).querySelector('circle.sumi-countdown-ring__value')!;
  return Number(circle.getAttribute('stroke-dashoffset'));
}

describe('SumiCountdownRing', () => {
  it('shows the full target at the start: offset 0, neutral', () => {
    const fixture = render(0, 5000);

    expect(label(fixture)).toBe('5.0');
    expect(offset(fixture)).toBeCloseTo(0, 5);
    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(false);
    expect(host(fixture).classList.contains('sumi-countdown-ring--overtime')).toBe(false);
  });

  it('is half-drained at the midpoint, still neutral', () => {
    const fixture = render(2500, 5000);

    expect(label(fixture)).toBe('2.5');
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE * 0.5, 3);
    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(false);
  });

  it('is not low just above the 25% boundary', () => {
    const fixture = render(3749, 5000); // fractionLeft ~ 0.2502

    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(false);
  });

  it('turns low exactly at the 25% boundary', () => {
    const fixture = render(3750, 5000); // fractionLeft = 0.25 exactly

    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(true);
    expect(label(fixture)).toBe('1.3');
  });

  it('is low (not overtime) at exactly 0 remaining', () => {
    const fixture = render(5000, 5000);

    expect(label(fixture)).toBe('0.0');
    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(true);
    expect(host(fixture).classList.contains('sumi-countdown-ring--overtime')).toBe(false);
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE, 3);
  });

  it('counts up past zero as "+x.x" and switches to overtime', () => {
    const fixture = render(6200, 5000); // 1200ms over

    expect(label(fixture)).toBe('+1.2');
    expect(host(fixture).classList.contains('sumi-countdown-ring--overtime')).toBe(true);
    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(false);
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE, 3);
  });

  it('treats a non-positive target as "no limit": full ring, no label, no low/overtime', () => {
    const fixture = render(1000, 0);

    expect(label(fixture)).toBe('');
    expect(offset(fixture)).toBeCloseTo(0, 5);
    expect(host(fixture).classList.contains('sumi-countdown-ring--low')).toBe(false);
    expect(host(fixture).classList.contains('sumi-countdown-ring--overtime')).toBe(false);

    const negative = render(1000, -5000);
    expect(offset(negative)).toBeCloseTo(0, 5);
  });

  it('has role="timer" with a descriptive aria-label', () => {
    const fixture = render(0, 5000);
    expect(host(fixture).getAttribute('role')).toBe('timer');
    expect(host(fixture).getAttribute('aria-label')).toBe('5.0 seconds remaining');

    const overtime = render(6200, 5000);
    expect(host(overtime).getAttribute('aria-label')).toBe('1.2 seconds over time');
  });
});
