import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileSidebar } from '../../components/mobile-sidebar';

// Mock the theme context (required by ThemeToggle)
vi.mock('../../contexts/theme-context', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

describe('MobileSidebar', () => {
  const defaultProps = {
    pathname: '/',
    onNavigate: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the navigation landmark', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(
        screen.getByRole('navigation', { name: 'Main navigation' })
      ).toBeInTheDocument();
    });

    it('renders all route nav items', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Border')).toBeInTheDocument();
      expect(screen.getByText('Resize')).toBeInTheDocument();
      expect(screen.getByText('Stops')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Reciprocity')).toBeInTheDocument();
      expect(screen.getByText('Lenses')).toBeInTheDocument();
      expect(screen.getByText('Exposure')).toBeInTheDocument();
      expect(screen.getByText('Films')).toBeInTheDocument();
      expect(screen.getByText('Docs')).toBeInTheDocument();
    });

    it('renders external link items', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Newsletter')).toBeInTheDocument();
    });

    it('renders section headers', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(screen.getByText('Printing')).toBeInTheDocument();
      expect(screen.getByText('Film')).toBeInTheDocument();
      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('Reference')).toBeInTheDocument();
    });

    it('renders footer with Theme and Settings buttons', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Change theme' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    it('does not render Theme or Settings in the main nav area', () => {
      render(<MobileSidebar {...defaultProps} />);

      const nav = screen.getByRole('navigation', { name: 'Main navigation' });
      // Settings button exists in footer, not inside <nav>
      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(nav.contains(settingsButton)).toBe(false);
    });
  });

  describe('navigation', () => {
    it('calls onNavigate and onClose when a route item is clicked', () => {
      const onNavigate = vi.fn();
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByText('Border'));

      expect(onNavigate).toHaveBeenCalledWith('/border');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when an external link is clicked', () => {
      const onClose = vi.fn();
      render(<MobileSidebar {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('GitHub'));

      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onNavigate for external links', () => {
      const onNavigate = vi.fn();
      render(<MobileSidebar {...defaultProps} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByText('GitHub'));

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('renders external links with target="_blank"', () => {
      render(<MobileSidebar {...defaultProps} />);

      const githubLink = screen.getByText('GitHub').closest('a');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noreferrer');
    });
  });

  describe('Settings footer button', () => {
    it('calls onNavigate with /settings and onClose when clicked', () => {
      const onNavigate = vi.fn();
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

      expect(onNavigate).toHaveBeenCalledWith('/settings');
      expect(onClose).toHaveBeenCalled();
    });

    it('shows active state when on /settings', () => {
      render(<MobileSidebar {...defaultProps} pathname="/settings" />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(settingsButton).toHaveAttribute('aria-current', 'page');
      expect(settingsButton).toHaveClass(
        'bg-[color:var(--color-text-primary)]'
      );
    });

    it('does not show active state on other routes', () => {
      render(<MobileSidebar {...defaultProps} pathname="/" />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(settingsButton).not.toHaveAttribute('aria-current');
    });
  });

  describe('active state', () => {
    it('marks Home as active when on /', () => {
      render(<MobileSidebar {...defaultProps} pathname="/" />);

      const homeButton = screen.getByRole('button', { name: 'Home' });
      expect(homeButton).toHaveAttribute('aria-current', 'page');
      expect(homeButton).toHaveClass('bg-[color:var(--color-text-primary)]');
    });

    it('marks Border as active when on /border', () => {
      render(<MobileSidebar {...defaultProps} pathname="/border" />);

      const borderButton = screen.getByRole('button', { name: 'Border' });
      expect(borderButton).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark Home as active on sub-routes', () => {
      render(<MobileSidebar {...defaultProps} pathname="/border" />);

      const homeButton = screen.getByRole('button', { name: 'Home' });
      expect(homeButton).not.toHaveAttribute('aria-current');
    });

    it('matches sub-routes for non-root paths', () => {
      render(<MobileSidebar {...defaultProps} pathname="/films/some-film" />);

      const filmsButton = screen.getByRole('button', { name: 'Films' });
      expect(filmsButton).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('accessibility', () => {
    it('external links use ariaLabel when provided', () => {
      render(<MobileSidebar {...defaultProps} />);

      const githubLink = screen.getByLabelText('Contribute on GitHub');
      expect(githubLink).toBeInTheDocument();
    });

    it('route buttons use label as aria-label', () => {
      render(<MobileSidebar {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Border' })
      ).toBeInTheDocument();
    });
  });
});
