import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { Combination } from '@dorkroom/api';
import {
  useCombinations,
  useCustomRecipes,
  useFavorites,
} from '@dorkroom/logic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HomePage } from '../home-page';

// Mock the hooks - vi.mocked() provides better type inference
vi.mock('@dorkroom/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dorkroom/logic')>();
  return {
    ...actual,
    useFavorites: vi.fn(),
    useCustomRecipes: vi.fn(),
    useCombinations: vi.fn(),
  };
});

// Mock TanStack Router's Link to render as <a>
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      search,
      children,
      className,
      ...props
    }: {
      to: string;
      search?: Record<string, string>;
      children: ReactNode;
      className?: string;
    }) => {
      const searchParams = search
        ? `?${new URLSearchParams(search).toString()}`
        : '';
      return (
        <a href={`${to}${searchParams}`} className={className} {...props}>
          {children}
        </a>
      );
    },
  };
});

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

// Default mock return values
const defaultMocks = {
  useFavorites: {
    favoriteIds: ['combo-1'],
    isInitialized: true,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
  },
  useCustomRecipes: {
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
  },
  useCombinations: {
    data: mockCombinations,
    isPending: false,
    error: null,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('HomePage', () => {
  let Wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    // Reset mocks to default values using vi.mocked() for type safety
    vi.mocked(useFavorites).mockReturnValue(defaultMocks.useFavorites);
    vi.mocked(useCustomRecipes).mockReturnValue(defaultMocks.useCustomRecipes);
    vi.mocked(useCombinations).mockReturnValue(defaultMocks.useCombinations);

    // Create fresh wrapper with new QueryClient to prevent cache pollution
    Wrapper = createWrapper();
  });

  it('renders without crashing when all data is loaded', () => {
    expect(() =>
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      )
    ).not.toThrow();
  });

  // Note: Visual regression testing is handled by Chromatic (see e2e/homepage.spec.ts)

  describe('data states', () => {
    it('handles loading state when data is pending', () => {
      vi.mocked(useFavorites).mockReturnValue({
        ...defaultMocks.useFavorites,
        favoriteIds: [],
        isInitialized: false,
      });
      vi.mocked(useCustomRecipes).mockReturnValue({
        ...defaultMocks.useCustomRecipes,
        customRecipes: [],
        isLoading: true,
      });
      vi.mocked(useCombinations).mockReturnValue({
        data: undefined,
        isPending: true,
        error: null,
      });

      expect(() =>
        render(
          <Wrapper>
            <HomePage />
          </Wrapper>
        )
      ).not.toThrow();
    });

    it('handles API error gracefully with fallback content', () => {
      vi.mocked(useCombinations).mockReturnValue({
        data: undefined,
        isPending: false,
        error: new Error('Failed to fetch'),
      });

      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // HomePage gracefully degrades - shows "-" for missing data instead of error message
      // The page should still render with main content visible
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Calculators section should still be visible (static content, not API-dependent)
      expect(
        screen.getByRole('heading', { name: /calculators/i, level: 2 })
      ).toBeInTheDocument();
    });

    it('handles empty state with no favorites or recipes', () => {
      vi.mocked(useFavorites).mockReturnValue({
        ...defaultMocks.useFavorites,
        favoriteIds: [],
      });
      vi.mocked(useCustomRecipes).mockReturnValue({
        ...defaultMocks.useCustomRecipes,
        customRecipes: [],
      });
      vi.mocked(useCombinations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
      });

      expect(() =>
        render(
          <Wrapper>
            <HomePage />
          </Wrapper>
        )
      ).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy with single h1', () => {
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      // Page should have exactly one h1 for proper document structure
      const h1s = screen.queryAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);

      // Should have section headings (h2s)
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('all links have accessible names', () => {
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const links = screen.getAllByRole('link');
      for (const link of links) {
        expect(link).toHaveAccessibleName();
      }
    });

    it('external links have security attributes', () => {
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const links = screen.getAllByRole('link');
      // Match only http/https URLs, excluding protocol-relative (//), mailto:, tel:, etc.
      const externalLinks = links.filter((link) =>
        link.getAttribute('href')?.match(/^https?:\/\//)
      );

      for (const link of externalLinks) {
        expect(link).toHaveAttribute('target', '_blank');
        // noreferrer implies noopener in modern browsers
        const rel = link.getAttribute('rel');
        expect(rel).toContain('noreferrer');
      }
    });
  });

  describe('navigation', () => {
    it('calculator links point to valid routes', () => {
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const links = screen.getAllByRole('link');
      const internalLinks = links.filter(
        (link) => !link.getAttribute('href')?.startsWith('http')
      );

      for (const link of internalLinks) {
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).toMatch(/^\//);
      }
    });
  });
});
