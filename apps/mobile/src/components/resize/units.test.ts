import {
  DEFAULT_NEW_HEIGHT,
  DEFAULT_NEW_LENGTH,
  DEFAULT_NEW_WIDTH,
  DEFAULT_ORIGINAL_HEIGHT,
  DEFAULT_ORIGINAL_LENGTH,
  DEFAULT_ORIGINAL_WIDTH,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { convertLengthInput, convertResizeLengths } from './units';

describe('convertLengthInput', () => {
  it('leaves the text alone when the unit does not change', () => {
    expect(convertLengthInput('6', 'imperial', 'imperial')).toBe('6');
    expect(convertLengthInput('15.', 'metric', 'metric')).toBe('15.');
  });

  it('converts inches to centimetres', () => {
    expect(convertLengthInput('6', 'imperial', 'metric')).toBe('15.24');
    expect(convertLengthInput('8', 'imperial', 'metric')).toBe('20.32');
    expect(convertLengthInput('10', 'imperial', 'metric')).toBe('25.4');
  });

  it('converts centimetres to inches', () => {
    expect(convertLengthInput('25.4', 'metric', 'imperial')).toBe('10');
    expect(convertLengthInput('25', 'metric', 'imperial')).toBe('9.843');
  });

  it('accepts a decimal comma', () => {
    expect(convertLengthInput('25,4', 'metric', 'imperial')).toBe('10');
  });

  it('round-trips typed values when toggled back and forth', () => {
    for (const typed of ['25', '15.2', '20.3', '12.7']) {
      const inches = convertLengthInput(typed, 'metric', 'imperial');
      expect(convertLengthInput(inches, 'imperial', 'metric')).toBe(typed);
    }
    for (const typed of ['8', '8.125', '6.5']) {
      const cm = convertLengthInput(typed, 'imperial', 'metric');
      expect(convertLengthInput(cm, 'metric', 'imperial')).toBe(typed);
    }
  });

  it('keeps blank or partial text as typed', () => {
    expect(convertLengthInput('', 'imperial', 'metric')).toBe('');
    expect(convertLengthInput('abc', 'metric', 'imperial')).toBe('abc');
  });
});

describe('convertResizeLengths', () => {
  const inchDefaults = {
    originalWidth: String(DEFAULT_ORIGINAL_WIDTH),
    originalLength: String(DEFAULT_ORIGINAL_LENGTH),
    newWidth: String(DEFAULT_NEW_WIDTH),
    newLength: String(DEFAULT_NEW_LENGTH),
    originalHeight: String(DEFAULT_ORIGINAL_HEIGHT),
    newHeight: String(DEFAULT_NEW_HEIGHT),
  };

  it('shows the inch defaults in centimetres for a metric user', () => {
    expect(convertResizeLengths(inchDefaults, 'imperial', 'metric')).toEqual({
      originalWidth: '15.24',
      originalLength: '10.16',
      newWidth: '22.86',
      newLength: '15.24',
      originalHeight: '30.48',
      newHeight: '91.44',
    });
  });

  it('converts every field back to the inch defaults', () => {
    const metric = convertResizeLengths(inchDefaults, 'imperial', 'metric');
    expect(convertResizeLengths(metric, 'metric', 'imperial')).toEqual(
      inchDefaults
    );
  });
});
