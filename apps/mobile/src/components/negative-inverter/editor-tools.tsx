import type { NegativeFilmType } from '@dorkroom/logic';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { EditorButton } from './editor-button';
import { ToolButton, ToolHint } from './editor-chrome';
import { ControlSlot } from './editor-frame';
import { toolHint } from './editor-layout';
import { InverterButton } from './inverter-button';
import type { InverterTool } from './inverter-state';
import { LIGHT_TABLE_TIPS } from './light-table-tips';
import {
  describeOrientation,
  type Orientation,
  type OrientationStep,
} from './orientation';

const TOOLS: {
  label: string;
  value: InverterTool;
  icon: SFSymbol;
  c41Only: boolean;
}[] = [
  { label: 'Crop', value: 'crop', icon: 'crop', c41Only: false },
  { label: 'Base', value: 'base', icon: 'eyedropper', c41Only: false },
  {
    label: 'Neutral',
    value: 'neutral',
    icon: 'eyedropper.halffull',
    c41Only: true,
  },
  { label: 'Rotate', value: 'rotate', icon: 'rotate.right', c41Only: false },
];

const ORIENT_BUTTONS: {
  label: string;
  step: OrientationStep;
  icon: SFSymbol;
}[] = [
  { label: 'Rotate left', step: 'rotate-left', icon: 'rotate.left' },
  { label: 'Rotate right', step: 'rotate-right', icon: 'rotate.right' },
  {
    label: 'Flip horizontally',
    step: 'flip-horizontal',
    icon: 'arrow.left.and.right.righttriangle.left.righttriangle.right',
  },
  {
    label: 'Flip vertically',
    step: 'flip-vertical',
    icon: 'arrow.up.and.down.righttriangle.up.righttriangle.down',
  },
];

export interface EditorToolsProps {
  filmType: NegativeFilmType;
  tool: InverterTool | null;
  orientation: Orientation;
  hasNeutral: boolean;
  resetDisabled: boolean;
  onTool: (tool: InverterTool | null) => void;
  onOrient: (step: OrientationStep) => void;
  onClearNeutral: () => void;
  onReset: () => void;
  /** The adjustments panel, shown while no tool is on. */
  children: ReactNode;
}

/**
 * The editor's tool row and the panel under it: the adjustments, or while a
 * tool is on, what it does, its own buttons (rotate and flip, clear the
 * neutral) and Done.
 */
export function EditorTools({
  filmType,
  tool,
  orientation,
  hasNeutral,
  resetDisabled,
  onTool,
  onOrient,
  onClearNeutral,
  onReset,
  children,
}: EditorToolsProps) {
  const tools = TOOLS.filter((t) => filmType === 'c41' || !t.c41Only);
  let extra: ReactNode = null;
  if (tool === 'rotate') {
    extra = ORIENT_BUTTONS.map((b) => (
      <EditorButton
        key={b.step}
        label={b.label}
        icon={b.icon}
        onPress={() => onOrient(b.step)}
      />
    ));
  } else if (tool === 'neutral' && hasNeutral) {
    extra = (
      <EditorButton
        label="Clear"
        icon="xmark"
        showLabel
        onPress={onClearNeutral}
      />
    );
  }

  return (
    <>
      <View
        className="flex-row items-center gap-2"
        accessibilityRole="toolbar"
        accessibilityLabel="Tool"
      >
        {tools.map((t) => {
          const selected = tool === t.value;
          return (
            <ToolButton
              key={t.value}
              label={t.label}
              icon={t.icon}
              selected={selected}
              onPress={() => onTool(selected ? null : t.value)}
            />
          );
        })}
        <EditorButton
          label="Reset adjustments"
          icon="arrow.counterclockwise"
          onPress={onReset}
          disabled={resetDisabled}
        />
      </View>

      <ControlSlot>
        {tool ? (
          <ToolHint
            hint={
              tool === 'rotate'
                ? `${toolHint('rotate')} ${describeOrientation(orientation)}.`
                : toolHint(tool)
            }
            onDone={() => onTool(null)}
            extra={extra}
          />
        ) : (
          children
        )}
      </ControlSlot>
    </>
  );
}

export interface InverterEmptyProps {
  loading: boolean;
  error: string | null;
  /** No new photo while one is being read or exported. */
  locked: boolean;
  onChoose: () => void;
  onLive: () => void;
}

/** Before a photo: what the tool does, the two ways in, and the tips. */
export function InverterEmpty({
  loading,
  error,
  locked,
  onChoose,
  onLive,
}: InverterEmptyProps) {
  return (
    <View className="flex-1">
      <Screen>
        <GlassCard className="gap-4">
          <Text className="text-base text-white/80">
            Photograph a negative on a light table, then convert it to a
            positive. Everything happens on your phone.
          </Text>
          <View className="flex-row gap-3">
            <InverterButton
              label="Choose Photo"
              primary
              onPress={onChoose}
              disabled={locked}
            />
            <InverterButton
              label="Live Camera"
              onPress={onLive}
              disabled={locked}
            />
          </View>
          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#ffffff" />
              <Text className="text-sm text-white/70">Reading photo...</Text>
            </View>
          ) : null}
          {error ? (
            <Text className="text-sm text-rose-400">{error}</Text>
          ) : null}
        </GlassCard>
        <GlassCard className="gap-2">
          <SectionLabel>Light table tips</SectionLabel>
          {LIGHT_TABLE_TIPS.map((tip) => (
            <Text key={tip} className="text-sm text-white/70">
              {`• ${tip}`}
            </Text>
          ))}
        </GlassCard>
      </Screen>
    </View>
  );
}
