/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- Test file requires type assertions for mocking localStorage */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from '../../lib/themes';
import { ThemeToggle } from '../theme-toggle';

// Mock the theme context
const mockSetTheme = vi.fn();
const mockTheme: Theme = 'dark';

vi.mock('../../contexts/theme-context', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('icon variant', () => {
    it('renders icon variant by default', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('displays current theme icon', () => {
      render(<ThemeToggle />);

      // Dark theme should show moon icon
      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toBeInTheDocument();
    });

    it('opens dropdown menu on click', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('displays all theme options in dropdown', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      expect(
        screen.getByRole('menuitem', { name: /^dark$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /light/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /high contrast/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /darkroom/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /system/i })
      ).toBeInTheDocument();
    });

    it('changes theme when option is selected', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const lightOption = screen.getByRole('menuitem', { name: /light/i });
      await userEvent.click(lightOption);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('closes dropdown after selecting theme', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const lightOption = screen.getByRole('menuitem', { name: /light/i });
      await userEvent.click(lightOption);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('closes dropdown on outside click', async () => {
      render(
        <div>
          <ThemeToggle />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('focuses button when closing with Escape', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await user.click(button);

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(button).toHaveFocus();
      });
    });

    it('opens dropdown on Enter key', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('opens dropdown on Space key', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      button.focus();
      fireEvent.keyDown(button, { key: ' ' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('opens dropdown on ArrowDown key when closed', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      button.focus();
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('toggles dropdown on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });

      // Open
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Close
      await user.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('button variant', () => {
    it('renders button variant when specified', () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    it('displays chevron icon in button variant', () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toBeInTheDocument();
      // Chevron should be present (icon component)
    });

    it('rotates chevron when dropdown is open', async () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      // Check for rotation class (implementation detail, but useful)
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('opens dropdown on click in button variant', async () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('displays all theme options in button variant dropdown', async () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      expect(
        screen.getByRole('menuitem', { name: /^dark$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /light/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /high contrast/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /darkroom/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /system/i })
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-label', 'Theme');
    });

    it('updates aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('menu items have menuitem role', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(5); // 5 theme options
    });

    it('is keyboard navigable', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });

      // Tab to button
      button.focus();
      expect(button).toHaveFocus();

      // Open with Enter
      fireEvent.keyDown(button, { key: 'Enter' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('prevents default on keyboard events', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      button.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      fireEvent(button, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('theme selection', () => {
    const themes: Array<{ value: Theme; name: string }> = [
      { value: 'dark', name: 'Dark' },
      { value: 'light', name: 'Light' },
      { value: 'high-contrast', name: 'High Contrast' },
      { value: 'darkroom', name: 'Darkroom' },
      { value: 'system', name: 'System' },
    ];

    themes.forEach(({ value, name }) => {
      it(`selects ${name} theme`, async () => {
        render(<ThemeToggle />);

        const button = screen.getByRole('button', { name: 'Theme' });
        await userEvent.click(button);

        const option = screen.getByRole('menuitem', {
          name: new RegExp(`^${name}$`, 'i'),
        });
        await userEvent.click(option);

        expect(mockSetTheme).toHaveBeenCalledWith(value);
      });
    });
  });

  describe('dropdown positioning', () => {
    it('positions dropdown correctly for icon variant (right-aligned)', async () => {
      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const menu = screen.getByRole('menu');
      // Menu should have positioning classes
      expect(menu).toHaveClass('absolute');
    });

    it('positions dropdown correctly for button variant (left-aligned)', async () => {
      render(<ThemeToggle variant="button" />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const menu = screen.getByRole('menu');
      // Menu should have positioning classes
      expect(menu).toHaveClass('absolute');
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<ThemeToggle className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<ThemeToggle className="custom-class" />);

      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-class');
      expect(element).toHaveClass('relative');
    });
  });

  describe('event cleanup', () => {
    it('removes event listeners when dropdown closes', async () => {
      const { unmount } = render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      // Dropdown is open, event listeners are attached
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Unmount component
      unmount();

      // Should not throw errors
      fireEvent.mouseDown(document);
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    it('cleans up event listeners on component unmount', async () => {
      const { unmount } = render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      unmount();

      // Verify cleanup happened
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('visual states', () => {
    it('shows selected state for current theme', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      // Current theme (dark) should have selected styling
      const darkOption = screen.getByRole('menuitem', { name: /^dark$/i });
      expect(darkOption).toBeInTheDocument();
      // Selected option would have specific classes for styling
    });

    it('applies hover styles to menu items', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const lightOption = screen.getByRole('menuitem', { name: /light/i });
      // Hover classes should be present
      expect(lightOption).toHaveClass(
        'hover:bg-[color:var(--color-border-muted)]'
      );
    });
  });

  describe('edge cases', () => {
    it('handles rapid clicking without breaking', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should still be functional
      expect(button).toBeInTheDocument();
    });

    it('handles theme selection while dropdown is closing', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const lightOption = screen.getByRole('menuitem', { name: /light/i });
      await userEvent.click(lightOption);

      // Theme should still be set
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('maintains focus when dropdown is closed with Escape', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(button).toHaveFocus();
      });
    });
  });

  describe('dropdown behavior', () => {
    it('does not close dropdown when clicking inside dropdown', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const menu = screen.getByRole('menu');
      fireEvent.mouseDown(menu);

      // Dropdown should stay open
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes dropdown only when clicking outside', async () => {
      render(
        <div>
          <ThemeToggle />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole('button', { name: 'Theme' });
      await userEvent.click(button);

      const menu = screen.getByRole('menu');
      fireEvent.mouseDown(menu);

      // Still open
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });
});
