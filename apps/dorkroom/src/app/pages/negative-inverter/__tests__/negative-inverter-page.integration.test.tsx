import '@testing-library/jest-dom/vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NegativeInverterPage from '../negative-inverter-page';
import {
  canvasPixels,
  type FakeCanvasEnvironment,
  installFakeCanvas,
  syntheticNegative,
} from './fake-canvas';

const WIDTH = 400;
const HEIGHT = 300;

let env: FakeCanvasEnvironment;
let fetchSpy: ReturnType<typeof vi.fn>;
let createObjectURL: ReturnType<typeof vi.fn>;
let clickedDownloads: string[];

beforeEach(() => {
  env = installFakeCanvas((file, resize) => {
    if (/\.heic$/i.test(file.name)) {
      throw new DOMException('The source image could not be decoded.');
    }
    return syntheticNegative(resize?.width ?? WIDTH, resize?.height ?? HEIGHT);
  });
  // Nothing on this page may touch the network: images stay on the device.
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  createObjectURL = vi.fn(() => 'blob:positive');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  clickedDownloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clickedDownloads.push(this.download);
  });
  // happy-dom does no layout; the photo frame is drawn 1:1 at the origin.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, WIDTH, HEIGHT)
  );
});

afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  env.restore();
});

async function loadPhoto(name = 'frame-07.jpg', type = 'image/jpeg') {
  render(<NegativeInverterPage />);
  fireEvent.change(screen.getByLabelText('Choose a photo of a negative'), {
    target: { files: [new File(['jpeg bytes'], name, { type })] },
  });
}

/** The positive canvas the renderer appended to the page. */
function positiveCanvas(): HTMLCanvasElement {
  const host = screen.getByTestId('positive-preview');
  const canvas = host.querySelector('canvas');
  if (!canvas) throw new Error('no positive canvas');
  return canvas;
}

function greenAt(canvas: HTMLCanvasElement, x: number, y: number): number {
  const pixels = canvasPixels(canvas);
  if (!pixels) throw new Error('canvas has no pixels');
  return pixels.data[(y * pixels.width + x) * 4 + 1];
}

