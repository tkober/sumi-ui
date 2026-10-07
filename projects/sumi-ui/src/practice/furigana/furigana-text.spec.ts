import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiFuriganaText, type SumiFuriganaSegment } from './furigana-text';
import { SumiFurigana } from './furigana.service';

@Component({
  imports: [SumiFuriganaText],
  template: `<sumi-furigana [segments]="segments()" />`,
})
class HostComponent {
  segments = signal<SumiFuriganaSegment[]>([{ base: '食べる', reading: 'たべる' }]);
}

describe('SumiFuriganaText', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
  }

  it('renders a ruby/rt pair for a segment with a reading', () => {
    const { host } = create();
    const ruby = host.querySelector('ruby');
    expect(ruby?.querySelector('rt')?.textContent).toBe('たべる');
    expect(ruby?.textContent).toContain('食べる');
  });

  it('renders plain text for a segment without a reading', () => {
    const { fixture, host } = create();
    fixture.componentInstance.segments.set([{ base: 'plain text' }]);
    fixture.detectChanges();

    expect(host.querySelector('ruby')).toBeNull();
    expect(host.querySelector('span')?.textContent).toBe('plain text');
  });

  it('renders mixed segments in order', () => {
    const { fixture, host } = create();
    fixture.componentInstance.segments.set([{ base: '食', reading: 'た' }, { base: 'べる' }]);
    fixture.detectChanges();

    expect(host.textContent?.replace(/\s+/g, '')).toBe('食たべる');
  });

  it('sets lang="ja" on the host', () => {
    const { host } = create();
    expect(host.querySelector('sumi-furigana')?.getAttribute('lang')).toBe('ja');
  });

  it('visually hides the reading when furigana is off, without removing it', () => {
    const { fixture, host } = create();
    TestBed.inject(SumiFurigana).visible.set(false);
    fixture.detectChanges();

    const rt = host.querySelector('rt')!;
    expect(rt.classList.contains('sumi-furigana__rt--hidden')).toBe(true);
    expect(rt.textContent).toBe('たべる'); // still rendered, just hidden
  });

  it('shows the reading again once furigana is switched back on', () => {
    const { fixture, host } = create();
    const furigana = TestBed.inject(SumiFurigana);
    furigana.visible.set(false);
    fixture.detectChanges();
    furigana.visible.set(true);
    fixture.detectChanges();

    expect(host.querySelector('rt')!.classList.contains('sumi-furigana__rt--hidden')).toBe(false);
  });
});
