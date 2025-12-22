import {
  SettingsButton,
  ToggleSwitch,
  useMeasurement,
  useTheme,
} from '@dorkroom/ui';
import {
  Camera,
  Contrast,
  Globe,
  Monitor,
  Moon,
  Ruler,
  Sun,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, animationsEnabled, setAnimationsEnabled } =
    useTheme();
  const { unit, setUnit } = useMeasurement();

  const showAnimations = theme !== 'high-contrast' && theme !== 'darkroom';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div
        className="rounded-2xl border p-5 sm:p-6 lg:p-8"
        style={{
          backgroundColor: 'var(--settings-container-bg)',
          borderColor: 'var(--settings-container-border)',
        }}
      >
        {/* Header */}
        <div className="mb-8 lg:mb-10">
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Settings
          </h1>
          <p
            className="mt-2 text-sm sm:mt-3 sm:text-base"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Customize your Dorkroom experience with these preferences.
          </p>
        </div>

        {/* Responsive grid layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Theme Settings - takes full width on larger screens when it's the main section */}
          <section className="lg:col-span-2 xl:col-span-1">
            <h2
              className="mb-4 text-lg font-semibold sm:mb-5 sm:text-xl"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Theme
            </h2>
            <div className="space-y-3">
              {/* System theme - full width */}
              <SettingsButton
                label="System"
                value="Follow system preference (chaotic neutral)"
                onPress={() => setTheme('system')}
                icon={Monitor}
                iconClassName="h-[22px] w-[22px]"
                showChevron={false}
                isSelected={theme === 'system'}
              />

              {/* Other themes - 2 column grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SettingsButton
                  label="Dark"
                  value="The correct choice."
                  onPress={() => setTheme('dark')}
                  icon={Moon}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={theme === 'dark'}
                />
                <SettingsButton
                  label="Light"
                  value="Honestly, why would you want to do this? It's a darkroom app!"
                  onPress={() => setTheme('light')}
                  icon={Sun}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={theme === 'light'}
                />
                <SettingsButton
                  label="High Contrast"
                  value="Ideal for e-ink devices. Black on white, no gradients, no motion"
                  onPress={() => setTheme('high-contrast')}
                  icon={Contrast}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={theme === 'high-contrast'}
                />
                <SettingsButton
                  label="Darkroom"
                  value="Pure black with red accents - the authentic darkroom experience"
                  onPress={() => setTheme('darkroom')}
                  icon={Camera}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={theme === 'darkroom'}
                />
              </div>
            </div>
          </section>

          {/* Right column - Animations & Units */}
          <div className="flex flex-col gap-8 xl:col-span-1">
            {/* Animations Settings */}
            {showAnimations && (
              <section>
                <h2
                  className="mb-4 text-lg font-semibold sm:mb-5 sm:text-xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Animations
                </h2>
                <div
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: 'var(--color-border-secondary)',
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                  }}
                >
                  <ToggleSwitch
                    label="Enable Animations"
                    value={animationsEnabled}
                    onValueChange={setAnimationsEnabled}
                  />
                </div>
              </section>
            )}

            {/* Units Settings */}
            <section>
              <h2
                className="mb-4 text-lg font-semibold sm:mb-5 sm:text-xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Default Units
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SettingsButton
                  label="Imperial 🇺🇸"
                  value="Inches, feet"
                  onPress={() => setUnit('imperial')}
                  icon={Ruler}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={unit === 'imperial'}
                />
                <SettingsButton
                  label="Metric 🌍"
                  value="Millimeters, centimeters"
                  onPress={() => setUnit('metric')}
                  icon={Globe}
                  iconClassName="h-[22px] w-[22px]"
                  showChevron={false}
                  isSelected={unit === 'metric'}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
