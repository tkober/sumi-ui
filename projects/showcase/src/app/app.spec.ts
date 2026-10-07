import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('redirects the empty path to the core showcase page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.detectChanges();

    await router.navigate(['']);
    await fixture.whenStable();

    expect(location.path()).toBe('/core');
  });

  it('navigates to every showcase page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.detectChanges();

    for (const path of ['core', 'forms', 'practice', 'charts', 'layout', 'about']) {
      await router.navigate([path]);
      await fixture.whenStable();
      expect(location.path()).toBe(`/${path}`);
    }
  });
});
