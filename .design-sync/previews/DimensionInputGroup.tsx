import { DimensionInputGroup } from '@dorkroom/ui';
import { useState } from 'react';

// Canonical paired width/height field — custom paper size for the border calculator.
// `showUnits` appends the active measurement unit (from context) to each label.
export const CustomPaperSize = () => {
  const [width, setWidth] = useState('8');
  const [height, setHeight] = useState('10');
  return (
    <div style={{ maxWidth: 360 }}>
      <DimensionInputGroup
        widthValue={width}
        onWidthChange={setWidth}
        heightValue={height}
        onHeightChange={setHeight}
        widthLabel="Width"
        heightLabel="Height"
        widthPlaceholder="Width"
        heightPlaceholder="Height"
      />
    </div>
  );
};

// Custom aspect ratio — units hidden, empty with placeholders.
export const CustomAspectRatio = () => {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  return (
    <div style={{ maxWidth: 360 }}>
      <DimensionInputGroup
        widthValue={width}
        onWidthChange={setWidth}
        heightValue={height}
        onHeightChange={setHeight}
        widthLabel="Width:"
        heightLabel="Height:"
        widthPlaceholder="Width"
        heightPlaceholder="Height"
        showUnits={false}
      />
    </div>
  );
};
