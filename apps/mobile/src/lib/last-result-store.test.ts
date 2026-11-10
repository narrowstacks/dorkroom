import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLastResults,
  KEY,
  parseLastResults,
  recordLastResult,
  storage,
} from './last-result-store';

beforeEach(() => {
  storage.clearAll();
});

describe('recordLastResult', () => {
  it('round-trips a result per tool', () => {
    recordLastResult('camera-exposure', '20s');
    recordLastResult('lens', '85 mm');
    expect(getLastResults()).toEqual({
      'camera-exposure': { text: '20s' },
      lens: { text: '85 mm' },
    });
  });

  it('replaces the previous result for the same tool', () => {
    recordLastResult('camera-exposure', '20s');
    recordLastResult('camera-exposure', '24s');
    expect(getLastResults()['camera-exposure']).toEqual({ text: '24s' });
  });

  it('ignores empty text', () => {
    recordLastResult('camera-exposure', '');
    expect(storage.getString(KEY)).toBeUndefined();
  });
});

describe('parseLastResults', () => {
  it('is empty for a missing or corrupt value', () => {
    expect(parseLastResults(undefined)).toEqual({});
    expect(parseLastResults('')).toEqual({});
    expect(parseLastResults('{not json')).toEqual({});
    expect(parseLastResults('[1,2]')).toEqual({});
    expect(parseLastResults('"text"')).toEqual({});
  });

  it('drops entries that fail the schema without losing the rest', () => {
    const raw = JSON.stringify({
      'camera-exposure': { text: '20s' },
      lens: { text: 5 },
      mat: { text: '' },
      border: 'oops',
    });
    expect(parseLastResults(raw)).toEqual({
      'camera-exposure': { text: '20s' },
    });
  });

  it('drops ids that are not tools', () => {
    const raw = JSON.stringify({
      'camera-exposure': { text: '20s' },
      gone: { text: 'x' },
      settings: { text: 'x' },
    });
    expect(Object.keys(parseLastResults(raw))).toEqual(['camera-exposure']);
  });

  it('drops tools whose inputs reset when reopened, e.g. a result stored earlier', () => {
    // Exposure, Resize and Reciprocity keep no inputs: their tile would name an
    // answer the tool no longer shows.
    const raw = JSON.stringify({
      exposure: { text: '25.2s' },
      resize: { text: '22.9 s' },
      reciprocity: { text: '4m' },
      border: { text: 'x' },
      mat: { text: 'x' },
      lens: { text: '85 mm' },
    });
    expect(Object.keys(parseLastResults(raw))).toEqual(['lens']);
  });
});

describe('old entries', () => {
  it('still reads an entry stored with a timestamp', () => {
    const raw = JSON.stringify({ lens: { text: '85 mm', at: 1234 } });
    expect(parseLastResults(raw)).toEqual({ lens: { text: '85 mm' } });
  });
});
