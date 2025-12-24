import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { Combination } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HomePage } from '../home-page';

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

// Types for mock hook return values
type MockUseFavorites = {
  favoriteIds: string[];
  isInitialized: boolean;
  addFavorite: ReturnType<typeof vi.fn>;
  removeFavorite: ReturnType<typeof vi.fn>;
  isFavorite: ReturnType<typeof vi.fn>;
};

type MockUseCustomRecipes = {
  customRecipes: Array<{
    id: string;
    name: string;
    filmId: string;
    developerId: string;
    temperatureF: number;
    timeMinutes: number;
    shootingIso: number;
    pushPull: number;
    isCustomFilm: boolean;
    isCustomDeveloper: boolean;
    isPublic: boolean;
    dateCreated: string;
    dateModified: string;
  }>;
  isLoading: boolean;
};

type MockUseCombinations = {
  data: Combination[] | undefined;
  isPending: boolean;
  error: Error | null;
};

// Default mock values
const defaultMocks: {
  useFavorites: MockUseFavorites;
  useCustomRecipes: MockUseCustomRecipes;
  useCombinations: MockUseCombinations;
} = {
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

// Create mutable mock return values (typed to allow test-specific overrides)
let mockFavoritesValue: MockUseFavorites = { ...defaultMocks.useFavorites };
let mockCustomRecipesValue: MockUseCustomRecipes = {
  ...defaultMocks.useCustomRecipes,
};
let mockCombinationsValue: MockUseCombinations = {
  ...defaultMocks.useCombinations,
};

// Mock the hooks with explicit return types for type safety
vi.mock('@dorkroom/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dorkroom/logic')>();
  return {
    ...actual,
    useFavorites: (): MockUseFavorites => mockFavoritesValue,
    useCustomRecipes: (): MockUseCustomRecipes => mockCustomRecipesValue,
    useCombinations: (): MockUseCombinations => mockCombinationsValue,
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
  beforeEach(() => {
    mockFavoritesValue = { ...defaultMocks.useFavorites };
    mockCustomRecipesValue = { ...defaultMocks.useCustomRecipes };
    mockCombinationsValue = { ...defaultMocks.useCombinations };
  });

  it('renders successfully with favorites and combinations data', () => {
    const Wrapper = createWrapper();
    expect(() =>
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      )
    ).not.toThrow();
  });

  // Run `bun test -- -u` to update snapshots when UI intentionally changes
  it('matches snapshot', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );
    expect(container).toMatchSnapshot();
  });

  describe('data states', () => {
    it('handles loading state when data is pending', () => {
      mockFavoritesValue = {
        ...defaultMocks.useFavorites,
        favoriteIds: [],
        isInitialized: false,
      };
      mockCustomRecipesValue = {
        ...defaultMocks.useCustomRecipes,
        customRecipes: [],
        isLoading: true,
      };
      mockCombinationsValue = {
        data: undefined,
        isPending: true,
        error: null,
      };

      const Wrapper = createWrapper();
      expect(() =>
        render(
          <Wrapper>
            <HomePage />
          </Wrapper>
        )
      ).not.toThrow();
    });

    it('handles API error gracefully', () => {
      mockCombinationsValue = {
        data: undefined,
        isPending: false,
        error: new Error('Failed to fetch'),
      };

      const Wrapper = createWrapper();
      expect(() =>
        render(
          <Wrapper>
            <HomePage />
          </Wrapper>
        )
      ).not.toThrow();
    });

    it('handles empty state with no favorites or recipes', () => {
      mockFavoritesValue = {
        ...defaultMocks.useFavorites,
        favoriteIds: [],
      };
      mockCustomRecipesValue = {
        ...defaultMocks.useCustomRecipes,
        customRecipes: [],
      };
      mockCombinationsValue = {
        data: [],
        isPending: false,
        error: null,
      };

      const Wrapper = createWrapper();
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
    it('has proper heading hierarchy', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('all links have accessible names', () => {
      const Wrapper = createWrapper();
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

    it('external links open in new tab with noreferrer', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <HomePage />
        </Wrapper>
      );

      const links = screen.getAllByRole('link');
      const externalLinks = links.filter((link) =>
        link.getAttribute('href')?.startsWith('http')
      );

      for (const link of externalLinks) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      }
    });
  });

  describe('navigation', () => {
    it('calculator links point to valid routes', () => {
      const Wrapper = createWrapper();
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
