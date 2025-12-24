import { useState } from 'react';
import { useVolume } from '../contexts/volume-context';

export function VolumeUnitToggle(): React.JSX.Element {
  const { unit, toggleUnit } = useVolume();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={unit === 'floz'}
      aria-label="Volume unit"
      onClick={toggleUnit}
      className="rounded-full border px-3 py-1.5 text-sm font-medium transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        borderColor: 'var(--color-border-primary)',
        color: isHovered
          ? 'var(--color-text-primary)'
          : 'var(--color-text-secondary)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        style={{
          color:
            unit === 'ml'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        ml
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>|</span>
      <span
        style={{
          color:
            unit === 'floz'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        fl oz
      </span>
    </button>
  );
}
