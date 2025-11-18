/**
 * Infobase Coming Soon Page
 * Displayed when the INFOBASE feature flag is disabled
 */

import type { FC } from 'react';
import { Book, Calendar, FileText, Users } from 'lucide-react';

export const InfobaseComingSoonPage: FC = () => {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-12">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="rounded-full p-6"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.5)',
              border: '2px solid var(--color-border-secondary)',
            }}
          >
            <Book
              className="h-16 w-16"
              style={{ color: 'var(--color-text-secondary)' }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Infobase Coming Soon
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            We're building a comprehensive knowledge base for film photography.
            Check back soon!
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid gap-4 sm:grid-cols-2 pt-4">
          <div
            className="rounded-2xl p-6 text-left"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
              border: '1px solid var(--color-border-muted)',
            }}
          >
            <FileText
              className="h-6 w-6 mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Film Profiles
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Detailed information about film stocks, characteristics, and usage
              tips
            </p>
          </div>

          <div
            className="rounded-2xl p-6 text-left"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
              border: '1px solid var(--color-border-muted)',
            }}
          >
            <Calendar
              className="h-6 w-6 mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Developer Database
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Comprehensive guide to developers and their properties
            </p>
          </div>

          <div
            className="rounded-2xl p-6 text-left"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
              border: '1px solid var(--color-border-muted)',
            }}
          >
            <Book
              className="h-6 w-6 mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Technique Guides
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Step-by-step tutorials for various darkroom techniques
            </p>
          </div>

          <div
            className="rounded-2xl p-6 text-left"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
              border: '1px solid var(--color-border-muted)',
            }}
          >
            <Users
              className="h-6 w-6 mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Community Recipes
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Tested and proven recipes from the photography community
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-4">
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Want to help build this feature?{' '}
            <a
              href="https://github.com/narrowstacks/dorkroom"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 transition hover:opacity-80"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Contribute on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InfobaseComingSoonPage;
