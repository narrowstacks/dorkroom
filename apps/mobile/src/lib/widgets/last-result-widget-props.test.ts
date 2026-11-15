import { describe, expect, it } from 'vitest';
import { recordsLastResult, TOOLS } from '@/lib/tools';
import {
  buildLastResultWidgetProps,
  LAST_RESULT_URL,
} from './last-result-widget-props';

describe('buildLastResultWidgetProps', () => {
  it('lists each recording tool with a result, in hub order', () => {
    const props = buildLastResultWidgetProps({
      lens: { text: '69mm' },
      'camera-exposure': { text: 'EV 7' },
    });
    expect(props.rows).toEqual([
      { label: 'Camera Exposure', value: 'EV 7' },
      { label: 'Lenses', value: '69mm' },
    ]);
    expect(props.url).toBe(LAST_RESULT_URL);
  });

  it('is empty before any tool has recorded, and says which tools fill it', () => {
    const props = buildLastResultWidgetProps({});
    expect(props.rows).toEqual([]);
    expect(props.emptyHint).toBe(
      'Camera Exposure and Lenses keep their last answer here.'
    );
  });

  it('never shows a tool that resets when reopened', () => {
    const props = buildLastResultWidgetProps({
      exposure: { text: '12.3s' },
      reciprocity: { text: '1m 4.7s' },
    });
    expect(props.rows).toEqual([]);
  });

  it('records only in Shoot today, which is why it opens the Shoot hub', () => {
    // If a Print tool starts recording, revisit the widget's link and name.
    const phases = new Set(
      TOOLS.filter((t) => recordsLastResult(t.id)).map((t) => t.phase)
    );
    expect([...phases]).toEqual(['shoot']);
  });

  it('cuts a long value', () => {
    const props = buildLastResultWidgetProps({
      lens: { text: '9'.repeat(60) },
    });
    expect(props.rows[0].value.length).toBeLessThanOrEqual(24);
  });
});
