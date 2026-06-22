import {
  type LightMeterSolution,
  type MeterPriority,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '@dorkroom/logic';
import { Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { CalibrationRow } from './calibration-row';
import { EvReadout } from './ev-readout';
import { IsoStepper } from './iso-stepper';

export interface MeterControlsProps {
  ev: number | null;
  iso: number;
  onIsoChange: (iso: number) => void;
  priority: MeterPriority;
  onPriorityChange: (priority: MeterPriority) => void;
  aperture: number;
  onApertureChange: (aperture: number) => void;
  shutterSpeed: number;
  onShutterSpeedChange: (shutterSpeed: number) => void;
  solution: LightMeterSolution;
  calibrationOffset: number;
  onCalibrationChange: (delta: number) => void;
}

const PRIORITY_OPTIONS: { label: string; value: MeterPriority }[] = [
  { label: 'Aperture priority', value: 'aperture' },
  { label: 'Shutter priority', value: 'shutter' },
];

/** Bottom overlay: EV, ISO, priority, the locked input, and the solved result. */
export function MeterControls(props: MeterControlsProps) {
  const apertureOptions = STANDARD_APERTURES.map((a) => ({
    label: a.label,
    value: a.value,
  }));
  const shutterOptions = STANDARD_SHUTTER_SPEEDS.map((s) => ({
    label: s.label,
    value: s.value,
  }));

  return (
    <GlassCard className="gap-4">
      <EvReadout ev={props.ev} />
      <IsoStepper iso={props.iso} onChange={props.onIsoChange} />
      <OptionRow
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={props.priority}
        onChange={props.onPriorityChange}
      />
      {props.priority === 'aperture' ? (
        <OptionRow
          label="Aperture"
          options={apertureOptions}
          value={props.aperture}
          onChange={props.onApertureChange}
        />
      ) : (
        <OptionRow
          label="Shutter"
          options={shutterOptions}
          value={props.shutterSpeed}
          onChange={props.onShutterSpeedChange}
        />
      )}
      <ResultRow
        label={props.priority === 'aperture' ? 'Shutter' : 'Aperture'}
        value={props.solution.isValid ? props.solution.solvedLabel : '—'}
      />
      {props.solution.outOfRange ? (
        <Text className="text-sm text-amber-400">
          Solved shutter is outside 1/8000s–30s.
        </Text>
      ) : null}
      <CalibrationRow
        offset={props.calibrationOffset}
        onChange={props.onCalibrationChange}
      />
    </GlassCard>
  );
}
