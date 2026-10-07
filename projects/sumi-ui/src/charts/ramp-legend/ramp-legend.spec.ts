import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiRampLegend } from './ramp-legend';

@Component({
  imports: [SumiRampLegend],
  template: `
    <sumi-ramp-legend
      [minLabel]="minLabel()"
      [maxLabel]="maxLabel()"
      [noDataLabel]="noDataLabel()"
    />
  `,
})
class HostComponent {
  readonly minLabel = signal('Less');
  readonly maxLabel = signal('More');
  readonly noDataLabel = signal<string | undefined>(undefined);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiRampLegend', () => {
  it('renders the min/max labels and five ramp swatches by default', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;
    const labels = [...el.querySelectorAll('.sumi-ramp-legend__label')].map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toEqual(['Less', 'More']);
    expect(el.querySelectorAll('.sumi-ramp-legend__swatch').length).toBe(5);
  });

  it('omits the "no data" entry when noDataLabel is not given', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.sumi-ramp-legend__no-data')).toBeNull();
  });

  it('appends a "no data" swatch and label when given', () => {
    const fixture = setup();
    fixture.componentInstance.noDataLabel.set('Not practised yet');
    fixture.detectChanges();
    const noData = fixture.nativeElement.querySelector('.sumi-ramp-legend__no-data');
    expect(noData?.textContent?.trim()).toBe('Not practised yet');
  });
});
