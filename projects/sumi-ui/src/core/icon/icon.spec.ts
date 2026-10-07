import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SumiIcon, SumiIconName } from './icon';

@Component({
  template: `<sumi-icon [name]="name" />`,
  imports: [SumiIcon],
})
class HostComponent {
  name: SumiIconName = 'home';
}

describe('SumiIcon', () => {
  it('renders exactly one svg for every icon name', () => {
    const names: SumiIconName[] = [
      'home',
      'practice',
      'review',
      'lessons',
      'stats',
      'forecast',
      'list',
      'settings',
      'chat',
      'history',
      'scenarios',
      'dictionary',
      'rules',
      'more',
      'close',
      'system',
      'sun',
      'moon',
      'check',
      'cross',
      'info',
      'warning',
      'keyboard',
      'apps',
      'chevron-down',
    ];

    const fixture = TestBed.createComponent(HostComponent);
    for (const name of names) {
      fixture.componentInstance.name = name;
      fixture.detectChanges();
      const svgs = fixture.nativeElement.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
      expect(svgs[0].getAttribute('viewBox')).toBe('0 0 24 24');
    }
  });
});
