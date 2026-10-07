import { TestBed } from '@angular/core/testing';
import { SumiFuriganaToggle } from './furigana-toggle';
import { SumiFurigana } from './furigana.service';

describe('SumiFuriganaToggle', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [SumiFuriganaToggle] });
    const fixture = TestBed.createComponent(SumiFuriganaToggle);
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('reflects the service state and toggles it on click', () => {
    const { fixture, host } = create();
    const furigana = TestBed.inject(SumiFurigana);
    expect(furigana.visible()).toBe(true);

    const button = host.querySelector('button[role="switch"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-checked')).toBe('true');

    button.click();
    fixture.detectChanges();

    expect(furigana.visible()).toBe(false);
    expect(button.getAttribute('aria-checked')).toBe('false');
  });
});
