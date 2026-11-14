import { describe, expect, it } from 'vitest';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';
import { gpxFileName, rollToCsv } from './film-log-csv';
import { buildRollGpx, escapeXml, gpxTime } from './film-log-gpx';

function roll(shots: Shot[], patch: Partial<FilmRoll> = {}): FilmRoll {
  return {
    id: 'r1',
    cameraId: 'cam1',
    filmStockName: 'Ilford HP5 Plus',
    process: 'bw',
    iso: 400,
    status: 'active',
    shots,
    startedAt: '2026-11-13T09:30:00.000Z',
    createdAt: 'x',
    updatedAt: 'x',
    ...patch,
  };
}

function shot(frameNumber: number, patch: Partial<Shot> = {}): Shot {
  return { id: `s${frameNumber}`, frameNumber, source: 'manual', ...patch };
}

const context = {
  lensName: (id: string | undefined) =>
    id === 'l1' ? '50mm f/1.8' : undefined,
  exportedAt: new Date('2026-11-14T08:00:00.123Z'),
};

const build = (shots: Shot[], patch: Partial<FilmRoll> = {}) =>
  buildRollGpx(roll(shots, patch), shots, context);

const waypointLines = (gpx: string) =>
  gpx.split('\n').filter((line) => line.startsWith('  <wpt '));

