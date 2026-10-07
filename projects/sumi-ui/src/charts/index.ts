/**
 * Charts area: statistics SVG components (see
 * docs/concept.md#statistik-komponenten). Maths (scales, ticks, path/segment
 * geometry) lives in pure, exported, unit-tested functions in `./math` —
 * components here only render. Every chart that is actually an SVG graphic
 * (`sumi-segmented-bar`, `sumi-sparkline`, `sumi-bar-chart`) carries
 * `role="img"` and a required `ariaLabel`, draws colours only from
 * `--sumi-*` tokens, and takes an optional `table` input that adds a
 * `sumi-data-table` fallback in a `<details>` ("Nie nur Farbe" in the
 * concept's Leitbild).
 */

export {
  toPoints,
  sparklineGeometry,
  segmentGeometry,
  barGeometry,
  stackedBarGeometry,
  stackOffsets,
  sparseLabelIndices,
  rampColor,
  DEFAULT_BAR_PLOT,
  type SumiPoint,
  type SparklineGeometry,
  type SegmentGeometry,
  type BarGeometry,
  type StackedBarGeometry,
  type PlotBox,
} from './math';

export { SumiStatTile } from './stat-tile/stat-tile';
export { SumiStatGrid } from './stat-grid/stat-grid';
export { SumiSegmentedBar, type SumiSegment } from './segmented-bar/segmented-bar';
export { SumiSparkline } from './sparkline/sparkline';
export {
  SumiBarChart,
  type SumiBar,
  type SumiBarSeries,
  type SumiStackedRow,
} from './bar-chart/bar-chart';
export { SumiLegend, type SumiLegendItem } from './legend/legend';
export { SumiDataTable, type SumiTableColumn, type SumiTableRow } from './data-table/data-table';

import { SumiStatTile } from './stat-tile/stat-tile';
import { SumiStatGrid } from './stat-grid/stat-grid';
import { SumiSegmentedBar } from './segmented-bar/segmented-bar';
import { SumiSparkline } from './sparkline/sparkline';
import { SumiBarChart } from './bar-chart/bar-chart';
import { SumiLegend } from './legend/legend';
import { SumiDataTable } from './data-table/data-table';

/** Convenience array for `imports: [...SUMI_CHARTS]` in a standalone component. */
export const SUMI_CHARTS = [
  SumiStatTile,
  SumiStatGrid,
  SumiSegmentedBar,
  SumiSparkline,
  SumiBarChart,
  SumiLegend,
  SumiDataTable,
] as const;