async function pickBaseAt(x: number, y: number) {
  fireEvent.click(screen.getByRole('button', { name: 'Film base' }));
  const surface = screen.getByRole('button', { name: /Pick the film base/ });
  fireEvent.pointerDown(surface, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(surface, { pointerId: 1, clientX: x, clientY: y });
  await screen.findByRole('figure', { name: 'Positive preview' });
}

describe('NegativeInverterPage', () => {
  it('starts with the loader, the privacy promise and light-table tips', () => {
    render(<NegativeInverterPage />);
    expect(
      screen.getByRole('heading', { name: 'Negative Inverter' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your photo stays on this device. Nothing is uploaded.')
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Mask off the light around the negative/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Choose photo' })
    ).toBeInTheDocument();
    const camera = screen.getByLabelText('Take a photo of a negative');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(screen.getByRole('button', { name: /Download/ })).toBeDisabled();
  });

  it('loads, crops, picks the base, converts, and downloads', async () => {
    await loadPhoto();

    expect(
      await screen.findByRole('figure', { name: 'Negative' })
    ).toBeInTheDocument();
    expect(env.bitmaps[0].close).toHaveBeenCalled();
    // The crop tool is active first; nudge the right edge in with the keyboard.
    expect(screen.getByRole('button', { name: 'Crop' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText(/Crop: 400 × 300 px/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Crop right edge' }), {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    expect(screen.getByText(/Crop: 380 × 300 px/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/ })).toBeDisabled();

    // Tap the clear rebate on the left edge.
    await pickBaseAt(10, 150);

    expect(screen.getByRole('button', { name: 'Positive' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Clear base is the deepest shadow and the densest negative the brightest
    // highlight, once the frame has rendered.
    await waitFor(() => {
      expect(greenAt(positiveCanvas(), 10, 150)).toBeLessThan(16);
    });
    expect(greenAt(positiveCanvas(), 370, 150)).toBeGreaterThan(230);

    // Exposure only moves the uniforms: the mid-tones brighten.
    const midBefore = greenAt(positiveCanvas(), 200, 150);
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Exposure (stops)' }),
      { target: { value: '1' } }
    );
    await waitFor(() => {
      expect(greenAt(positiveCanvas(), 200, 150)).toBeGreaterThan(
        midBefore + 10
      );
    });

    // Before/after.
    fireEvent.click(screen.getByRole('button', { name: 'Negative' }));
    expect(
      screen.getByRole('figure', { name: 'Negative' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('figure', { name: 'Positive preview' })
    ).toBeNull();

    // Download: the cropped area at full resolution, as a JPEG.
    expect(
      screen.getByText('Will save at 380 × 300 px, full resolution.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download JPEG' }));
    expect(
      await screen.findByText(
        'Saved at full resolution, 380 × 300 px (0.1 MP).'
      )
    ).toBeInTheDocument();
    expect(env.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.92
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickedDownloads).toEqual(['frame-07-positive.jpg']);

    // The note describes that file only until the options change.
    fireEvent.click(screen.getByRole('button', { name: 'PNG' }));
    expect(screen.queryByText(/Saved at full resolution/)).toBeNull();
    expect(
      screen.getByText('Will save at 380 × 300 px, full resolution.')
    ).toBeInTheDocument();
  });

  it('commits a crop drag from where the pointer is released', async () => {
    await loadPhoto();
    await screen.findByRole('figure', { name: 'Negative' });
    const edge = screen.getByRole('button', { name: 'Crop right edge' });
    // A quick flick: React never rendered a move before the release.
    fireEvent.pointerDown(edge, { pointerId: 3, clientX: 400, clientY: 150 });
    fireEvent.pointerUp(edge, { pointerId: 3, clientX: 300, clientY: 150 });
    expect(screen.getByText(/Crop: 300 × 300 px/)).toBeInTheDocument();
  });

  it('cancels a running export when a new photo is chosen', async () => {
    await loadPhoto();
    await screen.findByRole('figure', { name: 'Negative' });
    await pickBaseAt(10, 150);
    fireEvent.click(screen.getByRole('button', { name: 'Download JPEG' }));
    const photoCard = screen.getByRole('region', { name: 'frame-07.jpg' });
    fireEvent.click(
      within(photoCard).getByRole('button', { name: 'New photo' })
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(clickedDownloads).toEqual([]);
    expect(env.toBlob).not.toHaveBeenCalled();
  });

  it('offers colour controls and the neutral picker for C-41', async () => {
    await loadPhoto();
    await screen.findByRole('figure', { name: 'Negative' });
    fireEvent.click(screen.getByRole('button', { name: 'Color (C-41)' }));

    // Neutral grey needs a base first.
    expect(screen.getByRole('button', { name: 'Neutral grey' })).toBeDisabled();
    await pickBaseAt(10, 150);
    // The base picker is put away; focus goes back to the tool that opened it.
    expect(screen.getByRole('button', { name: 'Film base' })).toHaveFocus();

    expect(
      screen.getByRole('spinbutton', { name: 'Warmth' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Tint' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pick neutral grey' }));
    const surface = screen.getByRole('button', {
      name: /should be neutral grey/,
    });
    // Focus follows the picker to the photo, and the button can cancel it.
    expect(surface).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Cancel picking' })
    ).toBeEnabled();
    // Keyboard picking: Enter picks at the crosshair (the centre).
    fireEvent.click(surface, { detail: 0 });
    expect(
      await screen.findByText(/Colour balanced on the grey you picked/)
    ).toBeInTheDocument();
    // The picker is put away; focus returns to the button that opened it.
    expect(screen.getByRole('button', { name: 'Pick again' })).toHaveFocus();

    // A neutral pick makes the picked spot grey: its channels converge.
    await waitFor(() => {
      const pixels = canvasPixels(positiveCanvas());
      if (!pixels) throw new Error('no pixels');
      const i = (150 * pixels.width + 200) * 4;
      const [r, g, b] = pixels.data.subarray(i, i + 3);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(3);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear neutral' }));
    expect(
      screen.getByText(/Tap something that should be neutral grey/)
    ).toBeInTheDocument();

    // Reset to defaults goes back to B&W too, keeping the photo and base.
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(
      screen.getByRole('button', { name: 'Black & White' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('spinbutton', { name: 'Warmth' })).toBeNull();
    expect(
      screen.getByRole('figure', { name: 'Positive preview' })
    ).toBeInTheDocument();
  });

  it('hides the B&W-irrelevant colour controls', async () => {
    await loadPhoto();
    await screen.findByRole('figure', { name: 'Negative' });
    await pickBaseAt(10, 150);
    expect(screen.queryByRole('spinbutton', { name: 'Warmth' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Neutral grey' })).toBeNull();
    expect(
      screen.getByRole('spinbutton', { name: 'Contrast' })
    ).toBeInTheDocument();
  });

  it('explains a HEIC photo the browser cannot decode', async () => {
    await loadPhoto('IMG_0042.HEIC', '');
    expect(
      await screen.findByText(/This browser cannot open HEIC photos/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('figure', { name: 'Negative' })).toBeNull();
  });

  it('starts over with a new photo', async () => {
    await loadPhoto();
    await screen.findByRole('figure', { name: 'Negative' });
    const photoCard = screen.getByRole('region', { name: 'frame-07.jpg' });
    fireEvent.click(
      within(photoCard).getByRole('button', { name: 'New photo' })
    );
    expect(
      screen.getByRole('button', { name: 'Choose photo' })
    ).toBeInTheDocument();
  });
});
