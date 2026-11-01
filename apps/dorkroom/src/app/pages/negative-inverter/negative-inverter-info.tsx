import { CalculatorCard } from '@dorkroom/ui/calculator';
import { LIGHT_TABLE_TIPS } from './light-table-tips';

const HOW_TO_USE = [
  'Photograph the negative on a light table, or load a photo you already have.',
  'Pick Black & White or Color (C-41).',
  'Drag the crop handles around the frame so the bright light table is left out of the measurements.',
  'Choose Film base and tap a clear, unexposed part of the film: the rebate or the gap between frames.',
  'Fine-tune exposure and contrast. For colour, tap something that should be neutral grey, or nudge warmth and tint.',
  'Download the positive as a JPEG or PNG.',
];

const LIMITS = [
  'This is a quick preview, not a scan: it will not match dedicated scanning software.',
  'Downloads match the photo’s pixel size up to 16.7 MP, the largest canvas iOS Safari allows. Bigger photos are saved at the largest size that fits, and the page tells you when that happens.',
  'JPEG downloads use 92% quality. PNG is lossless but larger. Photo metadata (location, camera) is not copied.',
  'HEIC photos open in Safari. Other browsers need a JPEG or PNG.',
];

function TipList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>
      <ul className="ml-5 list-disc space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="pl-1 text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NegativeInverterInfo() {
  return (
    <CalculatorCard
      title="How the negative inverter works"
      className="mt-4 bg-surface-muted/80 md:mt-5"
    >
      <div className="space-y-6">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Each pixel is divided by the film base you tap and turned into
          density, the way a densitometer reads film. The densest and thinnest
          parts inside the crop become white and black. For C-41 every colour
          channel is stretched on its own, which removes the orange mask and
          balances the three dye layers.
        </p>

        <div className="space-y-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            How to use
          </h3>
          <ol className="ml-5 list-decimal space-y-2">
            {HOW_TO_USE.map((item) => (
              <li
                key={item}
                className="pl-1 text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>

        <TipList title="Light-table tips" items={LIGHT_TABLE_TIPS} />
        <TipList title="Limits" items={LIMITS} />

        <div className="space-y-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Privacy
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Your photos never leave this device. Decoding, conversion, and
            export all run in your browser, and nothing is uploaded or stored.
          </p>
        </div>
      </div>
    </CalculatorCard>
  );
}
