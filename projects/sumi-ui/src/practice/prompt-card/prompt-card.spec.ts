import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiKeyboardVisibility } from 'sumi-ui/core';
import { SumiPromptCard } from './prompt-card';

@Component({
  imports: [SumiPromptCard],
  template: `
    <sumi-prompt-card [text]="text()" [kind]="kind()" [meta]="meta()" [tone]="tone()">
      @if (extra()) {
        <p class="extra">extra content</p>
      }
    </sumi-prompt-card>
  `,
})
class HostComponent {
  text = signal('食べる');
  kind = signal<string | undefined>(undefined);
  meta = signal<string[] | undefined>(undefined);
  tone = signal<string | undefined>(undefined);
  extra = signal(false);
}

describe('SumiPromptCard', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const text = (): HTMLElement => host.querySelector('.sumi-prompt-card__text')!;
    return { fixture, host, text };
  }

  it('sets --glyphs to the code-point count of the prompt text', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set('食べる');
    fixture.detectChanges();
    expect(text().style.getPropertyValue('--glyphs')).toBe('3');
  });

  it('counts small kana as their own glyph', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set('がっこう');
    fixture.detectChanges();
    expect(text().style.getPropertyValue('--glyphs')).toBe('4');
  });

  it('is 1 glyph for a single character', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set('森');
    fixture.detectChanges();
    expect(text().style.getPropertyValue('--glyphs')).toBe('1');
  });

  it('counts mixed Latin/Japanese text by code points', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set('JLPT N5');
    fixture.detectChanges();
    expect(text().style.getPropertyValue('--glyphs')).toBe(String('JLPT N5'.length));
  });

  it('renders lang="ja" on the prompt text', () => {
    const { text } = create();
    expect(text().getAttribute('lang')).toBe('ja');
  });

  it('shows the kind chip only when set', () => {
    const { fixture, host } = create();
    expect(host.querySelector('.sumi-prompt-card__kind')).toBeNull();

    fixture.componentInstance.kind.set('Reading');
    fixture.detectChanges();
    expect(host.querySelector('.sumi-prompt-card__kind')?.textContent).toBe('Reading');
  });

  it('shows the meta line only when there are entries', () => {
    const { fixture, host } = create();
    expect(host.querySelector('.sumi-prompt-card__meta')).toBeNull();

    fixture.componentInstance.meta.set(['Kanji', 'Level 9', 'Guru']);
    fixture.detectChanges();
    const meta = host.querySelector('.sumi-prompt-card__meta');
    expect(meta?.textContent).toContain('Kanji');
    expect(meta?.textContent).toContain('Level 9');
    expect(meta?.textContent).toContain('Guru');
  });

  it('projects extra content', () => {
    const { fixture, host } = create();
    fixture.componentInstance.extra.set(true);
    fixture.detectChanges();
    expect(host.querySelector('.extra')).toBeTruthy();
  });

  it('adds the compact modifier class when the on-screen keyboard is open', () => {
    const keyboardOpen = signal(false);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: SumiKeyboardVisibility, useValue: { isOpen: keyboardOpen.asReadonly() } },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const cardHost = (fixture.nativeElement as HTMLElement).querySelector(
      'sumi-prompt-card',
    ) as HTMLElement;

    expect(cardHost.classList.contains('sumi-prompt-card--compact')).toBe(false);

    keyboardOpen.set(true);
    fixture.detectChanges();
    expect(cardHost.classList.contains('sumi-prompt-card--compact')).toBe(true);
  });

  it('sets the tone as a CSS custom property on the host', () => {
    const { fixture, host } = create();
    fixture.componentInstance.tone.set('#2b4c7e');
    fixture.detectChanges();
    const cardHost = host.querySelector('sumi-prompt-card') as HTMLElement;
    expect(cardHost.style.getPropertyValue('--sumi-prompt-tone')).toBe('#2b4c7e');
  });
});
