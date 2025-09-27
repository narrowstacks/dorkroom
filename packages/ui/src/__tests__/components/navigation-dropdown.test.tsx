import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Home, Settings, Users } from 'lucide-react';
import {
  NavigationDropdown,
  NavigationItem,
} from '../../components/navigation-dropdown';

describe('NavigationDropdown', () => {
  const mockNavigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: Home,
      summary: 'View your dashboard',
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
      summary: 'Configure your preferences',
    },
    {
      label: 'Users',
      to: '/users',
      icon: Users,
      summary: 'Manage user accounts',
    },
  ];

  const defaultProps = {
    label: 'Menu',
    icon: Home,
    items: mockNavigationItems,
    currentPath: '/dashboard',
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dropdown button with label and icon', () => {
    render(<NavigationDropdown {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', async () => {
    render(<NavigationDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('hides dropdown when clicked outside', async () => {
    render(<NavigationDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('calls onNavigate when menu item is clicked', async () => {
    const onNavigate = vi.fn();
    render(<NavigationDropdown {...defaultProps} onNavigate={onNavigate} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const settingsItem = screen.getByText('Settings');
    fireEvent.click(settingsItem);

    expect(onNavigate).toHaveBeenCalledWith('/settings');
  });

  it('closes dropdown after navigation', async () => {
    const onNavigate = vi.fn();
    render(<NavigationDropdown {...defaultProps} onNavigate={onNavigate} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const settingsItem = screen.getByText('Settings');
    fireEvent.click(settingsItem);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('keyboard interactions', () => {
    it('opens dropdown with Enter key', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('opens dropdown with Space key', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('opens dropdown with ArrowDown key', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('closes dropdown with Escape key', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('active state', () => {
    it('shows active state when current path matches an item', () => {
      render(<NavigationDropdown {...defaultProps} currentPath="/dashboard" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-[color:var(--color-text-primary)]');
    });

    it('does not show active state when current path does not match', () => {
      render(<NavigationDropdown {...defaultProps} currentPath="/other" />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-[color:var(--color-text-primary)]');
    });

    it('highlights active menu item', async () => {
      render(<NavigationDropdown {...defaultProps} currentPath="/settings" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const settingsButton = screen.getByRole('menuitem', { name: /Settings/ });
      expect(settingsButton).toHaveClass(
        'bg-[color:var(--color-text-primary)]'
      );
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('updates aria-expanded when dropdown opens', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper menu role', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('has proper menuitem roles', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByRole('menuitem')).toHaveLength(3);
      });
    });
  });

  describe('visual feedback', () => {
    it('rotates chevron when dropdown is open', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      const chevron = button.querySelector('.rotate-180');
      expect(chevron).not.toBeInTheDocument();

      fireEvent.click(button);

      await waitFor(() => {
        const rotatedChevron = button.querySelector('.rotate-180');
        expect(rotatedChevron).toBeInTheDocument();
      });
    });

    it('renders item summaries', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('View your dashboard')).toBeInTheDocument();
        expect(
          screen.getByText('Configure your preferences')
        ).toBeInTheDocument();
        expect(screen.getByText('Manage user accounts')).toBeInTheDocument();
      });
    });

    it('renders item icons', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        const icons = menu.querySelectorAll('svg');
        expect(icons).toHaveLength(3); // One icon per menu item
      });
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      render(
        <NavigationDropdown {...defaultProps} className="custom-dropdown" />
      );

      const container = screen.getByRole('button').closest('div');
      expect(container).toHaveClass('custom-dropdown');
    });
  });

  describe('component structure', () => {
    it('renders all navigation items', async () => {
      render(<NavigationDropdown {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        mockNavigationItems.forEach((item) => {
          expect(screen.getByText(item.label)).toBeInTheDocument();
          expect(screen.getByText(item.summary)).toBeInTheDocument();
        });
      });
    });

    it('handles empty items array', () => {
      render(<NavigationDropdown {...defaultProps} items={[]} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should render empty dropdown
      expect(screen.queryByRole('menu')).toBeInTheDocument();
    });
  });
});
