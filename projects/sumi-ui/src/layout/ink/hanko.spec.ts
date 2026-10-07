import { TestBed } from '@angular/core/testing';
import { SumiHanko } from './hanko';

describe('SumiHanko', () => {
  it('renders both characters and the accessible label', () => {
    const fixture = TestBed.createComponent(SumiHanko);
    fixture.componentRef.setInput('characters', '合格');
    fixture.componentRef.setInput('label', 'Passed');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('合');
    expect(host.textContent).toContain('格');
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Passed');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('renders a single character', () => {
    const fixture = TestBed.createComponent(SumiHanko);
    fixture.componentRef.setInput('characters', '福');
    fixture.componentRef.setInput('label', 'Good fortune');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('福');
  });

  it('sizes the host from [size]', () => {
    const fixture = TestBed.createComponent(SumiHanko);
    fixture.componentRef.setInput('characters', '福');
    fixture.componentRef.setInput('label', 'Good fortune');
    fixture.componentRef.setInput('size', 72);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.getPropertyValue('--sumi-hanko-size')).toBe('72px');
  });
});
