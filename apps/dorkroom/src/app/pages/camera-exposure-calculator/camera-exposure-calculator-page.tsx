import {
  apertureToKey,
  CAMERA_EXPOSURE_STORAGE_KEY,
  type CameraExposureFormState,
  calculateExposureValue,
  compareExposures,
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  EV_PRESETS,
  findNearestStandard,
  formatAperture,
  formatShutterSpeed,
  getEquivalentExposures,
  isoToKey,
  keyToAperture,
  keyToISO,
  keyToShutterSpeed,
  type SolveFor,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  shutterSpeedToKey,
  solveForAperture,
  solveForISO,
  solveForShutterSpeed,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorStat,
  cameraExposureCalculatorSchema,
  createZodFormValidator,
  ResultRow,
  Select,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type FC, useState } from 'react';

const validateCameraExposureForm = createZodFormValidator(
  cameraExposureCalculatorSchema
);

const apertureOptions = STANDARD_APERTURES.map((a) => ({
  value: a.label,
  label: a.label,
}));

const shutterSpeedOptions = STANDARD_SHUTTER_SPEEDS.map((s) => ({
  value: s.label,
  label: s.label,
}));

const isoOptions = STANDARD_ISOS.map((i) => ({
  value: `ISO ${i.value}`,
  label: i.label,
}));

const solveForOptions = [
  { value: 'shutterSpeed', label: 'Shutter Speed' },
  { value: 'aperture', label: 'Aperture' },
  { value: 'iso', label: 'ISO' },
];

const HOW_TO_USE = [
  'Select your aperture, shutter speed, and ISO to see the current EV.',
  'Use the EV presets to set a scene brightness. Pick which value to solve for.',
  'Browse the equivalent exposures table for alternative settings at the same EV.',
  'Use the comparison section to see the stops difference between two exposures.',
];

const TIPS = [
  'EV (Exposure Value) describes scene brightness at ISO 100. Higher EV = brighter scene.',
  'The Sunny 16 rule: on a bright sunny day (EV 15), use f/16 at 1/ISO seconds.',
  'Each full stop doubles or halves the light — in aperture, shutter speed, or ISO.',
  'Equivalent exposures maintain the same amount of light hitting the film or sensor.',
];

interface EVPresetButtonProps {
  ev: number;
  label: string;
  description: string;
  onClick: (ev: number) => void;
}

const EVPresetButton: FC<EVPresetButtonProps> = ({
  ev,
  label,
  description,
  onClick,
}) => {
  const descId = `ev-preset-desc-${ev}`;
  return (
    <button
      type="button"
      onClick={() => onClick(ev)}
      className="rounded-lg px-3 py-2 text-left transition-colors border themed-button"
      title={description}
      aria-describedby={descId}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span
        id={descId}
        className="block text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        EV {ev}
      </span>
    </button>
  );
};

function EVResultCard({
  form,
  formValues,
}: {
  form: ReturnType<typeof useForm<CameraExposureFormState>>;
  formValues: CameraExposureFormState;
}) {
  return (
    <form.Subscribe
      selector={(state) => {
        const { aperture, shutterSpeed, iso } = state.values;
        return calculateExposureValue(aperture, shutterSpeed, iso);
      }}
    >
      {(result) => (
        <CalculatorCard
          title="Exposure value"
          description="Scene brightness at ISO 100"
          accent="emerald"
          padding="compact"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CalculatorStat
              label="EV"
              value={result.isValid ? `${result.ev}` : '—'}
              helperText={result.description || 'Enter valid settings'}
              tone="emerald"
            />
            <CalculatorStat
              label="Settings"
              value={result.isValid ? formatAperture(formValues.aperture) : '—'}
              helperText={
                result.isValid
                  ? `${formatShutterSpeed(formValues.shutterSpeed)} · ISO ${formValues.iso}`
                  : ''
              }
            />
          </div>

          <div className="rounded-2xl p-4 font-mono text-sm border border-secondary bg-background/20 text-primary text-center">
            EV = log
            <sub>2</sub>(N<sup>2</sup> &times; 100 / t &times; S) ={' '}
            <span className="font-semibold">
              {result.isValid ? result.ev : '—'}
            </span>
          </div>
        </CalculatorCard>
      )}
    </form.Subscribe>
  );
}

