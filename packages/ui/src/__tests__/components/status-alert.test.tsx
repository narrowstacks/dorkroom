import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveStatusAlert, StatusAlert } from '../../components/status-alert';

describe('LiveStatusAlert', () => {
  it('mounts an empty alert region before any message exists', () => {
    render(<LiveStatusAlert message={null} action="error" />);

    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('delivers the text into the region that was already mounted (error)', () => {
    const { rerender } = render(
      <LiveStatusAlert message={null} action="error" />
    );
    const region = screen.getByRole('alert');

    rerender(<LiveStatusAlert message="Blades overlap" action="error" />);

    expect(screen.getByRole('alert')).toBe(region);
    expect(region).toHaveTextContent('Blades overlap');
  });

  it('uses a polite status region for warnings and keeps it across changes', () => {
    const { rerender } = render(<LiveStatusAlert message="" />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    rerender(<LiveStatusAlert message="Offset is clamped" />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Offset is clamped');

    rerender(<LiveStatusAlert message={undefined} />);
    expect(region).toBeEmptyDOMElement();
  });

  it('does not nest a second live region inside its own', () => {
    render(<LiveStatusAlert message="Heads up" action="error" />);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stops announcing, but stays mounted, when announce is false', () => {
    render(<LiveStatusAlert message="Also shown elsewhere" announce={false} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Also shown elsewhere')).toBeInTheDocument();
  });
});

describe('StatusAlert omitRole', () => {
  it('renders no live role when a parent owns the live region', () => {
    render(<StatusAlert message="Inside a region" omitRole />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Inside a region')).toBeInTheDocument();
  });
});
