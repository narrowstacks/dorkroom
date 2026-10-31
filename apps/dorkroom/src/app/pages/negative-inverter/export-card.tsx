import {
  type ExportPlan,
  type InversionCoefficients,
  isFullCrop,
  type PixelRect,
  planExportSize,
  scaleRect,
} from '@dorkroom/logic';
import { StatusAlert } from '@dorkroom/ui';
import { CalculatorCard } from '@dorkroom/ui/calculator';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, SegmentedControl } from './controls';
import type { LoadedNegative } from './decode-image';
import { describeExport, describePlannedExport } from './export-notes';
import {
  downloadBlob,
  exportFileName,
  type ExportFormat,
  exportPositive,
} from './export-positive';

interface ExportCardProps {
  negative: LoadedNegative | null;
  crop: PixelRect | null;
  coefficients: InversionCoefficients | null;
}

type ExportStatus =
  | { phase: 'idle' }
  | { phase: 'working'; progress: number }
  | { phase: 'done'; plan: ExportPlan; cropped: boolean }
  | { phase: 'failed' };

const FORMAT_OPTIONS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
] as const;

export function ExportCard({ negative, crop, coefficients }: ExportCardProps) {
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [cropOnly, setCropOnly] = useState(true);
  const [status, setStatus] = useState<ExportStatus>({ phase: 'idle' });

  const hasCrop = !!negative && !!crop && !isFullCrop(crop, negative.proxy);
  const cropped = hasCrop && cropOnly;
  const region: PixelRect | null = negative
    ? cropped && crop
      ? scaleRect(crop, negative.proxy, negative.original)
      : { x: 0, y: 0, ...negative.original }
    : null;
  const planned = region ? planExportSize(region) : null;
  const working = status.phase === 'working';

  const onDownload = async () => {
    if (!negative || !region || !coefficients || working) return;
    setStatus({ phase: 'working', progress: 0 });
    try {
      const { blob, plan } = await exportPositive({
        file: negative.file,
        original: negative.original,
        region,
        coefficients,
        format,
        onProgress: (progress) => setStatus({ phase: 'working', progress }),
      });
      downloadBlob(blob, exportFileName(negative.file.name, format));
      setStatus({ phase: 'done', plan, cropped });
    } catch {
      setStatus({ phase: 'failed' });
    }
  };

  return (
    <CalculatorCard
      title="Download"
      description="Rendered from the original photo, not the preview."
    >
      <SegmentedControl
        legend="File format"
        options={FORMAT_OPTIONS}
        value={format}
        onChange={setFormat}
      />

      {hasCrop && (
        <label
          className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={cropOnly}
            onChange={(event) => setCropOnly(event.target.checked)}
            className="size-4 cursor-pointer"
            style={{ accentColor: 'var(--color-brand)' }}
          />
          Only the cropped area
        </label>
      )}

      <ActionButton
        variant="primary"
        icon={Download}
        disabled={!coefficients || working}
        onClick={onDownload}
        className="w-full"
      >
        {status.phase === 'working'
          ? `Exporting… ${Math.round(status.progress * 100)}%`
          : `Download ${format === 'jpeg' ? 'JPEG' : 'PNG'}`}
      </ActionButton>

      <div aria-live="polite" className="space-y-2">
        {status.phase === 'done' && (
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {describeExport(status.plan, status.cropped)}
          </p>
        )}
        {status.phase === 'failed' && (
          <StatusAlert
            action="error"
            omitRole
            message="The export failed, most likely for lack of memory. Close other tabs, or crop tighter, and try again."
          />
        )}
      </div>

      {planned && status.phase !== 'done' && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {describePlannedExport(planned, cropped)}
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {format === 'jpeg'
          ? 'JPEG at 92% quality. Choose PNG for lossless output.'
          : 'PNG is lossless and larger than JPEG.'}{' '}
        Photo metadata is not copied.
      </p>
    </CalculatorCard>
  );
}
