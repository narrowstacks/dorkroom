import { GitBranch } from 'lucide-react';

interface TrackedEvent {
  name: string;
  fires: string;
  records: string;
}

/**
 * Kept deliberately in sync with the event catalog in
 * `app/lib/analytics/tracked-events.ts`. If an event is added there, it belongs here
 * too: a privacy page that lists less than the app sends is worse than none.
 */
const TRACKED_EVENTS: TrackedEvent[] = [
  {
    name: 'share',
    fires:
      'You create a share link for a calculation, a preset, a recipe or a film. Sharing the same link again on the same page is not counted again.',
    records:
      'Which tool, and whether the link was copied, shared natively, or shown for copying by hand.',
  },
  {
    name: 'share_opened',
    fires:
      'You open a link someone else shared with you. Links from a Share button carry a source=share marker so the page can tell; links from the site search never do.',
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
    records: 'Nothing else; there is no bulk-delete action.',
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
    records:
      "Which calculator, and the preset value — an EV, a stop increment, a focal length in mm, an exposure time in seconds, or a built-in preset's position in the list (mat board sizes, border presets). Presets you save yourself are never tracked.",
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
    name: 'home_search',
    fires:
      'A search on the home page settles (once per search, not per keystroke).',
    records:
      'What kind of answer it showed (a recipe, a calculator, a list of matches, or nothing) and how many matches it listed. Never the search text.',
  },
  {
    name: 'nav_search',
    fires:
      'A search from the search button in the navigation bar settles (once per search, not per keystroke).',
    records:
      'What kind of answer it showed (a recipe, a calculator, a list of matches, or nothing) and how many matches it listed. Never the search text.',
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

const IOS_APP_PRACTICES = [
  {
    title: 'No analytics.',
    body: 'The app has no analytics, crash reporting, advertising, or tracking code, and no cookies. It does not track you, so it never shows the App Tracking Transparency prompt. The Vercel Analytics events above are for the website only.',
  },
  {
    title: 'The light meter and camera.',
    body: "The light meter reads the exposure time and ISO that the camera's own auto-exposure chooses for the scene and works out a reading from them. It does not analyze, record, or upload the camera's video frames. The negative inverter's live preview is processed on your phone too. A photo is taken only when you press the shutter, and it stays on your phone.",
  },
  {
    title: 'Photos.',
    body: 'You choose a photo for a film log shot or the negative inverter with the system photo picker, which hands the app only the photo you picked. The app adds to your Photos library only when you tap Save in the negative inverter or turn on "Also save meter photos to Photos" in Settings (off by default), and it asks iOS for add-only permission. It never reads your library.',
  },
  {
    title: 'The film log stays on your phone.',
    body: "Rolls, shots, cameras, lenses, and the photos attached to shots are stored only on your phone: the text in the app's local storage and the photos in the app's documents folder. There is no account and no sync, and none of it is uploaded. It leaves your phone only when you export or share it from the share sheet. Like other app data, iOS may include it in your device backups, depending on your backup settings. Deleting the app deletes it. The negative inverter keeps its last photo and settings in the app's private data folder the same way.",
  },
  {
    title: 'What the app sends over the network.',
    body: 'The only server the app talks to is api.dorkroom.art, to download film, developer, and recipe data. Nothing from your film log, photos, or calculators is sent. The app keeps those downloads on your phone for up to 7 days so it works offline. As with any request, your IP address reaches the server.',
  },
  {
    title: 'The per-install client ID.',
    body: "Each request carries an ID that the app makes up the first time it runs, from the time of that first launch plus random characters. It is stored on your phone, is not derived from your device, Apple ID, or advertising identifier, and is not linked to a name, email address, or any account. It exists so the API can limit how many requests each install makes per minute, instead of limiting all installs together. The API checks it, with your IP address, against a rate limit that resets every minute, using the rate-limiting service Unkey. Dorkroom's API code does not write it to logs or to a database. Deleting the app deletes the ID, and a reinstall gets a new one.",
  },
  {
    title: 'Links.',
    body: 'Privacy Policy, Support, Licenses, GitHub, Newsletter, and links inside recipes open in your browser, where the site you reach has its own policy.',
  },
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

        <Section title="The iOS app">
          <p
            className="mb-4 text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            The Dorkroom iOS app shares its calculators and film data with the
            website, but it handles data differently. The sections above
            describe the website; this section describes the app.
          </p>
          <ul className="space-y-3">
            {IOS_APP_PRACTICES.map((item) => (
              <li
                key={item.title}
                className="text-sm leading-relaxed sm:text-base"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {item.title}
                </strong>{' '}
                {item.body}
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
            href="https://github.com/narrowstacks/dorkroom/blob/main/apps/dorkroom/src/app/lib/analytics/tracked-events.ts"
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
