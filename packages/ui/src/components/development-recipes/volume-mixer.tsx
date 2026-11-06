import {
  calculateVolumes,
  convertDisplayToMl,
  convertMlToDisplay,
  formatDilutionDescription,
  formatVolume,
  getDefaultVolumeMl,
  getVolumePrecision,
  getVolumeStepSize,
  getVolumeUnitLabel,
  isStockDilution,
  parseDilution,
} from '@dorkroom/logic';
import { useId, useState } from 'react';
import { useVolume } from '../../contexts/volume-context';
import { cn } from '../../lib/cn';
import { NumberInput } from '../number-input';
import { VolumeUnitToggle } from '../volume-unit-toggle';
import { RecipeChoiceChips } from './recipe-choice-chips';

interface VolumeMixerProps {
  /** The dilution string from the recipe (e.g., "1+1", "1:50", "Stock") */
  dilutionString: string;
  /**
   * Quick volumes in ml, shown as a choice group above the free input. The
   * typed total lives in this component, so keep it mounted across recipe
   * changes (do not key it by recipe) and the volume carries over. Also grows
   * the input and unit toggle to a 44px touch target.
   */
  presetsMl?: readonly number[];
  /**
   * The total, when a parent keeps it so it survives this component being
   * unmounted (a layout change). Without it the mixer keeps its own.
   */
  volumeMl?: number;
  onVolumeMlChange?: (ml: number) => void;
}

/**
 * Volume mixer component for calculating developer concentrate and water amounts.
 * Shows the calculated volumes based on the dilution ratio and user-entered total volume.
 */
export function VolumeMixer({
  dilutionString,
  presetsMl,
  volumeMl,
  onVolumeMlChange,
}: VolumeMixerProps) {
  const { unit } = useVolume();
  const inputId = useId();
  const [ownVolumeMl, setOwnVolumeMl] = useState(() => getDefaultVolumeMl());
  const totalVolumeMl = volumeMl ?? ownVolumeMl;
  const setTotalVolumeMl = (ml: number) => {
    setOwnVolumeMl(ml);
    onVolumeMlChange?.(ml);
  };
  // What is typed, while the field has focus. The committed volume is in ml, so
  // echoing it back would rewrite a half-typed value ("12" in fl oz becomes
  // "1.0") and refuse an emptied field.
  const [draft, setDraft] = useState<string | null>(null);
  // A draft is in the unit it was typed in, so a unit change drops it.
  const [draftUnit, setDraftUnit] = useState(unit);
  if (unit !== draftUnit) {
    setDraftUnit(unit);
    setDraft(null);
  }
  const touchSized = presetsMl !== undefined;

  // Check if this is a stock dilution (no mixing needed)
  if (isStockDilution(dilutionString)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          No mixing needed: use developer stock (undiluted).
        </p>
      </div>
    );
  }

  // Parse the dilution string
  const parsed = parseDilution(dilutionString);

  // If we can't parse the dilution, show a message
  if (!parsed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-tertiary">
          Unable to parse dilution format "{dilutionString}". Check the recipe
          for mixing instructions.
        </p>
      </div>
    );
  }

  // Calculate volumes
  const volumes = calculateVolumes(totalVolumeMl, parsed);

  // Explicitly state the interpreted ratio so the on-screen convention
  // (A:B read the same as A+B — concentrate parts + water parts) is
  // unambiguous next to the raw dilution string from the recipe.
  const ratioCaption = `${formatDilutionDescription(parsed)} (${dilutionString} = ${parsed.totalParts} parts total)`;

  // Convert display value
  const displayValue = convertMlToDisplay(totalVolumeMl, unit);
  const precision = getVolumePrecision(unit);
  const step = getVolumeStepSize(unit);
  const unitLabel = getVolumeUnitLabel(unit);

  const handleVolumeChange = (value: string) => {
    setDraft(value);
    const numValue = parseFloat(value);
    if (!Number.isNaN(numValue) && numValue > 0) {
      setTotalVolumeMl(convertDisplayToMl(numValue, unit));
    }
  };

  return (
    <div className="space-y-4">
      {presetsMl && presetsMl.length > 0 && (
        <RecipeChoiceChips
          label="Total volume presets"
          hideLabel
          options={presetsMl.map((ml) => ({
            id: String(ml),
            label: formatVolume(ml, unit),
          }))}
          value={
            presetsMl.includes(totalVolumeMl) ? String(totalVolumeMl) : null
          }
          onChange={(id) => {
            setDraft(null);
            setTotalVolumeMl(Number(id));
          }}
        />
      )}

      {/* Input row */}
      <div className={cn('flex items-center gap-3', touchSized && 'flex-wrap')}>
        <label className="text-sm text-secondary" htmlFor={inputId}>
          Total volume
        </label>
        <div className="flex items-center gap-2">
          <NumberInput
            id={inputId}
            inputTitle="Total volume"
            value={draft ?? displayValue.toFixed(precision)}
            onChangeText={handleVolumeChange}
            onBlur={() => setDraft(null)}
            step={step}
            className={cn('w-24', touchSized && 'min-h-11')}
          />
          <span className="text-sm text-muted">{unitLabel}</span>
        </div>
        <div className="ml-auto">
          <VolumeUnitToggle
            className={
              touchSized ? 'min-h-11 shrink-0 whitespace-nowrap' : undefined
            }
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-secondary bg-border-muted p-3">
          <div className="text-xs uppercase tracking-wide text-muted mb-1">
            Developer
          </div>
          <p className="text-lg font-semibold text-primary">
            {formatVolume(volumes.concentrate, unit)}
          </p>
        </div>
        <div className="rounded-lg border border-secondary bg-border-muted p-3">
          <div className="text-xs uppercase tracking-wide text-muted mb-1">
            Water
          </div>
          <p className="text-lg font-semibold text-primary">
            {formatVolume(volumes.water, unit)}
          </p>
        </div>
      </div>

      {/* Ratio description */}
      <p className="text-xs text-tertiary">{ratioCaption}</p>
    </div>
  );
}