describe('buildRollGpx', () => {
  it("names a fixed-lens camera's frame by its lens snapshot (#733)", () => {
    const { gpx } = build([
      shot(1, {
        fixedLensName: '90mm f/3.5',
        location: { latitude: 1, longitude: 2 },
      }),
    ]);
    expect(gpx).toContain('Lens: 90mm f/3.5');
  });

  it('writes a GPX 1.1 document with metadata and one waypoint', () => {
    const { gpx, waypoints } = build([
      shot(12, {
        takenAt: '2026-11-13T23:04:05.678Z',
        aperture: 8,
        shutterSpeed: 0.008,
        lensId: 'l1',
        place: 'Harbor',
        location: { latitude: 37.7749, longitude: -122.419412 },
      }),
    ]);
    expect(waypoints).toBe(1);
    expect(gpx).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Dorkroom" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
        '  <metadata>',
        '    <name>Ilford HP5 Plus</name>',
        '    <time>2026-11-14T08:00:00Z</time>',
        '  </metadata>',
        '  <wpt lat="37.774900" lon="-122.419412">',
        '    <time>2026-11-13T23:04:05Z</time>',
        '    <name>Frame 12</name>',
        '    <desc>Aperture: f/8\nShutter: 1/125\nISO: 400\nLens: 50mm f/1.8\nPlace: Harbor</desc>',
        '  </wpt>',
        '</gpx>',
        '',
      ].join('\n')
    );
  });

  it('has no track, elevation or accuracy', () => {
    const { gpx } = build([
      shot(1, {
        location: {
          latitude: 1,
          longitude: 2,
          accuracyMeters: 12,
          altitudeMeters: 300,
        },
      }),
    ]);
    expect(gpx).not.toContain('<trk');
    expect(gpx).not.toContain('<ele');
    expect(gpx).not.toContain('12');
    expect(gpx).not.toContain('300');
    expect(gpx).not.toContain('<extensions');
  });

  it('includes notes, as the CSV does', () => {
    const { gpx } = build([
      shot(1, { notes: 'fog', location: { latitude: 1, longitude: 2 } }),
    ]);
    expect(gpx).toContain('<desc>ISO: 400\nNotes: fog</desc>');
  });

  it('omits desc when there is nothing to describe', () => {
    const { gpx } = build(
      [shot(1, { location: { latitude: 1, longitude: 2 } })],
      { iso: undefined }
    );
    expect(gpx).not.toContain('<desc>');
  });

  it('escapes every text value, the roll name included', () => {
    const { gpx } = build(
      [
        shot(1, {
          place: `Tom's "pier" & <dock>`,
          location: { latitude: 1, longitude: 2 },
        }),
      ],
      { name: 'A & B <test>' }
    );
    expect(gpx).toContain('<name>A &amp; B &lt;test&gt;</name>');
    expect(gpx).toContain(
      'Place: Tom&apos;s &quot;pier&quot; &amp; &lt;dock&gt;'
    );
    expect(gpx).not.toContain('A & B');
  });

  it('strips characters XML 1.0 cannot carry', () => {
    const illegal = String.fromCharCode(0x0, 0x7, 0x1f, 0xfffe, 0xffff, 0xd800);
    expect(escapeXml(`a${illegal}b`)).toBe('ab');
    expect(escapeXml('tab\there\nline\r')).toBe('tab\there\nline\r');
    expect(escapeXml('émoji 📷')).toBe('émoji 📷');
  });

  it('orders waypoints by frame number and skips frames without a location', () => {
    const { gpx, waypoints } = build([
      shot(3, { location: { latitude: 3, longitude: 3 } }),
      shot(2),
      shot(1, { location: { latitude: 1, longitude: 1 } }),
      shot(4, { location: { latitude: 4, longitude: 4 } }),
    ]);
    expect(waypoints).toBe(3);
    expect(gpx.match(/<name>Frame \d+<\/name>/g)).toEqual([
      '<name>Frame 1</name>',
      '<name>Frame 3</name>',
      '<name>Frame 4</name>',
    ]);
  });

  it('writes 6 decimals with a dot', () => {
    const { gpx } = build([
      shot(1, { location: { latitude: -33.9, longitude: 151.2 } }),
      shot(2, { location: { latitude: 0.0000001, longitude: -0.0000004 } }),
    ]);
    expect(waypointLines(gpx)).toEqual([
      '  <wpt lat="-33.900000" lon="151.200000">',
      '  <wpt lat="0.000000" lon="0.000000">',
    ]);
  });

  it('writes a longitude of 180 as -180, which GPX allows', () => {
    const { gpx } = build([
      shot(1, { location: { latitude: 10, longitude: 180 } }),
      shot(2, { location: { latitude: 10, longitude: 179.9999996 } }),
      shot(3, { location: { latitude: 10, longitude: 179.999999 } }),
      shot(4, { location: { latitude: 10, longitude: -180 } }),
    ]);
    expect(waypointLines(gpx)).toEqual([
      '  <wpt lat="10.000000" lon="-180.000000">',
      '  <wpt lat="10.000000" lon="-180.000000">',
      '  <wpt lat="10.000000" lon="179.999999">',
      '  <wpt lat="10.000000" lon="-180.000000">',
    ]);
  });

  it('writes UTC time from takenAt, else the fix time, else none', () => {
    const { gpx } = build([
      shot(1, {
        takenAt: '2026-07-01T12:00:05-07:00',
        location: { latitude: 1, longitude: 1 },
      }),
      shot(2, {
        location: {
          latitude: 2,
          longitude: 2,
          capturedAt: '2026-07-01T19:01:00.000Z',
        },
      }),
      shot(3, { takenAt: 'nope', location: { latitude: 3, longitude: 3 } }),
    ]);
    const times = gpx.match(/ {4}<time>[^<]+<\/time>/g);
    expect(times).toEqual([
      '    <time>2026-11-14T08:00:00Z</time>',
      '    <time>2026-07-01T19:00:05Z</time>',
      '    <time>2026-07-01T19:01:00Z</time>',
    ]);
  });

  it('is a valid empty document when no frame has a location', () => {
    const { gpx, waypoints } = build([shot(1), shot(2)]);
    expect(waypoints).toBe(0);
    expect(waypointLines(gpx)).toEqual([]);
    expect(gpx).toContain('</metadata>\n</gpx>\n');
  });

  it('ignores a location the schema would not accept', () => {
    const { waypoints } = build([
      shot(1, { location: { latitude: 91, longitude: 0 } }),
    ]);
    expect(waypoints).toBe(0);
  });
});

describe('the CSV beside it', () => {
  it('keeps a longitude of 180 as it is', () => {
    const shots = [shot(1, { location: { latitude: 10, longitude: 180 } })];
    const csv = rollToCsv(roll(shots), {
      cameraName: 'FM2',
      lensName: () => undefined,
    });
    expect(csv).toContain(',10.000000,180.000000,');
  });
});

describe('gpxTime', () => {
  it('is UTC with whole seconds and a Z', () => {
    expect(gpxTime('2026-11-13T15:04:05.999-08:00')).toBe(
      '2026-11-13T23:04:05Z'
    );
    expect(gpxTime(undefined)).toBeUndefined();
    expect(gpxTime('')).toBeUndefined();
  });
});

describe('gpxFileName', () => {
  it('mirrors the CSV name with a .gpx extension', () => {
    const name = gpxFileName(roll([]), 'Nikon FM2');
    expect(name).toMatch(
      /^dorkroom-ilford-hp5-plus-nikon-fm2-\d{4}-\d{2}-\d{2}\.gpx$/
    );
  });
});
