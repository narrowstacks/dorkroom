import type { BorderDiagram, HomeAnswer } from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { type MouseEventHandler, type ReactNode, useId } from 'react';
import { activeOptionClass } from './result-sections';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

/** Paper and print to scale, as on the easel. */
function EaselDiagram({
  diagram,
  label,
}: {
  diagram: BorderDiagram;
  label: string;
}) {
  const pad = 0.4;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${diagram.paperW + pad * 2} ${diagram.paperH + pad * 2}`}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an inline SVG drawn from the answer; role="img" with a label is how it is announced
      role="img"
      aria-label={label}
      className="h-auto w-full max-w-[12rem] sm:max-w-[14rem]"
    >
      <rect
        className="search-easel-paper"
        x={0}
        y={0}
        width={diagram.paperW}
        height={diagram.paperH}
        rx={0.08}
        strokeWidth={0.06}
      />
      <rect
        className="search-easel-print"
        x={diagram.printX}
        y={diagram.printY}
        width={diagram.printW}
        height={diagram.printH}
        strokeWidth={0.04}
      />
    </svg>
  );
}

/**
 * A fact's value, with a power written "t^1.54" set as a superscript. Screen
 * readers hear "to the power" rather than a bare number run on.
 */
function FactValue({ value }: { value: string }) {
  const power = /^(.*)\^([\d.]+)$/.exec(value);
  if (!power) return value;
  return (
    <>
      {power[1]}
      <span className="sr-only"> to the power </span>
      <sup>{power[2]}</sup>
    </>
  );
}

/**
 * A figure's text with each fraction ("5⁄16") set in the body font, which
 * draws it as a small diagonal fraction like the facts below; the display
 * font would draw a full-size slash that runs into the whole number.
 */
function FigureValue({ value }: { value: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const match of value.matchAll(/\d+⁄\d+/g)) {
    parts.push(
      value.slice(at, match.index),
      <span
        key={match.index}
        className="ml-[0.12em]"
        style={{ fontFamily: 'var(--font-family-sans)' }}
      >
        {match[0]}
      </span>
    );
    at = match.index + match[0].length;
  }
  parts.push(value.slice(at));
  return parts;
}

/** Long figures step down a size, so the number stays on one line. */
function figureSize(text: string): string {
  if (text.length > 16) return 'text-2xl sm:text-4xl';
  if (text.length > 12) return 'text-3xl sm:text-5xl';
  if (text.length > 8) return 'text-4xl sm:text-5xl';
  return 'text-5xl sm:text-6xl';
}

interface AnswerCardProps {
  answer: HomeAnswer;
  /** Label the card as an example rather than an answer to the visitor's query. */
  example?: string;
  /** The link's element id, so the search box can scroll it into view. */
  linkId?: string;
  /**
   * Mark the link as the search box's active option. The option itself sits
   * in the results listbox for screen readers; this is what the eye follows.
   */
  highlighted?: boolean;
  /** Called when the answer's link is clicked (the nav dialog closes on it). */
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
}

/** One answer from the site search: the number, how it was read, and where to go next. */
export function AnswerCard({
  answer,
  example,
  linkId,
  highlighted = false,
  onNavigate,
  className,
}: AnswerCardProps) {
  const titleId = useId();
  const diagram = answer.kind === 'border' ? answer.diagram : null;
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] p-4 sm:p-5',
        className
      )}
    >
      {example ? (
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
          Example:{' '}
          <span className="normal-case tracking-normal">“{example}”</span>
        </p>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-2">
        <h2
          id={titleId}
          className="font-semibold text-[color:var(--color-text-primary)]"
        >
          {answer.title}
        </h2>
        <span className="rounded-lg border border-[color:var(--color-border-secondary)] px-2 py-0.5 text-xs text-[color:var(--color-text-secondary)]">
          {answer.badge}
        </span>
      </header>

      {answer.readAs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[color:var(--color-text-tertiary)]">
            Read as
          </span>
          {answer.readAs.map((reading) => (
            <span
              key={reading.text}
              className={cn(
                'rounded-lg border px-2 py-0.5',
                reading.assumed
                  ? 'border-dashed border-[color:var(--color-border-primary)] text-[color:var(--color-text-tertiary)]'
                  : 'border-[color:var(--color-border-secondary)] text-[color:var(--color-text-secondary)]'
              )}
            >
              {reading.text}
            </span>
          ))}
        </div>
      ) : null}

      {answer.notice ? (
        <p className="rounded-lg border border-[color:var(--color-border-primary)] px-3 py-2 text-sm font-medium text-[color:var(--color-text-primary)]">
          {answer.notice}
        </p>
      ) : null}

      {answer.figure || diagram ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {answer.figure ? (
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <span
                className={cn(
                  'whitespace-nowrap font-semibold leading-none tracking-tight text-[color:var(--color-text-primary)]',
                  figureSize(
                    `${answer.figure.value} ${answer.figure.unit ?? ''}`.trim()
                  )
                )}
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                <FigureValue value={answer.figure.value} />
                {answer.figure.unit ? (
                  <span className="ml-1 text-[0.4em] font-normal text-[color:var(--color-text-secondary)]">
                    {answer.figure.unit}
                  </span>
                ) : null}
              </span>
              <span className="text-sm text-[color:var(--color-text-secondary)]">
                {answer.figure.caption}
              </span>
            </p>
          ) : null}
          {diagram && answer.figure ? (
            <EaselDiagram
              diagram={diagram}
              label={`${answer.title}: a ${answer.figure.value} ${answer.figure.unit ?? ''} print, centred`}
            />
          ) : null}
        </div>
      ) : null}

      {answer.facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {answer.facts.map((fact) => (
            <div
              key={fact.label}
              className="border-t border-[color:var(--color-border-secondary)] pt-2"
            >
              <dt className="text-xs text-[color:var(--color-text-tertiary)]">
                {fact.label}
              </dt>
              <dd
                className={cn(
                  'text-sm',
                  fact.missing
                    ? 'text-[color:var(--color-text-tertiary)]'
                    : 'font-medium text-[color:var(--color-text-primary)]'
                )}
              >
                {fact.href ? (
                  <a
                    href={fact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('underline underline-offset-2', focusRing)}
                  >
                    {fact.value}
                  </a>
                ) : (
                  <FactValue value={fact.value} />
                )}
                {fact.detail ? (
                  <span className="ml-1 text-xs font-normal text-[color:var(--color-text-tertiary)]">
                    {fact.detail}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {answer.notes.map((note) => (
        <p
          key={note}
          className="text-sm text-[color:var(--color-text-secondary)]"
        >
          {note}
        </p>
      ))}

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          to={answer.link.target.to}
          search={answer.link.target.search}
          id={linkId}
          onClick={onNavigate}
          className={cn(
            '-mx-1.5 inline-flex scroll-my-24 items-center gap-1 rounded-lg px-1.5 py-0.5 text-sm font-medium text-[color:var(--color-text-primary)] underline decoration-[color:var(--color-border-primary)] underline-offset-4 transition-colors hover:decoration-[color:var(--color-text-primary)]',
            highlighted && activeOptionClass,
            focusRing
          )}
        >
          {answer.link.label}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
        {answer.footnote ? (
          <span className="text-xs text-[color:var(--color-text-tertiary)]">
            {answer.footnote}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
