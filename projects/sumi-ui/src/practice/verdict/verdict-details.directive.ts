import { Directive } from '@angular/core';

/**
 * Marks the content of `sumi-verdict`'s collapsible details slot:
 * `<div sumiVerdictDetails>...</div>`. A bare marker so `SumiVerdictCard`
 * can tell via a content query whether the slot actually has anything in
 * it, to decide whether to show the toggle/register `F` at all.
 */
@Directive({ selector: '[sumiVerdictDetails]' })
export class SumiVerdictDetailsDirective {}
