import { cn } from '@dorkroom/ui';
import type { ComponentType, ReactNode, Ref } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  /** The fieldset; each button carries its option as `data-option`. */
  ref?: Ref<HTMLFieldSetElement>;
}

/**
 * A row of toggle buttons, one pressed at a time, in the resize calculator's
 * pill style. Buttons are at least 44px tall for touch.
 */
export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
  ref,
}: SegmentedControlProps<T>) {
  return (
    <fieldset
      ref={ref}
      className={cn('flex gap-1 rounded-2xl border p-1', className)}
      style={{
        borderColor: 'var(--color-border-muted)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
      }}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map(({ value: option, label, icon: Icon, disabled }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            data-option={option}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
              'disabled:cursor-not-allowed disabled:opacity-40',
              active
                ? 'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
                : 'text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]'
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}

interface ActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function ActionButton({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  icon: Icon,
  className,
  ref,
}: ActionButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary'
          ? 'bg-[color:var(--color-brand)] text-[color:var(--color-background)]'
          : 'border border-[color:var(--color-border-secondary)] text-[color:var(--color-text-primary)] hover:bg-[rgba(var(--color-background-rgb),0.08)]',
        className
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
