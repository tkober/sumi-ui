import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiStatGrid } from './stat-grid';

@Component({
  imports: [SumiStatGrid],
  template: `<sumi-stat-grid><span>a</span><span>b</span></sumi-stat-grid>`,
})
class HostComponent {}

describe('SumiStatGrid', () => {
  it('projects its content', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ab');
  });
});
