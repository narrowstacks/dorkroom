import { CAMERA_EXPOSURE_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const CameraExposureCalculatorPage = lazy(
  () =>
    import('../app/pages/camera-exposure-calculator/camera-exposure-calculator-page')
);

export const Route = createFileRoute('/exposure')({
  ...calculatorRoute(
    'exposure',
    CAMERA_EXPOSURE_LINK_PARAMS,
    CameraExposureCalculatorPage
  ),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/exposure']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/exposure'] },
      { property: 'og:title', content: ROUTE_TITLES['/exposure'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/exposure'] },
    ],
  }),
});
