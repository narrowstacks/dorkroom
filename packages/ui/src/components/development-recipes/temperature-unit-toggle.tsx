import { useTemperature } from '../../contexts/temperature-context';

export function TemperatureUnitToggle() {
  const { unit, toggleUnit } = useTemperature();

  return (
    <button
      type="button"
      onClick={toggleUnit}
      className="rounded-full border px-3 py-1.5 text-sm font-medium transition flex items-center gap-1"
      style={{
        borderColor: 'var(--color-border-primary)',
        color: 'var(--color-text-secondary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-primary)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-primary)';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }}
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
