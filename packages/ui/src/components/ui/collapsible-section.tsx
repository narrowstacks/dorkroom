import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  isExpanded,
  onToggle,
}: CollapsibleSectionProps) {
  return (
    <div
      className="rounded-xl border"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-border-muted)',
      }}
    >
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {title}
            </div>
            <div
              className="mt-1 text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {subtitle}
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown
              className="h-4 w-4"
              style={{ color: 'var(--color-text-muted)' }}
            />
          ) : (
            <ChevronRight
              className="h-4 w-4"
              style={{ color: 'var(--color-text-muted)' }}
            />
          )}
        </div>
      </button>
      {isExpanded && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
