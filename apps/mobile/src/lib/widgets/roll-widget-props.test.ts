import { describe, expect, it } from 'vitest';
import type { Camera, FilmRoll, Shot } from '@/schemas/film-log.schema';
import {
  buildRollWidgetProps,
  FILM_LOG_URL,
  framesLabel,
} from './roll-widget-props';

function roll(over: Partial<FilmRoll> & { id: string }): FilmRoll {
  return {
    cameraId: 'cam1',
    process: 'bw',
    status: 'active',
    shots: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const shots = (n: number): Shot[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    frameNumber: i + 1,
    source: 'manual',
  }));

const CAMERAS: Camera[] = [
  { id: 'cam1', name: 'Nikon FM2', format: '35mm', createdAt: '' },
];

describe('buildRollWidgetProps', () => {
  it('shows the roll the Meter logs to: label, EI and push, camera, frames shot', () => {
    const props = buildRollWidgetProps({
      rolls: [
        roll({ id: 'a', name: 'First', shots: shots(3) }),
        roll({
          id: 'b',
          filmStockName: 'Ilford HP5 Plus',
          iso: 800,
          pushPull: 1,
          shots: shots(23),
        }),
      ],
      cameras: CAMERAS,
      meterRollId: 'b',
    });
    expect(props).toMatchObject({
      hasRoll: true,
      label: 'Ilford HP5 Plus',
      exposure: 'EI 800 · Push +1',
      camera: 'Nikon FM2',
      frames: '23 frames',
      frameCount: 23,
      url: 'dorkroom://shoot/film-log/roll/b',
    });
  });

  it('falls back to the first active roll, as useMeterRoll does', () => {
    const props = buildRollWidgetProps({
      rolls: [
        roll({ id: 'x', status: 'finished', name: 'Done' }),
        roll({ id: 'y', name: 'Loaded' }),
      ],
      cameras: CAMERAS,
      meterRollId: 'x',
    });
    expect(props.label).toBe('Loaded');
    expect(props.url).toBe('dorkroom://shoot/film-log/roll/y');
  });

  it('says nothing about EI or camera it does not know', () => {
    const props = buildRollWidgetProps({
      rolls: [roll({ id: 'a', cameraId: 'gone', shots: shots(1) })],
      cameras: CAMERAS,
      meterRollId: undefined,
    });
    expect(props).toMatchObject({
      label: 'Roll',
      exposure: '',
      camera: '',
      frames: '1 frame',
    });
  });

  it('opens the film log when no roll is in a camera', () => {
    const props = buildRollWidgetProps({
      rolls: [roll({ id: 'a', status: 'developed' })],
      cameras: CAMERAS,
      meterRollId: 'a',
    });
    expect(props).toMatchObject({
      hasRoll: false,
      label: '',
      frames: '',
      url: FILM_LOG_URL,
    });
  });

  it('cuts a long label and escapes the id in the link', () => {
    const props = buildRollWidgetProps({
      rolls: [roll({ id: 'a b/c', name: 'x'.repeat(80) })],
      cameras: CAMERAS,
      meterRollId: undefined,
    });
    expect(props.label.length).toBeLessThanOrEqual(40);
    expect(props.label.endsWith('\u2026')).toBe(true);
    expect(props.url).toBe('dorkroom://shoot/film-log/roll/a%20b%2Fc');
  });

  it('uses the dark palette with the Shoot hue, as literal hex', () => {
    const { palette } = buildRollWidgetProps({
      rolls: [],
      cameras: [],
      meterRollId: undefined,
    });
    expect(palette.accent).toBe('#facc15');
    for (const colour of Object.values(palette)) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('counts frames in words', () => {
    expect(framesLabel(0)).toBe('0 frames');
    expect(framesLabel(1)).toBe('1 frame');
    expect(framesLabel(36)).toBe('36 frames');
  });
});
