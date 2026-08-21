import { GitBranch } from 'lucide-react';

interface TrackedEvent {
  name: string;
  fires: string;
  records: string;
}

/**
 * Kept deliberately in sync with the event catalog in
 * `app/lib/analytics/events.ts`. If an event is added there, it belongs here
 * too: a privacy page that lists less than the app sends is worse than none.
 */
const TRACKED_EVENTS: TrackedEvent[] = [
  {
    name: 'share',
    fires: 'You create a share link for a preset or a recipe.',
    records: 'Which tool, and whether the link was copied or shared natively.',
  },
  {
    name: 'share_opened',
    fires: 'You open a link someone else shared with you.',
    records: 'Which tool the link points at.',
  },
  {
    name: 'recipe_saved',
    fires: 'You save a custom development recipe.',
    records:
      'Whether it was new or an edit, and whether you typed it or imported it.',
  },
  {
    name: 'recipe_deleted',
    fires: 'You delete a custom recipe.',
    records: 'Whether it was one recipe or all of them.',
  },
  {
    name: 'recipe_imported',
    fires: 'You import a recipe from filmdev.org.',
    records: 'Whether the import succeeded.',
  },
  {
    name: 'favorite_toggled',
    fires: 'You favorite or unfavorite a recipe.',
    records: 'Whether it was added or removed.',
  },
  {
    name: 'calculator_used',
    fires: 'A calculator produces a result, once per calculator per visit.',
    records:
      'Which calculator, and which mode (for example print size vs enlarger height).',
  },
  {
    name: 'preset_applied',
    fires: 'You tap a built-in preset.',
    records: 'Which calculator, and the preset value (an EV number).',
  },
  {
    name: 'theme_changed',
    fires: 'You switch themes.',
    records: 'Which theme you switched to.',
  },
  {
    name: 'units_changed',
    fires: 'You switch between imperial and metric, or change volume units.',
    records: 'Which setting, and which unit.',
  },
  {
    name: 'search_no_results',
    fires: 'A search returns nothing.',
    records:
      'Which page, and how many filters were active. Never the search text.',
  },
  {
    name: 'detail_opened',
    fires: 'You open a film or recipe detail view.',
    records: 'Whether it was a film or a recipe.',
  },
  {
    name: 'filter_applied',
    fires: 'You apply a filter.',
    records: 'Which page, and which filter control. Never the value you chose.',
  },
  {
    name: 'app_error',
    fires: 'Something crashes.',
    records:
      "Which of Dorkroom's pages you were on, chosen from a fixed list. Never the error message, and never a path you typed.",
  },
  {
    name: 'route_not_found',
    fires: 'You land on a page that does not exist.',
    records:
      'Whether you arrived from inside Dorkroom, from elsewhere, or directly.',
  },
];

const NEVER_COLLECTED = [
  'Accounts, names, email addresses, or any way to contact you.',
  'Cookies. Dorkroom sets none, for analytics or anything else.',
  'Anything you type: search terms, recipe names, notes, or print dimensions.',
  'Your saved recipes, favorites, and presets. These live in your browser and are never uploaded.',
  'IP addresses or device fingerprints stored against your activity.',
  'Any data sold, shared, or handed to advertisers. There are no ad networks here.',
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className="mb-4 text-xl font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div
        className="rounded-2xl border p-5 sm:p-6 lg:p-8"
        style={{
          backgroundColor: 'var(--settings-container-bg)',
          borderColor: 'var(--settings-container-border)',
        }}
      >
        <div className="mb-8 lg:mb-10">
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Privacy
          </h1>
          <p
            className="mt-2 text-sm sm:mt-3 sm:text-base"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            What Dorkroom measures, why, and everything it deliberately does
            not.
          </p>
        </div>

        <Section title="The short version">
          <p
            className="text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Dorkroom has no accounts and no cookies. It counts which tools get
            used so the ones people rely on keep getting attention, and it does
            that without collecting anything that could identify you or reveal
            what you were working on. Your recipes, favorites, and calculator
            settings are stored in your own browser and never leave it.
          </p>
        </Section>

        <Section title="What we use">
          <p
            className="mb-3 text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <a
              href="https://vercel.com/docs/analytics/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="underline footer-link"
            >
              Vercel Web Analytics
            </a>{' '}
            for page views and the events listed below, and Vercel Speed
            Insights for page load timings. Both are cookieless and neither
            builds a profile of you across sites or visits.
          </p>
          <p
            className="text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Every URL is stripped of its query string and hash before it is
            sent. That matters here because Dorkroom encodes real work in URLs:
            a shared border preset carries your print dimensions, and the film
            and recipe pages carry what you searched for. None of that reaches
            the analytics service.
          </p>
        </Section>

        <Section title="Every event we record">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: 'var(--color-border-secondary)' }}
                >
                  <th
                    className="py-2 pr-4 font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Event
                  </th>
                  <th
                    className="py-2 pr-4 font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    When it fires
                  </th>
                  <th
                    className="py-2 font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    What it records
                  </th>
                </tr>
              </thead>
              <tbody>
                {TRACKED_EVENTS.map((event) => (
                  <tr
                    key={event.name}
                    className="border-b align-top"
                    style={{ borderColor: 'var(--color-border-muted)' }}
                  >
                    <td className="py-3 pr-4">
                      <code
                        className="rounded-lg px-1.5 py-0.5 text-xs"
                        style={{
                          backgroundColor: 'var(--color-border-muted)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {event.name}
                      </code>
                    </td>
                    <td
                      className="py-3 pr-4"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {event.fires}
                    </td>
                    <td
                      className="py-3"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {event.records}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className="mt-4 text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Each event carries at most two of these short labels and nothing
            else. There is no identifier tying one event to another, so they
            cannot be reassembled into a session or a person.
          </p>
        </Section>

        <Section title="What we never collect">
          <ul className="space-y-2">
            {NEVER_COLLECTED.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-relaxed sm:text-base"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span aria-hidden="true">&mdash;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Opting out">
          <p
            className="text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Any content blocker or a browser&rsquo;s Do Not Track setting will
            stop analytics from loading, and nothing in Dorkroom depends on it.
            Every calculator, recipe, and film page works exactly the same with
            analytics blocked.
          </p>
        </Section>

        <Section title="Checking our work">
          <p
            className="mb-4 text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Dorkroom is open source under the AGPLv3. The full event catalog
            lives in one file, and the URL redaction it passes through is a few
            lines next to it, so you do not have to take this page&rsquo;s word
            for any of it.
          </p>
          <a
            href="https://github.com/narrowstacks/dorkroom/blob/main/apps/dorkroom/src/app/lib/analytics/events.ts"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm transition-colors footer-link"
          >
            <GitBranch className="size-4" />
            <span>Read the event catalog on GitHub</span>
          </a>
        </Section>
      </div>
    </div>
  );
}

export default PrivacyPage;
