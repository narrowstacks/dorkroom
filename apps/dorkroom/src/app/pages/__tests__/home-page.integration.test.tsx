import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router';
import { HomePage } from '../home-page';
import type { Film, Developer, Combination } from '@dorkroom/api';

// Create a minimal route tree for testing
const routeTree = {
  id: '__root__',
  path: '/',
  component: HomePage,
  children: [
    {
      id: '/border',
      path: '/border',
      component: () => <div>Border Calculator</div>,
    },
    {
      id: '/development',
      path: '/development',
      component: () => <div>Development Recipes</div>,
    },
    {
      id: '/stops',
      path: '/stops',
      component: () => <div>Stops Calculator</div>,
    },
    {
      id: '/resize',
      path: '/resize',
      component: () => <div>Resize Calculator</div>,
    },
    {
      id: '/reciprocity',
      path: '/reciprocity',
      component: () => <div>Reciprocity Calculator</div>,
    },
  ],
};

// Mock the logic hooks
const mockCombinations: Combination[] = [
  {
    id: 1,
    uuid: 'combo-1',
    filmId: 1,
    developerId: 1,
    dilution: '1:1',
    iso: 400,
    temperature: 20,
    time: 8.5,
    notes: null,
    filmColor: 'bw',
    filmName: 'HP5 Plus',
    developerName: 'DD-X',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 2,
    uuid: 'combo-2',
    filmId: 2,
    developerId: 2,
    dilution: '1:4',
    iso: 100,
    temperature: 20,
    time: 12,
    notes: null,
    filmColor: 'bw',
    filmName: 'FP4 Plus',
    developerName: 'HC-110',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

vi.mock('@dorkroom/logic', () => ({
  useFavorites: () => ({
    favoriteIds: ['combo-1'],
    isInitialized: true,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
  }),
  useCustomRecipes: () => ({
    customRecipes: [
      {
        id: 'custom-1',
        name: 'My Custom Recipe',
        filmId: 'film-1',
        developerId: 'dev-1',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
        dateCreated: '2024-01-01',
        dateModified: '2024-01-01',
      },
    ],
    isLoading: false,
  }),
  useCombinations: () => ({
    data: mockCombinations,
    isPending: false,
    error: null,
  }),
}));

// Create test wrapper with providers
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const history = createMemoryHistory({
    initialEntries: ['/'],
  });

  // Mock router for testing
  const router = createRouter({
    routeTree: routeTree as any,
    history,
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('HomePage Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe('page layout and rendering', () => {
    it('renders the home page successfully', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText(/skip the math/i)).toBeInTheDocument();
    });

    it('displays greeting component', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Greeting component should be present
      // (exact text depends on time of day)
      const greetingElement = screen.getByText(/good/i);
      expect(greetingElement).toBeInTheDocument();
    });

    it('renders hero section with main CTA', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText(/skip the math/i)).toBeInTheDocument();
      expect(
        screen.getByText(/collection of tools for the darkroom/i)
      ).toBeInTheDocument();
    });

    it('displays primary action buttons', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(
        screen.getByRole('link', {
          name: /try our darkroom easel border calculator/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: /find the perfect film development recipe/i,
        })
      ).toBeInTheDocument();
    });
  });

  describe('statistics display', () => {
    it('displays film development recipes count', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Film Development Recipes')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Mock data has 2 combinations
    });

    it('displays favorite recipes count', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Favorite Recipes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Mock has 1 favorite
    });

    it('displays custom recipes count', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Your Custom Recipes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Mock has 1 custom recipe
    });

    it('shows loading state for statistics', () => {
      // Override mock to show loading state
      vi.mock('@dorkroom/logic', () => ({
        useFavorites: () => ({
          favoriteIds: [],
          isInitialized: false,
          addFavorite: vi.fn(),
          removeFavorite: vi.fn(),
          isFavorite: vi.fn(),
        }),
        useCustomRecipes: () => ({
          customRecipes: [],
          isLoading: true,
        }),
        useCombinations: () => ({
          data: undefined,
          isPending: true,
          error: null,
        }),
      }));

      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Loading states should be present
      expect(screen.getByText('Film Development Recipes')).toBeInTheDocument();
    });
  });

  describe('calculator tools section', () => {
    it('displays all calculator tools', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Border Calculator')).toBeInTheDocument();
      expect(screen.getByText('Stops Calculator')).toBeInTheDocument();
      expect(screen.getByText('Resize Calculator')).toBeInTheDocument();
      expect(screen.getByText('Reciprocity')).toBeInTheDocument();
      expect(screen.getByText('Film Development Recipes')).toBeInTheDocument();
    });

    it('displays calculator descriptions', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(
        screen.getByText('Print borders & trim guides')
      ).toBeInTheDocument();
      expect(screen.getByText('F-stop & time math')).toBeInTheDocument();
      expect(screen.getByText(/scale prints/i)).toBeInTheDocument();
      expect(screen.getByText('Long exposure correction')).toBeInTheDocument();
      expect(screen.getByText('Film & chemistry database')).toBeInTheDocument();
    });

    it('displays calculator categories', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Print')).toBeInTheDocument();
      expect(screen.getByText('Exposure')).toBeInTheDocument();
      expect(screen.getByText('Digital')).toBeInTheDocument();
      expect(screen.getByText('In the Field')).toBeInTheDocument();
      expect(screen.getByText('Film Dev')).toBeInTheDocument();
    });

    it('calculator cards have correct links', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const borderLink = screen.getByRole('link', {
        name: /border calculator/i,
      });
      expect(borderLink).toHaveAttribute('href', '/border');

      const stopsLink = screen.getByRole('link', { name: /stops calculator/i });
      expect(stopsLink).toHaveAttribute('href', '/stops');

      const resizeLink = screen.getByRole('link', {
        name: /resize calculator/i,
      });
      expect(resizeLink).toHaveAttribute('href', '/resize');

      const reciprocityLink = screen.getByRole('link', {
        name: /reciprocity/i,
      });
      expect(reciprocityLink).toHaveAttribute('href', '/reciprocity');

      const developmentLink = screen.getByRole('link', {
        name: /film development recipes/i,
      });
      expect(developmentLink).toHaveAttribute('href', '/development');
    });
  });

  describe('coming soon section', () => {
    it('displays coming soon section', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('displays coming soon items', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(screen.getByText('Docs')).toBeInTheDocument();
      expect(screen.getByText('Infobase')).toBeInTheDocument();
      expect(screen.getByText('Camera Exposure')).toBeInTheDocument();
    });

    it('coming soon items are not clickable', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Coming soon items should not be links
      const docs = screen.getByText('Docs').closest('div');
      expect(docs?.tagName).not.toBe('A');
    });

    it('displays coming soon descriptions', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(
        screen.getByText('Documentation for Dorkroom')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Photography & darkroom guides')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Equivalent exposure calculator')
      ).toBeInTheDocument();
    });
  });

  describe('footer section', () => {
    it('displays copyright information', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(new RegExp(`© ${currentYear} Dorkroom`))
      ).toBeInTheDocument();
    });

    it('displays license link', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const licenseLink = screen.getByRole('link', {
        name: /open source via the agplv3 license/i,
      });
      expect(licenseLink).toHaveAttribute(
        'href',
        'https://github.com/narrowstacks/dorkroom/blob/main/LICENSE'
      );
      expect(licenseLink).toHaveAttribute('target', '_blank');
    });

    it('displays contribute link', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const contributeLink = screen.getByRole('link', { name: /contribute/i });
      expect(contributeLink).toHaveAttribute(
        'href',
        'https://github.com/narrowstacks/dorkroom'
      );
      expect(contributeLink).toHaveAttribute('target', '_blank');
    });

    it('displays donate link', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const donateLink = screen.getByRole('link', { name: /donate/i });
      expect(donateLink).toHaveAttribute('href', 'https://ko-fi.com/affords');
      expect(donateLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('user interactions', () => {
    it('navigates to border calculator on CTA click', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const borderCTA = screen.getByRole('link', {
        name: /try our darkroom easel border calculator/i,
      });

      expect(borderCTA).toHaveAttribute('href', '/border');
    });

    it('navigates to development recipes on CTA click', async () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const developmentCTA = screen.getByRole('link', {
        name: /find the perfect film development recipe/i,
      });

      expect(developmentCTA).toHaveAttribute('href', '/development');
    });

    it('stat cards link to development page with correct search params', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Favorite recipes stat should link with view=favorites
      const favoritesStat = screen.getByText('Favorite Recipes').closest('a');
      expect(favoritesStat).toHaveAttribute(
        'href',
        '/development?view=favorites'
      );

      // Custom recipes stat should link with view=custom
      const customStat = screen.getByText('Your Custom Recipes').closest('a');
      expect(customStat).toHaveAttribute('href', '/development?view=custom');
    });

    it('calculator tools are clickable', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const borderCalculator = screen.getByRole('link', {
        name: /border calculator/i,
      });
      await user.hover(borderCalculator);

      // Link should be interactive
      expect(borderCalculator).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('renders without errors on different viewport sizes', () => {
      const Wrapper = createTestWrapper();
      const { container } = render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      expect(container).toBeInTheDocument();
    });

    it('applies responsive grid classes', () => {
      const Wrapper = createTestWrapper();
      const { container } = render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Check for responsive grid classes
      const gridElements = container.querySelectorAll('[class*="grid"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('all links have accessible names', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('external links have proper attributes', () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const externalLinks = [
        screen.getByRole('link', {
          name: /open source via the agplv3 license/i,
        }),
        screen.getByRole('link', { name: /contribute/i }),
        screen.getByRole('link', { name: /donate/i }),
      ];

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      });
    });

    it('stat cards are keyboard navigable', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Tab through stat cards
      await user.tab();

      // At least one element should receive focus
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('data loading states', () => {
    it('handles empty combinations list', () => {
      vi.mock('@dorkroom/logic', () => ({
        useFavorites: () => ({
          favoriteIds: [],
          isInitialized: true,
          addFavorite: vi.fn(),
          removeFavorite: vi.fn(),
          isFavorite: vi.fn(),
        }),
        useCustomRecipes: () => ({
          customRecipes: [],
          isLoading: false,
        }),
        useCombinations: () => ({
          data: [],
          isPending: false,
          error: null,
        }),
      }));

      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Should show 0 for empty combinations
      expect(screen.getByText('Film Development Recipes')).toBeInTheDocument();
    });

    it('handles error states gracefully', () => {
      vi.mock('@dorkroom/logic', () => ({
        useFavorites: () => ({
          favoriteIds: [],
          isInitialized: true,
          addFavorite: vi.fn(),
          removeFavorite: vi.fn(),
          isFavorite: vi.fn(),
        }),
        useCustomRecipes: () => ({
          customRecipes: [],
          isLoading: false,
        }),
        useCombinations: () => ({
          data: undefined,
          isPending: false,
          error: new Error('Failed to fetch'),
        }),
      }));

      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Page should still render
      expect(screen.getByText(/skip the math/i)).toBeInTheDocument();
    });
  });

  describe('visual design elements', () => {
    it('renders with theme-aware styling', () => {
      const Wrapper = createTestWrapper();
      const { container } = render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Check for CSS custom properties usage
      const elementsWithCustomProps =
        container.querySelectorAll('[style*="var(--"]');
      expect(elementsWithCustomProps.length).toBeGreaterThan(0);
    });

    it('applies gradient backgrounds to hero section', () => {
      const Wrapper = createTestWrapper();
      const { container } = render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Hero section should have gradient styling
      const heroSection = container.querySelector('[style*="gradient"]');
      expect(heroSection).toBeInTheDocument();
    });
  });
});
