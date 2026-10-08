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
  calendarCellSize,
  calendarBucketThresholds,
  calendarBucket,
  calendarMonthLabels,
  formatCalendarCellTitle,
  calendarGeometry,
  matrixDomain,
  matrixBucket,
  matrixCellGeometry,
  heatmapCellColor,
  heatmapTextColor,
  largestRemainderPercentages,
  donutSegments,
  arcPath,
  polarPoint,
  labelFitsArc,
  arcLabelRotation,
  sunburstGeometry,
  sunburstTint,
  sunburstTextColor,
  sunburstLabelOrientation,
  arcLabelTangentialRotation,
  type SumiPoint,
  type SparklineGeometry,
  type SegmentGeometry,
  type BarGeometry,
  type StackedBarGeometry,
  type PlotBox,
  type SumiCalendarDay,
  type CalendarCell,
  type CalendarGeometry,
  type SumiMatrixCellInput,
  type MatrixCellGeometry,
  type SumiDonutSegment,
  type DonutSegmentGeometry,
  type SumiSunburstNode,
  type SunburstSegmentGeometry,
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
export { SumiRampLegend } from './ramp-legend/ramp-legend';
export { SumiDataTable, type SumiTableColumn, type SumiTableRow } from './data-table/data-table';
export { SumiTableCellTemplate } from './data-table/table-cell-template.directive';
export { SumiCalendarHeatmap } from './calendar-heatmap/calendar-heatmap';
export { SumiMatrixHeatmap, type SumiMatrixCellSelection } from './matrix-heatmap/matrix-heatmap';
export { SumiDonut } from './donut/donut';
export { SumiSunburst } from './sunburst/sunburst';

import { SumiStatTile } from './stat-tile/stat-tile';
import { SumiStatGrid } from './stat-grid/stat-grid';
import { SumiSegmentedBar } from './segmented-bar/segmented-bar';
import { SumiSparkline } from './sparkline/sparkline';
import { SumiBarChart } from './bar-chart/bar-chart';
import { SumiLegend } from './legend/legend';
import { SumiRampLegend } from './ramp-legend/ramp-legend';
import { SumiDataTable } from './data-table/data-table';
import { SumiTableCellTemplate } from './data-table/table-cell-template.directive';
import { SumiCalendarHeatmap } from './calendar-heatmap/calendar-heatmap';
import { SumiMatrixHeatmap } from './matrix-heatmap/matrix-heatmap';
import { SumiDonut } from './donut/donut';
import { SumiSunburst } from './sunburst/sunburst';

/** Convenience array for `imports: [...SUMI_CHARTS]` in a standalone component. */
export const SUMI_CHARTS = [
  SumiStatTile,
  SumiStatGrid,
  SumiSegmentedBar,
  SumiSparkline,
  SumiBarChart,
  SumiLegend,
  SumiRampLegend,
  SumiDataTable,
  SumiTableCellTemplate,
  SumiCalendarHeatmap,
  SumiMatrixHeatmap,
  SumiDonut,
  SumiSunburst,
] as const;
