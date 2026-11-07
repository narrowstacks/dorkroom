import {
  buildFStopTable,
  exactThirds,
  formatExposureTime,
  formatFStopTableSeconds,
  FSTOP_TABLE_ROW_STEPS,
  type FStopTableRowDenominator,
} from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import { CalculatorCard } from '@dorkroom/ui/calculator';
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface FStopChartCardProps {
  /** Exposure the table centres on, in seconds. */
  baseTime: number;
  /** The current stop adjustment; its column is marked when there is one. */
  stops: number;
}

const MATCH_TOLERANCE = 1e-6;

const DODGE_TINT =
  'bg-[color:color-mix(in_oklab,var(--accent-sky-text)_7%,transparent)]';
const BURN_TINT =
  'bg-[color:color-mix(in_oklab,var(--accent-amber-text)_7%,transparent)]';
const CURRENT_COLUMN_TINT =
  'bg-[color:color-mix(in_oklab,var(--accent-blue-text)_16%,transparent)]';
const BASE_ROW_TINT =
  'bg-[color:color-mix(in_oklab,var(--accent-blue-text)_24%,var(--color-surface))]';

/** Sub-pixel slack so a fully scrolled table never reads as "more to see". */
const SCROLL_END_SLACK = 1;

/**
 * Sideways scroller that fades its right edge while more columns sit off
 * screen, so a phone user can tell the burn columns are there.
 */
const SideScroller: FC<{ children: ReactNode }> = ({ children }) => {
  const scrollerRef = useRef<HTMLElement>(null);
  const [hasMoreRight, setHasMoreRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setHasMoreRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_END_SLACK
    );
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const content = el.firstElementChild;
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [update]);

  return (
    <div className="relative">
      <section
        ref={scrollerRef}
        onScroll={update}
        aria-label="Dodge and burn times, scrolls sideways"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a sideways scroller; Safari never makes scroll containers focusable, so without this keyboard users cannot reach the off-screen burn columns
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-[color:var(--color-border-secondary)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
      >
        {children}
      </section>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-px right-px w-12 rounded-r-xl bg-gradient-to-l from-[color:var(--color-surface)] to-transparent transition-opacity',
          hasMoreRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

export const FStopChartCard: FC<FStopChartCardProps> = ({
  baseTime,
  stops,
}) => {
  const [denominator, setDenominator] = useState<FStopTableRowDenominator>(6);
  const table = buildFStopTable(baseTime, denominator);
  if (!table) return null;

  const adjustedStops = exactThirds(stops);
  const dodgeCount = table.columns.filter((column) => column.stops < 0).length;
  const burnCount = table.columns.length - dodgeCount;
  const isCurrentColumn = (columnStops: number) =>
    Math.abs(columnStops - adjustedStops) < MATCH_TOLERANCE;

  return (
    <CalculatorCard
      title="F-stop printing table"
      description={`Seconds to dodge or burn, for base times within a stop of your ${formatExposureTime(baseTime)} exposure.`}
      padding="compact"
    >
      <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="float-left mr-1 text-xs text-tertiary">
          Rows every
        </legend>
        {FSTOP_TABLE_ROW_STEPS.map((option) => {
          const selected = option.denominator === denominator;
          return (
            <button
              key={option.denominator}
              type="button"
              aria-pressed={selected}
              onClick={() => setDenominator(option.denominator)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
                selected
                  ? 'border-[color:var(--color-text-primary)] bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
                  : 'themed-button'
              )}
            >
              {option.label} stop
            </button>
          );
        })}
      </fieldset>

      <SideScroller>
        <table className="w-full border-collapse font-mono text-xs tabular-nums">
          <caption className="sr-only">
            Seconds to dodge or burn by stop change, for each base exposure
          </caption>
          <thead>
            <tr className="text-xs font-sans uppercase tracking-wider">
              <th className="sticky left-0 bg-[color:var(--color-surface)]">
                <span className="sr-only">Stop change</span>
              </th>
              <th
                scope="colgroup"
                colSpan={dodgeCount}
                className={cn(
                  'px-2 pt-2 pb-1 text-center font-semibold text-[color:var(--accent-sky-text)]',
                  DODGE_TINT
                )}
              >
                ← Dodge
              </th>
              <th
                scope="colgroup"
                colSpan={burnCount}
                className={cn(
                  'px-2 pt-2 pb-1 text-center font-semibold text-[color:var(--accent-amber-text)]',
                  BURN_TINT
                )}
              >
                Burn →
              </th>
            </tr>
            <tr className="border-b border-[color:var(--color-border-secondary)]">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-[color:var(--color-surface)] px-3 py-2 text-left font-sans font-medium text-[color:var(--color-text-secondary)]"
              >
                Base
              </th>
              {table.columns.map((column) => (
                <th
                  key={column.stops}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-2 py-2 text-right font-semibold text-[color:var(--color-text-primary)]',
                    column.stops < 0 ? DODGE_TINT : BURN_TINT,
                    isCurrentColumn(column.stops) && CURRENT_COLUMN_TINT
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => {
              const isBase = row.step === 0;
              const isWholeStop = row.step % denominator === 0;
              return (
                <tr
                  key={row.step}
                  className={cn(
                    'border-t',
                    isWholeStop
                      ? 'border-[color:var(--color-border-primary)]'
                      : 'border-[color:var(--color-border-muted)]',
                    isBase
                      ? cn(BASE_ROW_TINT, 'font-bold')
                      : 'text-[color:var(--color-text-secondary)]'
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 whitespace-nowrap border-r border-[color:var(--color-border-secondary)] px-3 py-1.5 text-left',
                      isBase
                        ? BASE_ROW_TINT
                        : 'bg-[color:var(--color-surface)]',
                      isWholeStop || isBase
                        ? 'font-bold text-[color:var(--color-text-primary)]'
                        : 'font-medium text-[color:var(--color-text-primary)]'
                    )}
                  >
                    {formatFStopTableSeconds(row.time)}
                    <span className="ml-2 font-sans text-xs font-normal text-[color:var(--color-text-tertiary)]">
                      {isBase ? 'yours' : row.label}
                    </span>
                  </th>
                  {row.adjustments.map((seconds, index) => {
                    const column = table.columns[index];
                    return (
                      <td
                        key={column.stops}
                        className={cn(
                          'px-2 py-1.5 text-right',
                          isCurrentColumn(column.stops) && CURRENT_COLUMN_TINT,
                          isBase && 'text-[color:var(--color-text-primary)]'
                        )}
                      >
                        {formatFStopTableSeconds(seconds)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SideScroller>

      <p className="text-xs text-tertiary">
        Find your base time in the left column, then read across: dodge columns
        give the seconds to hold back, burn columns the seconds to add. Times
        are in seconds; bold rows fall on whole stops.
      </p>
    </CalculatorCard>
  );
};
