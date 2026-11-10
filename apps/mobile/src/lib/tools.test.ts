import { describe, expect, it } from 'vitest';
import {
  getScreenToolForPhase,
  getTool,
  getToolPhase,
  PHASES,
  type RecordingToolId,
  recordsLastResult,
  TOOLS,
  toolsForPhase,
  usesLargeTitle,
} from './tools';

describe('tool registry', () => {
  it('exposes a unique id for every tool', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('derives each route from its phase and id or section path', () => {
    for (const tool of TOOLS) {
      const tail = tool.kind === 'screen' ? tool.id : tool.path;
      expect(tool.route).toBe(`/${tool.phase}/${tail}`);
    }
  });

  it('gives every tool a short blurb for its hub tile', () => {
    for (const tool of TOOLS) {
      const words = tool.blurb.split(/\s+/).length;
      expect(words, tool.id).toBeGreaterThanOrEqual(2);
      expect(words, tool.id).toBeLessThanOrEqual(4);
    }
  });

  it('getTool returns undefined for unknown ids, Home and Settings', () => {
    expect(getTool('nope')).toBeUndefined();
    expect(getTool('home')).toBeUndefined();
    expect(getTool('settings')).toBeUndefined();
  });
});

describe('phases', () => {
  it('puts every tool in exactly one phase', () => {
    const listed = PHASES.flatMap((p) => p.toolIds);
    expect([...listed].sort()).toEqual(TOOLS.map((t) => t.id).sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('getToolPhase and toolsForPhase agree with PHASES', () => {
    for (const phase of PHASES) {
      expect(toolsForPhase(phase.id).map((t) => t.id)).toEqual(phase.toolIds);
      for (const id of phase.toolIds) expect(getToolPhase(id)).toBe(phase.id);
    }
    expect(getToolPhase('nope')).toBeUndefined();
  });
});

describe('getScreenToolForPhase', () => {
  it('finds a single-screen tool in its own phase', () => {
    expect(getScreenToolForPhase('print', 'exposure')?.id).toBe('exposure');
    expect(getScreenToolForPhase('shoot', 'lens')?.id).toBe('lens');
  });

  it('is not found for another phase, a section, an unknown id or none', () => {
    expect(getScreenToolForPhase('shoot', 'exposure')).toBeUndefined();
    expect(getScreenToolForPhase('shoot', 'film-log')).toBeUndefined();
    expect(getScreenToolForPhase('develop', 'timer')).toBeUndefined();
    expect(getScreenToolForPhase('print', 'nope')).toBeUndefined();
    expect(getScreenToolForPhase('print', undefined)).toBeUndefined();
  });
});

describe('usesLargeTitle', () => {
  it('is standard for answer-first and fixed-layout tools and for not found', () => {
    expect(usesLargeTitle(getTool('exposure'))).toBe(false);
    expect(usesLargeTitle(getTool('negative-inverter'))).toBe(false);
    expect(usesLargeTitle(undefined)).toBe(false);
  });

  it('is large for a scrolling tool', () => {
    expect(usesLargeTitle(getTool('border'))).toBe(true);
  });
});

describe('recordsLastResult', () => {
  it('is true only for answer-first screens that restore their inputs', () => {
    expect(recordsLastResult('lens')).toBe(true);
    expect(recordsLastResult('camera-exposure')).toBe(true);
    for (const id of ['exposure', 'resize', 'reciprocity']) {
      expect(recordsLastResult(id), id).toBe(false);
    }
    // Border and Mat persist but have no Readout to record.
    expect(recordsLastResult('border')).toBe(false);
    expect(recordsLastResult('mat')).toBe(false);
    expect(recordsLastResult('film-log')).toBe(false);
    expect(recordsLastResult('nope')).toBe(false);
  });
});

describe('RecordingToolId', () => {
  it('rejects a tool that resets its inputs at compile time', () => {
    const accept = (id: RecordingToolId) => id;
    accept('lens');
    // @ts-expect-error Exposure keeps no inputs, so it can't record a result.
    accept('exposure');
    expect(accept('camera-exposure')).toBe('camera-exposure');
  });
});
