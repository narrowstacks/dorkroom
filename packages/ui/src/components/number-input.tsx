import { cn } from '../lib/cn';

interface NumberInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputTitle?: string;
  step?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChangeText,
  placeholder,
  inputTitle,
  step = 1,
  className,
}: NumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChangeText((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      title={inputTitle}
      step={step}
      className={cn(
        'w-20 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20',
        className
      )}
    />
  );
}
