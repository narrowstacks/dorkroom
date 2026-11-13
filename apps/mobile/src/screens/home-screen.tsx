import {
  BORDER_CALCULATOR_STORAGE_KEY,
  type HomeLinkTarget,
  searchHome,
  suggestHome,
} from '@dorkroom/logic';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SearchBar } from '@/components/development/search-bar';
import { GlassCard } from '@/components/glass-card';
import { AnswerCard } from '@/components/home/answer-card';
import { ResultGroups } from '@/components/home/result-groups';
import { ResumeSections } from '@/components/home/resume-sections';
import { HomeSettingsButton } from '@/components/home/settings-button';
import { SuggestionList } from '@/components/home/suggestion-list';
import { TryChips } from '@/components/home/try-chips';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCameras, useLenses, useRolls } from '@/hooks/use-film-log';
import { useHomeSearchData } from '@/hooks/use-home-search-data';
import { useMeasurementUnit } from '@/hooks/use-measurement-unit';
import {
  homeDestination,
  type HomeRoute,
  homeRouteDestination,
  toolHref,
} from '@/lib/home/destination';
import { summarizeEasel } from '@/lib/home/easel-summary';
import { matchFilmLog } from '@/lib/home/film-log-matches';
import { recentRecipeRows } from '@/lib/home/recent-recipes';
import { homeToolIds } from '@/lib/home/tool-matches';
import { toHref } from '@/lib/href';
import { sharedStorage } from '@/lib/mmkv-storage';
import {
  getRecentRecipeIds,
  getRecentToolIds,
  isFirstHomeLaunch,
  markHomeSeen,
} from '@/lib/recent-store';
import { getTool, SETTINGS_ROUTE } from '@/lib/tools';

const FILM_LOG_ROUTE = getTool('film-log')?.route ?? '/shoot/film-log';

/** What the empty box shows on a first launch: a real answer, worked out like any other. */
const EXAMPLE_QUERY = '8x10 35mm 1/2';

/** What Home resumes from, read fresh from storage. */
function readResume() {
  return {
    firstLaunch: isFirstHomeLaunch(),
    toolIds: getRecentToolIds(),
    recipeIds: getRecentRecipeIds(),
    easelRaw: sharedStorage.getString(BORDER_CALCULATOR_STORAGE_KEY),
  };
}

