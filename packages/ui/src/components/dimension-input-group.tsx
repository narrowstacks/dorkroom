import { cn } from '../lib/cn';

interface DimensionInputGroupProps {
  widthValue: string;
  onWidthChange: (value: string) => void;
  heightValue: string;
  onHeightChange: (value: string) => void;
  widthLabel: string;
  heightLabel: string;
  widthPlaceholder?: string;
  heightPlaceholder?: string;
  widthDefault?: string;
  heightDefault?: string;
  className?: string;
}

export function DimensionInputGroup({
  widthValue,
  onWidthChange,
  heightValue,
  onHeightChange,
  widthLabel,
  heightLabel,
  widthPlaceholder,
  heightPlaceholder,
  className,
}: DimensionInputGroupProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">
          {widthLabel}
        </label>
        <input
          type="number"
          value={widthValue}
          onChange={(e) => onWidthChange((e.target as HTMLInputElement).value)}
          placeholder={widthPlaceholder}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">
          {heightLabel}
        </label>
        <input
          type="number"
          value={heightValue}
          onChange={(e) => onHeightChange((e.target as HTMLInputElement).value)}
          placeholder={heightPlaceholder}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
    </div>
  );
}
