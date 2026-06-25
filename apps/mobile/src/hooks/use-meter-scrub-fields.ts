import {
  formatAperture,
  formatShutterSpeed,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  snapToStandardStop,
  type useLightMeterSolver,
} from '@dorkroom/logic';
import { useMemo } from 'react';
import type { ScrubField, ScrubOption } from '@/components/meter/meter-readout';

export type SelectorTarget = 'aperture' | 'shutter' | 'iso';

type Solver = ReturnType<typeof useLightMeterSolver>;

// Common film speeds between the standard stops (third-stop box speeds).
const EXTRA_FILM_ISOS = [80, 125, 160, 250, 320, 500];
// Sentinel option value: landing on it opens a number input instead of setting ISO.
const CUSTOM_ISO = -1;

/**
 * Standard + common film ISOs, the roll's rated EI, and the current value, sorted
 * ascending — then a trailing "Custom" entry for off-list speeds.
 */
function buildIsoOptions(
  rollIso: number | undefined,
  currentIso: number
): ScrubOption[] {
  const values = new Set<number>(STANDARD_ISOS.map((o) => o.value));
  for (const v of EXTRA_FILM_ISOS) values.add(v);
  if (rollIso != null) values.add(rollIso);
  if (currentIso > 0) values.add(currentIso);
  const options: ScrubOption[] = [...values]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: String(value) }));
  options.push({ value: CUSTOM_ISO, label: 'Custom', action: true });
  return options;
}

/**
 * Builds the three drag-scrubbable meter settings (aperture / shutter / ISO)
 * from the solver. Dragging aperture/shutter commits a value and locks it (sets
 * that priority); ISO never changes priority. A calculated setting starts the
 * scrub from its displayed (solved + snapped) value.
 */
export function useMeterScrubFields(
  solver: Solver,
  rollIso: number | undefined,
  isoLocked: boolean,
  onIsoBlocked: () => void,
  onCustomIso: () => void
): Record<SelectorTarget, ScrubField> {
  return useMemo(() => {
    const sol = solver.solution;
    const isoOptions = buildIsoOptions(rollIso, solver.iso);
    const apertureLocked = solver.priority === 'aperture';
    const shutterLocked = solver.priority === 'shutter';
    return {
      aperture: {
        caption: 'aperture',
        accessibilityLabel: 'Aperture',
        options: STANDARD_APERTURES,
        value: apertureLocked
          ? solver.aperture
          : snapToStandardStop(sol.aperture, STANDARD_APERTURES, false).standard
              .value,
        displayLabel: apertureLocked
          ? formatAperture(solver.aperture)
          : sol.isValid
            ? sol.solvedLabel
            : '—',
        onChange: (v) => {
          solver.setAperture(v);
          solver.setPriority('aperture');
        },
        brighterIsHigherIndex: false,
        locked: apertureLocked,
        calculated: !apertureLocked,
        stopError:
          !apertureLocked && sol.isValid ? sol.solvedStopError : undefined,
      },
      shutter: {
        caption: 'shutter',
        accessibilityLabel: 'Shutter',
        options: STANDARD_SHUTTER_SPEEDS,
        value: shutterLocked
          ? solver.shutterSpeed
          : snapToStandardStop(sol.shutterSpeed, STANDARD_SHUTTER_SPEEDS, true)
              .standard.value,
        displayLabel: shutterLocked
          ? formatShutterSpeed(solver.shutterSpeed)
          : sol.isValid
            ? sol.solvedLabel
            : '—',
        onChange: (v) => {
          solver.setShutterSpeed(v);
          solver.setPriority('shutter');
        },
        brighterIsHigherIndex: false,
        locked: shutterLocked,
        calculated: !shutterLocked,
        stopError:
          !shutterLocked && sol.isValid ? sol.solvedStopError : undefined,
      },
      iso: {
        caption: 'ISO',
        accessibilityLabel: 'ISO',
        options: isoOptions,
        value: solver.iso,
        displayLabel: String(solver.iso),
        onChange: (v) => {
          if (v === CUSTOM_ISO) onCustomIso();
          else solver.setIso(v);
        },
        brighterIsHigherIndex: true,
        // Show the lock icon (like the aperture/shutter priority lock) and make
        // the wheel non-scrubbable while ISO is locked to the roll's EI.
        locked: isoLocked,
        calculated: false,
        // Accent the roll's rated EI in the wheel.
        highlightValue: rollIso,
        disabled: isoLocked,
        onBlocked: onIsoBlocked,
      },
    };
  }, [solver, rollIso, isoLocked, onIsoBlocked, onCustomIso]);
}
