import type { ReactNode } from 'react';
import {
  type RecipeActions,
  RecipeActionsContext,
  RecipeDataContext,
  type RecipeDataState,
  type RecipeModalsActions,
  RecipeModalsContext,
  type RecipeModalsState,
  RecipeUIContext,
  type RecipeUIState,
} from './recipe-context';

/**
 * Props for the RecipeProvider component.
 */
export interface RecipeProviderProps {
  children: ReactNode;
  modals: RecipeModalsState & RecipeModalsActions;
  data: RecipeDataState;
  actions: RecipeActions;
  ui: RecipeUIState;
}

/**
 * Provider component that makes recipe context available to children.
 *
 * This allows incremental adoption: wrap parts of the component tree
 * with this provider to enable context-based access to recipe state.
 *
 * @example
 * ```tsx
 * <RecipeProvider modals={modals} data={data} actions={actions} ui={ui}>
 *   <RecipeModals />
 *   <RecipeResultsSection />
 * </RecipeProvider>
 * ```
 */
export function RecipeProvider({
  children,
  modals,
  data,
  actions,
  ui,
}: RecipeProviderProps) {
  return (
    <RecipeModalsContext value={modals}>
      <RecipeDataContext value={data}>
        <RecipeActionsContext value={actions}>
          <RecipeUIContext value={ui}>{children}</RecipeUIContext>
        </RecipeActionsContext>
      </RecipeDataContext>
    </RecipeModalsContext>
  );
}
