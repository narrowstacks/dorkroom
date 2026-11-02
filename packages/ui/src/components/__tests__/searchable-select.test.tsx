import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
    // The live region is mounted before it has anything to say.
    expect(screen.getByRole('status')).toHaveTextContent('');
    await user.click(input);
    await user.keyboard('zzz');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(input).not.toHaveAttribute('aria-controls');
    expect(input).toHaveAttribute('aria-expanded', 'false');
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
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
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

  it('blurs after a pen pick, but not after a click with no pointerdown', async () => {
    const user = userEvent.setup();
    const { input } = setup('b');
    await user.click(input);
    const pen = screen.getByRole('option', { name: 'Gamma' });
    fireEvent.pointerDown(pen, { pointerType: 'pen' });
    fireEvent.click(pen);
    expect(input).not.toHaveFocus();

    await user.click(input);
    // Screen reader or Voice Control activation: click only.
    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(input).toHaveFocus();
  });
});

describe('SearchableSelect open-list marker (#629)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('marks <html> while the list is open and clears it on close', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    expect(document.documentElement).not.toHaveAttribute('data-listbox-open');
    await user.click(input);
    expect(document.documentElement).toHaveAttribute('data-listbox-open');
    await user.keyboard('{Escape}');
    expect(document.documentElement).not.toHaveAttribute('data-listbox-open');
  });

  it('clears the marker when unmounted while open', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { unmount } = render(
      <SearchableSelect
        label="Film"
        selectedValue="b"
        onValueChange={onValueChange}
        items={items}
      />
    );
    await user.click(screen.getByRole('combobox'));
    expect(document.documentElement).toHaveAttribute('data-listbox-open');
    unmount();
    expect(document.documentElement).not.toHaveAttribute('data-listbox-open');
  });

  it('keeps the marker while another list is open and clears it when both close', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchableSelect
          label="First"
          selectedValue="a"
          onValueChange={vi.fn()}
          items={items}
        />
        <SearchableSelect
          label="Second"
          selectedValue="b"
          onValueChange={vi.fn()}
          items={items}
        />
      </>
    );
    const [first, second] = screen.getAllByRole('combobox');
    // Open both without blurring either (focus-driven close is bypassed).
    fireEvent.focus(first);
    fireEvent.change(first, { target: { value: 'A' } });
    fireEvent.focus(second);
    fireEvent.change(second, { target: { value: 'B' } });
    expect(screen.getAllByRole('listbox')).toHaveLength(2);
    expect(document.documentElement).toHaveAttribute('data-listbox-open');

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(document.documentElement).toHaveAttribute('data-listbox-open');

    await user.click(second);
    fireEvent.keyDown(second, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.documentElement).not.toHaveAttribute('data-listbox-open');
  });

  it('opens and closes cleanly under StrictMode', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <SearchableSelect
          label="Film"
          selectedValue="b"
          onValueChange={vi.fn()}
          items={items}
        />
      </StrictMode>
    );
    await user.click(screen.getByRole('combobox'));
    expect(document.documentElement).toHaveAttribute('data-listbox-open');
    await user.keyboard('{Escape}');
    expect(document.documentElement).not.toHaveAttribute('data-listbox-open');
  });
});

