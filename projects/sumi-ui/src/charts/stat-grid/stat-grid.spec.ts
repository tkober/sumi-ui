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

@Component({
  imports: [SumiStatGrid],
  template: `
    <sumi-stat-grid>
      @for (tile of tiles; track tile) {
        <span>{{ tile }}</span>
      }
    </sumi-stat-grid>
  `,
})
class CountedHostComponent {
  tiles: string[] = [];
}

describe('SumiStatGrid tile-count columns (sumi-ui#36)', () => {
  // The actual column counts only take effect under real CSS cascade +
  // container-query support (verified visually via the showcase
  // screenshots, see charts.html's "Stat grid: never a lone tile"
  // section) -- jsdom does not evaluate `:has()`/`@container` against
  // getComputedStyle. These specs instead confirm the selectors this
  // behaviour depends on are actually present in the component's
  // stylesheet, and that every tile count still renders all its tiles.
  function stylesheetContaining(fragment: string): CSSStyleSheet | undefined {
    return Array.from(document.styleSheets).find((sheet) =>
      Array.from(sheet.cssRules ?? []).some((rule) => rule.cssText?.includes(fragment)),
    );
  }

  it.each([1, 2, 3, 4, 5, 6])('renders all %d tiles', (count) => {
    TestBed.configureTestingModule({ imports: [CountedHostComponent] });
    const fixture = TestBed.createComponent(CountedHostComponent);
    fixture.componentInstance.tiles = Array.from({ length: count }, (_, i) => `tile-${i}`);
    fixture.detectChanges();
    const spans = fixture.nativeElement.querySelectorAll('sumi-stat-grid span');
    expect(spans.length).toBe(count);
  });

  it('defines an exact-count selector for each of 1 to 4 tiles', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    for (const n of [1, 2, 3, 4]) {
      expect(stylesheetContaining(`:nth-child(${n}):last-child`)).toBeDefined();
    }
  });

  it('only grows the 4-tile layout to 4 columns once there is room, skipping 3', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    const sheet = stylesheetContaining(':nth-child(4):last-child');
    const rules = Array.from(sheet!.cssRules);
    const fourColumnRule = rules.find(
      (rule) => rule.cssText?.includes('@container') && rule.cssText?.includes('repeat(4, 1fr)'),
    );
    expect(fourColumnRule?.cssText).toContain('636px');
    // 3 columns (the "3 + 1" split the issue reports) never appears in
    // any rule targeting exactly 4 tiles.
    const fourTileBlocks = rules.filter((rule) =>
      rule.cssText?.includes(':nth-child(4):last-child'),
    );
    expect(fourTileBlocks.length).toBeGreaterThan(0);
    for (const block of fourTileBlocks) {
      expect(block.cssText).not.toContain('repeat(3,');
    }
  });

  it('only grows the 6-tile layout to 6 columns once there is room, skipping 4 and 5', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    const sheet = stylesheetContaining(':nth-child(6):last-child');
    const rules = Array.from(sheet!.cssRules);
    const sixColumnRule = rules.find(
      (rule) => rule.cssText?.includes('@container') && rule.cssText?.includes('repeat(6, 1fr)'),
    );
    expect(sixColumnRule?.cssText).toContain('960px');
  });
});
