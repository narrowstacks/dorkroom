/**
 * Build a change handler that reports the option table's own value type: a
 * `<select>` hands back a plain string, so look it up in the rendered options.
 * Lives here rather than beside `Select` so that component file exports only
 * components and Fast Refresh can preserve state.
 */
export function optionChangeHandler<TValue extends string>(
  items: readonly { readonly value: TValue }[],
  onChange: (value: TValue) => void
): (value: string) => void {
  return (value) => {
    const item = items.find((candidate) => candidate.value === value);
    if (item) {
      onChange(item.value);
    }
  };
}
