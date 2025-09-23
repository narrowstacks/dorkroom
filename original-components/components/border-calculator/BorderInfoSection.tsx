import React from 'react';
import {
  InfoSection,
  InfoText,
  InfoSubtitle,
  InfoList,
} from '@/components/ui/calculator/InfoSection';

const INFO_HOW_TO_USE = [
  '1. Select your desired aspect ratio (the ratio of your negative or image)',
  "2. Choose your paper size (the size of photo paper you're printing on)",
  '3. Set your minimum border width (at least 0.5" recommended)',
  '4. Optionally enable offsets to shift the image from center',
  '5. View the blade positions in the results section',
];

const INFO_TIPS = [
  '• Easels only provide markings for quarter-inch increments, so you are on your own for measuring the blade positions with a ruler.',
  '• For uniform borders, keep offsets at 0',
  '• The "flip paper orientation" button rotates the paper between portrait and landscape',
  '• The "flip aspect ratio" button swaps the width and height of your image',
];

export const BorderInfoSection = () => (
  <InfoSection title="About This Tool">
    <InfoText>
      The border calculator helps you determine the optimal placement of your
      enlarger easel blades when printing photos, ensuring consistent and
      aesthetically pleasing borders.
    </InfoText>

    <InfoSubtitle>How To Use:</InfoSubtitle>
    <InfoList items={INFO_HOW_TO_USE} />

    <InfoSubtitle>Blade Measurements:</InfoSubtitle>
    <InfoText>
      The measurements shown are distances from the edge of your enlarger
      baseboard to where each blade should be positioned. For non-standard paper
      sizes (sizes that don&apos;t have a standard easel slot), follow the
      instructions to place your paper in the appropriate easel slot.
    </InfoText>

    <InfoSubtitle>Tips:</InfoSubtitle>
    <InfoList items={INFO_TIPS} />
  </InfoSection>
);
