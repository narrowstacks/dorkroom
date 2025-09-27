import { Link } from 'react-router-dom';

export interface PlaceholderPageProps {
  title: string;
  summary: string;
}

export function PlaceholderPage({ title, summary }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 text-center sm:px-10">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed text-lg font-semibold"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Soon
      </div>
      <div className="space-y-3">
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h1>
        <p
          className="text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {summary}
        </p>
        <div></div>
        <p
          className="text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          We&apos;re still working on this page.
        </p>
        <div></div>
        <p
          className="text-base"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Check back shortly or head to another tool.
        </p>
      </div>
      <div className="flex justify-center">
        <Link
          to="/"
          className="rounded-full px-5 py-2 text-sm font-medium transition"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-secondary)',
            borderWidth: 1,
            backgroundColor: 'transparent',
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
