import { useMemo } from 'react';
import { colorMixOr } from '../../lib/color';

interface RecipeStateStyles {
  backgroundColor: string;
  borderColor: string;
}

/**
 * Pre-computed hover styles for recipe cards and table rows.
 * Memoizes colorMixOr calculations to avoid recomputing on every hover event.
 */
export interface RecipeHoverStyles {
  /** Styles for API/regular recipes */
  api: {
    default: RecipeStateStyles;
    hover: RecipeStateStyles;
    selected: RecipeStateStyles;
  };
  /** Styles for custom recipes (with accent color) */
  custom: {
    default: RecipeStateStyles;
    hover: RecipeStateStyles;
    selected: RecipeStateStyles;
  };
}

/**
 * Hook that returns pre-computed hover styles for recipe items.
 * Call once at the component level to avoid recalculating on every render/hover.
 *
 * @example
 * const hoverStyles = useRecipeHoverStyles();
 * const styles = rowData.source === 'custom' ? hoverStyles.custom : hoverStyles.api;
 * // In onMouseEnter:
 * e.currentTarget.style.backgroundColor = styles.hover.backgroundColor;
 */
export function useRecipeHoverStyles(): RecipeHoverStyles {
  return useMemo(
    () => ({
      api: {
        default: {
          backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
          borderColor: 'var(--color-border-secondary)',
        },
        hover: {
          backgroundColor: 'rgba(var(--color-background-rgb), 0.35)',
          borderColor: 'var(--color-border-primary)',
        },
        selected: {
          backgroundColor: 'var(--color-surface-muted)',
          borderColor: 'var(--color-primary)',
        },
      },
      custom: {
        default: {
          backgroundColor: colorMixOr(
            'var(--color-accent)',
            15,
            'transparent',
            'var(--color-border-muted)'
          ),
          borderColor: colorMixOr(
            'var(--color-accent)',
            30,
            'transparent',
            'var(--color-border-secondary)'
          ),
        },
        hover: {
          backgroundColor: colorMixOr(
            'var(--color-accent)',
            20,
            'transparent',
            'var(--color-border-secondary)'
          ),
          borderColor: colorMixOr(
            'var(--color-accent)',
            40,
            'transparent',
            'var(--color-border-primary)'
          ),
        },
        selected: {
          backgroundColor: colorMixOr(
            'var(--color-accent)',
            25,
            'transparent',
            'var(--color-surface-muted)'
          ),
          borderColor: 'var(--color-primary)',
        },
      },
    }),
    []
  );
}

/**
 * Pre-computed styles for the delete button (uses semantic-error color).
 */
export interface DeleteButtonStyles {
  default: { backgroundColor: string; color: string };
  hover: { backgroundColor: string; color: string };
}

export function useDeleteButtonStyles(): DeleteButtonStyles {
  return useMemo(
    () => ({
      default: {
        backgroundColor: colorMixOr(
          'var(--color-semantic-error)',
          10,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-semantic-error)',
          80,
          'var(--color-text-primary)',
          'var(--color-semantic-error)'
        ),
      },
      hover: {
        backgroundColor: colorMixOr(
          'var(--color-semantic-error)',
          20,
          'transparent',
          'var(--color-border-secondary)'
        ),
        color: colorMixOr(
          'var(--color-semantic-error)',
          90,
          'var(--color-text-primary)',
          'var(--color-semantic-error)'
        ),
      },
    }),
    []
  );
}
