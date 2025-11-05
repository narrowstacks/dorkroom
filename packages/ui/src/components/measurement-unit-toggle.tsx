import { useState } from 'react';
import { useMeasurement } from '../contexts/measurement-context';

export function MeasurementUnitToggle(): React.JSX.Element {
  const { unit, toggleUnit } = useMeasurement();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={unit === 'metric'}
      aria-label="Measurement unit"
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
            unit === 'imperial'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        in
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>|</span>
      <span
        style={{
          color:
            unit === 'metric'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        cm
      </span>
    </button>
  );
}
