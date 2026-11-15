import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { GlassPill } from '@/components/meter/glass-pill';
import { NeutralButton } from '@/components/neutral-button';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import {
  frameCountDisplay,
  joinFacts,
  rollLabel,
} from '@/lib/film-log-options';
import { selectableRowStyle, useSelectionTint } from '@/theme/use-phase-accent';

/** Top-of-meter pill showing which roll captures log to; tap to pick another. */
export function MeterRollPill() {
  const { roll, activeRolls, setRoll } = useMeterRoll();
  const [open, setOpen] = useState(false);
  const tint = useSelectionTint();
  const label = roll ? rollLabel(roll) : 'No roll in the camera';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Logging to ${label}. Tap to change roll.`}
      >
        <GlassPill style={styles.pill}>
          <SymbolView name="film.fill" size={15} tintColor="#ffffff" />
          <Text style={styles.pillText} numberOfLines={1}>
            {label}
          </Text>
          <SymbolView
            name="chevron.down"
            size={11}
            tintColor="rgba(255,255,255,0.5)"
          />
        </GlassPill>
      </Pressable>

      <BottomSheet
        visible={open}
        title="Log to roll"
        onClose={() => setOpen(false)}
      >
        <View className="gap-2">
          {activeRolls.length === 0 ? (
            <>
              <Text className="text-ink-60">
                No roll in the camera. Start one to log shots from the meter.
              </Text>
              <NeutralButton
                onPress={() => {
                  setOpen(false);
                  router.push('/shoot/film-log/roll-form');
                }}
                label="Start a roll"
              />
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
                  className="rounded-xl border px-4 py-3"
                  style={selectableRowStyle(tint, selected)}
                >
                  <Text className="text-base text-white">{rollLabel(r)}</Text>
                  <Text className="text-sm text-ink-50">
                    {joinFacts([
                      r.filmStockName ?? 'No film',
                      frameCountDisplay(r.shots.length),
                    ])}
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
  pill: { gap: 6, maxWidth: 240 },
  pillText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
});
