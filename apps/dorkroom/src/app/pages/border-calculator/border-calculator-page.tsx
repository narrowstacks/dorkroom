import { useState, useMemo } from 'react';
import {
  RotateCw,
  RotateCcw,
  Square,
  Share2,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/cn';

// Components
import { LabeledSliderInput } from '../../components/ui/labeled-slider-input';
import { TextInput } from '../../components/ui/text-input';
import { DimensionInputGroup } from '../../components/ui/dimension-input-group';
import { ToggleSwitch } from '../../components/ui/toggle-switch';
import { Select } from '../../components/ui/select';
import { WarningAlert } from '../../components/ui/warning-alert';
import { ResultRow } from '../../components/ui/result-row';
import {
  AnimatedPreview,
  BorderInfoSection,
  MobileBorderCalculator,
} from '../../components/border-calculator';

// Constants and hooks
import {
  useModularBorderCalculator as useBorderCalculator,
  useBorderPresets,
  useWindowDimensions,
  type SelectItem,
  DESKTOP_BREAKPOINT,
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
  ASPECT_RATIOS,
  PAPER_SIZES,
  DEFAULT_BORDER_PRESETS,
} from '@dorkroom/logic';

export default function BorderCalculatorPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width > DESKTOP_BREAKPOINT;

  const {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    customAspectWidth,
    setCustomAspectWidth,
    customAspectHeight,
    setCustomAspectHeight,
    customPaperWidth,
    setCustomPaperWidth,
    customPaperHeight,
    setCustomPaperHeight,
    minBorder,
    setMinBorder,
    setMinBorderSlider,
    enableOffset,
    setEnableOffset,
    ignoreMinBorder,
    setIgnoreMinBorder,
    horizontalOffset,
    setHorizontalOffset,
    setHorizontalOffsetSlider,
    verticalOffset,
    setVerticalOffset,
    setVerticalOffsetSlider,
    showBlades,
    setShowBlades,
    isLandscape,
    setIsLandscape,
    isRatioFlipped,
    setIsRatioFlipped,
    offsetWarning,
    bladeWarning,
    calculation,
    minBorderWarning,
    paperSizeWarning,
    resetToDefaults,
    applyPreset,
  } = useBorderCalculator();

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [isEditingPreset, setIsEditingPreset] = useState(false);

  const currentSettings = useMemo(
    () => ({
      aspectRatio,
      paperSize,
      customAspectWidth,
      customAspectHeight,
      customPaperWidth,
      customPaperHeight,
      minBorder,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset,
      verticalOffset,
      showBlades,
      isLandscape,
      isRatioFlipped,
    }),
    [
      aspectRatio,
      paperSize,
      customAspectWidth,
      customAspectHeight,
      customPaperWidth,
      customPaperHeight,
      minBorder,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset,
      verticalOffset,
      showBlades,
      isLandscape,
      isRatioFlipped,
    ]
  );

  const presetItems = useMemo(
    () => [
      ...presets.map((p) => ({ label: p.name, value: p.id })),
      { label: '────────', value: '__divider__' },
      ...DEFAULT_BORDER_PRESETS.map((p) => ({ label: p.name, value: p.id })),
    ],
    [presets]
  );

  const handleSelectPreset = (id: string) => {
    if (id === '__divider__') return;
    setSelectedPresetId(id);
    const preset =
      presets.find((p) => p.id === id) ||
      DEFAULT_BORDER_PRESETS.find((p) => p.id === id);
    if (preset) {
      applyPreset(preset.settings);
      setPresetName(preset.name);
      setIsEditingPreset(false);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: 'user-' + Date.now(),
      name: presetName.trim(),
      settings: currentSettings,
    };
    addPreset(newPreset);
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
  };

  const updatePresetHandler = () => {
    if (!selectedPresetId) return;
    const updated = { name: presetName.trim(), settings: currentSettings };
    updatePreset(selectedPresetId, updated);
    setIsEditingPreset(false);
  };

  const deletePresetHandler = () => {
    if (!selectedPresetId) return;
    removePreset(selectedPresetId);
    setSelectedPresetId('');
    setPresetName('');
    setIsEditingPreset(false);
  };

  // If not desktop, use mobile UI
  if (!isDesktop) {
    return <MobileBorderCalculator />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Border Calculator
        </h1>
        <p className="mt-3 text-base text-zinc-300">
          Calculate precise easel blade positions for consistent print borders
        </p>
      </div>

      <div
        className={cn('gap-8', isDesktop ? 'grid grid-cols-2' : 'space-y-8')}
      >
        {calculation && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <AnimatedPreview
                  calculation={calculation}
                  showBlades={showBlades}
                  className="max-w-full"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsLandscape(!isLandscape)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <RotateCw className="h-4 w-4" />
                Flip Paper
              </button>
              <button
                onClick={() => setIsRatioFlipped(!isRatioFlipped)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Square className="h-4 w-4" />
                Flip Ratio
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Blade Readings
              </h3>
              <div className="space-y-2">
                <ResultRow
                  label="Image Dimensions:"
                  value={`${calculation.printWidth.toFixed(
                    2
                  )} × ${calculation.printHeight.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Left Blade:"
                  value={`${calculation.leftBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Right Blade:"
                  value={`${calculation.rightBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Top Blade:"
                  value={`${calculation.topBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Bottom Blade:"
                  value={`${calculation.bottomBladeReading.toFixed(2)} inches`}
                />
              </div>

              <button
                onClick={resetToDefaults}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>

              {calculation.isNonStandardPaperSize && (
                <div className="mt-4 rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                  <p className="text-center text-sm text-blue-200">
                    <strong>Non-Standard Paper Size</strong>
                    <br />
                    Position paper in the {calculation.easelSizeLabel} slot all
                    the way to the left.
                  </p>
                </div>
              )}

              {bladeWarning && (
                <div className="mt-4">
                  <WarningAlert message={bladeWarning} action="error" />
                </div>
              )}
              {minBorderWarning && (
                <div className="mt-4">
                  <WarningAlert message={minBorderWarning} action="error" />
                </div>
              )}
              {paperSizeWarning && (
                <div className="mt-4">
                  <WarningAlert message={paperSizeWarning} action="warning" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  label="Presets:"
                  selectedValue={selectedPresetId}
                  onValueChange={handleSelectPreset}
                  items={presetItems}
                  placeholder="Select Preset"
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Share Preset"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditingPreset(true)}
                  className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Edit Preset"
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isEditingPreset && (
              <div className="space-y-3">
                <TextInput
                  value={presetName}
                  onValueChange={setPresetName}
                  placeholder="Preset Name"
                  label="Preset Name"
                />
                <div className="flex gap-2">
                  <button
                    onClick={savePreset}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={updatePresetHandler}
                    disabled={!selectedPresetId}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    Update
                  </button>
                  <button
                    onClick={deletePresetHandler}
                    disabled={!selectedPresetId}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <Select
            label="Aspect Ratio:"
            selectedValue={aspectRatio}
            onValueChange={setAspectRatio}
            items={ASPECT_RATIOS as SelectItem[]}
            placeholder="Select Aspect Ratio"
          />

          {aspectRatio === 'custom' && (
            <DimensionInputGroup
              widthValue={String(customAspectWidth)}
              onWidthChange={(value) =>
                setCustomAspectWidth(Number(value) || 0)
              }
              heightValue={String(customAspectHeight)}
              onHeightChange={(value) =>
                setCustomAspectHeight(Number(value) || 0)
              }
              widthLabel="Width:"
              heightLabel="Height:"
              widthPlaceholder="Width"
              heightPlaceholder="Height"
            />
          )}

          <Select
            label="Paper Size:"
            selectedValue={paperSize}
            onValueChange={setPaperSize}
            items={PAPER_SIZES as SelectItem[]}
            placeholder="Select Paper Size"
          />

          {paperSize === 'custom' && (
            <DimensionInputGroup
              widthValue={String(customPaperWidth)}
              onWidthChange={(value) => setCustomPaperWidth(Number(value) || 0)}
              heightValue={String(customPaperHeight)}
              onHeightChange={(value) =>
                setCustomPaperHeight(Number(value) || 0)
              }
              widthLabel="Width (inches):"
              heightLabel="Height (inches):"
              widthPlaceholder="Width"
              heightPlaceholder="Height"
            />
          )}

          <LabeledSliderInput
            label="Minimum Border (inches):"
            value={minBorder}
            onChange={setMinBorder}
            onSliderChange={setMinBorderSlider}
            min={SLIDER_MIN_BORDER}
            max={SLIDER_MAX_BORDER}
            step={SLIDER_STEP_BORDER}
            labels={BORDER_SLIDER_LABELS}
            continuousUpdate={true}
          />

          <div className="flex gap-6">
            <ToggleSwitch
              label="Enable Offsets"
              value={enableOffset}
              onValueChange={setEnableOffset}
            />
            <ToggleSwitch
              label="Show Easel Blades"
              value={showBlades}
              onValueChange={setShowBlades}
            />
          </div>

          {enableOffset && (
            <div className="space-y-4">
              <ToggleSwitch
                label="Ignore Min Border"
                value={ignoreMinBorder}
                onValueChange={setIgnoreMinBorder}
              />
              {ignoreMinBorder && (
                <p className="text-sm text-white/70">
                  Print can be positioned freely but will stay within paper
                  edges
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabeledSliderInput
                  label="Horizontal Offset:"
                  value={horizontalOffset}
                  onChange={setHorizontalOffset}
                  onSliderChange={setHorizontalOffsetSlider}
                  min={OFFSET_SLIDER_MIN}
                  max={OFFSET_SLIDER_MAX}
                  step={OFFSET_SLIDER_STEP}
                  labels={OFFSET_SLIDER_LABELS}
                  warning={!!offsetWarning}
                  continuousUpdate={true}
                />
                <LabeledSliderInput
                  label="Vertical Offset:"
                  value={verticalOffset}
                  onChange={setVerticalOffset}
                  onSliderChange={setVerticalOffsetSlider}
                  min={OFFSET_SLIDER_MIN}
                  max={OFFSET_SLIDER_MAX}
                  step={OFFSET_SLIDER_STEP}
                  labels={OFFSET_SLIDER_LABELS}
                  warning={!!offsetWarning}
                  continuousUpdate={true}
                />
              </div>

              {offsetWarning && (
                <WarningAlert message={offsetWarning} action="warning" />
              )}
            </div>
          )}
        </div>
      </div>

      <BorderInfoSection />
    </div>
  );
}
