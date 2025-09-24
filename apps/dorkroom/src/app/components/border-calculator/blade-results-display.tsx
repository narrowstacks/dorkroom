import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { BorderCalculation } from '@dorkroom/logic';
import { useTheme } from '../../contexts/theme-context';

interface BladeResultsDisplayProps {
  calculation: BorderCalculation | null;
  paperSize: string;
  aspectRatio: string;
}

export function BladeResultsDisplay({
  calculation,
  paperSize,
  aspectRatio,
}: BladeResultsDisplayProps) {
  const { resolvedTheme } = useTheme();

  if (!calculation) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface-muted)',
        }}
      >
        <h2
          className="text-xl font-semibold mb-4 text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Blade Positions
        </h2>
        <p className="text-center" style={{ color: 'var(--color-text-muted)' }}>
          Configure your settings to see blade positions
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        borderColor:
          resolvedTheme === 'light'
            ? 'var(--color-border-secondary)'
            : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent', // Let parent handle background
      }}
    >
      <div className="text-center mb-6">
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Blade Positions
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {calculation.printWidth.toFixed(2)}" ×{' '}
          {calculation.printHeight.toFixed(2)}" image on {paperSize}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div
          className="rounded-lg border p-3 text-center"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div
            className="flex items-center justify-center mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">L</span>
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {calculation.leftBladeReading.toFixed(2)}"
          </div>
        </div>

        <div
          className="rounded-lg border p-3 text-center"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div
            className="flex items-center justify-center mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowUp className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">T</span>
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {calculation.topBladeReading.toFixed(2)}"
          </div>
        </div>

        <div
          className="rounded-lg border p-3 text-center"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div
            className="flex items-center justify-center mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="text-sm font-medium mr-1">B</span>
            <ArrowDown className="h-4 w-4" />
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {calculation.bottomBladeReading.toFixed(2)}"
          </div>
        </div>

        <div
          className="rounded-lg border p-3 text-center"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div
            className="flex items-center justify-center mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="text-sm font-medium mr-1">R</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {calculation.rightBladeReading.toFixed(2)}"
          </div>
        </div>
      </div>

      {calculation.isNonStandardPaperSize && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor:
              'color-mix(in srgb, var(--color-semantic-info) 50%, transparent)',
            backgroundColor:
              'color-mix(in srgb, var(--color-semantic-info) 10%, transparent)',
          }}
        >
          <p
            className="text-center text-sm"
            style={{
              color:
                'color-mix(in srgb, var(--color-semantic-info) 80%, var(--color-text-primary))',
            }}
          >
            <strong>Non-Standard Paper Size</strong>
            <br />
            Position paper in the {calculation.easelSizeLabel} slot all the way
            to the left.
          </p>
        </div>
      )}
    </div>
  );
}
