import { describe, expect, it, vi } from 'vitest';
import {
  attemptWithRetry,
  attributionMismatch,
  classifyFailure,
  formatFailureReport,
  MAX_ATTEMPTS,
  readBoxState,
  retryDelayMs,
  summarizeOutcomes,
  UploadFailure,
} from '../github-upload-attachment';

const asset = (id: string) =>
  `https://github.com/user-attachments/assets/${id}`;
const UUID_A = '11111111-2222-3333-4444-555555555555';
const UUID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('readBoxState', () => {
  it('reports an empty box as empty', () => {
    expect(readBoxState('')).toEqual({ status: 'empty' });
    expect(readBoxState('   \n  ')).toEqual({ status: 'empty' });
  });

  it('reports the placeholder GitHub parks in the box as pending', () => {
    expect(readBoxState('![Uploading before.webp…]()')).toEqual({
      status: 'pending',
    });
  });

  it('attributes a lone asset URL unambiguously', () => {
    expect(readBoxState(`![before](${asset(UUID_A)})`)).toEqual({
      status: 'ready',
      url: asset(UUID_A),
    });
  });

  it('refuses to guess when more than one asset URL is in the box', () => {
    const value = `![a](${asset(UUID_A)})\n![b](${asset(UUID_B)})`;
    expect(readBoxState(value)).toEqual({
      status: 'ambiguous',
      urls: [asset(UUID_A), asset(UUID_B)],
    });
  });

  it("detects GitHub's upload rejection copy", () => {
    const state = readBoxState('Failed to upload file.');
    expect(state.status).toBe('rejected');
    expect(state.status === 'rejected' && state.detail).toMatch(
      /failed to upload/i
    );
  });

  it('does not mistake a filename containing "failed" for a rejection', () => {
    // The old heuristic was /failed/i against the whole box, so a shot named
    // `light-meter-failed-state` was reported as a GitHub rejection.
    expect(
      readBoxState('![Uploading light-meter-failed-state.webp…]()')
    ).toEqual({ status: 'pending' });
    expect(
      readBoxState(`![light-meter-failed-state](${asset(UUID_A)})`)
    ).toEqual({ status: 'ready', url: asset(UUID_A) });
  });

  it('prefers a landed URL over leftover prose in the box', () => {
    expect(readBoxState(`some draft text\n![x](${asset(UUID_A)})`)).toEqual({
      status: 'ready',
      url: asset(UUID_A),
    });
  });

  it('treats unrelated leftover text as pending, not empty', () => {
    expect(readBoxState('draft note')).toEqual({ status: 'pending' });
  });
});

describe('classifyFailure', () => {
  it('marks a GitHub rejection permanent so it is never retried', () => {
    expect(
      classifyFailure('GitHub rejected a.webp: Failed to upload file.')
    ).toBe('permanent');
    expect(classifyFailure('File too large')).toBe('permanent');
    expect(classifyFailure('this file type is not supported')).toBe(
      'permanent'
    );
    expect(classifyFailure('No such file: /tmp/nope.webp')).toBe('permanent');
  });

  it('marks timeouts and browser faults transient so they are retried', () => {
    expect(
      classifyFailure('Timed out waiting for GitHub to accept a.webp.')
    ).toBe('transient');
    expect(
      classifyFailure('Target page, context or browser has been closed')
    ).toBe('transient');
    expect(classifyFailure('net::ERR_CONNECTION_RESET')).toBe('transient');
    expect(classifyFailure('two asset URLs appeared in the comment box')).toBe(
      'transient'
    );
  });
});

describe('retryDelayMs', () => {
  it('backs off exponentially and stays bounded', () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(3)).toBe(4_000);
    expect(retryDelayMs(9)).toBe(8_000);
  });
});

