import type { SensorFormat } from '@dorkroom/logic';
import type { FC } from 'react';
import { useMemo } from 'react';

export interface SensorSizeVisualizationProps {
  sourceFormat: SensorFormat;
  targetFormat: SensorFormat;
  className?: string;
}

/**
 * Visualizes the relative sizes of two sensor formats
 * Shows the larger format as the outer rectangle with the smaller format nested inside
 */
export const SensorSizeVisualization: FC<SensorSizeVisualizationProps> = ({
  sourceFormat,
  targetFormat,
  className = '',
}) => {
  const { largerFormat, smallerFormat, isSourceLarger } = useMemo(() => {
    const sourceArea = sourceFormat.width * sourceFormat.height;
    const targetArea = targetFormat.width * targetFormat.height;
    const isSourceLarger = sourceArea >= targetArea;

    return {
      largerFormat: isSourceLarger ? sourceFormat : targetFormat,
      smallerFormat: isSourceLarger ? targetFormat : sourceFormat,
      isSourceLarger,
    };
  }, [sourceFormat, targetFormat]);

  // Calculate display dimensions maintaining aspect ratios
  // Compact container dimensions
  const maxWidth = 220;
  const maxHeight = 140;

  const { outerWidth, outerHeight, innerWidth, innerHeight } = useMemo(() => {
    // Scale larger format to fit container
    const largerAspect = largerFormat.width / largerFormat.height;
    let outerW: number;
    let outerH: number;

    if (largerAspect > maxWidth / maxHeight) {
      // Width constrained
      outerW = maxWidth;
      outerH = maxWidth / largerAspect;
    } else {
      // Height constrained
      outerH = maxHeight;
      outerW = maxHeight * largerAspect;
    }

    // Scale smaller format proportionally
    const scale = outerW / largerFormat.width;
    const innerW = smallerFormat.width * scale;
    const innerH = smallerFormat.height * scale;

    return {
      outerWidth: outerW,
      outerHeight: outerH,
      innerWidth: innerW,
      innerHeight: innerH,
    };
  }, [largerFormat, smallerFormat]);

  // Calculate area ratio for display
  const areaRatio = useMemo(() => {
    const sourceArea = sourceFormat.width * sourceFormat.height;
    const targetArea = targetFormat.width * targetFormat.height;
    return targetArea / sourceArea;
  }, [sourceFormat, targetFormat]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Visualization container */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: maxWidth, height: maxHeight }}
      >
        {/* Outer (larger) format */}
        <div
          className="relative border-2 rounded-sm flex items-center justify-center"
          style={{
            width: outerWidth,
            height: outerHeight,
            borderColor: isSourceLarger
              ? 'var(--color-accent-primary)'
              : 'var(--color-accent-secondary)',
            backgroundColor: isSourceLarger
              ? 'var(--color-accent-primary-bg)'
              : 'var(--color-accent-secondary-bg)',
          }}
        >
          {/* Inner (smaller) format */}
          <div
            className="absolute border-2 rounded-sm"
            style={{
              width: innerWidth,
              height: innerHeight,
              borderColor: isSourceLarger
                ? 'var(--color-accent-secondary)'
                : 'var(--color-accent-primary)',
              backgroundColor: isSourceLarger
                ? 'var(--color-accent-secondary-bg)'
                : 'var(--color-accent-primary-bg)',
            }}
          />

          {/* Larger format label */}
          <span
            className="absolute text-[10px] font-medium px-1 py-0.5 rounded"
            style={{
              top: 3,
              left: 3,
              backgroundColor: isSourceLarger
                ? 'var(--color-accent-primary)'
                : 'var(--color-accent-secondary)',
              color: 'white',
            }}
          >
            {largerFormat.shortName}
          </span>

          {/* Smaller format label - positioned at bottom right of inner box */}
          <span
            className="absolute text-[10px] font-medium px-1 py-0.5 rounded"
            style={{
              bottom: (outerHeight - innerHeight) / 2 + 3,
              right: (outerWidth - innerWidth) / 2 + 3,
              backgroundColor: isSourceLarger
                ? 'var(--color-accent-secondary)'
                : 'var(--color-accent-primary)',
              color: 'white',
            }}
          >
            {smallerFormat.shortName}
          </span>
        </div>
      </div>

      {/* Compact legend */}
      <div className="flex flex-col items-center gap-1 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-2 rounded-sm border"
              style={{
                borderColor: 'var(--color-accent-primary)',
                backgroundColor: 'var(--color-accent-primary-bg)',
              }}
            />
            <span className="text-secondary">{sourceFormat.shortName}</span>
            <span className="text-tertiary">
              ({sourceFormat.width}×{sourceFormat.height})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-2 rounded-sm border"
              style={{
                borderColor: 'var(--color-accent-secondary)',
                backgroundColor: 'var(--color-accent-secondary-bg)',
              }}
            />
            <span className="text-secondary">{targetFormat.shortName}</span>
            <span className="text-tertiary">
              ({targetFormat.width}×{targetFormat.height})
            </span>
          </div>
        </div>
        <p className="text-tertiary">
          Target is{' '}
          <span className="font-medium text-secondary">
            {areaRatio > 1 ? areaRatio.toFixed(2) : (1 / areaRatio).toFixed(2)}×
          </span>{' '}
          {areaRatio > 1 ? 'larger' : 'smaller'}
        </p>
      </div>
    </div>
  );
};
