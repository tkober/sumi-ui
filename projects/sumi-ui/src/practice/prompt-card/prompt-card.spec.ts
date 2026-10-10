import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SUMI_ACCENT_PRESETS,
  SUMI_CONFIG,
  SumiKeyboardVisibility,
  type SumiConfig,
} from 'sumi-ui/core';
import { SumiPromptCard, type SumiPromptCardAppearance } from './prompt-card';
import { SumiPromptVisualDirective } from './prompt-visual.directive';

@Component({
  imports: [SumiPromptCard],
  template: `
    <sumi-prompt-card
      [text]="text()"
      [kind]="kind()"
      [meta]="meta()"
      [tone]="tone()"
      [appearance]="appearance()"
    >
      @if (extra()) {
        <p class="extra">extra content</p>
      }
    </sumi-prompt-card>
  `,
})
class HostComponent {
  text = signal<string | undefined>('食べる');
  kind = signal<string | undefined>(undefined);
  meta = signal<string[] | undefined>(undefined);
  tone = signal<string | undefined>(undefined);
  appearance = signal<SumiPromptCardAppearance>('accent');
  extra = signal(false);
}

function configureSumi(config: Partial<SumiConfig> = {}) {
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      {
        provide: SUMI_CONFIG,
        useValue: {
          accent: SUMI_ACCENT_PRESETS.ai,
          motif: 'mountains',
          pattern: 'none',
          dashboardPort: 8087,
          ...config,
        },
      },
    ],
  });
}

@Component({
  imports: [SumiPromptCard, SumiPromptVisualDirective],
  template: `
    <sumi-prompt-card [text]="text()">
      <img [sumiPromptVisual]="variant()" src="radical.png" alt="" />
    </sumi-prompt-card>
  `,
})
class VisualHostComponent {
  text = signal<string | undefined>(undefined);
  variant = signal<'' | 'ink'>('');
}

describe('SumiPromptCard', () => {
  function create(config: Partial<SumiConfig> = {}) {
    configureSumi(config);
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

  describe('appearance', () => {
    it('defaults to accent, never adding the tinted class', () => {
      const { fixture, host } = create();
      fixture.componentInstance.tone.set('#2b4c7e');
      fixture.detectChanges();
      const cardHost = host.querySelector('sumi-prompt-card') as HTMLElement;
      expect(cardHost.classList.contains('sumi-prompt-card--tinted')).toBe(false);
    });

    it('adds the tinted class for appearance="tinted" with a tone set', () => {
      const { fixture, host } = create();
      fixture.componentInstance.appearance.set('tinted');
      fixture.componentInstance.tone.set('#2b4c7e');
      fixture.detectChanges();
      const cardHost = host.querySelector('sumi-prompt-card') as HTMLElement;
      expect(cardHost.classList.contains('sumi-prompt-card--tinted')).toBe(true);
    });

    it('looks like accent — no tinted class — for appearance="tinted" without a tone', () => {
      const { fixture, host } = create();
      fixture.componentInstance.appearance.set('tinted');
      fixture.detectChanges();
      const cardHost = host.querySelector('sumi-prompt-card') as HTMLElement;
      expect(cardHost.classList.contains('sumi-prompt-card--tinted')).toBe(false);
    });

    it('renders the app pattern layer when tinted and a pattern is configured', () => {
      const { fixture, host } = create({ pattern: 'seigaiha' });
      fixture.componentInstance.appearance.set('tinted');
      fixture.componentInstance.tone.set('#2b4c7e');
      fixture.detectChanges();
      const pattern = host.querySelector('sumi-pattern .sumi-pattern__svg');
      expect(pattern?.innerHTML.trim()).not.toBe('');
    });

    it('renders no pattern markup when provideSumi({ pattern: "none" })', () => {
      const { fixture, host } = create({ pattern: 'none' });
      fixture.componentInstance.appearance.set('tinted');
      fixture.componentInstance.tone.set('#2b4c7e');
      fixture.detectChanges();
      const pattern = host.querySelector('sumi-pattern .sumi-pattern__svg');
      expect(pattern?.innerHTML.trim()).toBe('');
    });

    it('renders no sumi-pattern element at all for appearance="accent"', () => {
      const { fixture, host } = create({ pattern: 'seigaiha' });
      fixture.componentInstance.tone.set('#2b4c7e');
      fixture.detectChanges();
      expect(host.querySelector('sumi-pattern')).toBeNull();
    });
  });

  it('renders no text element when text is unset', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set(undefined);
    fixture.detectChanges();
    expect(text()).toBeNull();
  });

  it('renders no text element when text is empty', () => {
    const { fixture, text } = create();
    fixture.componentInstance.text.set('');
    fixture.detectChanges();
    expect(text()).toBeNull();
  });

  describe('[sumiPromptVisual]', () => {
    function createVisual() {
      TestBed.configureTestingModule({ imports: [VisualHostComponent] });
      const fixture = TestBed.createComponent(VisualHostComponent);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const visual = (): HTMLElement => host.querySelector('.sumi-prompt-card__visual')!;
      const text = (): HTMLElement | null => host.querySelector('.sumi-prompt-card__text');
      return { fixture, host, visual, text };
    }

    it('projects the visual slot content in place of the text', () => {
      const { visual, text } = createVisual();
      expect(visual()).toBeTruthy();
      expect(visual().tagName).toBe('IMG');
      expect(text()).toBeNull();
    });

    it('has no ink class by default', () => {
      const { visual } = createVisual();
      expect(visual().classList.contains('sumi-prompt-card__visual--ink')).toBe(false);
    });

    it('gets the ink class for the ink variant', () => {
      const { fixture, visual } = createVisual();
      fixture.componentInstance.variant.set('ink');
      fixture.detectChanges();
      expect(visual().classList.contains('sumi-prompt-card__visual--ink')).toBe(true);
    });

    it('still shows text alongside a visual when both are given', () => {
      const { fixture, text, visual } = createVisual();
      fixture.componentInstance.text.set('森');
      fixture.detectChanges();
      expect(visual()).toBeTruthy();
      expect(text()).toBeTruthy();
    });
  });
});
