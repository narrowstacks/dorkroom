import {
  byteToLinear,
  type InversionCoefficients,
  invertPixel,
  type RgbaImage,
} from '@dorkroom/logic';
import { DITHER_AMOUNT, orderedDither } from './inversion-shader';

/**
 * The CPU fallback for browsers without WebGL: `invertPixel` per pixel, then
 * the shader's ordered dither before quantizing to 8 bits. With a zero dither
 * amount the output is byte for byte `invertImage`.
 *
 * `out` may be the source's own buffer: each pixel is read before it is
 * written.
 */
export function invertPixelsDithered(
  source: RgbaImage,
  coeffs: InversionCoefficients,
  out: Uint8ClampedArray,
  ditherAmount = DITHER_AMOUNT
): void {
  const { width, height, data } = source;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const i = (row * width + column) * 4;
      const [r, g, b] = invertPixel(
        [
          byteToLinear(data[i]),
          byteToLinear(data[i + 1]),
          byteToLinear(data[i + 2]),
        ],
        coeffs
      );
      const d = orderedDither(column, row) * ditherAmount;
      out[i] = Math.round(Math.max(0, Math.min(1, r + d)) * 255);
      out[i + 1] = Math.round(Math.max(0, Math.min(1, g + d)) * 255);
      out[i + 2] = Math.round(Math.max(0, Math.min(1, b + d)) * 255);
      out[i + 3] = 255;
    }
  }
}
