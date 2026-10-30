import { SENSOR_FORMAT_MAP, SENSOR_FORMATS } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  buildSensorFormatOptions,
  focalLengthFieldText,
  formatSensorDetail,
  parseFocalLengthInput,
  sensorOverlay,
} from './format';

function format(id: string) {
  const found = SENSOR_FORMAT_MAP[id];
  if (!found) throw new Error(`unknown sensor format ${id}`);
  return found;
}

const fullFrame = format('full-frame');
const mft = format('micro-four-thirds');
const sixBySix = format('film-6x6');

describe('formatSensorDetail', () => {
  it('describes size, category and crop factor', () => {
    expect(formatSensorDetail(fullFrame)).toBe(
      '36×24 mm · Digital · 1.00× crop'
    );
    expect(formatSensorDetail(sixBySix)).toBe(
      '56×56 mm · Medium format film · 0.55× crop'
    );
  });
});

describe('buildSensorFormatOptions', () => {
  it('makes one option per format, keyed by id', () => {
    const options = buildSensorFormatOptions(SENSOR_FORMATS);
    expect(options).toHaveLength(SENSOR_FORMATS.length);
    expect(options[0]).toEqual({
      label: 'Full Frame (35mm)',
      value: 'full-frame',
      sublabel: '36×24 mm · Digital · 1.00× crop',
    });
  });
});

describe('parseFocalLengthInput', () => {
  it('reads either decimal separator', () => {
    expect(parseFocalLengthInput('85')).toBe(85);
    expect(parseFocalLengthInput('23,5')).toBe(23.5);
  });

  it('reads blank or invalid text as 0', () => {
    expect(parseFocalLengthInput('')).toBe(0);
    expect(parseFocalLengthInput('abc')).toBe(0);
  });
});

describe('focalLengthFieldText', () => {
  it('shows the stored value before anything is typed', () => {
    expect(focalLengthFieldText(null, 50)).toBe('50');
  });

  it('keeps an in-progress draft that matches the stored value', () => {
    expect(focalLengthFieldText('8', 8)).toBe('8');
    expect(focalLengthFieldText('85,', 85)).toBe('85,');
    expect(focalLengthFieldText('', 0)).toBe('');
  });

  it('shows the stored value when it moved away from the draft', () => {
    // A preset tap, or the hook clamping to its maximum.
    expect(focalLengthFieldText('8', 135)).toBe('135');
    expect(focalLengthFieldText('20000', 10000)).toBe('10000');
  });

  it('leaves the field empty for a zero value with no draft', () => {
    expect(focalLengthFieldText(null, 0)).toBe('');
  });
});

describe('sensorOverlay', () => {
  it('fits the larger format to the box and nests the smaller one', () => {
    const { outer, inner, sourceIsOuter } = sensorOverlay(
      fullFrame,
      mft,
      220,
      140
    );
    expect(sourceIsOuter).toBe(true);
    // 3:2 is height-constrained in a 220×140 box.
    expect(outer.h).toBeCloseTo(140);
    expect(outer.w).toBeCloseTo(210);
    expect(inner.w).toBeCloseTo(17.3 * (140 / 24));
    // Both centred.
    expect(outer.x + outer.w / 2).toBeCloseTo(110);
    expect(inner.y + inner.h / 2).toBeCloseTo(70);
  });

  it('puts the target outside when it is the larger format', () => {
    const { outer, sourceIsOuter } = sensorOverlay(
      fullFrame,
      sixBySix,
      220,
      140
    );
    expect(sourceIsOuter).toBe(false);
    // A square is height-constrained.
    expect(outer.h).toBeCloseTo(140);
    expect(outer.w).toBeCloseTo(140);
  });
});
