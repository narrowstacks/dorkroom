import { DetailPanel, DetailPanelExpandButton, ResultRow } from '@dorkroom/ui';

// In context: the expand button sits beside the close button in a DetailPanel
// header (the panel renders it automatically when showExpandButton is true).
export const InPanel = () => (
  <div style={{ maxWidth: 420 }}>
    <DetailPanel
      isOpen
      isMobile={false}
      onClose={() => {}}
      ariaLabel="Fujifilm Acros 100 II details"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Fujifilm Acros 100 II
        </h2>
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
          }}
        >
          <ResultRow label="Box speed" value="ISO 100" />
          <ResultRow label="Reciprocity" value="Excellent" />
        </div>
      </div>
    </DetailPanel>
  </div>
);

// Both states standalone: collapse (expanded) and expand (collapsed).
export const States = () => (
  <div
    style={{
      maxWidth: 140,
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border-secondary)',
    }}
  >
    <DetailPanelExpandButton isExpanded={false} onClick={() => {}} />
    <DetailPanelExpandButton isExpanded onClick={() => {}} />
  </div>
);
