import {
  calculateVolumes,
  convertDisplayToMl,
  convertMlToDisplay,
  formatVolume,
  getDefaultVolumeMl,
  getVolumePrecision,
  getVolumeStepSize,
  getVolumeUnitLabel,
  isStockDilution,
  parseDilution,
} from '@dorkroom/logic';
import { useState } from 'react';
import { useVolume } from '../../contexts/volume-context';
import { NumberInput } from '../number-input';
import { VolumeUnitToggle } from '../volume-unit-toggle';

interface VolumeMixerProps {
  /** The dilution string from the recipe (e.g., "1+1", "1:50", "Stock") */
  dilutionString: string;
}

/**
 * Volume mixer component for calculating developer concentrate and water amounts.
 * Shows the calculated volumes based on the dilution ratio and user-entered total volume.
 */
export function VolumeMixer({ dilutionString }: VolumeMixerProps) {
  const { unit } = useVolume();
  const [totalVolumeMl, setTotalVolumeMl] = useState(getDefaultVolumeMl());

  // Check if this is a stock dilution (no mixing needed)
  if (isStockDilution(dilutionString)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          No mixing needed — use developer stock (undiluted).
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

  // Convert display value
  const displayValue = convertMlToDisplay(totalVolumeMl, unit);
  const precision = getVolumePrecision(unit);
  const step = getVolumeStepSize(unit);
  const unitLabel = getVolumeUnitLabel(unit);

  const handleVolumeChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!Number.isNaN(numValue) && numValue > 0) {
      setTotalVolumeMl(convertDisplayToMl(numValue, unit));
    }
  };

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-secondary" htmlFor="volume-mixer-input">
          Total volume
        </label>
        <div className="flex items-center gap-2">
          <NumberInput
            value={displayValue.toFixed(precision)}
            onChangeText={handleVolumeChange}
            step={step}
            className="w-24"
          />
          <span className="text-sm text-muted">{unitLabel}</span>
        </div>
        <div className="ml-auto">
          <VolumeUnitToggle />
        </div>
      </div>

      {/* Results */}
      {totalVolumeMl > 0 && (
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
      )}

      {/* Ratio description */}
      <p className="text-xs text-tertiary">
        {parsed.concentrateParts} part{parsed.concentrateParts !== 1 ? 's' : ''}{' '}
        developer + {parsed.waterParts} part{parsed.waterParts !== 1 ? 's' : ''}{' '}
        water
      </p>
    </div>
  );
}
