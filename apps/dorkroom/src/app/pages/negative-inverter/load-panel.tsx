import { cn, StatusAlert } from '@dorkroom/ui';
import { Camera, ImageUp, ShieldCheck } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { ActionButton } from './controls';
import { LIGHT_TABLE_TIPS } from './light-table-tips';

interface LoadPanelProps {
  loading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

/**
 * The empty state: a drop zone with a file picker and a separate camera
 * button (`capture="environment"` opens the rear camera on phones and falls
 * back to the file picker elsewhere).
 */
export function LoadPanel({ loading, error, onFile }: LoadPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear it so picking the same file again still fires a change.
    event.target.value = '';
    if (file) onFile(file);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-4">
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a drop target only; the Choose photo and Use camera buttons inside are the keyboard and screen reader way in */}
      <section
        aria-label="Load a photo of a negative"
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors',
          dragging
            ? 'border-[color:var(--color-brand)]'
            : 'border-[color:var(--color-border-secondary)]'
        )}
      >
        <ImageUp
          className="size-10"
          aria-hidden="true"
          style={{ color: 'var(--color-text-tertiary)' }}
        />
        <div className="space-y-1">
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {loading ? 'Opening photo…' : 'Load a photo of a negative'}
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            JPEG, PNG, or HEIC (Safari). Drop a file here, or choose one.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ActionButton
            variant="primary"
            icon={ImageUp}
            disabled={loading}
            onClick={() => fileInput.current?.click()}
          >
            Choose photo
          </ActionButton>
          <ActionButton
            icon={Camera}
            disabled={loading}
            onClick={() => cameraInput.current?.click()}
          >
            Use camera
          </ActionButton>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          aria-label="Choose a photo of a negative"
          className="hidden"
          onChange={onChange}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Take a photo of a negative"
          className="hidden"
          onChange={onChange}
        />
        <p
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Your photo stays on this device. Nothing is uploaded.
        </p>
      </section>

      <div aria-live="polite">
        {error && <StatusAlert action="error" omitRole message={error} />}
      </div>

      <div className="space-y-2">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Light-table tips
        </h3>
        <ul className="ml-5 list-disc space-y-1.5">
          {LIGHT_TABLE_TIPS.map((tip) => (
            <li
              key={tip}
              className="pl-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
