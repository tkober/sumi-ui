import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiPage, SumiPageWidth } from './page';

// Host state is held in signals rather than plain fields: this harness's
// zoneless change detection only re-checks a fixture on a signal write (or
// an event), not on an arbitrary later mutation of a plain property.
@Component({
  imports: [SumiPage],
  template: `
    <sumi-page [width]="width()" [title]="title()" [subtitle]="subtitle()">
      <div sumiPageActions>Actions</div>
      Body
    </sumi-page>
  `,
})
class HostComponent {
  width = signal<SumiPageWidth>('default');
  title = signal<string | undefined>('Title');
  subtitle = signal<string | undefined>(undefined);
}

describe('SumiPage', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title as an h1 and the subtitle as a muted line', () => {
    const fixture = create();
    fixture.componentInstance.subtitle.set('Subtitle');
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement.querySelector('sumi-page');
    expect(page.querySelector('h1')?.textContent).toBe('Title');
    expect(page.querySelector('.sumi-page__subtitle')?.textContent).toBe('Subtitle');
  });

  it('renders no header when there is no title', () => {
    const fixture = create();
    fixture.componentInstance.title.set(undefined);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement.querySelector('sumi-page');
    expect(page.querySelector('.sumi-page__header')).toBeNull();
    expect(page.textContent).toContain('Body');
  });

  it('projects actions next to the title', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Actions');
  });

  it('wraps the projected content in a body element that carries the spacing', () => {
    const fixture = create();
    const page: HTMLElement = fixture.nativeElement.querySelector('sumi-page');
    const body = page.querySelector('.sumi-page__body');
    expect(body).not.toBeNull();
    expect(body?.textContent).toContain('Body');
    // Actions live outside the body, next to the title.
    expect(body?.textContent).not.toContain('Actions');
  });

  it.each<[SumiPageWidth, string]>([
    ['narrow', 'sumi-page--narrow'],
    ['default', ''],
    ['wide', 'sumi-page--wide'],
  ])('applies the %s width class', (width, className) => {
    const fixture = create();
    fixture.componentInstance.width.set(width);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement.querySelector('sumi-page');
    if (className) {
      expect(page.classList.contains(className)).toBe(true);
    } else {
      expect(page.classList.contains('sumi-page--narrow')).toBe(false);
      expect(page.classList.contains('sumi-page--wide')).toBe(false);
    }
  });
});
