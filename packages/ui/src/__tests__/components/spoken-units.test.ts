import { describe, expect, it } from 'vitest';
import {
  spokenDuration,
  spokenLength,
  spokenShutterSpeed,
  spokenStops,
} from '../../components/calculator/spoken-units';

describe('spoken units', () => {
  it.each([
    ['40s', '40 seconds'],
    ['1s', '1 second'],
    ['24.6s', '24.6 seconds'],
    ['1m 20s', '1 minute 20 seconds'],
    ['2m', '2 minutes'],
    ['1h 5m', '1 hour 5 minutes'],
  ])('spokenDuration(%j) → %j', (display, spoken) => {
    expect(spokenDuration(display)).toBe(spoken);
  });

  it.each([
    ['2"', '2 seconds'],
    ['1"', '1 second'],
    ['1/60', '1/60 second'],
    ['—', '—'],
  ])('spokenShutterSpeed(%j) → %j', (display, spoken) => {
    expect(spokenShutterSpeed(display)).toBe(spoken);
  });

  it.each([
    ['14 1/2"', '14 1/2 inches'],
    ['1"', '1 inch'],
    ['13.00in', '13.00 inches'],
    ['19.1cm', '19.1 centimeters'],
    ['55.4mm', '55.4 millimeters'],
    ['', ''],
  ])('spokenLength(%j) → %j', (display, spoken) => {
    expect(spokenLength(display)).toBe(spoken);
  });

  it.each([
    [2, 'plus 2 stops'],
    [1, 'plus 1 stop'],
    [-1, 'minus 1 stop'],
    ['-1.06', 'minus 1.06 stops'],
    ['1.17', 'plus 1.17 stops'],
    [0, '0 stops'],
    ['0.00', '0.00 stops'],
  ])('spokenStops(%j) → %j', (stops, spoken) => {
    expect(spokenStops(stops)).toBe(spoken);
  });
});
