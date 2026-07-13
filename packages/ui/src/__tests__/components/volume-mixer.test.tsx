import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VolumeMixer } from '../../components/development-recipes/volume-mixer';
import { VolumeProvider } from '../../contexts/volume-context';

function renderMixer(dilutionString: string) {
  return render(
    <VolumeProvider>
      <VolumeMixer dilutionString={dilutionString} />
    </VolumeProvider>
  );
}

describe('VolumeMixer', () => {
  it('renders the concentrate+water caption and derived volumes for "1:31" (Ilfotec HC dilution B) with the 500ml default', () => {
    renderMixer('1:31');

    // Caption states the interpreted ratio explicitly, including the raw
    // dilution string and total parts, so the on-screen convention is
    // unambiguous next to the "1:31" label sourced from the recipe data.
    expect(
      screen.getByText(
        '1 part concentrate + 31 parts water (1:31 = 32 parts total)'
      )
    ).toBeInTheDocument();

    // 500ml default / 32 total parts = 15.625ml concentrate, 484.375ml water.
    // formatVolume rounds to 0 decimals for the "ml" unit: 16 ml / 484 ml.
    expect(screen.getByText('16 ml')).toBeInTheDocument();
    expect(screen.getByText('484 ml')).toBeInTheDocument();
  });

  it('renders the stock message for "stock" with no volume breakdown', () => {
    renderMixer('stock');

    expect(
      screen.getByText('No mixing needed: use developer stock (undiluted).')
    ).toBeInTheDocument();
    expect(screen.queryByText('Developer')).not.toBeInTheDocument();
    expect(screen.queryByText('Water')).not.toBeInTheDocument();
  });
});
