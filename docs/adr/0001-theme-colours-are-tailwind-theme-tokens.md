# Theme colours are Tailwind `@theme` tokens, never handwritten utilities

The stylesheet grew a parallel set of handwritten utility classes that mimic
Tailwind's naming (`.text-primary`, `.bg-border-muted`, `.bg-error/10`).
Handwritten utilities get no variant generation, so every `hover:` written
against one silently emits nothing, and where a handwritten name collided with a
real `@theme` token the base class and its own hover variant resolved to two
different colours. We are moving every semantic colour into the `@theme` block
so Tailwind generates the variants, and deleting the handwritten rules.

## Considered Options

Keeping the handwritten utilities and adding a lint rule that bans `hover:` and
`focus:` prefixes on them was the cheaper change. It was rejected because it
leaves the underlying trap in place, needs maintaining forever, and does not fix
the case where two spellings of the same name mean two different colours.

## Consequences

The brand colour is `--color-brand`, not `--color-primary`. The name `primary`
now belongs unambiguously to the primary _text_ colour, which is what
`.text-primary` has always meant in this codebase and is the far more common
usage. A future reader expecting Tailwind's convention, where `primary` is the
brand colour, will find this surprising, which is why it is written down.

Hover states draw from dedicated hover-surface tokens rather than reusing border
tokens as fills. A monochrome theme (see `CONTEXT.md`) collapses many tokens to a
single value, so a hover rule that picks its background and its foreground from
two ordinary tokens can paint a control invisible. The hover-surface tokens carry
a guarantee that a unit test enforces: in every theme, the hover background
differs from the hover foreground.
