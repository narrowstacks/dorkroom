import { useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';

/**
 * Renders a button that toggles the temperature unit between Fahrenheit and Celsius.
 *
 * The button visually highlights the active unit, updates its text color on hover,
 * and exposes an `aria-label` that announces the unit it will switch to.
 *
 * @returns The button element used to switch between Fahrenheit and Celsius.
 */
export function TemperatureUnitToggle() {
  const { unit, toggleUnit } = useTemperature();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={toggleUnit}
      className="rounded-full border px-3 py-1.5 text-sm font-medium transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        borderColor: 'var(--color-border-primary)',
        color: isHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Switch to ${
        unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'
      }`}
    >
      <span
        style={{
          color:
            unit === 'fahrenheit'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        °F
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>|</span>
      <span
        style={{
          color:
            unit === 'celsius'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        °C
      </span>
    </button>
  );
}
