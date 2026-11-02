import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FilterPanelContainer,
  FilterPanelHeader,
} from '../../components/filters';

function Panel({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  return (
    <FilterPanelContainer
      activeFilterCount={0}
      hasActiveFilters={false}
      defaultCollapsed={defaultCollapsed}
    >
      <FilterPanelHeader />
    </FilterPanelContainer>
  );
}

describe('FilterPanelContainer toggle accessibility', () => {
  it('exposes aria-expanded and aria-controls on the collapse toggle', () => {
    render(<Panel />);
    const toggle = screen.getByRole('button', { name: 'Collapse filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const id = toggle.getAttribute('aria-controls');
    expect(id).not.toBeNull();
    expect(document.getElementById(id ?? '')).not.toBeNull();
  });

  it('exposes aria-expanded and aria-controls on the expand toggle', () => {
    render(<Panel defaultCollapsed />);
    const toggle = screen.getByRole('button', { name: 'Expand filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const id = toggle.getAttribute('aria-controls');
    expect(id).not.toBeNull();
    expect(document.getElementById(id ?? '')).not.toBeNull();
  });

  it('moves focus to the counterpart toggle in both directions', () => {
    render(<Panel />);
    const collapse = screen.getByRole('button', { name: 'Collapse filters' });
    collapse.focus();
    fireEvent.click(collapse);

    const expand = screen.getByRole('button', { name: 'Expand filters' });
    expect(expand).toHaveFocus();

    fireEvent.click(expand);
    expect(
      screen.getByRole('button', { name: 'Collapse filters' })
    ).toHaveFocus();
  });

  it('does not steal focus when a controlled parent changes the state itself', () => {
    const renderPanel = (collapsed: boolean) => (
      <FilterPanelContainer
        activeFilterCount={0}
        hasActiveFilters={false}
        collapsed={collapsed}
        onCollapsedChange={() => {}}
      >
        <FilterPanelHeader />
      </FilterPanelContainer>
    );
    const { rerender } = render(renderPanel(false));
    // The parent ignores the click, so the state never changes.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse filters' }));
    expect(
      screen.getByRole('button', { name: 'Collapse filters' })
    ).not.toHaveFocus();

    // A later programmatic change to the other value must not move focus.
    rerender(renderPanel(true));
    rerender(renderPanel(false));
    expect(
      screen.getByRole('button', { name: 'Collapse filters' })
    ).not.toHaveFocus();
  });
});
