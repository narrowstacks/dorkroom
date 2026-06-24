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
import type { ScrubField } from '@/components/meter/meter-readout';

export type SelectorTarget = 'aperture' | 'shutter' | 'iso';

type Solver = ReturnType<typeof useLightMeterSolver>;

const ISO_OPTIONS = STANDARD_ISOS.map((o) => ({
  value: o.value,
  label: String(o.value),
}));

/**
 * Builds the three drag-scrubbable meter settings (aperture / shutter / ISO)
 * from the solver. Dragging aperture/shutter commits a value and locks it (sets
 * that priority); ISO never changes priority. A calculated setting starts the
 * scrub from its displayed (solved + snapped) value.
 */
export function useMeterScrubFields(
  solver: Solver
): Record<SelectorTarget, ScrubField> {
  return useMemo(() => {
    const sol = solver.solution;
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
        options: ISO_OPTIONS,
        value: solver.iso,
        displayLabel: String(solver.iso),
        onChange: solver.setIso,
        brighterIsHigherIndex: true,
        locked: false,
        calculated: false,
      },
    };
  }, [solver]);
}
