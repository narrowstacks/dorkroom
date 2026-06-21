import { DetailPanel, ResultRow } from '@dorkroom/ui';

const FilmDetail = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div>
      <div
        className="text-xs uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Kodak
      </div>
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Tri-X 400
      </h2>
      <p
        className="mt-1 text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        A classic high-speed black & white negative film with a distinctive
        grain structure and wide exposure latitude.
      </p>
    </div>
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-border-muted)',
      }}
    >
      <ResultRow label="Box speed" value="ISO 400" />
      <ResultRow label="Process" value="Black & White" />
      <ResultRow label="Grain" value="Fine to medium" />
      <ResultRow label="Format" value="35mm · 120 · Sheet" />
      <ResultRow label="Status" value="In production" />
    </div>
  </div>
);

// The desktop sidebar — sticky detail panel with close + expand buttons and a
// real film detail body.
export const FilmSidebar = () => (
  <div style={{ maxWidth: 420 }}>
    <DetailPanel
      isOpen
      isMobile={false}
      onClose={() => {}}
      ariaLabel="Tri-X 400 details"
    >
      <FilmDetail />
    </DetailPanel>
  </div>
);

// A developer recipe detail, with the expand button hidden.
export const DeveloperSidebar = () => (
  <div style={{ maxWidth: 420 }}>
    <DetailPanel
      isOpen
      isMobile={false}
      onClose={() => {}}
      showExpandButton={false}
      ariaLabel="HC-110 dilution B details"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div
            className="text-xs uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Kodak HC-110
          </div>
          <h2
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Dilution B
          </h2>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
          }}
        >
          <ResultRow label="Dilution" value="1+31" />
          <ResultRow label="Temperature" value="20°C / 68°F" />
          <ResultRow label="Time" value="7 min 30 s" />
          <ResultRow label="Agitation" value="Every 30 s" />
        </div>
      </div>
    </DetailPanel>
  </div>
);
