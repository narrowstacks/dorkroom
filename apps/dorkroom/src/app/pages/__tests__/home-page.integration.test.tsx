import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useStats } from '@dorkroom/logic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HomePage } from '../home-page';

// Mock the hooks - vi.mocked() provides better type inference
vi.mock('@dorkroom/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dorkroom/logic')>();
  return {
    ...actual,
    useStats: vi.fn(),
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

// Default mock return values
const defaultMocks = {
  useStats: {
    data: { films: 151, developers: 24, combinations: 1020 },
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
    vi.mocked(useStats).mockReturnValue(defaultMocks.useStats);

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
      vi.mocked(useStats).mockReturnValue({
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
      vi.mocked(useStats).mockReturnValue({
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

    it('handles empty stats gracefully', () => {
      vi.mocked(useStats).mockReturnValue({
        data: { films: 0, developers: 0, combinations: 0 },
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
