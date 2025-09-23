import { useState, useMemo } from 'react';
import {
  RotateCw,
  RotateCcw,
  Square,
  Share2,
  Save,
  Trash2,
} from 'lucide-react';
// UI Components from @dorkroom/ui package
import {
  LabeledSliderInput,
  TextInput,
  DimensionInputGroup,
  ToggleSwitch,
  Select,
  WarningAlert,
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorStat,
  ShareModal,
  SaveBeforeShareModal,
} from '@dorkroom/ui';
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
  usePresetSharing,
  useUrlPresetLoader,
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

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{ webUrl: string; nativeUrl: string } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);

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

  // Sharing hooks
  const { sharePreset, getSharingUrls, canShareNatively, canCopyToClipboard, isSharing } = usePresetSharing({
    onShareSuccess: (result) => {
      if (result.method === 'clipboard') {
        // Show success toast for clipboard copy
        console.log('Preset link copied to clipboard!');
      } else if (result.method === 'native') {
        setIsShareModalOpen(false);
      }
    },
    onShareError: (error) => {
      console.error('Sharing failed:', error);
    },
  });

  // URL preset loader
  const { loadedPreset, clearLoadedPreset } = useUrlPresetLoader({
    onPresetLoaded: (preset) => {
      applyPreset(preset.settings);
      setPresetName(preset.name);
      console.log(`Preset "${preset.name}" loaded from URL!`);
    },
    onLoadError: (error) => {
      console.error('Failed to load preset from URL:', error);
    },
  });

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

  // Sharing handlers
  const handleShareClick = async () => {
    setIsGeneratingShareUrl(true);

    try {
      // Check if current settings match a saved preset
      const matchedPreset = presets.find(
        (p) => JSON.stringify(p.settings) === JSON.stringify(currentSettings)
      );

      if (matchedPreset) {
        // If it's a saved preset, share it directly
        const urls = getSharingUrls({ name: matchedPreset.name, settings: currentSettings });
        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          console.error('Failed to generate sharing URLs for saved preset');
          // Still open modal to show error state
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else {
        // If not saved, check if user has a preset name already entered
        if (presetName.trim()) {
          // User has entered a name, generate URLs and share directly
          const urls = getSharingUrls({ name: presetName.trim(), settings: currentSettings });
          if (urls) {
            setShareUrls(urls);
            setIsShareModalOpen(true);
          } else {
            console.error('Failed to generate sharing URLs for named settings');
            setShareUrls(null);
            setIsShareModalOpen(true);
          }
        } else {
          // No name entered, open save-before-share modal
          setIsSaveBeforeShareOpen(true);
        }
      }
    } catch (error) {
      console.error('Error during share URL generation:', error);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleSaveAndShare = async (name: string) => {
    setIsGeneratingShareUrl(true);

    try {
      // Create and save the new preset
      const newPreset = {
        id: 'user-' + Date.now(),
        name,
        settings: currentSettings,
      };
      addPreset(newPreset);
      setPresetName(name);
      setSelectedPresetId(newPreset.id);

      // Generate share URLs and open share modal
      const urls = getSharingUrls({ name, settings: currentSettings });
      setIsSaveBeforeShareOpen(false);

      if (urls) {
        setShareUrls(urls);
        setIsShareModalOpen(true);
      } else {
        console.error('Failed to generate sharing URLs after saving preset');
        // Still open modal to show error state
        setShareUrls(null);
        setIsShareModalOpen(true);
      }
    } catch (error) {
      console.error('Error during save and share:', error);
      setIsSaveBeforeShareOpen(false);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleCopyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrls) return;

    try {
      await sharePreset(
        {
          name: presetName || 'Border Calculator Settings',
          settings: currentSettings,
        },
        false // prefer native share
      );
    } catch (error) {
      console.error('Native share failed:', error);
      throw error;
    }
  };

  // If not desktop, use mobile UI
  if (!isDesktop) {
    return <MobileBorderCalculator loadedPresetFromUrl={loadedPreset} clearLoadedPreset={clearLoadedPreset} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Printmaking"
        title="Border Calculator"
        description="Calculate precise easel blade positions for consistent print borders."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          {calculation && (
            <>
              <CalculatorCard
                title="Preview & orientation"
                description="Visualize the paper, borders, and blade setup before you walk to the enlarger."
                accent="violet"
                padding="compact"
              >
                <div className="flex justify-center">
                  <div className="relative">
                    <AnimatedPreview
                      calculation={calculation}
                      showBlades={showBlades}
                      className="max-w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setIsLandscape(!isLandscape)}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <RotateCw className="h-4 w-4" />
                    Flip Paper
                  </button>
                  <button
                    onClick={() => setIsRatioFlipped(!isRatioFlipped)}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <Square className="h-4 w-4" />
                    Flip Ratio
                  </button>
                </div>
                <button
                  onClick={resetToDefaults}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to defaults
                </button>
              </CalculatorCard>

              <CalculatorCard
                title="Blade readings"
                description="Dial these values on your easel for a centered print."
                accent="emerald"
                padding="compact"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <CalculatorStat
                    label="Left blade"
                    value={`${calculation.leftBladeReading.toFixed(2)} in`}
                    className="p-4"
                  />
                  <CalculatorStat
                    label="Right blade"
                    value={`${calculation.rightBladeReading.toFixed(2)} in`}
                    className="p-4"
                  />
                  <CalculatorStat
                    label="Top blade"
                    value={`${calculation.topBladeReading.toFixed(2)} in`}
                    className="p-4"
                  />
                  <CalculatorStat
                    label="Bottom blade"
                    value={`${calculation.bottomBladeReading.toFixed(2)} in`}
                    className="p-4"
                  />
                  <CalculatorStat
                    label="Image size"
                    value={`${calculation.printWidth.toFixed(
                      2
                    )} × ${calculation.printHeight.toFixed(2)} in`}
                    helperText="Final image area within the borders."
                    className="sm:col-span-2 p-4"
                  />
                </div>

                {calculation.isNonStandardPaperSize && (
                  <div className="mt-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-center text-sm text-blue-100">
                    <strong className="font-semibold">
                      Non-standard paper
                    </strong>
                    <br />
                    Position paper in the {calculation.easelSizeLabel} slot all
                    the way to the left.
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
              </CalculatorCard>
            </>
          )}
        </div>

        <div className="space-y-6">
          <CalculatorCard
            title="Presets"
            description="Save, recall, and share the setups you use most often."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  label="Presets"
                  selectedValue={selectedPresetId}
                  onValueChange={handleSelectPreset}
                  items={presetItems}
                  placeholder="Select preset"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShareClick}
                  disabled={isSharing || isGeneratingShareUrl}
                  className="rounded-full border border-white/12 bg-white/5 p-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Share preset"
                >
                  {isGeneratingShareUrl ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsEditingPreset(true)}
                  className="rounded-full border border-white/12 bg-white/5 p-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  title="Edit preset"
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
                  placeholder="Preset name"
                  label="Preset name"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    onClick={savePreset}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={updatePresetHandler}
                    disabled={!selectedPresetId}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Update
                  </button>
                  <button
                    onClick={deletePresetHandler}
                    disabled={!selectedPresetId}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </CalculatorCard>

          <CalculatorCard
            title="Paper setup"
            description="Match the paper size and aspect ratio you're printing on."
          >
            <div className="space-y-5">
              <Select
                label="Aspect ratio"
                selectedValue={aspectRatio}
                onValueChange={setAspectRatio}
                items={ASPECT_RATIOS as SelectItem[]}
                placeholder="Select"
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
                  widthLabel="Width"
                  heightLabel="Height"
                  widthPlaceholder="Width"
                  heightPlaceholder="Height"
                />
              )}

              <Select
                label="Paper size"
                selectedValue={paperSize}
                onValueChange={setPaperSize}
                items={PAPER_SIZES as SelectItem[]}
                placeholder="Select"
              />

              {paperSize === 'custom' && (
                <DimensionInputGroup
                  widthValue={String(customPaperWidth)}
                  onWidthChange={(value) =>
                    setCustomPaperWidth(Number(value) || 0)
                  }
                  heightValue={String(customPaperHeight)}
                  onHeightChange={(value) =>
                    setCustomPaperHeight(Number(value) || 0)
                  }
                  widthLabel="Width (inches)"
                  heightLabel="Height (inches)"
                  widthPlaceholder="Width"
                  heightPlaceholder="Height"
                />
              )}
            </div>
          </CalculatorCard>

          <CalculatorCard
            title="Borders & offsets"
            description="Control the border thickness and fine-tune print placement."
          >
            <div className="space-y-5">
              <LabeledSliderInput
                label="Minimum border (inches)"
                value={minBorder}
                onChange={setMinBorder}
                onSliderChange={setMinBorderSlider}
                min={SLIDER_MIN_BORDER}
                max={SLIDER_MAX_BORDER}
                step={SLIDER_STEP_BORDER}
                labels={BORDER_SLIDER_LABELS}
                continuousUpdate
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <ToggleSwitch
                  label="Enable offsets"
                  value={enableOffset}
                  onValueChange={setEnableOffset}
                />
                <ToggleSwitch
                  label="Show easel blades"
                  value={showBlades}
                  onValueChange={setShowBlades}
                />
              </div>

              {enableOffset && (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <ToggleSwitch
                    label="Ignore min border"
                    value={ignoreMinBorder}
                    onValueChange={setIgnoreMinBorder}
                  />
                  {ignoreMinBorder && (
                    <p className="text-sm text-white/70">
                      Print can be positioned freely but will stay within the
                      paper edges.
                    </p>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledSliderInput
                      label="Horizontal offset"
                      value={horizontalOffset}
                      onChange={setHorizontalOffset}
                      onSliderChange={setHorizontalOffsetSlider}
                      min={OFFSET_SLIDER_MIN}
                      max={OFFSET_SLIDER_MAX}
                      step={OFFSET_SLIDER_STEP}
                      labels={OFFSET_SLIDER_LABELS}
                      warning={!!offsetWarning}
                      continuousUpdate
                    />
                    <LabeledSliderInput
                      label="Vertical offset"
                      value={verticalOffset}
                      onChange={setVerticalOffset}
                      onSliderChange={setVerticalOffsetSlider}
                      min={OFFSET_SLIDER_MIN}
                      max={OFFSET_SLIDER_MAX}
                      step={OFFSET_SLIDER_STEP}
                      labels={OFFSET_SLIDER_LABELS}
                      warning={!!offsetWarning}
                      continuousUpdate
                    />
                  </div>

                  {offsetWarning && (
                    <WarningAlert message={offsetWarning} action="warning" />
                  )}
                </div>
              )}
            </div>
          </CalculatorCard>
        </div>
      </div>

      <BorderInfoSection />

      {/* Sharing Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        presetName={presetName || 'Border Calculator Settings'}
        webUrl={shareUrls?.webUrl || ''}
        nativeUrl={shareUrls?.nativeUrl}
        onCopyToClipboard={handleCopyToClipboard}
        onNativeShare={canShareNatively ? handleNativeShare : undefined}
        canShareNatively={canShareNatively}
        canCopyToClipboard={canCopyToClipboard}
      />

      <SaveBeforeShareModal
        isOpen={isSaveBeforeShareOpen}
        onClose={() => setIsSaveBeforeShareOpen(false)}
        onSaveAndShare={handleSaveAndShare}
        isLoading={isSharing || isGeneratingShareUrl}
      />
    </div>
  );
}
