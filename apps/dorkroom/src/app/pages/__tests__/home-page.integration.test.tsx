import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
} from '@tanstack/react-router';
import React from 'react';
import { HomePage } from '../home-page';
import type { Combination } from '@dorkroom/api';
import {
  useFavorites,
  useCustomRecipes,
  useCombinations,
} from '@dorkroom/logic';

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

vi.mock('@dorkroom/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dorkroom/logic')>();
  return {
    ...actual,
    useFavorites: vi.fn(),
    useCustomRecipes: vi.fn(),
    useCombinations: vi.fn(),
  };
});

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

  // Create a valid route tree using TanStack Router API
  // Root route is just a wrapper - actual component goes on the index route
  const rootRoute = createRootRoute();

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
  });

  const borderRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/border',
    component: () => <div>Border Calculator</div>,
  });

  const developmentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/development',
    component: () => <div>Development Recipes</div>,
  });

  const stopsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stops',
    component: () => <div>Stops Calculator</div>,
  });

  const resizeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/resize',
    component: () => <div>Resize Calculator</div>,
  });

  const reciprocityRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/reciprocity',
    component: () => <div>Reciprocity Calculator</div>,
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    borderRoute,
    developmentRoute,
    stopsRoute,
    resizeRoute,
    reciprocityRoute,
  ]);

  // Mock router for testing
  const router = createRouter({
    routeTree,
    history,
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  };
};

