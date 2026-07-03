// Pure display helpers for the film-processing timer UI. No native deps, no React
// — just number/string formatting, kept here so it's unit-testable beside the
// presentation components.
import type { StageKind, TimerStage } from '@/lib/timer/types';

/**
 * Format a countdown value (seconds, possibly fractional) as `M:SS` — minutes are
 * unbounded (`120:00` is valid), seconds are always two digits. Negative/non-finite
 * input clamps to `0:00`. Remaining time is rounded *up* so the display only hits
 * `0:00` at the true end of a stage, never a beat early.
 */
export function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Compact whole-duration label for the stage list (`7:00`, `0:45`). Unlike
 * `formatClock` this rounds to the nearest second since stage durations are
 * already whole — it just shares the `M:SS` shape.
 */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** °F → °C, rounded to the nearest whole degree. */
function toCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

/**
 * Render a stage temperature as `68°F · 20°C`, or null when the stage has no
 * process-critical temperature (e.g. a running-water wash).
 */
export function formatTemp(temperatureF: number | null): string | null {
  if (temperatureF == null || !Number.isFinite(temperatureF)) return null;
  return `${Math.round(temperatureF)}°F · ${toCelsius(temperatureF)}°C`;
}

/** Human label for a stage kind, used in the preset editor's kind picker. */
const KIND_LABELS: Record<StageKind, string> = {
  dev: 'Develop',
  stop: 'Stop',
  fix: 'Fix',
  wash: 'Wash',
  custom: 'Custom',
};

export function stageKindLabel(kind: StageKind): string {
  return KIND_LABELS[kind];
}

/** Fallback display name for a stage with a blank `name` (mid-edit). */
export function stageDisplayName(stage: TimerStage): string {
  return stage.name.trim() || stageKindLabel(stage.kind);
}
