import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { LogFrameSheet } from '@/components/film-log/log-frame-sheet';
import { ActionRow } from '@/components/next-step-row';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { nextFrameNumber, rollLabel } from '@/lib/film-log-options';
import type { FrameReading } from '@/lib/log-frame';
import type { Shot } from '@/schemas/film-log.schema';

/** How long the row reads "Logged frame N" after a log. */
const LOGGED_MS = 2000;

interface SaveToRollActionProps {
  reading: FrameReading;
  /** Pre-filled into the sheet's notes. */
  defaultNotes?: string;
}

/**
 * "Save to roll" under a calculator's answer: opens the log-frame sheet for
 * the roll the Meter logs to. Renders nothing when there is no active roll.
 * After a log it reads "Logged frame N" for two seconds, and says so to
 * VoiceOver.
 */
export function SaveToRollAction({
  reading,
  defaultNotes,
}: SaveToRollActionProps) {
  const { roll } = useMeterRoll();
  // The roll the sheet was opened for. Open means this still is the meter's roll,
  // so losing the roll closes the sheet and it never pops open later.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [loggedFrame, setLoggedFrame] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  const hasRoll = roll !== undefined;
  useEffect(() => {
    if (!hasRoll) setOpenFor(null);
  }, [hasRoll]);

  const onLogged = useCallback((shot: Shot) => {
    setOpenFor(null);
    setLoggedFrame(shot.frameNumber);
    const message = `Logged frame ${shot.frameNumber}`;
    AccessibilityInfo.announceForAccessibility(message);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoggedFrame(null), LOGGED_MS);
  }, []);

  if (!roll) return null;

  const label = rollLabel(roll);
  const frame = nextFrameNumber(roll.shots);
  const detail =
    loggedFrame !== null
      ? `Logged frame ${loggedFrame}`
      : `${label} · frame ${frame}`;

  return (
    <>
      <ActionRow
        symbol="plus.circle"
        label="Save to roll"
        detail={detail}
        onPress={() => setOpenFor(roll.id)}
        accessibilityRole="button"
        accessibilityLabel={
          loggedFrame !== null
            ? `Save result to roll, logged frame ${loggedFrame}`
            : `Save result to roll, ${label}, frame ${frame}`
        }
      />
      <LogFrameSheet
        visible={openFor === roll.id}
        roll={roll}
        reading={reading}
        source="manual"
        defaultNotes={defaultNotes}
        onLogged={onLogged}
        onCancel={() => setOpenFor(null)}
      />
    </>
  );
}
