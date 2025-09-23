import { cn } from '../lib/cn';

interface TextInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TextInput({
  value,
  onValueChange,
  placeholder,
  label,
  className,
}: TextInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
    </div>
  );
}
