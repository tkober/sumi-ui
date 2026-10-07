import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiLegend, type SumiLegendItem } from './legend';

@Component({
  imports: [SumiLegend],
  template: `<sumi-legend [items]="items" />`,
})
class HostComponent {
  items: SumiLegendItem[] = [{ label: 'Apprentice', color: 'red', value: 12, percent: 24 }];
}

describe('SumiLegend', () => {
  it('renders the label, value and percentage', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Apprentice');
    expect(text).toContain('12');
    expect(text).toContain('24%');
  });

  it('omits the value entirely when not given', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.items = [{ label: 'Guru', color: 'blue' }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-legend__value')).toBeNull();
  });
});