describe('attemptWithRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    const sleep = vi.fn(async () => {});
    const run = vi.fn(async () => 'ok');
    await expect(attemptWithRetry(run, { sleep })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a transient failure with backoff and succeeds', async () => {
    const sleep = vi.fn(async () => {});
    const run = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new UploadFailure('timed out', 'transient'))
      .mockResolvedValueOnce('ok');

    await expect(attemptWithRetry(run, { sleep })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it('never retries a permanent failure', async () => {
    const sleep = vi.fn(async () => {});
    const run = vi.fn(async () => {
      throw new UploadFailure('GitHub rejected a.webp', 'permanent');
    });
    await expect(attemptWithRetry(run, { sleep })).rejects.toThrow(/rejected/);
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('classifies a plain Error by message when no kind is attached', async () => {
    const sleep = vi.fn(async () => {});
    const run = vi.fn(async () => {
      throw new Error('File too large');
    });
    await expect(attemptWithRetry(run, { sleep })).rejects.toThrow(/too large/);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('gives up after MAX_ATTEMPTS and rethrows the last failure', async () => {
    const sleep = vi.fn(async () => {});
    const run = vi.fn(async (attempt: number) => {
      throw new UploadFailure(`timeout ${attempt}`, 'transient');
    });
    await expect(attemptWithRetry(run, { sleep })).rejects.toThrow(
      `timeout ${MAX_ATTEMPTS}`
    );
    expect(run).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(MAX_ATTEMPTS - 1);
  });

  it('reports each retry so the operator sees progress', async () => {
    const onRetry = vi.fn();
    const run = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new UploadFailure('boom', 'transient'))
      .mockResolvedValueOnce('ok');

    await attemptWithRetry(run, { sleep: async () => {}, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toBe(1);
    expect(onRetry.mock.calls[0][2]).toBe(1_000);
  });
});

describe('summarizeOutcomes', () => {
  it('keeps every successful upload even when a sibling failed', () => {
    const summary = summarizeOutcomes([
      { file: '/a.webp', url: asset(UUID_A), attempts: 1 },
      { file: '/b.webp', url: null, attempts: 3, error: 'Timed out' },
      { file: '/c.webp', url: asset(UUID_B), attempts: 2 },
    ]);

    expect(summary.urls).toEqual({
      '/a.webp': asset(UUID_A),
      '/c.webp': asset(UUID_B),
    });
    expect(summary.failures).toEqual([{ file: '/b.webp', error: 'Timed out' }]);
    expect(summary.ok).toBe(false);
  });

  it('reports ok when nothing failed', () => {
    const summary = summarizeOutcomes([
      { file: '/a.webp', url: asset(UUID_A), attempts: 1 },
    ]);
    expect(summary.failures).toEqual([]);
    expect(summary.ok).toBe(true);
  });
});

describe('attributionMismatch', () => {
  const url = asset(UUID_A);

  it('accepts markup whose alt text names the uploaded file', () => {
    const markup = `<img width="120" height="80" alt="alpha-red" src="${url}" />`;
    expect(attributionMismatch(markup, '/shots/alpha-red.png')).toBeNull();
  });

  it('accepts the markdown image form', () => {
    expect(
      attributionMismatch(
        `![reciprocity-after](${url})`,
        '/a/reciprocity-after.webp'
      )
    ).toBeNull();
  });

  it('accepts the plain link form GitHub uses for non-images', () => {
    expect(
      attributionMismatch(`[report.pdf](${url})`, '/a/report.pdf')
    ).toBeNull();
  });

  it('ignores case and separator differences', () => {
    const markup = `<img alt="Alpha_Red" src="${url}" />`;
    expect(attributionMismatch(markup, '/shots/alpha-red.png')).toBeNull();
  });

  it('tolerates a name GitHub truncated', () => {
    const markup = `<img alt="border-calculator-desktop" src="${url}" />`;
    expect(
      attributionMismatch(markup, '/shots/border-calculator-desktop-dark.webp')
    ).toBeNull();
  });

  it('flags markup that names a different file', () => {
    const markup = `<img alt="bravo-green" src="${url}" />`;
    const problem = attributionMismatch(markup, '/shots/alpha-red.png');
    expect(problem).toMatch(/bravo-green/);
    expect(problem).toMatch(/alpha-red/);
  });

  it('says nothing when GitHub gave no name to check against', () => {
    expect(attributionMismatch(url, '/shots/alpha-red.png')).toBeNull();
  });
});

describe('formatFailureReport', () => {
  it('names the failed files and how to re-run just those', () => {
    const report = formatFailureReport(
      [
        { file: '/tmp/a.webp', error: 'Timed out' },
        { file: '/tmp/b.webp', error: 'GitHub rejected it' },
      ],
      '42'
    );
    expect(report).toMatch(/2 file/);
    expect(report).toContain('/tmp/a.webp');
    expect(report).toContain('Timed out');
    expect(report).toContain('--pr 42');
    expect(report).toContain('/tmp/b.webp');
  });
});
