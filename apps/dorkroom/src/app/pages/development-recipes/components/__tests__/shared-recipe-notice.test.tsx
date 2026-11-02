import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SharedRecipeNotice } from '../shared-recipe-notice';

describe('SharedRecipeNotice', () => {
  it('shows a failed link as a dismissible alert', () => {
    const onDismiss = vi.fn();
    render(
      <SharedRecipeNotice
        isLoading={false}
        message="Invalid custom recipe data"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid custom recipe data'
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss shared recipe message' })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('announces loading politely', () => {
    render(
      <SharedRecipeNotice
        isLoading
        message={null}
        onDismiss={() => undefined}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading shared recipe…'
    );
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('renders no visible content when there is nothing to report', () => {
    render(
      <SharedRecipeNotice
        isLoading={false}
        message={null}
        onDismiss={() => undefined}
      />
    );

    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('keeps the alert region mounted so a later failure is announced', () => {
    const { rerender } = render(
      <SharedRecipeNotice
        isLoading
        message={null}
        onDismiss={() => undefined}
      />
    );
    const region = screen.getByRole('alert');

    rerender(
      <SharedRecipeNotice
        isLoading={false}
        message="Unknown recipe"
        onDismiss={() => undefined}
      />
    );

    expect(screen.getByRole('alert')).toBe(region);
    expect(region).toHaveTextContent('Unknown recipe');
  });
});
