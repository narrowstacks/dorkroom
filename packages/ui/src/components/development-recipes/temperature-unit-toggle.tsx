import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';

export function TemperatureUnitToggle() {
  const { unit, toggleUnit } = useTemperature();

  return (
    <button
      type="button"
      onClick={toggleUnit}
      className={cn(
        'rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium transition',
        'hover:border-white/40 hover:text-white',
        'flex items-center gap-1 text-white/70'
      )}
      aria-label={`Switch to ${
        unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'
      }`}
    >
      <span
        className={cn(unit === 'fahrenheit' ? 'text-white' : 'text-white/50')}
      >
        °F
      </span>
      <span className="text-white/30">|</span>
      <span className={cn(unit === 'celsius' ? 'text-white' : 'text-white/50')}>
        °C
      </span>
    </button>
  );
}
