import { useState } from 'react';

export interface UnitToggleOption {
  value: string;
  label: string;
}

export interface UnitToggleProps {
  /** Currently selected unit value */
  currentUnit: string;
  /** Function to toggle between units */
  onToggle: () => void;
  /** Two options representing left and right toggle states */
  options: [UnitToggleOption, UnitToggleOption];
  /** Accessible label for the toggle button */
  ariaLabel: string;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Generic toggle button for switching between two unit options.
 * Used for measurement, volume, and temperature unit toggles.
 */
export function UnitToggle({
  currentUnit,
  onToggle,
  options,
  ariaLabel,
  className,
}: UnitToggleProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [leftOption, rightOption] = options;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentUnit === rightOption.value}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className ?? ''}`}
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
            currentUnit === leftOption.value
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        {leftOption.label}
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>|</span>
      <span
        style={{
          color:
            currentUnit === rightOption.value
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
        }}
      >
        {rightOption.label}
      </span>
    </button>
  );
}
