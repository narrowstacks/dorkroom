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
import { useEffect, useRef, useState } from 'react';
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

/** What an export was run with, so its outcome is shown only while the
 *  options still match. */
interface ExportInputs {
  region: PixelRect;
  format: ExportFormat;
  coefficients: InversionCoefficients;
}

type ExportStatus =
  | { phase: 'idle' }
  | { phase: 'working'; progress: number }
  | {
      phase: 'done';
      plan: ExportPlan;
      cropped: boolean;
      inputs: ExportInputs;
    }
  | { phase: 'failed'; inputs: ExportInputs };

const sameRect = (a: PixelRect, b: PixelRect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

function matchesInputs(
  inputs: ExportInputs,
  region: PixelRect | null,
  format: ExportFormat,
  coefficients: InversionCoefficients | null
): boolean {
  return (
    region !== null &&
    sameRect(inputs.region, region) &&
    inputs.format === format &&
    inputs.coefficients === coefficients
  );
}

const FORMAT_OPTIONS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
] as const;

export function ExportCard({ negative, crop, coefficients }: ExportCardProps) {
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [cropOnly, setCropOnly] = useState(true);
  const [exportStatus, setStatus] = useState<ExportStatus>({ phase: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // The card remounts for each new photo; stop a running export so it does
  // not download the old photo or overlap the new photo's decode.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const hasCrop = !!negative && !!crop && !isFullCrop(crop, negative.proxy);
  const cropped = hasCrop && cropOnly;
  const region: PixelRect | null = negative
    ? cropped && crop
      ? scaleRect(crop, negative.proxy, negative.original)
      : { x: 0, y: 0, ...negative.original }
    : null;
  const planned = region ? planExportSize(region) : null;
  // A finished or failed export describes the options it ran with; once the
  // crop, format or adjustments change, show the plan for the next one.
  const status: ExportStatus =
    (exportStatus.phase === 'done' || exportStatus.phase === 'failed') &&
    !matchesInputs(exportStatus.inputs, region, format, coefficients)
      ? { phase: 'idle' }
      : exportStatus;
  const working = status.phase === 'working';

  const onDownload = async () => {
    if (!negative || !region || !coefficients || working) return;
    const inputs: ExportInputs = { region, format, coefficients };
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ phase: 'working', progress: 0 });
    try {
      const { blob, plan } = await exportPositive({
        file: negative.file,
        original: negative.original,
        region,
        coefficients,
        format,
        signal: controller.signal,
        onProgress: (progress) => setStatus({ phase: 'working', progress }),
      });
      if (controller.signal.aborted) return;
      downloadBlob(blob, exportFileName(negative.file.name, format));
      setStatus({ phase: 'done', plan, cropped, inputs });
    } catch {
      // An aborted export rejects too; the card it belonged to is gone.
      if (controller.signal.aborted) return;
      setStatus({ phase: 'failed', inputs });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
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
