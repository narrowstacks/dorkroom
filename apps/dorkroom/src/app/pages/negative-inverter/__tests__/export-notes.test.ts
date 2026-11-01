import { planExportSize } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { describeExport, describePlannedExport } from '../export-notes';

describe('export notes', () => {
  it('says a photo under the cap is saved at full resolution', () => {
    const plan = planExportSize({ width: 4032, height: 3024 });
    expect(describeExport(plan, false)).toBe(
      'Saved at full resolution, 4032 × 3024 px (12 MP).'
    );
    expect(describePlannedExport(plan, false)).toBe(
      'Will save at 4032 × 3024 px, full resolution.'
    );
  });

  it('says when a 48 MP photo was scaled to fit the canvas cap', () => {
    const plan = planExportSize({ width: 8064, height: 6048 });
    expect(describeExport(plan, false)).toBe(
      'Exported at 16 MP; original is 48 MP, over the 16.7 MP limit for one browser canvas.'
    );
    expect(describePlannedExport(plan, false)).toMatch(
      /^Will save at \d+ × \d+ px \(16 MP\)\. The original is 48 MP/
    );
  });

  it('talks about the crop when only the crop is exported', () => {
    const plan = planExportSize({ width: 6000, height: 4000 });
    expect(describeExport(plan, true)).toBe(
      'Exported at 16 MP; the crop is 24 MP at full resolution, over the 16.7 MP limit for one browser canvas.'
    );
  });
});
