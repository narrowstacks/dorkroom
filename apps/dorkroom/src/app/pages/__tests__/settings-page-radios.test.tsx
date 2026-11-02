import '@testing-library/jest-dom/vitest';
import {
  MeasurementProvider,
  SettingsButton,
  SettingsRadioGroup,
  ThemeProvider,
} from '@dorkroom/ui';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../settings-page';

function renderSettings() {
  render(
    <ThemeProvider>
      <MeasurementProvider>
        <SettingsPage />
      </MeasurementProvider>
    </ThemeProvider>
  );
}

const themeGroup = () => screen.getByRole('radiogroup', { name: 'Theme' });
const unitsGroup = () =>
  screen.getByRole('radiogroup', { name: 'Default Units' });
const checked = (group: HTMLElement) =>
  within(group)
    .getAllByRole('radio')
    .filter((r) => r.getAttribute('aria-checked') === 'true');

describe('SettingsPage single-choice groups', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('exposes named radiogroups with radios', () => {
    renderSettings();
    expect(within(themeGroup()).getAllByRole('radio')).toHaveLength(5);
    expect(within(unitsGroup()).getAllByRole('radio')).toHaveLength(2);
  });

  it('marks exactly one radio checked per group and follows clicks', async () => {
    const user = userEvent.setup();
    renderSettings();
    expect(checked(themeGroup())).toHaveLength(1);
    expect(checked(unitsGroup())).toHaveLength(1);

    await user.click(
      within(themeGroup()).getByRole('radio', { name: /Light/ })
    );
    expect(checked(themeGroup())).toHaveLength(1);
    expect(checked(themeGroup())[0]).toHaveAccessibleName(/Light/);

    await user.click(
      within(unitsGroup()).getByRole('radio', { name: /Metric/ })
    );
    expect(checked(unitsGroup())[0]).toHaveAccessibleName(/Metric/);
  });

  it('has one tab stop per group, on the checked radio', () => {
    renderSettings();
    for (const group of [themeGroup(), unitsGroup()]) {
      const stops = within(group)
        .getAllByRole('radio')
        .filter((r) => r.tabIndex === 0);
      expect(stops).toEqual(checked(group));
    }
  });

  it('moves and selects with arrow keys, wrapping and Home/End', async () => {
    const user = userEvent.setup();
    renderSettings();
    const units = within(unitsGroup()).getAllByRole('radio');
    const selected = checked(unitsGroup())[0];
    selected.focus();
    const other = units.find((r) => r !== selected);

    await user.keyboard('{ArrowRight}');
    expect(other).toHaveFocus();
    expect(checked(unitsGroup())).toEqual([other]);
    expect(other?.tabIndex).toBe(0);
    expect(selected.tabIndex).toBe(-1);

    await user.keyboard('{ArrowRight}');
    expect(selected).toHaveFocus();
    expect(checked(unitsGroup())).toEqual([selected]);

    await user.keyboard('{ArrowUp}');
    expect(other).toHaveFocus();

    const themes = within(themeGroup()).getAllByRole('radio');
    themes[0].focus();
    await user.keyboard('{End}');
    expect(themes[4]).toHaveFocus();
    expect(checked(themeGroup())).toEqual([themes[4]]);
    await user.keyboard('{Home}');
    expect(checked(themeGroup())).toEqual([themes[0]]);
  });

  it('persists the theme once per arrow keypress', async () => {
    const user = userEvent.setup();
    renderSettings();
    const themes = within(themeGroup()).getAllByRole('radio');
    themes[0].focus();
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    setItem.mockClear();
    await user.keyboard('{ArrowRight}');
    const themeWrites = () =>
      setItem.mock.calls.filter(([key]) => key === 'dorkroom-theme');
    expect(themeWrites()).toHaveLength(1);
    await user.keyboard('{ArrowRight}');
    expect(themeWrites()).toHaveLength(2);
    setItem.mockRestore();
  });

  it('ignores arrow keys with Alt held', async () => {
    const user = userEvent.setup();
    renderSettings();
    const before = checked(themeGroup())[0];
    before.focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(checked(themeGroup())).toEqual([before]);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    before.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('names a radio by its label and describes it with the value', () => {
    renderSettings();
    const dark = within(themeGroup()).getByRole('radio', { name: 'Dark' });
    expect(dark).toHaveAccessibleDescription('The correct choice.');
    expect(
      within(unitsGroup()).getByRole('radio', { name: 'Imperial' })
    ).toBeInTheDocument();
  });

  it('keeps a tab stop when nothing is checked', () => {
    render(
      <SettingsRadioGroup labelledBy="x">
        <SettingsButton asRadio label="A" onPress={vi.fn()} />
        <SettingsButton asRadio label="B" onPress={vi.fn()} />
      </SettingsRadioGroup>
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1]);
  });

  it('calls onPress once per arrow keypress', async () => {
    const user = userEvent.setup();
    const onA = vi.fn();
    const onB = vi.fn();
    render(
      <SettingsRadioGroup labelledBy="x">
        <SettingsButton asRadio isSelected label="A" onPress={onA} />
        <SettingsButton asRadio label="B" onPress={onB} />
      </SettingsRadioGroup>
    );
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onA).not.toHaveBeenCalled();
  });

  it('keeps the e-ink note without radios', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(monochrome)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    renderSettings();
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).toBeNull();
    expect(
      screen.getByText('High contrast is used on e-ink screens.')
    ).toBeInTheDocument();
    expect(unitsGroup()).toBeInTheDocument();
  });
});
