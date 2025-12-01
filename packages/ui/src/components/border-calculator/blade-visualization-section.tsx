import type { FieldApi, FormInstance } from '../../index';
import { CalculatorCard, ToggleSwitch } from '../../index';

interface BladeVisualizationSectionProps {
  form: FormInstance;
}

/**
 * Section for controlling blade and blade reading visibility in the preview
 * Allows toggling display of easel blades and measurement readings
 */
export function BladeVisualizationSection({
  form,
}: BladeVisualizationSectionProps) {
  return (
    <CalculatorCard
      title="Blade Visualization"
      description="Control the display of easel blades and measurements on the preview."
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
