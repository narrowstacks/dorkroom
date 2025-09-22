import { cn } from '../../lib/cn';

interface LabeledSliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onSliderChange?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  labels?: string[];
  className?: string;
  warning?: boolean;
  continuousUpdate?: boolean;
}

export function LabeledSliderInput({
  label,
  value,
  onChange,
  onSliderChange,
  min,
  max,
  step,
  labels = [],
  className,
  warning = false,
  continuousUpdate = false,
}: LabeledSliderInputProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (onSliderChange) {
      // Prefer dedicated slider handler to avoid routing through text-input logic
      onSliderChange(newValue);
    } else {
      // Fallback: if no slider-specific handler provided, use onChange
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/90">{label}</label>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-20 rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none',
            warning && 'border-yellow-500/50 bg-yellow-500/10'
          )}
        />
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className={cn(
            'w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer',
            'slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 slider-thumb:rounded-full slider-thumb:bg-white slider-thumb:cursor-pointer',
            warning && 'bg-yellow-500/20'
          )}
        />

        {labels.length > 0 && (
          <div className="flex justify-between text-xs text-white/50">
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}