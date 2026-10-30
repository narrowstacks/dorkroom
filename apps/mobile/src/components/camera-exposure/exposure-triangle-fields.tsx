import {
  apertureToKey,
  formatAperture,
  formatShutterSpeed,
  isoToKey,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  shutterSpeedToKey,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { PickerField } from '@/components/picker-field';
import { standardLookup, standardOptions } from './format';

const APERTURE_OPTIONS = standardOptions(STANDARD_APERTURES);
const SHUTTER_OPTIONS = standardOptions(STANDARD_SHUTTER_SPEEDS);
const ISO_OPTIONS = standardOptions(STANDARD_ISOS);
const APERTURE_BY_LABEL = standardLookup(STANDARD_APERTURES);
const SHUTTER_BY_LABEL = standardLookup(STANDARD_SHUTTER_SPEEDS);
const ISO_BY_LABEL = standardLookup(STANDARD_ISOS);

interface ExposureTriangleFieldsProps {
  aperture: number;
  shutterSpeed: number;
  iso: number;
  onApertureChange: (value: number) => void;
  onShutterSpeedChange: (value: number) => void;
  onIsoChange: (value: number) => void;
  /** Appended to each field label, e.g. "B" for the comparison exposure, so
   * VoiceOver can tell the two sets of pickers apart. */
  labelSuffix?: string;
}

/** Aperture, shutter speed and ISO pickers over the standard dial values. */
export function ExposureTriangleFields({
  aperture,
  shutterSpeed,
  iso,
  onApertureChange,
  onShutterSpeedChange,
  onIsoChange,
  labelSuffix,
}: ExposureTriangleFieldsProps) {
  const suffix = labelSuffix ? ` ${labelSuffix}` : '';
  return (
    <View className="gap-3">
      <PickerField
        label={`Aperture${suffix}`}
        options={APERTURE_OPTIONS}
        value={apertureToKey(aperture)}
        placeholder={formatAperture(aperture)}
        onChange={(key) =>
          onApertureChange(APERTURE_BY_LABEL.get(key) ?? aperture)
        }
      />
      <PickerField
        label={`Shutter speed${suffix}`}
        options={SHUTTER_OPTIONS}
        value={shutterSpeedToKey(shutterSpeed)}
        placeholder={formatShutterSpeed(shutterSpeed)}
        onChange={(key) =>
          onShutterSpeedChange(SHUTTER_BY_LABEL.get(key) ?? shutterSpeed)
        }
      />
      <PickerField
        label={`ISO${suffix}`}
        options={ISO_OPTIONS}
        value={isoToKey(iso)}
        placeholder={`ISO ${iso}`}
        onChange={(key) => onIsoChange(ISO_BY_LABEL.get(key) ?? iso)}
      />
    </View>
  );
}
