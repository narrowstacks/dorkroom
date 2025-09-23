// Legacy component - can be removed if not needed
export * from './lib/ui';

// Core UI Components
export { LabeledSliderInput } from './components/labeled-slider-input';
export { TextInput } from './components/text-input';
export { NumberInput } from './components/number-input';
export { DimensionInputGroup } from './components/dimension-input-group';
export { ToggleSwitch } from './components/toggle-switch';
export { Select } from './components/select';
export { WarningAlert } from './components/warning-alert';
export { ResultRow } from './components/result-row';
export { Drawer, DrawerContent, DrawerBody } from './components/drawer';

// Sharing Components
export { ShareButton } from './components/share-button';
export { ShareModal } from './components/share-modal';
export { SaveBeforeShareModal } from './components/save-before-share-modal';
export { Modal } from './components/modal';
export {
  DevelopmentFiltersPanel,
} from './components/development-recipes/filters-panel';
export {
  DevelopmentResultsTable,
} from './components/development-recipes/results-table';
export type {
  DevelopmentCombinationView,
} from './components/development-recipes/results-table';
export {
  DevelopmentResultsCards,
} from './components/development-recipes/results-cards';
export {
  DevelopmentRecipeDetail,
} from './components/development-recipes/recipe-detail';
export {
  CustomRecipeForm,
} from './components/development-recipes/custom-recipe-form';
export {
  DevelopmentActionsBar,
} from './components/development-recipes/actions-bar';
export {
  ImportRecipeForm,
} from './components/development-recipes/import-recipe-form';

// Calculator Components
export {
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorNumberField,
  CalculatorStat,
} from './components/calculator';

// Utilities
export { cn } from './lib/cn';