export function HomeScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const settled = useDebouncedValue(query, 150);
  const searching = settled.trim() !== '';
  const [unit] = useMeasurementUnit();

  // Native tabs keep Home mounted, so re-read on every focus: a tool opened,
  // a recipe viewed or an easel saved elsewhere shows up on return. The read
  // comes before markHomeSeen, so the first visit still shows the example and
  // the next one gives way to the resume sections.
  const [resume, setResume] = useState(readResume);
  useFocusEffect(
    useCallback(() => {
      setResume(readResume());
      markHomeSeen();
    }, [])
  );

  const { data, loadError } = useHomeSearchData(
    searching || focused || resume.recipeIds.length > 0
  );
  const result = useMemo(
    () => (searching ? searchHome(settled, data) : null),
    [searching, settled, data]
  );
  const suggestions = useMemo(
    () => (searching ? suggestHome(settled, data) : []),
    [searching, settled, data]
  );
  // Tools by their iOS labels as well as the shared (web) words.
  const toolIds = useMemo(
    () => (result ? homeToolIds(result.groups, settled) : []),
    [result, settled]
  );
  // The film log is local, so it matches even while the catalog is loading.
  const rolls = useRolls();
  const cameras = useCameras();
  const lenses = useLenses();
  const filmLog = useMemo(
    () =>
      searching
        ? matchFilmLog(settled, { rolls, cameras, lenses })
        : { rolls: [], cameras: [] },
    [searching, settled, rolls, cameras, lenses]
  );
  const hasFilmLogMatches = filmLog.rolls.length + filmLog.cameras.length > 0;
  const example = useMemo(() => searchHome(EXAMPLE_QUERY).answer, []);

  const easel = useMemo(
    () => summarizeEasel(resume.easelRaw, unit),
    [resume.easelRaw, unit]
  );
  const recentRecipes = useMemo(
    () => recentRecipeRows(resume.recipeIds, data),
    [resume.recipeIds, data]
  );
  const hasResume =
    easel !== null || resume.toolIds.length > 0 || recentRecipes.length > 0;
  const showExample = !searching && (resume.firstLaunch || !hasResume);

  // `withAnchor` puts the phase's hub under the tool when its tab has not been
  // opened yet, so Back from a tool opened here goes to the hub.
  const go = (path: string) =>
    router.navigate(toHref(path), { withAnchor: true });
  const openTarget = (target: HomeLinkTarget) =>
    go(homeDestination(target, Date.now()));
  const openRoute = (route: HomeRoute) => go(homeRouteDestination(route));

  const answer = result?.answer ?? null;
  // Camera exposure questions get a plain link to the calculator, not a card.
  const cameraLink = answer?.kind === 'camera_exposure' ? answer : null;
  const card = answer && !cameraLink ? answer : null;

  return (
    <Screen>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            placeholder="Ask: hp5 at 800 in dd-x"
          />
        </View>
        <HomeSettingsButton
          onPress={() => router.navigate(toHref(SETTINGS_ROUTE))}
        />
      </View>

      {!searching ? <TryChips onTry={setQuery} /> : null}

      {searching ? (
        <SuggestionList suggestions={suggestions} onPick={setQuery} />
      ) : null}

      {card ? (
        <AnswerCard answer={card} onOpen={() => openTarget(card.link.target)} />
      ) : null}

      {cameraLink ? (
        <GlassCard className="gap-2">
          <Text className="text-base font-semibold text-white">
            {cameraLink.title}
          </Text>
          {cameraLink.notes.map((note) => (
            <Text key={note} className="text-sm text-ink-60">
              {note}
            </Text>
          ))}
          <Text
            onPress={() => openTarget(cameraLink.link.target)}
            accessibilityRole="button"
            className="pt-1 text-sm font-medium text-rose-400"
          >
            {cameraLink.link.label}
          </Text>
        </GlassCard>
      ) : null}

      {result && !answer && result.pending ? (
        <GlassCard>
          <Text className="text-sm text-ink-60">
            {loadError ?? 'Loading recipes and films…'}
          </Text>
        </GlassCard>
      ) : null}

      {result &&
      !answer &&
      !result.pending &&
      result.groups.length === 0 &&
      toolIds.length === 0 &&
      !hasFilmLogMatches ? (
        <GlassCard className="gap-3">
          <Text className="text-sm text-ink-60">
            Nothing matches that yet. Name a film, a developer or a size, or try
            one of these.
          </Text>
          <TryChips onTry={setQuery} />
        </GlassCard>
      ) : null}

      {result ? (
        <ResultGroups
          groups={result.groups}
          toolIds={toolIds}
          filmLog={filmLog}
          onOpen={openTarget}
          onOpenTool={(id) => go(toolHref(id))}
          onOpenRoll={(id) =>
            go(`${FILM_LOG_ROUTE}/roll/${encodeURIComponent(id)}`)
          }
          onOpenGear={() => go(`${FILM_LOG_ROUTE}/gear`)}
        />
      ) : null}

      {showExample && example ? (
        <View className="gap-2">
          <SectionLabel>Example</SectionLabel>
          <AnswerCard
            answer={example}
            example={EXAMPLE_QUERY}
            onOpen={() => openTarget(example.link.target)}
          />
        </View>
      ) : null}

      {!searching && !showExample ? (
        <ResumeSections
          easel={easel}
          recentToolIds={resume.toolIds}
          recentRecipes={recentRecipes}
          onOpenEasel={() => openRoute('/border')}
          onOpenTool={(id) => go(toolHref(id))}
          onOpenRecipe={(id) =>
            go(`/develop/recipes/recipe/${encodeURIComponent(id)}`)
          }
        />
      ) : null}
    </Screen>
  );
}
