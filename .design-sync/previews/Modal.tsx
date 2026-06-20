import { Modal } from '@dorkroom/ui';
import { useState } from 'react';

// Footer action buttons styled to match the dark surface theme.
const footerButton = (primary: boolean) =>
  ({
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 12,
    cursor: 'pointer',
    border: primary
      ? 'none'
      : '1px solid var(--color-border-secondary)',
    backgroundColor: primary
      ? 'var(--color-primary)'
      : 'var(--color-surface-muted)',
    color: primary ? 'white' : 'var(--color-text-secondary)',
  }) as const;

// Canonical open modal: a titled dialog with body copy and a footer action row.
export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 520 }}>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Reset border calculator?"
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" style={footerButton(false)}>
              Cancel
            </button>
            <button type="button" style={footerButton(true)}>
              Reset to defaults
            </button>
          </div>
        }
      >
        <p>
          This clears your current paper size, easel blades and border widths
          and restores the 8&times;10 default layout. Saved presets are not
          affected.
        </p>
      </Modal>
    </div>
  );
};

// Larger modal with structured body content — a developer/film pairing summary.
export const WithRichBody = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 640 }}>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Kodak Tri-X 400 in HC-110 (Dilution B)"
        size="lg"
      >
        <p>
          A classic high-acutance combination. Times below assume continuous
          agitation for the first 30 seconds, then 3 inversions every minute.
        </p>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '8px 24px',
            marginTop: 4,
          }}
        >
          <dt style={{ color: 'var(--color-text-muted)' }}>Dilution</dt>
          <dd style={{ margin: 0 }}>1:31 (Dilution B)</dd>
          <dt style={{ color: 'var(--color-text-muted)' }}>Temperature</dt>
          <dd style={{ margin: 0 }}>20&deg;C / 68&deg;F</dd>
          <dt style={{ color: 'var(--color-text-muted)' }}>Time</dt>
          <dd style={{ margin: 0 }}>7 min 30 sec</dd>
        </dl>
      </Modal>
    </div>
  );
};

// Compact modal with the header close button hidden (footer-only dismissal).
export const SmallNoCloseButton = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 400 }}>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Preset saved"
        size="sm"
        hideCloseButton
        footer={
          <button type="button" style={footerButton(true)}>
            Done
          </button>
        }
      >
        <p>
          &ldquo;Portrait 5&times;7 with 0.5&Prime; border&rdquo; is now in your
          saved presets and synced to this device.
        </p>
      </Modal>
    </div>
  );
};
