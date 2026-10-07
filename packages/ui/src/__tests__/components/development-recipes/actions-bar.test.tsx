import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DevelopmentActionsBar } from '../../../components/development-recipes/actions-bar';
import { TemperatureProvider } from '../../../contexts/temperature-context';

const noop = () => undefined;

describe('DevelopmentActionsBar', () => {
  afterEach(() => {
    cleanup();
  });

  // /development has no other page header, so this is its main heading (#350).
  it('renders the page title as the h1', () => {
    render(
      <TemperatureProvider>
        <DevelopmentActionsBar
          totalResults={3}
          viewMode="table"
          onViewModeChange={noop}
          onOpenImportModal={noop}
          onOpenCustomRecipeModal={noop}
          onRefresh={noop}
        />
      </TemperatureProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Development Recipes'
    );
  });
});
