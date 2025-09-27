import { Moon, Sun, Monitor, Ruler, Globe, Camera } from 'lucide-react';
import { SettingsButton } from '@dorkroom/ui';
import { useTheme } from '../contexts/theme-context';

/**
 * Render the Settings page that lets users view and change theme and unit preferences.
 *
 * The component reads the current theme from theme context and updates it when a theme
 * option is selected. Unit selection buttons are present as placeholders and currently
 * only log messages rather than persisting a choice. Also includes a placeholder section
 * for future additional settings.
 *
 * @returns A JSX element containing the settings UI
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
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
              value="Inches, feet (current)"
              onPress={() => console.log('Imperial units not implemented yet')}
              icon={Ruler}
              showChevron={false}
            />
            <SettingsButton
              label="Metric 🌍"
              value="Millimeters, centimeters"
              onPress={() => console.log('Metric units not implemented yet')}
              icon={Globe}
              showChevron={false}
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
