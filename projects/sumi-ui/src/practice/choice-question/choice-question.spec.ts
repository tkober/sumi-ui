import { TestBed } from '@angular/core/testing';
import { SumiChoiceQuestion, type SumiChoiceOption } from './choice-question';

const OPTIONS: SumiChoiceOption[] = [
  { id: 'a', text: 'Fresh fish' },
  { id: 'b', text: 'Soba noodles' },
  { id: 'c', text: 'Only sushi' },
  { id: 'd', text: 'Nothing — the market was closed' },
];

function render(inputs: { selectedId?: string | null; correctId?: string | null } = {}) {
  TestBed.configureTestingModule({ imports: [SumiChoiceQuestion] });
  const fixture = TestBed.createComponent(SumiChoiceQuestion);
  fixture.componentRef.setInput('options', OPTIONS);
  if (inputs.selectedId !== undefined) {
    fixture.componentRef.setInput('selectedId', inputs.selectedId);
  }
  if (inputs.correctId !== undefined) {
    fixture.componentRef.setInput('correctId', inputs.correctId);
  }
  fixture.detectChanges();
  return fixture;
}

function host(fixture: ReturnType<typeof render>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tiles(fixture: ReturnType<typeof render>): HTMLButtonElement[] {
  return Array.from(
    host(fixture).querySelectorAll<HTMLButtonElement>('.sumi-choice-question__tile'),
  );
}

function keydown(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('SumiChoiceQuestion', () => {
  it('renders one tile per option, lettered A, B, C, D', () => {
    const fixture = render();
    const letters = Array.from(host(fixture).querySelectorAll('.sumi-choice-question__letter')).map(
      (el) => el.textContent,
    );
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('emits optionSelected on tile click before the question is answered', () => {
    const fixture = render();
    let selected: string | undefined;
    fixture.componentInstance.optionSelected.subscribe((id) => (selected = id));

    tiles(fixture)[1].click();

    expect(selected).toBe('b');
  });

  it('does nothing on click once answered (correctId set)', () => {
    const fixture = render({ correctId: 'a' });
    let calls = 0;
    fixture.componentInstance.optionSelected.subscribe(() => calls++);

    tiles(fixture)[1].click();

    expect(calls).toBe(0);
  });

  it('disables every tile once answered', () => {
    const fixture = render({ correctId: 'a' });
    for (const tile of tiles(fixture)) {
      expect(tile.disabled).toBe(true);
    }
  });

  it('shows the selected tile’s "selected" style before answering', () => {
    const fixture = render({ selectedId: 'b' });
    expect(tiles(fixture)[1].classList.contains('sumi-choice-question__tile--selected')).toBe(true);
  });

  it('a correct pick highlights only that tile as correct', () => {
    const fixture = render({ selectedId: 'a', correctId: 'a' });
    const rendered = tiles(fixture);
    expect(rendered[0].classList.contains('sumi-choice-question__tile--correct')).toBe(true);
    expect(rendered[1].classList.contains('sumi-choice-question__tile--wrong')).toBe(false);
    expect(rendered[2].classList.contains('sumi-choice-question__tile--correct')).toBe(false);
  });

  it('a wrong pick marks the pick wrong and reveals the correct tile — only then', () => {
    const fixture = render({ selectedId: 'c', correctId: 'a' });
    const rendered = tiles(fixture);
    expect(rendered[2].classList.contains('sumi-choice-question__tile--wrong')).toBe(true);
    expect(rendered[0].classList.contains('sumi-choice-question__tile--correct')).toBe(true);
    expect(rendered[1].classList.contains('sumi-choice-question__tile--correct')).toBe(false);
    expect(rendered[3].classList.contains('sumi-choice-question__tile--correct')).toBe(false);
  });

  // --- keyboard selection: 1-4 / A-D ------------------------------------

  it('digit keys 1-4 select the matching option', () => {
    const fixture = render();
    let selected: string | undefined;
    fixture.componentInstance.optionSelected.subscribe((id) => (selected = id));

    keydown(host(fixture), '3');

    expect(selected).toBe('c');
  });

  it('letter keys A-D (any case) select the matching option', () => {
    const fixture = render();
    let selected: string | undefined;
    fixture.componentInstance.optionSelected.subscribe((id) => (selected = id));

    keydown(host(fixture), 'd');

    expect(selected).toBe('d');
  });

  it('ignores a digit/letter key once answered', () => {
    const fixture = render({ correctId: 'a' });
    let calls = 0;
    fixture.componentInstance.optionSelected.subscribe(() => calls++);

    keydown(host(fixture), '2');

    expect(calls).toBe(0);
  });

  it('ignores a key beyond the number of options', () => {
    const fixture = render();
    let calls = 0;
    fixture.componentInstance.optionSelected.subscribe(() => calls++);

    keydown(host(fixture), '9');
    keydown(host(fixture), 'f');

    expect(calls).toBe(0);
  });

  it('ignores a modified key (e.g. Ctrl+1), so browser/OS shortcuts keep working', () => {
    const fixture = render();
    let calls = 0;
    fixture.componentInstance.optionSelected.subscribe(() => calls++);

    host(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true }),
    );

    expect(calls).toBe(0);
  });
});
