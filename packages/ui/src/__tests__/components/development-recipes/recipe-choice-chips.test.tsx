import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecipeChoiceChips } from '../../../components/development-recipes/recipe-choice-chips';

const options = ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase() }));

const box = (left: number, right: number): DOMRect => ({
  left,
  right,
  top: 0,
  bottom: 40,
  x: left,
  y: 0,
  width: right - left,
  height: 40,
  toJSON: () => ({}),
});

const chipOf = (radio: HTMLElement): HTMLElement => {
  const chip = radio.parentElement;
  if (!chip) throw new Error('radio has no label');
  return chip;
};

function renderChips(scroll: boolean, value = 'a') {
  render(
    <RecipeChoiceChips
      label="Speed"
      options={options}
      value={value}
      onChange={vi.fn()}
      scroll={scroll}
    />
  );
  const row = screen.getByRole('radiogroup');
  let scrollLeft = 0;
  Object.defineProperty(row, 'scrollLeft', {
    get: () => scrollLeft,
    set: (next: number) => {
      scrollLeft = next;
    },
  });
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(box(0, 288));
  return {
    row,
    get scrollLeft() {
      return scrollLeft;
    },
  };
}

describe('RecipeChoiceChips reveal on focus', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('scrolls the row, not the page, until a chip clipped on the right is whole', () => {
    const probe = renderChips(true);
    const radio = screen.getByRole('radio', { name: 'C' });
    vi.spyOn(chipOf(radio), 'getBoundingClientRect').mockReturnValue(
      box(250, 340)
    );
    fireEvent.focus(radio);
    expect(probe.scrollLeft).toBe(340 - 288 + 4);
  });

  it('scrolls back for a chip clipped on the left', () => {
    const probe = renderChips(true);
    probe.row.scrollLeft = 100;
    const radio = screen.getByRole('radio', { name: 'A' });
    vi.spyOn(chipOf(radio), 'getBoundingClientRect').mockReturnValue(
      box(-30, 60)
    );
    fireEvent.focus(radio);
    expect(probe.scrollLeft).toBe(100 - 30 - 4);
  });

  it('does nothing when the chips wrap instead of scrolling', () => {
    const probe = renderChips(false);
    const radio = screen.getByRole('radio', { name: 'C' });
    vi.spyOn(chipOf(radio), 'getBoundingClientRect').mockReturnValue(
      box(250, 340)
    );
    fireEvent.focus(radio);
    expect(probe.scrollLeft).toBe(0);
  });

  it('draws a focus ring on the chip when its radio is focused by keyboard', () => {
    renderChips(true);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.nextElementSibling?.className).toContain(
        'peer-focus-visible:ring-2'
      );
    }
  });

  it('reveals the checked chip on mount without focusing it', () => {
    const rects = new Map<string, DOMRect>([['C', box(500, 590)]]);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute('role') === 'radiogroup') return box(0, 288);
        return rects.get(this.textContent ?? '') ?? box(0, 80);
      }
    );
    const scrolls: number[] = [];
    const original = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'scrollLeft'
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get: () => 0,
      set: (value: number) => {
        scrolls.push(value);
      },
    });
    try {
      render(
        <RecipeChoiceChips
          label="Speed"
          options={options}
          value="c"
          onChange={vi.fn()}
          scroll
        />
      );
    } finally {
      if (original)
        Object.defineProperty(Element.prototype, 'scrollLeft', original);
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollLeft');
    }
    expect(scrolls).toEqual([590 - 288 + 4]);
    expect(document.activeElement).toBe(document.body);
  });

  it('leaves a row alone when the checked chip is already whole', () => {
    const probe = renderChips(true, 'a');
    expect(probe.scrollLeft).toBe(0);
  });
});
