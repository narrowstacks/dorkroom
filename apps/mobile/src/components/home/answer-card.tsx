import type { BorderDiagram, HomeAnswer } from '@dorkroom/logic';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { diagramSize } from './diagram';

interface AnswerCardProps {
  answer: HomeAnswer;
  /** Label the card as an example rather than an answer to the query. */
  example?: string;
  onOpen: () => void;
}

const DIAGRAM_BOX = 112;

/** Long figures step down a size so the number stays on one line. */
function figureSize(text: string): string {
  if (text.length > 16) return 'text-2xl';
  if (text.length > 12) return 'text-3xl';
  if (text.length > 8) return 'text-4xl';
  return 'text-5xl';
}

/** Paper and print to scale, as on the easel. */
function EaselDiagram({ diagram }: { diagram: BorderDiagram }) {
  const { paper, print } = diagramSize(diagram, DIAGRAM_BOX);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Print centered on the paper"
      style={{ width: paper.width, height: paper.height }}
      className="rounded-sm bg-white/90"
    >
      <View
        style={{
          position: 'absolute',
          left: print.x,
          top: print.y,
          width: print.width,
          height: print.height,
        }}
        className="bg-zinc-700"
      />
    </View>
  );
}

/** One answer from the Home search: the number, how it was read, and where to go next. */
export function AnswerCard({ answer, example, onOpen }: AnswerCardProps) {
  const diagram = answer.kind === 'border' ? answer.diagram : null;
  return (
    <GlassCard className="gap-4">
      {example ? (
        <Text className="text-xs font-medium uppercase tracking-wide text-white/40">
          Example: “{example}”
        </Text>
      ) : null}

      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-base font-semibold text-white">
          {answer.title}
        </Text>
        <View className="rounded-lg bg-white/10 px-2 py-0.5">
          <Text className="text-xs text-white/70">{answer.badge}</Text>
        </View>
      </View>

      {answer.readAs.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="text-xs text-white/40">Read as</Text>
          {answer.readAs.map((reading) => (
            <View
              key={reading.text}
              className={`rounded-lg px-2 py-0.5 ${reading.assumed ? 'border border-dashed border-white/30' : 'bg-white/10'}`}
            >
              <Text
                className={`text-xs ${reading.assumed ? 'text-white/50' : 'text-white/70'}`}
              >
                {reading.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {answer.notice ? (
        <Text className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white">
          {answer.notice}
        </Text>
      ) : null}

      {answer.figure || diagram ? (
        <View className="flex-row items-center justify-between gap-4">
          {answer.figure ? (
            <View className="min-w-0 flex-1 gap-1">
              <Text
                className={`${figureSize(`${answer.figure.value} ${answer.figure.unit ?? ''}`.trim())} font-semibold text-white`}
                accessibilityLabel={`${answer.figure.value} ${answer.figure.unit ?? ''}`.trim()}
              >
                {answer.figure.value}
                {answer.figure.unit ? (
                  <Text className="text-xl font-normal text-white/60">
                    {` ${answer.figure.unit}`}
                  </Text>
                ) : null}
              </Text>
              <Text className="text-sm text-white/60">
                {answer.figure.caption}
              </Text>
            </View>
          ) : null}
          {diagram ? <EaselDiagram diagram={diagram} /> : null}
        </View>
      ) : null}

      {answer.facts.length > 0 ? (
        <View className="flex-row flex-wrap gap-x-4 gap-y-3">
          {answer.facts.map((fact) => (
            <View
              key={fact.label}
              className="w-[46%] gap-0.5 border-t border-white/10 pt-2"
            >
              <Text className="text-xs text-white/40">{fact.label}</Text>
              <Text
                className={`text-sm ${fact.missing ? 'text-white/40' : 'font-medium text-white'}`}
              >
                {fact.value}
                {fact.detail ? (
                  <Text className="text-xs font-normal text-white/40">
                    {` ${fact.detail}`}
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {answer.notes.map((note) => (
        <Text key={note} className="text-sm text-white/60">
          {note}
        </Text>
      ))}

      <View className="gap-1">
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${answer.link.label}: ${answer.title}`}
          className="flex-row items-center gap-1.5 self-start rounded-full bg-white/10 px-4 py-2.5 active:opacity-60"
        >
          <Text className="text-sm font-medium text-rose-400">
            {answer.link.label}
          </Text>
          <ArrowRight size={14} color="#fb7185" />
        </Pressable>
        {answer.footnote ? (
          <Text className="text-xs text-white/40">{answer.footnote}</Text>
        ) : null}
      </View>
    </GlassCard>
  );
}
