import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

export type InfoCardVariant = 'default' | 'insight' | 'step';

export interface InfoCardItem {
  title: string;
  description: string;
}

export interface InfoCardProps {
  /** The info item to display */
  item: InfoCardItem;
  /** Visual variant of the card */
  variant?: InfoCardVariant;
  /** Additional className */
  className?: string;
}

const variantStyles: Record<
  InfoCardVariant,
  {
    titleClass: string;
    descriptionClass: string;
    backgroundOpacity: number;
  }
> = {
  default: {
    titleClass: 'text-sm font-semibold',
    descriptionClass: 'mt-1 text-sm',
    backgroundOpacity: 5,
  },
  insight: {
    titleClass: 'text-sm font-semibold uppercase tracking-[0.25em]',
    descriptionClass: 'mt-2 text-sm',
    backgroundOpacity: 15,
  },
  step: {
    titleClass: 'text-sm font-semibold',
    descriptionClass: 'mt-1 text-sm',
    backgroundOpacity: 5,
  },
};

/**
 * Single info card item with title and description.
 * Used in "How to use" and "Insights" sections of calculator pages.
 */
export function InfoCard({
  item,
  variant = 'default',
  className,
}: InfoCardProps) {
  const styles = variantStyles[variant];

  return (
    <li
      className={cn('rounded-2xl border px-4 py-3', className)}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: colorMixOr(
          'var(--color-background)',
          styles.backgroundOpacity,
          'transparent',
          'var(--color-border-muted)'
        ),
      }}
    >
      <p
        className={styles.titleClass}
        style={{
          color:
            variant === 'insight'
              ? 'var(--color-text-tertiary)'
              : 'var(--color-text-primary)',
        }}
      >
        {item.title}
      </p>
      <p
        className={styles.descriptionClass}
        style={{
          color:
            variant === 'insight'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
        }}
      >
        {item.description}
      </p>
    </li>
  );
}

export interface InfoCardListProps {
  /** Array of info items or simple strings to display */
  items: InfoCardItem[] | string[];
  /** Visual variant for all cards */
  variant?: InfoCardVariant;
  /** Additional className for the list */
  className?: string;
}

/**
 * List of info cards rendered as an unordered list.
 * Supports both object items with title/description and simple string items.
 */
export function InfoCardList({
  items,
  variant = 'default',
  className,
}: InfoCardListProps) {
  // Normalize items to InfoCardItem format
  const normalizedItems: InfoCardItem[] = items.map((item) =>
    typeof item === 'string' ? { title: item, description: '' } : item
  );

  return (
    <ul className={cn('space-y-3', className)}>
      {normalizedItems.map((item, index) => (
        <InfoCard
          // biome-ignore lint/suspicious/noArrayIndexKey: Static list order
          key={item.title || index}
          item={item}
          variant={variant}
        />
      ))}
    </ul>
  );
}
