import { DetailPanel, DetailPanelCloseButton, ResultRow } from '@dorkroom/ui';

// In context: the close button lives in the top-right of a DetailPanel header.
// Here it sits in a real film detail sidebar (the panel renders its own close
// button in the same slot).
export const InPanel = () => (
  <div style={{ maxWidth: 420 }}>
    <DetailPanel
      isOpen
      isMobile={false}
      onClose={() => {}}
      showExpandButton={false}
      ariaLabel="Ilford HP5 Plus details"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Ilford HP5 Plus
        </h2>
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
          }}
        >
          <ResultRow label="Box speed" value="ISO 400" />
          <ResultRow label="Process" value="Black & White" />
        </div>
      </div>
    </DetailPanel>
  </div>
);

// The button on its own, against the panel surface it normally sits on.
export const Standalone = () => (
  <div
    style={{
      maxWidth: 80,
      display: 'flex',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border-secondary)',
    }}
  >
    <DetailPanelCloseButton onClick={() => {}} />
  </div>
);
