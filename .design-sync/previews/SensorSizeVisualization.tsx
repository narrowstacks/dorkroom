import { SensorSizeVisualization } from '@dorkroom/ui';

// Real format presets from the lens-equivalency calculator.
const fullFrame = {
  id: 'full-frame',
  name: 'Full Frame (35mm)',
  shortName: 'Full Frame',
  category: 'digital' as const,
  width: 36,
  height: 24,
  diagonal: 43.27,
  cropFactor: 1,
};

const apsC = {
  id: 'aps-c-nikon',
  name: 'APS-C (Nikon/Sony)',
  shortName: 'APS-C',
  category: 'digital' as const,
  width: 23.5,
  height: 15.6,
  diagonal: 28.2,
  cropFactor: 1.53,
};

const medium67 = {
  id: 'film-6x7',
  name: '6×7',
  shortName: '6×7',
  category: 'film-medium' as const,
  width: 70,
  height: 56,
  diagonal: 89.6,
  cropFactor: 0.48,
};

// 35mm full frame nested against APS-C — the common digital crop comparison.
export const FullFrameVsApsC = () => (
  <div style={{ maxWidth: 320 }}>
    <SensorSizeVisualization sourceFormat={fullFrame} targetFormat={apsC} />
  </div>
);

// Full frame nested inside 6×7 medium format — a large area ratio.
export const FullFrameVsMediumFormat = () => (
  <div style={{ maxWidth: 320 }}>
    <SensorSizeVisualization sourceFormat={fullFrame} targetFormat={medium67} />
  </div>
);
