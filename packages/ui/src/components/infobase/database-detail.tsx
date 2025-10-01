import { cn } from '../../lib/cn';

interface DetailField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

interface DatabaseDetailProps {
  title: string;
  subtitle?: string;
  fields: DetailField[];
  className?: string;
}

export function DatabaseDetail({
  title,
  subtitle,
  fields,
  className,
}: DatabaseDetailProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div
        className="border-b pb-4"
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Fields Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field, index) => (
          <div
            key={index}
            className={cn('rounded-lg p-4', field.fullWidth && 'sm:col-span-2')}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
            }}
          >
            <div
              className="mb-1 text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {field.label}
            </div>
            <div
              className="text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {field.value || (
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  Not specified
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
