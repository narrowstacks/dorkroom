import { Check, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SearchBar } from '@/components/development/search-bar';
import { usePhaseHue } from '@/theme/use-phase-accent';
import { useSheetBodyMaxHeight } from './form-sheet-body';
import { type GearOption, pickerRows } from './gear-picker-logic';

type Row =
  | { kind: 'none' }
  | { kind: 'add'; name: string }
  | { kind: 'option'; option: GearOption };

const rowKey = (row: Row): string =>
  row.kind === 'option' ? `option-${row.option.value}` : row.kind;

interface GearPickerFieldProps {
  label: string;
  /** The stored value: a brand's name or a mount's id. */
  value: string | undefined;
  /** What the field shows for `value` (a mount's name, or "Unknown mount"). */
  valueLabel: string | undefined;
  options: readonly GearOption[];
  onChange: (value: string | undefined) => void;
  /** Takes a name the user typed and returns the value to select (or
   * undefined to select nothing). The forms hold it until they are saved. */
  onAdd: (name: string) => string | undefined;
  /** The first row, which clears the field ("No brand"). */
  noneLabel: string;
  placeholder: string;
  searchPlaceholder: string;
}

/**
 * The Brand and Mount fields of the camera and lens forms (#733): a row with
 * the `SelectField` look that opens a searchable list. The search is the
 * shared `searchByTerms` (names and aliases, accents ignored); when the typed
 * text is not already a name or alias, an `Add "..."` row stores it as the
 * user's own and selects it.
 */
export function GearPickerField({
  label,
  value,
  valueLabel,
  options,
  onChange,
  onAdd,
  noneLabel,
  placeholder,
  searchPlaceholder,
}: GearPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const hue = usePhaseHue();
  // The search bar (and its 12pt margin) is pinned above the list.
  const [searchHeight, setSearchHeight] = useState(0);
  const listMaxHeight = useSheetBodyMaxHeight(searchHeight);

  const rows = useMemo<Row[]>(() => {
    const result = pickerRows(options, query);
    return [
      ...(result.addName
        ? [{ kind: 'add' as const, name: result.addName }]
        : []),
      ...(query.trim() === '' ? [{ kind: 'none' as const }] : []),
      ...result.rows.map((option) => ({ kind: 'option' as const, option })),
    ];
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (next: string | undefined) => {
    onChange(next);
    close();
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'add') {
      return (
        <Pressable
          onPress={() => {
            const added = onAdd(item.name);
            if (added === undefined) close();
            else choose(added);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name}`}
          className="min-h-11 flex-row items-center gap-3 py-3 active:opacity-60"
        >
          <Plus size={18} color={hue} />
          <Text className="flex-1 text-base" style={{ color: hue }}>
            Add “{item.name}”
          </Text>
        </Pressable>
      );
    }
    const selected =
      item.kind === 'none' ? value === undefined : item.option.value === value;
    const title = item.kind === 'none' ? noneLabel : item.option.label;
    const detail = item.kind === 'option' ? item.option.detail : undefined;
    return (
      <Pressable
        onPress={() =>
          choose(item.kind === 'none' ? undefined : item.option.value)
        }
        accessibilityRole="button"
        accessibilityState={{ selected }}
        className="min-h-11 flex-row items-center justify-between gap-3 py-3 active:opacity-60"
      >
        <View className="flex-1">
          <Text
            className={
              item.kind === 'none'
                ? 'text-base text-ink-70'
                : 'text-base text-white'
            }
          >
            {title}
          </Text>
          {detail ? (
            <Text className="text-sm text-ink-50" numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>
        {selected ? <Check size={18} color={hue} /> : null}
      </Pressable>
    );
  };

  return (
    <View className="gap-1">
      <Text className="text-sm text-ink-60">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueLabel ?? placeholder}`}
        className="flex-row items-center justify-between gap-3 rounded-xl border-hw border-line bg-surface px-4 py-3"
      >
        <Text
          className={
            valueLabel
              ? 'flex-1 text-base text-white'
              : 'flex-1 text-base text-ink-40'
          }
        >
          {valueLabel ?? placeholder}
        </Text>
        <Text className="text-ink-70">▾</Text>
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={close}>
        <View
          className="mb-3"
          onLayout={(event) =>
            setSearchHeight(event.nativeEvent.layout.height + 12)
          }
        >
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
          />
        </View>
        <FlatList
          data={rows}
          keyExtractor={rowKey}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: listMaxHeight }}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={EmptyState}
          renderItem={renderRow}
        />
      </BottomSheet>
    </View>
  );
}

function EmptyState() {
  return <Text className="py-6 text-center text-ink-50">No matches</Text>;
}

function ItemSeparator() {
  return <View className="h-px bg-edge" />;
}
