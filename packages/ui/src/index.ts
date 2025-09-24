// Legacy component - can be removed if not needed
export * from './lib/ui';

// Core UI Components
export { LabeledSliderInput } from './components/labeled-slider-input';
export { TextInput } from './components/text-input';
export { NumberInput } from './components/number-input';
export { DimensionInputGroup } from './components/dimension-input-group';
export { ToggleSwitch } from './components/toggle-switch';
export { Select } from './components/select';
export { SearchableSelect } from './components/searchable-select';
export { NavigationDropdown } from './components/navigation-dropdown';
export type {
  NavigationItem,
  NavigationDropdownProps,
} from './components/navigation-dropdown';
export { WarningAlert } from './components/warning-alert';
export { ResultRow } from './components/result-row';
export { Drawer, DrawerContent, DrawerBody } from './components/drawer';
export { Tag } from './components/ui/tag';
export {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
} from './components/ui/skeleton';

// Sharing Components
export { ShareButton } from './components/share-button';
export { ShareModal } from './components/share-modal';
export { SaveBeforeShareModal } from './components/save-before-share-modal';
export { Modal } from './components/modal';
export { DevelopmentFiltersPanel } from './components/development-recipes/filters-panel';
export { DevelopmentResultsTable } from './components/development-recipes/results-table';
export type { DevelopmentCombinationView } from './components/development-recipes/results-table';
export { DevelopmentResultsCards } from './components/development-recipes/results-cards';
export { DevelopmentRecipeDetail } from './components/development-recipes/recipe-detail';
export { CustomRecipeForm } from './components/development-recipes/custom-recipe-form';
export { DevelopmentActionsBar } from './components/development-recipes/actions-bar';
export { ImportRecipeForm } from './components/development-recipes/import-recipe-form';
export { SharedRecipeModal } from './components/development-recipes/shared-recipe-modal';
export { TemperatureUnitToggle } from './components/development-recipes/temperature-unit-toggle';

// Calculator Components
export {
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorNumberField,
  CalculatorStat,
} from './components/calculator';

// Utilities
export { cn } from './lib/cn';

// Temperature
export {
  TemperatureProvider,
  useTemperature,
} from './contexts/temperature-context';
export type { TemperatureUnit } from './lib/temperature';
