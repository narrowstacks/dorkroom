import { describe, expect, it } from 'vitest';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';
import {
  CSV_HEADER,
  csvFileName,
  isoWithOffset,
  localIso,
  rollToCsv,
} from './film-log-csv';

const HEADER =
  'Frame,Taken at (local ISO 8601),Aperture,Shutter (s),Shutter,ISO,Lens,Place,Latitude,Longitude,Accuracy (m),Back,Notes';

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

const names = {
  cameraName: 'Nikon FM2',
  lensName: (id: string | undefined) =>
    id === 'l1' ? '50mm f/1.8' : undefined,
};

const lines = (csv: string) => csv.split('\r\n');

// Built from local parts, so the wall time is known in any zone.
const TAKEN_DATE = new Date(2026, 6, 1, 12, 0, 5);
const TAKEN = TAKEN_DATE.toISOString();
const TAKEN_CELL = /^2026-07-01T12:00:05[+-]\d\d:\d\d$/;

describe('rollToCsv', () => {
  it("names a fixed-lens camera's frame by its lens snapshot (#733)", () => {
    const csv = rollToCsv(
      roll([
        shot(1, { fixedLensName: '90mm f/3.5' }),
        shot(2, { lensId: 'l1' }),
      ]),
      names
    );
    expect(lines(csv)[0]).toBe(HEADER);
    expect(lines(csv)[1]?.split(',')[6]).toBe('90mm f/3.5');
    expect(lines(csv)[2]?.split(',')[6]).toBe('50mm f/1.8');
  });

  it('is header only for an empty roll, with no preamble', () => {
    expect(rollToCsv(roll([]), names)).toBe(`${HEADER}\r\n`);
    expect(CSV_HEADER).toHaveLength(13);
  });

  it('writes a full row with local time and no photo column', () => {
    const csv = rollToCsv(
      roll([
        shot(1, {
          takenAt: TAKEN,
          aperture: 8,
          shutterSpeed: 0.008,
          lensId: 'l1',
          place: 'Harbor',
          back: 'A12',
          notes: 'fog',
        }),
      ]),
      names
    );
    expect(lines(csv)[1]).toBe(
      `1,${localIso(new Date(TAKEN))},8,0.008,1/125,400,50mm f/1.8,Harbor,,,,A12,fog`
    );
  });

  it('leaves missing optional values empty and inherits the roll back', () => {
    const csv = rollToCsv(
      roll([shot(3)], { iso: undefined, back: 'B2' }),
      names
    );
    expect(lines(csv)[1]).toBe('3,,,,,,,,,,,B2,');
  });

  it('writes latitude and longitude as plain 6 decimal numbers, unquoted', () => {
    const csv = rollToCsv(
      roll([
        shot(1, {
          place: 'Harbor',
          location: { latitude: 37.7749, longitude: -122.419412 },
        }),
        shot(2, { location: { latitude: -33.9, longitude: 151.2 } }),
        shot(3, {
          location: { latitude: 1, longitude: 2, accuracyMeters: 12.6 },
        }),
      ]),
      names
    );
    const rows = lines(csv);
    expect(rows[1]).toBe('1,,,,,400,,Harbor,37.774900,-122.419412,,,');
    expect(rows[2]).toBe('2,,,,,400,,,-33.900000,151.200000,,,');
    expect(rows[3]).toBe('3,,,,,400,,,1.000000,2.000000,13,,');
    expect(rows[1]).not.toContain("'");
  });

  it('leaves both columns empty for a frame without a location', () => {
    expect(lines(rollToCsv(roll([shot(1)]), names))[1]).toBe(
      '1,,,,,400,,,,,,,'
    );
  });

  it('emits no placeholder for a zero shutter', () => {
    const csv = rollToCsv(roll([shot(1, { shutterSpeed: 0 })]), names);
    expect(lines(csv)[1]).toBe('1,,,,,400,,,,,,,');
    expect(csv).not.toContain('\u2014');
  });

  it('rounds to a tenth before the 60 s split', () => {
    const rows = lines(
      rollToCsv(roll([shot(1, { shutterSpeed: 59.96 })]), names)
    );
    expect(rows[1]).toContain(',59.96,1m,');
  });

  it('labels long shutters in minutes and seconds, and rounds seconds', () => {
    const rows = lines(
      rollToCsv(
        roll([
          shot(1, { shutterSpeed: 125 }),
          shot(2, { shutterSpeed: 1 / 3 }),
          shot(3, { shutterSpeed: 30 }),
        ]),
        names
      )
    );
    expect(rows[1]).toContain(',125,2m 5s,');
    expect(rows[2]).toContain(',0.333333,1/3,');
    expect(rows[3]).toContain(',30,"30""",');
  });

  it('quotes commas, quotes and newlines', () => {
    const csv = rollToCsv(
      roll([shot(1, { notes: 'a, "b"\nline two', place: 'x\r\ny' })]),
      names
    );
    expect(csv).toContain('"x\r\ny",,,,,"a, ""b""\nline two"');
  });

  it('keeps Unicode and leading or trailing spaces as written', () => {
    const csv = rollToCsv(
      roll([shot(1, { place: '  Café 東京 \u{1F4F7}  ', notes: ' x ' })]),
      names
    );
    expect(lines(csv)[1]).toContain(',  Café 東京 \u{1F4F7}  ,,,,, x ');
  });

  it('guards formula-like text but not numbers or ordinary values', () => {
    const cell = (notes: string) =>
      lines(rollToCsv(roll([shot(1, { notes })]), names))[1]
        ?.split(',')
        .pop();
    expect(cell('=1+1')).toBe("'=1+1");
    expect(cell('@x')).toBe("'@x");
    expect(cell('-SUM(A1)')).toBe("'-SUM(A1)");
    expect(cell('+cmd')).toBe("'+cmd");
    expect(cell('+(1)')).toBe("'+(1)");
    expect(cell('-=1')).toBe("'-=1");
    expect(cell('\tx')).toBe("'\tx");
    expect(cell('-1 stop')).toBe('-1 stop');
    expect(cell('+1 Main St')).toBe('+1 Main St');
    expect(cell('plain')).toBe('plain');
    const row = lines(rollToCsv(roll([shot(1, { aperture: 8 })]), names))[1];
    expect(row).toBe('1,,8,,,400,,,,,,,');
  });

  it('guards a CR-prefixed field inside its quotes', () => {
    const csv = rollToCsv(roll([shot(1, { notes: '\rx' })]), names);
    expect(csv).toContain('"\'\rx"');
  });

  it('passes an unparseable time through the text handling', () => {
    const csv = rollToCsv(
      roll([shot(1, { takenAt: '=bad' }), shot(2, { takenAt: 'a, b' })]),
      names
    );
    expect(lines(csv)[1]).toMatch(/^1,'=bad,/);
    expect(lines(csv)[2]).toMatch(/^2,"a, b",/);
  });

  it('sorts rows by frame number and does not mutate', () => {
    const input = roll([shot(3), shot(1), shot(2)]);
    const rows = lines(rollToCsv(input, names));
    expect(rows.slice(1, 4).map((r) => r.split(',')[0])).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(input.shots.map((s) => s.frameNumber)).toEqual([3, 1, 2]);
  });

  it('keeps duplicate frame numbers in their original order', () => {
    const rows = lines(
      rollToCsv(
        roll([
          shot(2, { notes: 'first' }),
          shot(2, { notes: 'second' }),
          shot(1),
        ]),
        names
      )
    );
    expect(rows[2]).toMatch(/first$/);
    expect(rows[3]).toMatch(/second$/);
  });

  it('ends every record with CRLF', () => {
    const csv = rollToCsv(roll([shot(1)]), names);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
});

describe('localIso', () => {
  it('writes the local wall time with the offset of that instant', () => {
    const iso = localIso(TAKEN_DATE);
    expect(iso).toMatch(TAKEN_CELL);
    const offset = -TAKEN_DATE.getTimezoneOffset();
    const sign = offset < 0 ? '-' : '+';
    const abs = Math.abs(offset);
    const expected = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    expect(iso.slice(-6)).toBe(expected);
  });
});

describe('isoWithOffset', () => {
  const instant = new Date('2026-11-13T23:04:05Z');
  it('writes the wall time at a west offset', () => {
    expect(isoWithOffset(instant, -480)).toBe('2026-11-13T15:04:05-08:00');
  });
  it('writes the wall time at an east offset, crossing midnight', () => {
    expect(isoWithOffset(instant, 120)).toBe('2026-11-14T01:04:05+02:00');
  });
  it('handles half-hour offsets and UTC', () => {
    expect(isoWithOffset(instant, 330)).toBe('2026-11-14T04:34:05+05:30');
    expect(isoWithOffset(instant, -210)).toBe('2026-11-13T19:34:05-03:30');
    expect(isoWithOffset(instant, 0)).toBe('2026-11-13T23:04:05+00:00');
  });
  it('zero-pads every field', () => {
    expect(isoWithOffset(new Date('2026-01-02T03:04:05Z'), 0)).toBe(
      '2026-01-02T03:04:05+00:00'
    );
  });
});

describe('csvFileName', () => {
  it('joins label, camera and date', () => {
    expect(
      csvFileName(
        roll([], {
          filmStockName: 'HP5 Plus',
          startedAt: '2026-11-13T12:00:00',
        }),
        'Nikon FM2'
      )
    ).toBe('dorkroom-hp5-plus-nikon-fm2-2026-11-13.csv');
  });

  it('uses the local date, not the UTC one', () => {
    const started = new Date(2026, 11, 31, 23, 30);
    expect(
      csvFileName(roll([], { startedAt: started.toISOString() }), 'FM2')
    ).toContain('-2026-12-31.csv');
  });

  it('prefers the roll name and strips accents and symbols', () => {
    expect(
      csvFileName(
        roll([], { name: 'Été / Paris: #1', startedAt: '2026-11-13T12:00:00' }),
        'Leica M6'
      )
    ).toBe('dorkroom-ete-paris-1-leica-m6-2026-11-13.csv');
  });

  it('folds letters that do not decompose', () => {
    expect(
      csvFileName(
        roll([], { name: 'Straße Ø', startedAt: '2026-11-13T12:00:00' }),
        'Æ đ ł'
      )
    ).toBe('dorkroom-strasse-o-ae-d-l-2026-11-13.csv');
  });

  it('falls back for an emoji or CJK only name', () => {
    expect(
      csvFileName(
        roll([], { name: '\u{1F4F7} 東京', startedAt: '2026-11-13T12:00:00' }),
        ''
      )
    ).toBe('dorkroom-roll-2026-11-13.csv');
  });

  it('caps at 80 characters and keeps the date and extension', () => {
    const name = csvFileName(
      roll([], { name: 'x'.repeat(200), startedAt: '2026-11-13T12:00:00' }),
      'Camera'
    );
    expect(name.length).toBeLessThanOrEqual(80);
    expect(name.endsWith('-2026-11-13.csv')).toBe(true);
    expect(name).toMatch(/^[a-z0-9.-]+$/);
  });

  it('leaves the date out when startedAt does not parse', () => {
    expect(
      csvFileName(roll([], { filmStockName: undefined, startedAt: 'nope' }), '')
    ).toBe('dorkroom-roll.csv');
  });
});
