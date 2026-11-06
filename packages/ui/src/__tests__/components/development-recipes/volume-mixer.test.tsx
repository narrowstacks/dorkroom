import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VolumeMixer } from '../../../components/development-recipes/volume-mixer';
import { VolumeProvider } from '../../../contexts/volume-context';

const renderMixer = (props: Parameters<typeof VolumeMixer>[0]) =>
  render(
    <VolumeProvider>
      <VolumeMixer {...props} />
    </VolumeProvider>
  );

describe('VolumeMixer', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('points its label at the input', () => {
    const { container } = renderMixer({ dilutionString: '1+1' });
    const label = container.querySelector('label');
    const input = container.querySelector('input');
    expect(label?.htmlFor).toBeTruthy();
    expect(label?.htmlFor).toBe(input?.id);
  });

  it('draws no presets unless asked', () => {
    renderMixer({ dilutionString: '1+1' });
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('draws the presets it is given', () => {
    renderMixer({ dilutionString: '1+1', presetsMl: [250, 750] });
    expect(
      screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))
    ).toEqual(['250 ml', '750 ml']);
  });

  it('keeps what is typed in fl oz instead of rewriting it per keystroke', () => {
    localStorage.setItem('dorkroom-volume-unit', 'floz');
    renderMixer({ dilutionString: '1+1' });
    const input = screen.getByLabelText('Total volume');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12' } });
    expect(input).toHaveValue(12);
    fireEvent.change(input, { target: { value: '16.9' } });
    expect(input).toHaveValue(16.9);
    fireEvent.blur(input);
    expect(input).toHaveValue(16.9);
  });

  it('lets the ml field be cleared, and restores it on blur', () => {
    renderMixer({ dilutionString: '1+1' });
    const input = screen.getByLabelText('Total volume');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.blur(input);
    expect(input).toHaveValue(500);
  });

  it('drops a typed draft when a preset is picked with the input still focused', () => {
    renderMixer({ dilutionString: '1+1', presetsMl: [500, 1000] });
    const input = screen.getByLabelText('Total volume');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '750' } });
    expect(screen.getAllByText('375 ml')).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: '500 ml' }));
    expect(input).toHaveValue(500);
    expect(screen.getAllByText('250 ml')).toHaveLength(2);
  });

  it('drops a typed draft when the unit changes', () => {
    renderMixer({ dilutionString: '1+1' });
    const input = screen.getByLabelText('Total volume');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '750' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Volume unit' }));
    expect(input).toHaveValue(25.4);
  });

  it('sizes the touch controls only with presets', () => {
    const { unmount } = renderMixer({ dilutionString: '1+1' });
    expect(screen.getByLabelText('Total volume').className).not.toContain(
      'min-h-11'
    );
    unmount();
    renderMixer({ dilutionString: '1+1', presetsMl: [500] });
    expect(screen.getByLabelText('Total volume').className).toContain(
      'min-h-11'
    );
    expect(
      screen.getByRole('switch', { name: 'Volume unit' }).className
    ).toContain('min-h-11');
  });
});
