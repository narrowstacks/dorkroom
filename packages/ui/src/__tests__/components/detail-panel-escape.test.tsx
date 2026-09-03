import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../../components/confirm-modal';
import { DetailPanel } from '../../components/detail-panel/detail-panel';

describe('DetailPanel escape layering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('closes on Escape when it is the only open layer', () => {
    const onClose = vi.fn();
    render(
      <DetailPanel
        isOpen={true}
        onClose={onClose}
        isMobile={false}
        ariaLabel="Panel"
      >
        <div>Panel body</div>
      </DetailPanel>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the panel open when a confirm dialog above it takes the Escape', () => {
    const onPanelClose = vi.fn();
    const onConfirmClose = vi.fn();
    render(
      <>
        <DetailPanel
          isOpen={true}
          onClose={onPanelClose}
          isMobile={false}
          ariaLabel="Panel"
        >
          <div>Panel body</div>
        </DetailPanel>
        <ConfirmModal
          isOpen={true}
          onClose={onConfirmClose}
          onConfirm={vi.fn()}
          title="Delete Recipe"
          message="Are you sure?"
        />
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onConfirmClose).toHaveBeenCalledTimes(1);
    expect(onPanelClose).not.toHaveBeenCalled();
  });
});
