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
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Settings
        </h1>
        <p
          className="mt-3 text-base"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Customize your Dorkroom experience with these preferences.
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Settings */}
        <section>
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Theme
          </h2>
          <div className="space-y-3">
            <SettingsButton
              label="Dark"
              value="The correct choice."
              onPress={() => setTheme('dark')}
              icon={Moon}
              showChevron={false}
              isSelected={theme === 'dark'}
            />
            <SettingsButton
              label="Light"
              value="Honestly, why would you want to do this? It's a darkroom app!"
              onPress={() => setTheme('light')}
              icon={Sun}
              showChevron={false}
              isSelected={theme === 'light'}
            />
            <SettingsButton
              label="High Contrast"
              value="Ideal for e-ink devices. Black on white, no gradients, no motion"
              onPress={() => setTheme('high-contrast')}
              icon={Contrast}
              showChevron={false}
              isSelected={theme === 'high-contrast'}
            />
            <SettingsButton
              label="Darkroom"
              value="Pure black with red accents - the authentic darkroom experience"
              onPress={() => setTheme('darkroom')}
              icon={Camera}
              showChevron={false}
              isSelected={theme === 'darkroom'}
            />
            <SettingsButton
              label="System"
              value="Follow system preference (chaotic neutral)"
              onPress={() => setTheme('system')}
              icon={Monitor}
              showChevron={false}
              isSelected={theme === 'system'}
            />
          </div>
        </section>

        {/* Animations Settings */}
        {theme !== 'high-contrast' && theme !== 'darkroom' && (
          <section>
            <h2
              className="mb-4 text-lg font-semibold"
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
            className="mb-4 text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Default Units
          </h2>
          <div className="space-y-3">
            <SettingsButton
              label="Imperial 🇺🇸"
              value="Inches, feet"
              onPress={() => setUnit('imperial')}
              icon={Ruler}
              showChevron={false}
              isSelected={unit === 'imperial'}
            />
            <SettingsButton
              label="Metric 🌍"
              value="Millimeters, centimeters"
              onPress={() => setUnit('metric')}
              icon={Globe}
              showChevron={false}
              isSelected={unit === 'metric'}
            />
          </div>
        </section>

        {/* Future Settings Placeholder */}
        <section>
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Additional Settings
          </h2>
          <div
            className="rounded-lg border p-6 text-center"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              More customization options will be available here in future
              updates.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
