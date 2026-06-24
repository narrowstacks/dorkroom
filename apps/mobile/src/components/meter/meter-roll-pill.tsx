import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import type { FilmRoll } from '@/types/film-log';

function rollLabel(roll: FilmRoll): string {
  return roll.name?.trim() ? roll.name : (roll.filmStockName ?? 'Roll');
}

/** Top-of-meter pill showing which roll captures log to; tap to pick another. */
export function MeterRollPill() {
  const { roll, activeRolls, setRoll } = useMeterRoll();
  const [open, setOpen] = useState(false);
  const label = roll ? rollLabel(roll) : 'No active roll';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Logging to ${label}. Tap to change roll.`}
        style={styles.pill}
      >
        <Text style={styles.pillText} numberOfLines={1}>
          🎞 {label}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <BottomSheet
        visible={open}
        title="Log to roll"
        onClose={() => setOpen(false)}
      >
        <View className="gap-2">
          {activeRolls.length === 0 ? (
            <>
              <Text className="text-white/60">
                No active rolls. Start one to log shots from the meter.
              </Text>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  router.push('/film-log/roll-form');
                }}
                accessibilityRole="button"
                className="items-center rounded-xl bg-rose-600 px-4 py-3"
              >
                <Text className="text-base font-semibold text-white">
                  Start a roll
                </Text>
              </Pressable>
            </>
          ) : (
            activeRolls.map((r) => {
              const selected = r.id === roll?.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setRoll(r.id);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`rounded-xl px-4 py-3 ${selected ? 'bg-rose-600' : 'bg-white/5'}`}
                >
                  <Text className="text-base text-white">{rollLabel(r)}</Text>
                  <Text className="text-sm text-white/50">
                    {r.filmStockName ?? 'No film'} · {r.shots.length}{' '}
                    {r.shots.length === 1 ? 'shot' : 'shots'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevron: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
