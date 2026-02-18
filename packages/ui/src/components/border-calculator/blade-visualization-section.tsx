import type { FieldApi } from '../../index';
import { CalculatorCard, ToggleSwitch } from '../../index';
import { useBorderCalculator } from './border-calculator-context';

/**
 * Section for controlling blade and blade reading visibility in the preview
 * Allows toggling display of easel blades and measurement readings
 */
export function BladeVisualizationSection() {
  const { form } = useBorderCalculator();

  return (
    <CalculatorCard
      title="Blade Visualization"
      description="Show or hide blades and measurements in the preview."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="showBlades">
          {(field: FieldApi<boolean>) => (
            <ToggleSwitch
              label="Show easel blades"
              value={field.state.value}
              onValueChange={(value: boolean) => {
                field.handleChange(value);
              }}
            />
          )}
        </form.Field>
        <form.Field name="showBladeReadings">
          {(field: FieldApi<boolean>) => (
            <ToggleSwitch
              label="Show blade readings"
              value={field.state.value}
              onValueChange={(value: boolean) => {
                field.handleChange(value);
              }}
            />
          )}
        </form.Field>
      </div>
    </CalculatorCard>
  );
}
