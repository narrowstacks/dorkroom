import { Link } from '@tanstack/react-router';
import { Aperture, ArrowLeft, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border-secondary)',
          }}
        >
          <Aperture
            className="h-12 w-12"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
        </div>

        {/* 404 */}
        <p
          className="mb-2 text-sm font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          404
        </p>

        {/* Heading */}
        <h1
          className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Nothing on this frame
        </h1>

        {/* Description */}
        <p
          className="mb-10 max-w-md text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Looks like this page was never exposed. Check the URL or head back to
          the darkroom.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors hero-button-success"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