export default function CameraExposureCalculatorPage() {
  const [presetsOpen, setPresetsOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      aperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
      shutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
      iso: DEFAULT_CAMERA_EXPOSURE_ISO,
      solveFor: 'shutterSpeed' as SolveFor,
      compareAperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
      compareShutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
      compareIso: DEFAULT_CAMERA_EXPOSURE_ISO,
    },
    validators: {
      onChange: validateCameraExposureForm,
    },
  });

  const formValues = useStore(
    form.store,
    (state) => state.values as CameraExposureFormState
  );

  useLocalStorageFormPersistence({
    storageKey: CAMERA_EXPOSURE_STORAGE_KEY,
    form,
    formValues,
    persistKeys: [
      'aperture',
      'shutterSpeed',
      'iso',
      'solveFor',
      'compareAperture',
      'compareShutterSpeed',
      'compareIso',
    ],
    validators: {
      aperture: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
      shutterSpeed: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
      iso: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
      solveFor: {
        validate: (v) =>
          v === 'shutterSpeed' || v === 'aperture' || v === 'iso',
      },
      compareAperture: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
      compareShutterSpeed: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
      compareIso: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
      },
    },
  });

  const handlePresetClick = (ev: number) => {
    const solveFor = form.getFieldValue('solveFor');
    const aperture = form.getFieldValue('aperture');
    const shutterSpeed = form.getFieldValue('shutterSpeed');
    const iso = form.getFieldValue('iso');

    if (solveFor === 'shutterSpeed') {
      const solved = solveForShutterSpeed(ev, aperture, iso);
      const nearest = findNearestStandard(solved, STANDARD_SHUTTER_SPEEDS);
      form.setFieldValue('shutterSpeed', nearest.value);
    } else if (solveFor === 'aperture') {
      const solved = solveForAperture(ev, shutterSpeed, iso);
      const nearest = findNearestStandard(solved, STANDARD_APERTURES);
      form.setFieldValue('aperture', nearest.value);
    } else {
      const solved = solveForISO(ev, aperture, shutterSpeed);
      const nearest = findNearestStandard(solved, STANDARD_ISOS);
      form.setFieldValue('iso', nearest.value);
    }
  };

  return (
    <CalculatorLayout
      title="Camera Exposure Calculator"
      description={
        <>
          Balance aperture, shutter speed, and ISO for correct exposure.
          <br />
          Find equivalent exposures and compare settings across different
          lighting conditions.
        </>
      }
      sidebar={
        <CalculatorCard
          title="How this calculator works"
          padding="normal"
          className="bg-surface-muted/80"
        >
          <div className="space-y-6">
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              The exposure triangle links aperture, shutter speed, and ISO.
              Changing one requires adjusting another to maintain the same
              exposure. This calculator helps you find those relationships and
              compare different settings.
            </p>

            <div className="space-y-3">
              <h4
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                How to use
              </h4>
              <ol className="ml-5 space-y-2 list-decimal">
                {HOW_TO_USE.map((item) => (
                  <li
                    key={item}
                    className="pl-2 text-[15px] leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3">
              <h4
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Tips
              </h4>
              <ul className="ml-5 space-y-2 list-disc">
                {TIPS.map((tip) => (
                  <li
                    key={tip}
                    className="pl-2 text-[15px] leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CalculatorCard>
      }
      results={
        <div className="space-y-6">
          {/* EV Result - desktop only (mobile instance is in children) */}
          <div className="hidden md:block">
            <EVResultCard form={form} formValues={formValues} />
          </div>

          {/* Equivalent Exposures */}
          <form.Subscribe
            selector={(state) => {
              const { aperture, shutterSpeed, iso } = state.values;
              const evResult = calculateExposureValue(
                aperture,
                shutterSpeed,
                iso
              );
              if (!evResult.isValid) return null;
              return {
                equivalents: getEquivalentExposures(
                  evResult.ev,
                  iso,
                  aperture,
                  shutterSpeed
                ),
                ev: evResult.ev,
                iso,
              };
            }}
          >
            {(data) =>
              data && data.equivalents.length > 0 ? (
                <CalculatorCard
                  title="Equivalent exposures"
                  description={`Same EV ${data.ev} at ISO ${data.iso}`}
                  accent="sky"
                  padding="compact"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="border-b"
                          style={{
                            borderColor: 'var(--color-border-secondary)',
                          }}
                        >
                          <th
                            className="py-2 px-3 text-left font-medium"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            Aperture
                          </th>
                          <th
                            className="py-2 px-3 text-left font-medium"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            Shutter Speed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.equivalents.map((eq) => (
                          <tr
                            key={eq.apertureLabel}
                            className={`border-b ${eq.isCurrentSetting ? 'font-semibold' : ''}`}
                            style={{
                              borderColor: 'var(--color-border-muted)',
                              backgroundColor: eq.isCurrentSetting
                                ? 'var(--color-surface-elevated)'
                                : undefined,
                              color: eq.isStandardShutterSpeed
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-tertiary)',
                            }}
                          >
                            <td className="py-2 px-3">{eq.apertureLabel}</td>
                            <td className="py-2 px-3">
                              {eq.shutterSpeedLabel}
                              {eq.isCurrentSetting && (
                                <span
                                  className="ml-2 text-xs"
                                  style={{
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  current
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Non-standard shutter speeds shown in muted text
                  </p>
                </CalculatorCard>
              ) : null
            }
          </form.Subscribe>
        </div>
      }
    >
      {/* Exposure Settings */}
      <CalculatorCard
        title="Exposure settings"
        description="Set aperture, shutter speed, and ISO."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <form.Field name="aperture">
              {(field) => (
                <Select
                  label="Aperture"
                  selectedValue={apertureToKey(field.state.value)}
                  onValueChange={(v) => field.handleChange(keyToAperture(v))}
                  items={apertureOptions}
                  ariaLabel="Aperture"
                />
              )}
            </form.Field>

            <form.Field name="shutterSpeed">
              {(field) => (
                <Select
                  label="Shutter speed"
                  selectedValue={shutterSpeedToKey(field.state.value)}
                  onValueChange={(v) =>
                    field.handleChange(keyToShutterSpeed(v))
                  }
                  items={shutterSpeedOptions}
                  ariaLabel="Shutter speed"
                />
              )}
            </form.Field>

            <form.Field name="iso">
              {(field) => (
                <Select
                  label="ISO"
                  selectedValue={isoToKey(field.state.value)}
                  onValueChange={(v) => field.handleChange(keyToISO(v))}
                  items={isoOptions}
                  ariaLabel="ISO"
                />
              )}
            </form.Field>
          </div>
        </div>
      </CalculatorCard>

      {/* Exposure Comparison */}
      <form.Subscribe
        selector={(state) => {
          return compareExposures(
            state.values.aperture,
            state.values.shutterSpeed,
            state.values.iso,
            state.values.compareAperture,
            state.values.compareShutterSpeed,
            state.values.compareIso
          );
        }}
      >
        {(comparison) => (
          <CalculatorCard
            title="Exposure comparison"
            description="Stops difference between exposure A (above) and exposure B"
            accent="violet"
            padding="compact"
          >
            {/* Comparison Inputs */}
            <div className="space-y-3">
              <h4
                className="text-xs font-semibold uppercase tracking-[0.25em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Exposure B
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <form.Field name="compareAperture">
                  {(field) => (
                    <Select
                      label="Aperture"
                      selectedValue={apertureToKey(field.state.value)}
                      onValueChange={(v) =>
                        field.handleChange(keyToAperture(v))
                      }
                      items={apertureOptions}
                      ariaLabel="Compare aperture"
                    />
                  )}
                </form.Field>
                <form.Field name="compareShutterSpeed">
                  {(field) => (
                    <Select
                      label="Shutter"
                      selectedValue={shutterSpeedToKey(field.state.value)}
                      onValueChange={(v) =>
                        field.handleChange(keyToShutterSpeed(v))
                      }
                      items={shutterSpeedOptions}
                      ariaLabel="Compare shutter speed"
                    />
                  )}
                </form.Field>
                <form.Field name="compareIso">
                  {(field) => (
                    <Select
                      label="ISO"
                      selectedValue={isoToKey(field.state.value)}
                      onValueChange={(v) => field.handleChange(keyToISO(v))}
                      items={isoOptions}
                      ariaLabel="Compare ISO"
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {comparison.isValid && (
              <div className="space-y-3 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CalculatorStat
                    label="Stops difference"
                    value={`${comparison.stopsDifference > 0 ? '+' : ''}${comparison.stopsDifference}`}
                    helperText={
                      comparison.stopsDifference > 0
                        ? 'A is darker than B'
                        : comparison.stopsDifference < 0
                          ? 'B is darker than A'
                          : 'Same exposure'
                    }
                    tone="default"
                  />
                  <div className="space-y-2">
                    <ResultRow
                      label="Exposure A"
                      value={`EV ${comparison.evA}`}
                    />
                    <ResultRow
                      label="Exposure B"
                      value={`EV ${comparison.evB}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </CalculatorCard>
        )}
      </form.Subscribe>

      {/* EV Result - mobile only (desktop instance is in results) */}
      <div className="md:hidden">
        <EVResultCard form={form} formValues={formValues} />
      </div>

      {/* EV Presets - collapsible */}
      <CalculatorCard
        title="EV presets"
        description="Select a lighting condition. The calculator adjusts the selected value to match."
        actions={
          <button
            type="button"
            onClick={() => setPresetsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-expanded={presetsOpen}
            aria-label={presetsOpen ? 'Collapse presets' : 'Expand presets'}
          >
            {presetsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        }
      >
        {presetsOpen && (
          <div className="space-y-4">
            <form.Field name="solveFor">
              {(field) => (
                <Select
                  label="When selecting a preset, adjust"
                  selectedValue={field.state.value}
                  onValueChange={(v) => field.handleChange(v as SolveFor)}
                  items={solveForOptions}
                  ariaLabel="Value to solve for"
                />
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EV_PRESETS.map((preset) => (
                <EVPresetButton
                  key={preset.ev}
                  ev={preset.ev}
                  label={preset.label}
                  description={preset.description}
                  onClick={handlePresetClick}
                />
              ))}
            </div>
          </div>
        )}
      </CalculatorCard>
    </CalculatorLayout>
  );
}