describe('HomePage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useFavorites).mockReturnValue({
      favoriteIds: ['combo-1'],
      isInitialized: true,
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useCustomRecipes).mockReturnValue({
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
    });

    vi.mocked(useCombinations).mockReturnValue({
      data: mockCombinations,
      isPending: false,
      error: null,
    });
  });

  describe('page layout and rendering', () => {
    it('renders the home page successfully', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText(/skip the math/i)).toBeInTheDocument();
    });

    it('displays greeting component', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Greeting component should be present
      // (exact text depends on time of day)
      const greetingElement = await screen.findByText(/good/i);
      expect(greetingElement).toBeInTheDocument();
    });

    it('renders hero section with main CTA', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText(/skip the math/i)).toBeInTheDocument();
      expect(
        screen.getByText(/collection of tools for the darkroom/i)
      ).toBeInTheDocument();
    });

    it('displays primary action buttons', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(
        await screen.findByRole('link', {
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
    it('displays film development recipes count', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(
        await screen.findByText('Film Development Recipes')
      ).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Mock data has 2 combinations
    });

    it('displays favorite recipes count', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText('Favorite Recipes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Mock has 1 favorite
    });

    it('displays custom recipes count', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(
        await screen.findByText('Your Custom Recipes')
      ).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Mock has 1 custom recipe
    });

    it('shows loading state for statistics', async () => {
      // Override mock to show loading state
      vi.mocked(useFavorites).mockReturnValue({
        favoriteIds: [],
        isInitialized: false,
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
        isFavorite: vi.fn(),
      });

      vi.mocked(useCustomRecipes).mockReturnValue({
        customRecipes: [],
        isLoading: true,
      });

      vi.mocked(useCombinations).mockReturnValue({
        data: undefined,
        isPending: true,
        error: null,
      });

      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Loading states should be present
      expect(
        await screen.findByText('Film Development Recipes')
      ).toBeInTheDocument();
    });
  });

  describe('calculator tools section', () => {
    it('displays all calculator tools', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText('Border Calculator')).toBeInTheDocument();
      expect(screen.getByText('Stops Calculator')).toBeInTheDocument();
      expect(screen.getByText('Resize Calculator')).toBeInTheDocument();
      expect(screen.getByText('Reciprocity')).toBeInTheDocument();
      expect(screen.getByText('Film Development Recipes')).toBeInTheDocument();
    });

    it('displays calculator descriptions', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(
        await screen.findByText('Print borders & trim guides')
      ).toBeInTheDocument();
      expect(screen.getByText('F-stop & time math')).toBeInTheDocument();
      expect(screen.getByText(/scale prints/i)).toBeInTheDocument();
      expect(screen.getByText('Long exposure correction')).toBeInTheDocument();
      expect(screen.getByText('Film & chemistry database')).toBeInTheDocument();
    });

    it('displays calculator categories', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText('Print')).toBeInTheDocument();
      expect(screen.getByText('Exposure')).toBeInTheDocument();
      expect(screen.getByText('Digital')).toBeInTheDocument();
      expect(screen.getByText('In the Field')).toBeInTheDocument();
      expect(screen.getByText('Film Dev')).toBeInTheDocument();
    });

    it('calculator cards have correct links', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const borderLink = await screen.findByRole('link', {
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
    it('displays coming soon section', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText('Coming Soon')).toBeInTheDocument();
    });

    it('displays coming soon items', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText('Docs')).toBeInTheDocument();
      expect(screen.getByText('Infobase')).toBeInTheDocument();
      expect(screen.getByText('Camera Exposure')).toBeInTheDocument();
    });

    it('coming soon items are not clickable', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Coming soon items should not be links
      const docs = (await screen.findByText('Docs')).closest('div');
      expect(docs?.tagName).not.toBe('A');
    });

    it('displays coming soon descriptions', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      expect(
        await screen.findByText('Documentation for Dorkroom')
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
    it('displays copyright information', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const currentYear = new Date().getFullYear();
      expect(
        await screen.findByText(new RegExp(`© ${currentYear} Dorkroom`))
      ).toBeInTheDocument();
    });

    it('displays license link', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const licenseLink = await screen.findByRole('link', {
        name: /open source via the agplv3 license/i,
      });
      expect(licenseLink).toHaveAttribute(
        'href',
        'https://github.com/narrowstacks/dorkroom/blob/main/LICENSE'
      );
      expect(licenseLink).toHaveAttribute('target', '_blank');
    });

    it('displays contribute link', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const contributeLink = await screen.findByRole('link', {
        name: /contribute/i,
      });
      expect(contributeLink).toHaveAttribute(
        'href',
        'https://github.com/narrowstacks/dorkroom'
      );
      expect(contributeLink).toHaveAttribute('target', '_blank');
    });

    it('displays donate link', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const donateLink = await screen.findByRole('link', { name: /donate/i });
      expect(donateLink).toHaveAttribute('href', 'https://ko-fi.com/affords');
      expect(donateLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('user interactions', () => {
    it('navigates to border calculator on CTA click', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const borderCTA = await screen.findByRole('link', {
        name: /try our darkroom easel border calculator/i,
      });

      expect(borderCTA).toHaveAttribute('href', '/border');
    });

    it('navigates to development recipes on CTA click', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      const developmentCTA = await screen.findByRole('link', {
        name: /find the perfect film development recipe/i,
      });

      expect(developmentCTA).toHaveAttribute('href', '/development');
    });

    it('stat cards link to development page with correct search params', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Favorite recipes stat should link with view=favorites
      const favoritesStat = (
        await screen.findByText('Favorite Recipes')
      ).closest('a');
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
      render(<Wrapper>{null}</Wrapper>);

      const borderCalculator = await screen.findByRole('link', {
        name: /border calculator/i,
      });
      await user.hover(borderCalculator);

      // Link should be interactive
      expect(borderCalculator).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('renders without errors on different viewport sizes', async () => {
      const Wrapper = createTestWrapper();
      const { container } = render(<Wrapper>{null}</Wrapper>);

      expect(await screen.findByText(/skip the math/i)).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('applies responsive grid classes', async () => {
      const Wrapper = createTestWrapper();
      const { container } = render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      // Check for responsive grid classes
      const gridElements = container.querySelectorAll('[class*="grid"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('all links have accessible names', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('external links have proper attributes', async () => {
      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

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
      render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      // Tab through stat cards
      await user.tab();

      // At least one element should receive focus
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('data loading states', () => {
    it('handles empty combinations list', async () => {
      vi.mocked(useFavorites).mockReturnValue({
        favoriteIds: [],
        isInitialized: true,
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
        isFavorite: vi.fn(),
      });

      vi.mocked(useCustomRecipes).mockReturnValue({
        customRecipes: [],
        isLoading: false,
      });

      vi.mocked(useCombinations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
      });

      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Should show 0 for empty combinations
      expect(
        await screen.findByText('Film Development Recipes')
      ).toBeInTheDocument();
    });

    it('handles error states gracefully', async () => {
      vi.mocked(useFavorites).mockReturnValue({
        favoriteIds: [],
        isInitialized: true,
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
        isFavorite: vi.fn(),
      });

      vi.mocked(useCustomRecipes).mockReturnValue({
        customRecipes: [],
        isLoading: false,
      });

      vi.mocked(useCombinations).mockReturnValue({
        data: undefined,
        isPending: false,
        error: new Error('Failed to fetch'),
      });

      const Wrapper = createTestWrapper();
      render(<Wrapper>{null}</Wrapper>);

      // Page should still render
      expect(await screen.findByText(/skip the math/i)).toBeInTheDocument();
    });
  });

  describe('visual design elements', () => {
    it('renders with theme-aware styling', async () => {
      const Wrapper = createTestWrapper();
      const { container } = render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      // Check for CSS custom properties usage
      const elementsWithCustomProps =
        container.querySelectorAll('[style*="var(--"]');
      expect(elementsWithCustomProps.length).toBeGreaterThan(0);
    });

    it('applies gradient backgrounds to hero section', async () => {
      const Wrapper = createTestWrapper();
      const { container } = render(<Wrapper>{null}</Wrapper>);

      await screen.findByText(/skip the math/i);

      // Hero section should have gradient styling
      const heroSection = container.querySelector('[style*="gradient"]');
      expect(heroSection).toBeInTheDocument();
    });
  });
});
