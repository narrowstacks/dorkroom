// Generates the timer cue sounds as 16-bit mono PCM WAVs: plain sine tones
// synthesized here, so there is no third-party audio and nothing to license.
// Run from apps/mobile: `node scripts/generate-cue-sounds.mjs`.
// The files are also bundled as iOS notification sounds (see app.json).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'sounds'
);
const RATE = 44100;

/** A sine burst with a short linear attack and release so it does not click. */
function tone(freq, seconds, volume = 0.6) {
  const total = Math.round(seconds * RATE);
  const fade = Math.round(0.01 * RATE);
  const samples = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const edge = Math.min(i, total - 1 - i, fade) / fade;
    samples[i] = Math.sin((2 * Math.PI * freq * i) / RATE) * volume * edge;
  }
  return samples;
}

const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

function wav(parts) {
  const length = parts.reduce((n, p) => n + p.length, 0);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(length * 2, 40);
  let offset = 44;
  for (const part of parts) {
    for (const sample of part) {
      buffer.writeInt16LE(
        Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
        offset
      );
      offset += 2;
    }
  }
  return buffer;
}

mkdirSync(OUT, { recursive: true });
// Stage boundary: two high beeps.
writeFileSync(
  join(OUT, 'cue-stage.wav'),
  wav([tone(988, 0.18), silence(0.1), tone(988, 0.18)])
);
// Agitation start: one lower, shorter beep.
writeFileSync(join(OUT, 'cue-agitate.wav'), wav([tone(660, 0.22)]));
console.log('generated cue-stage.wav, cue-agitate.wav');