describe('SearchableSelect outside press (#633)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function setupWithTarget() {
    const onTargetClick = vi.fn();
    const onValueChange = vi.fn();
    render(
      <div>
        <SearchableSelect
          label="Film"
          selectedValue="b"
          onValueChange={onValueChange}
          items={items}
        />
        <SearchableSelect
          label="Developer"
          selectedValue=""
          onValueChange={vi.fn()}
          items={items}
        />
        <button type="button" onClick={onTargetClick}>
          Card
        </button>
      </div>
    );
    return {
      onTargetClick,
      onValueChange,
      input: screen.getByRole('combobox', { name: 'Film' }),
      other: screen.getByRole('combobox', { name: 'Developer' }),
      card: screen.getByRole('button', { name: 'Card' }),
    };
  }

  const down = (el: Element, pointerType: string) =>
    fireEvent.pointerDown(el, { pointerType, isPrimary: true, button: 0 });
  const up = (el: Element, pointerType: string) =>
    fireEvent.pointerUp(el, { pointerType, isPrimary: true });

  function tap(el: Element, pointerType: string) {
    down(el, pointerType);
    up(el, pointerType);
    return fireEvent.click(el, { detail: 1 });
  }

  it.each(['touch', 'pen'])(
    'closes the list on a %s press outside and swallows its click, then lets the next one through',
    async (pointerType) => {
      const user = userEvent.setup();
      const { input, card, onTargetClick } = setupWithTarget();
      await user.click(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');

      expect(tap(card, pointerType)).toBe(false);
      expect(onTargetClick).not.toHaveBeenCalled();
      // Closed by the hook itself, without waiting for a platform blur.
      expect(input).toHaveAttribute('aria-expanded', 'false');

      tap(card, pointerType);
      expect(onTargetClick).toHaveBeenCalledTimes(1);
    }
  );

  it('lets a mouse click outside through', async () => {
    const user = userEvent.setup();
    const { input, card, onTargetClick } = setupWithTarget();
    await user.click(input);
    expect(tap(card, 'mouse')).toBe(true);
    expect(onTargetClick).toHaveBeenCalledTimes(1);
  });

  it('does not swallow a click with detail 0 after an outside touch press', async () => {
    const user = userEvent.setup();
    const { input, card, onTargetClick } = setupWithTarget();
    await user.click(input);
    down(card, 'touch'); // pointerup lost
    fireEvent.click(card, { detail: 0 });
    expect(onTargetClick).toHaveBeenCalledTimes(1);
  });

  it('does not swallow the click after a scroll gesture (pointercancel)', async () => {
    const user = userEvent.setup();
    const { input, card, onTargetClick } = setupWithTarget();
    await user.click(input);
    down(card, 'touch');
    fireEvent.pointerCancel(card, { pointerType: 'touch' });
    fireEvent.click(card, { detail: 1 });
    expect(onTargetClick).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary pointers', async () => {
    const user = userEvent.setup();
    const { input, card, onTargetClick } = setupWithTarget();
    await user.click(input);
    fireEvent.pointerDown(card, {
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
    });
    fireEvent.click(card, { detail: 1 });
    expect(onTargetClick).toHaveBeenCalledTimes(1);
  });

  it('opens another list when it is pressed while the first is open', async () => {
    const user = userEvent.setup();
    const { input, other } = setupWithTarget();
    await user.click(input);
    down(other, 'touch');
    up(other, 'touch');
    act(() => other.focus()); // the browser's compat mousedown focuses the pressed field
    fireEvent.click(other, { detail: 1 });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(other).toHaveAttribute('aria-expanded', 'true');
  });

  describe('timing', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('stops swallowing 400 ms after pointerup', async () => {
      const user = userEvent.setup();
      const { input, card, onTargetClick } = setupWithTarget();
      await user.click(input);
      vi.useFakeTimers();
      down(card, 'touch');
      up(card, 'touch');
      act(() => {
        vi.advanceTimersByTime(399);
      });
      // Still armed: swallowed.
      expect(fireEvent.click(card, { detail: 1 })).toBe(false);
      expect(onTargetClick).not.toHaveBeenCalled();
    });

    it('is disarmed once 400 ms have passed since pointerup', async () => {
      const user = userEvent.setup();
      const { input, card, onTargetClick } = setupWithTarget();
      await user.click(input);
      vi.useFakeTimers();
      down(card, 'touch');
      up(card, 'touch');
      act(() => {
        vi.advanceTimersByTime(401);
      });
      fireEvent.click(card, { detail: 1 });
      expect(onTargetClick).toHaveBeenCalledTimes(1);
    });

    it('disarms 1.5 s after pointerdown even if pointerup is lost', async () => {
      const user = userEvent.setup();
      const { input, card, onTargetClick } = setupWithTarget();
      await user.click(input);
      vi.useFakeTimers();
      down(card, 'touch');
      act(() => {
        vi.advanceTimersByTime(1501);
      });
      fireEvent.click(card, { detail: 1 });
      expect(onTargetClick).toHaveBeenCalledTimes(1);
    });
  });

  it('removes its window listeners on unmount', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <SearchableSelect
        label="Film"
        selectedValue=""
        onValueChange={vi.fn()}
        items={items}
      />
    );
    const added = add.mock.calls.filter(([, , c]) => c === true);
    expect(added.length).toBeGreaterThan(0);
    unmount();
    for (const [type, fn] of added) {
      expect(remove).toHaveBeenCalledWith(type, fn, true);
    }
    add.mockRestore();
    remove.mockRestore();
  });

  it('does not interfere with picking an option or pressing the input', async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setupWithTarget();
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves clicks alone while the list is closed', () => {
    const { card, onTargetClick } = setupWithTarget();
    tap(card, 'touch');
    expect(onTargetClick).toHaveBeenCalledTimes(1);
  });
});
