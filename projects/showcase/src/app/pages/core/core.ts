import { Component } from '@angular/core';
import { SUMI_VERSION, SumiIcon, type SumiIconName } from 'sumi-ui/core';
import { SumiPage } from 'sumi-ui/layout';

interface TokenSwatch {
  label: string;
  token: string;
}

const ICON_NAMES: SumiIconName[] = [
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
];

@Component({
  selector: 'app-core-page',
  templateUrl: './core.html',
  styleUrl: './core.scss',
  imports: [SumiPage, SumiIcon],
})
export class CorePage {
  protected readonly version = SUMI_VERSION;
  protected readonly iconNames = ICON_NAMES;

  protected readonly surfaceSwatches: TokenSwatch[] = [
    { label: 'Background', token: '--sumi-bg' },
    { label: 'Surface', token: '--sumi-surface' },
    { label: 'Sunken', token: '--sumi-sunken' },
    { label: 'Line', token: '--sumi-line' },
  ];

  protected readonly textSwatches: TokenSwatch[] = [
    { label: 'Text', token: '--sumi-text' },
    { label: 'Text 2', token: '--sumi-text-2' },
    { label: 'Muted', token: '--sumi-muted' },
  ];

  protected readonly feedbackSwatches: TokenSwatch[] = [
    { label: 'Correct', token: '--sumi-correct' },
    { label: 'Correct soft', token: '--sumi-correct-soft' },
    { label: 'Wrong', token: '--sumi-wrong' },
    { label: 'Wrong soft', token: '--sumi-wrong-soft' },
    { label: 'Retry', token: '--sumi-retry' },
    { label: 'Retry soft', token: '--sumi-retry-soft' },
  ];

  protected readonly accentSwatches: TokenSwatch[] = [
    { label: 'Accent', token: '--sumi-accent' },
    { label: 'On accent', token: '--sumi-on-accent' },
    { label: 'Accent ink', token: '--sumi-accent-ink' },
    { label: 'Accent soft', token: '--sumi-accent-soft' },
  ];

  protected readonly seqSteps: TokenSwatch[] = [0, 1, 2, 3, 4, 5].map((step) => ({
    label: `seq-${step}`,
    token: `--sumi-seq-${step}`,
  }));

  protected readonly typeScale = [
    { label: 'xs', token: '--sumi-text-xs' },
    { label: 'sm', token: '--sumi-text-sm' },
    { label: 'md', token: '--sumi-text-md' },
    { label: 'lg', token: '--sumi-text-lg' },
    { label: 'xl', token: '--sumi-text-xl' },
    { label: '2xl', token: '--sumi-text-2xl' },
    { label: '3xl', token: '--sumi-text-3xl' },
  ];

  protected readonly spacingScale = [1, 2, 3, 4, 5, 6, 7, 8].map((step) => ({
    label: `space-${step}`,
    token: `--sumi-space-${step}`,
  }));
}
