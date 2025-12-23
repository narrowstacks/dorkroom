import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { getTagThemeStyle } from '../../lib/tag-colors';

interface TagProps {
  children: string;
  className?: string;
  size?: 'sm' | 'xs';
  /**
   * Variant style for the tag. When specified, overrides the default tag color mapping.
   * - 'discontinued': Uses semantic error colors with reduced opacity for discontinued items
   */
  variant?: 'discontinued';
}

export function Tag({ children, className, size = 'xs', variant }: TagProps) {
  // Use variant styles if specified, otherwise fall back to tag-based colors
  const themeStyle = variant
    ? getVariantStyle(variant)
    : getTagThemeStyle(children);

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 uppercase tracking-wide border whitespace-nowrap',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        className
      )}
      style={{
        backgroundColor: themeStyle.backgroundColor,
        color: themeStyle.color,
        borderColor: themeStyle.borderColor,
      }}
    >
      {children.replace(/-/g, ' ')}
    </span>
  );
}

/**
 * Get theme-aware styles for tag variants.
 * Uses CSS custom properties to ensure proper theming across all themes.
 */
function getVariantStyle(_variant: 'discontinued') {
  // Currently only one variant exists; parameter kept for future extensibility
  return {
    backgroundColor: colorMixOr(
      'var(--color-semantic-error)',
      10,
      'transparent',
      'rgba(220, 38, 38, 0.1)'
    ),
    color: colorMixOr(
      'var(--color-semantic-error)',
      100,
      'transparent',
      'rgb(220, 38, 38)'
    ),
    borderColor: colorMixOr(
      'var(--color-semantic-error)',
      100,
      'transparent',
      'rgb(220, 38, 38)'
    ),
  };
}
