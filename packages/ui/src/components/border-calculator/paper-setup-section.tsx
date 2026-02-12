import type { SelectItem } from '@dorkroom/logic';
import { useStore } from '@tanstack/react-store';
import type { FieldApi, FormInstance } from '../../index';
import { DimensionInputGroup, Select } from '../../index';
import { CalculatorCard } from '../calculator/calculator-card';

interface PaperSetupSectionProps {
  form: FormInstance;
  displayPaperSizes: SelectItem[];
  paperWidthInput: string;
  paperHeightInput: string;
  onPaperWidthChange: (value: string) => void;
  onPaperWidthBlur: () => void;
  onPaperHeightChange: (value: string) => void;
  onPaperHeightBlur: () => void;
  aspectRatios: SelectItem[];
  customAspectWidth: number;
  customAspectHeight: number;
}

/**
 * Section for selecting paper size and aspect ratio
 * Allows selection of preset sizes or custom dimensions
 */
export function PaperSetupSection({
  form,
  displayPaperSizes,
  paperWidthInput,
  paperHeightInput,
  onPaperWidthChange,
  onPaperWidthBlur,
  onPaperHeightChange,
  onPaperHeightBlur,
  aspectRatios,
  customAspectWidth,
  customAspectHeight,
}: PaperSetupSectionProps) {
  const aspectRatio = useStore(form.store, (state) => state.values.aspectRatio);
  const paperSize = useStore(form.store, (state) => state.values.paperSize);

  return (
    <CalculatorCard
      title="Print Setup"
      description="Set your paper size and desired aspect ratio."
    >
      <div className="space-y-3.5">
        <form.Field name="aspectRatio">
          {(field: FieldApi<string>) => (
            <Select
              label="Aspect Ratio"
              selectedValue={field.state.value}
              onValueChange={(value: string) => {
                field.handleChange(value);
                form.setFieldValue('isRatioFlipped', false);
              }}
              items={aspectRatios}
              placeholder="Select"
            />
          )}
        </form.Field>

        {aspectRatio === 'custom' && (
          <form.Field name="customAspectWidth">
            {(widthField: FieldApi<number>) => (
              <form.Field name="customAspectHeight">
                {(heightField: FieldApi<number>) => (
                  <DimensionInputGroup
                    widthValue={String(widthField.state.value)}
                    onWidthChange={(value: string) => {
                      const numValue = Number(value) || 0;
                      widthField.handleChange(numValue);
                      if (numValue > 0) {
                        form.setFieldValue(
                          'lastValidCustomAspectWidth',
                          numValue
                        );
                      }
                    }}
                    heightValue={String(heightField.state.value)}
                    onHeightChange={(value: string) => {
                      const numValue = Number(value) || 0;
                      heightField.handleChange(numValue);
                      if (numValue > 0) {
                        form.setFieldValue(
                          'lastValidCustomAspectHeight',
                          numValue
                        );
                      }
                    }}
                    widthLabel="Width"
                    heightLabel="Height"
                    widthPlaceholder="Width"
                    heightPlaceholder="Height"
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )}

        <form.Field name="paperSize">
          {(field: FieldApi<string>) => (
            <Select
              label="Paper Size"
              selectedValue={field.state.value}
              onValueChange={(value: string) => {
                field.handleChange(value);
                const isCustom = value === 'custom';
                if (isCustom) {
                  // For custom paper, calculate orientation based on actual dimensions
                  const shouldBeLandscape =
                    customAspectWidth < customAspectHeight;
                  form.setFieldValue('isLandscape', shouldBeLandscape);
                } else {
                  // For standard paper sizes, default to landscape
                  form.setFieldValue('isLandscape', true);
                }
                form.setFieldValue('isRatioFlipped', false);
                form.setFieldValue('hasManuallyFlippedPaper', false);
              }}
              items={displayPaperSizes}
              placeholder="Select"
            />
          )}
        </form.Field>

        {paperSize === 'custom' && (
          <DimensionInputGroup
            widthValue={paperWidthInput}
            onWidthChange={onPaperWidthChange}
            onWidthBlur={onPaperWidthBlur}
            heightValue={paperHeightInput}
            onHeightChange={onPaperHeightChange}
            onHeightBlur={onPaperHeightBlur}
            widthLabel="Width"
            heightLabel="Height"
            widthPlaceholder="Width"
            heightPlaceholder="Height"
          />
        )}
      </div>
    </CalculatorCard>
  );
}
