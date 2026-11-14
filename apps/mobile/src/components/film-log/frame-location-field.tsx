import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/button';
import { requestFrameLocation } from '@/lib/frame-location';
import {
  describeLocation,
  isUsableLocation,
} from '@/lib/frame-location-format';
import type { ShotLocationFields } from '@/schemas/film-log.schema';
import { usePhaseHue } from '@/theme/use-phase-accent';

type Notice = 'denied' | 'servicesOff' | 'unavailable' | 'timeout' | null;

const DENIED_TEXT =
  'Location is turned off for Dorkroom. Turn it on in Settings.';
const SERVICES_OFF_TEXT =
  'Location Services are off for this iPhone. Turn them on in Settings, under Privacy & Security.';
const UNAVAILABLE_TEXT = "Couldn't get a location. Try again.";
const TIMEOUT_TEXT =
  'Still no location. Try again somewhere with a clearer view of the sky.';

interface FrameLocationFieldProps {
  /** The location on the frame, or undefined for none. */
  location: ShotLocationFields | undefined;
  onChange: (location: ShotLocationFields | undefined) => void;
  /** Called with true while a fix is being found, so the parent can hold Log or Save. */
  onBusyChange?: (busy: boolean) => void;
}

function noticeText(notice: Exclude<Notice, null>): string {
  switch (notice) {
    case 'denied':
      return DENIED_TEXT;
    case 'servicesOff':
      return SERVICES_OFF_TEXT;
    case 'timeout':
      return TIMEOUT_TEXT;
    case 'unavailable':
      return UNAVAILABLE_TEXT;
  }
}

const announce = (message: string) =>
  AccessibilityInfo.announceForAccessibility(message);

/**
 * "Add location" for one frame. Nothing is looked up until the user taps it,
 * the first tap is what raises iOS's permission prompt, and the result is only
 * handed to `onChange`: the parent decides whether it is ever stored. Foreground
 * only, no place-name lookup.
 */
export function FrameLocationField({
  location,
  onChange,
  onBusyChange,
}: FrameLocationFieldProps) {
  const hue = usePhaseHue();
  const [finding, setFinding] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // Bumped on unmount and on Remove, so a late answer is dropped.
  const attempt = useRef(0);
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    []
  );

  const add = async () => {
    if (finding) return;
    const mine = ++attempt.current;
    setFinding(true);
    onBusyChange?.(true);
    setNotice(null);
    const result = await requestFrameLocation();
    if (attempt.current !== mine) return;
    setFinding(false);
    onBusyChange?.(false);
    // The tapped button unmounts when a location arrives, so say what happened.
    // Never the coordinates.
    if (result.status === 'ok') {
      onChange(result.location);
      announce('Location added');
    } else {
      setNotice(result.status);
      announce(noticeText(result.status));
    }
  };

  const remove = () => {
    attempt.current += 1;
    setNotice(null);
    onChange(undefined);
  };

  if (isUsableLocation(location) && location) {
    const { text, accuracy } = describeLocation(location);
    const spoken = accuracy ? `${text}, ${accuracy}` : text;
    return (
      <View className="min-h-11 flex-row items-center gap-3 rounded-xl border-hw border-line bg-surface px-4">
        <SymbolView name="location.fill" size={20} tintColor={hue} />
        <Text
          accessibilityLabel={`Location: ${spoken}`}
          className="flex-1 text-base text-white"
        >
          {text}
          {accuracy ? (
            <Text className="text-sm text-ink-60">{`  ${accuracy}`}</Text>
          ) : null}
        </Text>
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          accessibilityLabel="Remove location"
          className="min-h-11 justify-center active:opacity-80"
        >
          <Text className="text-base text-ink-60">Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => void add()}
        disabled={finding}
        accessibilityRole="button"
        accessibilityLabel={finding ? 'Finding location' : 'Add location'}
        accessibilityState={{ busy: finding }}
        className="min-h-11 flex-row items-center gap-3 rounded-xl border-hw border-line bg-surface px-4 active:opacity-80"
      >
        <SymbolView name="location" size={20} tintColor={hue} />
        <Text className="flex-1 text-base text-white">
          {finding ? 'Finding location…' : 'Add location'}
        </Text>
      </Pressable>
      {notice === 'denied' || notice === 'servicesOff' ? (
        <View className="gap-2">
          <Text className="text-sm text-ink-60">{noticeText(notice)}</Text>
          <Button
            label="Open Settings"
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : notice ? (
        <Text className="text-sm text-ink-60">{noticeText(notice)}</Text>
      ) : null}
    </View>
  );
}
