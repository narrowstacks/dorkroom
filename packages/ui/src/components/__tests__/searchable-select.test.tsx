import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SearchableSelect } from '../searchable-select';

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

function setup(selectedValue = 'b') {
  const onValueChange = vi.fn();
  render(
    <SearchableSelect
      label="Film"
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      items={items}
    />
  );
  return { onValueChange, input: screen.getByRole('combobox') };
}

describe('SearchableSelect ARIA wiring', () => {
  beforeAll(() => {
    // jsdom does not implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('is a collapsed combobox until opened', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-controls');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('points aria-controls at the listbox and activedescendant at the selected option on open', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);

    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
  });

  it('moves aria-activedescendant with the arrow keys and wraps', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);
    const options = screen.getAllByRole('option');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);
    // DOM focus never leaves the input.
    expect(input).toHaveFocus();
  });

  it('scrolls the active option into view', async () => {
    const user = userEvent.setup();
    const { input } = setup('a');
    await user.click(input);
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    await user.keyboard('{ArrowDown}');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
    });
  });

  it('gives each instance unique ids', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchableSelect
          label="One"
          selectedValue=""
          onValueChange={vi.fn()}
          items={items}
        />
        <SearchableSelect
          label="Two"
          selectedValue=""
          onValueChange={vi.fn()}
          items={items}
        />
      </>
    );
    const [first, second] = screen.getAllByRole('combobox');
    await user.click(first);
    await user.click(second);
    const ids = screen.getAllByRole('option').map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops aria-activedescendant when filtering leaves no focused option', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);
    await user.keyboard('zzz');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(input).not.toHaveAttribute('aria-controls');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    // The empty message is announced, and lives outside the listbox.
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('No results found');
  });

  it('marks the selected row with a check icon and the focused row with an inset ring', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);
    const options = screen.getAllByRole('option');
    expect(options[1].querySelector('svg')).not.toBeNull();
    expect(options[0].querySelector('svg')).toBeNull();
    expect(options[1].className).toContain('--color-on-hover-surface');
    await user.keyboard('{ArrowDown}');
    expect(options[1].className).not.toContain('--color-on-hover-surface');
    expect(options[2].className).toContain('--color-on-hover-surface');
  });

  it('still selects with Enter and closes with Escape', async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setup('b');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('c');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects on mouse click', async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setup('b');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('reopens when the still-focused input is clicked after a selection', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('dismisses the keyboard after a touch pick but not after a mouse pick', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.pointer({ keys: '[MouseLeft]', target: input });
    const mouseOption = screen.getByRole('option', { name: 'Alpha' });
    await user.pointer({ keys: '[MouseLeft]', target: mouseOption });
    expect(input).toHaveFocus();

    await user.click(input);
    const touchOption = screen.getByRole('option', { name: 'Gamma' });
    fireEvent.pointerDown(touchOption, { pointerType: 'touch' });
    fireEvent.click(touchOption);
    expect(input).not.toHaveFocus();
  });
});
