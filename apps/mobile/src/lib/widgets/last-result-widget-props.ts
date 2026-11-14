// Pure builder of the "Last answers" widget's props: the last result each
// recording tool showed, the same entries the Shoot hub's tiles read
// (`last-result-store.ts`).
//
// Only a tool that is answer-first AND restores its inputs records a result
// (`recordsLastResult`): today that is Camera Exposure and Lenses, both in
// Shoot. Print's Exposure resets when reopened, so it records nothing, and a
// "last print exposure" widget would name an answer the tool no longer shows.
// The widget therefore shows the tools that do record, in hub order, and opens
// the Shoot hub where their tiles are.
import type { LastResults } from '@/lib/last-result-store';
import { recordsLastResult, TOOLS } from '@/lib/tools';
import { cutText, type WidgetPalette, widgetPalette } from './widget-palette';

/** Matches the `name` of the widget in app.json's `expo-widgets` entry. */
export const LAST_RESULT_WIDGET_NAME = 'LastResultWidget';

/** The hub whose tiles show these results. */
export const LAST_RESULT_URL = 'dorkroom://shoot';

const MAX_VALUE = 24;

export interface LastResultRow {
  /** The tool's label, "Camera Exposure". */
  label: string;
  /** The readout as the tile shows it, "EV 7". */
  value: string;
}

export interface LastResultWidgetProps {
  /** One row per recording tool with a result, in hub order. Empty: "No answers yet". */
  rows: LastResultRow[];
  /** Shown with no rows: which tools fill the widget, "Camera Exposure and Lenses keep...". */
  emptyHint: string;
  url: string;
  palette: WidgetPalette;
}

export function buildLastResultWidgetProps(
  results: LastResults
): LastResultWidgetProps {
  const rows: LastResultRow[] = [];
  const recording = TOOLS.filter((tool) => recordsLastResult(tool.id));
  for (const tool of recording) {
    const result = results[tool.id];
    if (result) {
      rows.push({ label: tool.label, value: cutText(result.text, MAX_VALUE) });
    }
  }
  const labels = recording.map((tool) => tool.label);
  const names =
    labels.length > 1
      ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
      : (labels[0] ?? 'Tools');
  return {
    rows,
    emptyHint: `${names} keep their last answer here.`,
    url: LAST_RESULT_URL,
    palette: widgetPalette('yellow'),
  };
}
