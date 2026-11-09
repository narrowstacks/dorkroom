import { fireEvent, render, screen } from '@testing-library/react';
import { Crop } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { CalculatorLayout } from '../../components/calculator/calculator-layout';
import { CalculatorPageHeader } from '../../components/calculator/calculator-page-header';
import { PageTitleBar } from '../../components/calculator/page-title-bar';

const ABOUT = 'Work out where to set the easel blades.';

describe('CalculatorPageHeader', () => {
  it('renders the title as the only h1', () => {
    render(
      <CalculatorPageHeader title="Border Calculator" description={ABOUT} />
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Border Calculator');
  });

  it('collapses the description behind an info toggle', () => {
    render(
      <CalculatorPageHeader title="Border Calculator" description={ABOUT} />
    );
    const toggle = screen.getByRole('button', {
      name: 'About Border Calculator',
    });
    const region = document.getElementById(
      toggle.getAttribute('aria-controls') ?? ''
    );

    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(region).not.toBeNull();
    expect(region).toHaveTextContent(ABOUT);
    expect(region).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(region).toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(region).not.toBeVisible();
  });

  it('renders no info toggle without a description', () => {
    render(<CalculatorPageHeader title="Tool" />);

    expect(
      screen.queryByRole('button', { name: 'About Tool' })
    ).not.toBeInTheDocument();
  });

  it('wires Share and Reset, committing a focused field before sharing', () => {
    const calls: string[] = [];
    const onReset = vi.fn();
    render(
      <>
        <input aria-label="Width" onBlur={() => calls.push('blur')} />
        <CalculatorPageHeader
          title="Tool"
          description={ABOUT}
          onShare={() => calls.push('share')}
          onReset={onReset}
        />
      </>
    );
    screen.getByRole('textbox', { name: 'Width' }).focus();

    fireEvent.click(
      screen.getByRole('button', { name: 'Share this calculation' })
    );
    expect(calls).toEqual(['blur', 'share']);

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('disables Share when shareDisabled is set', () => {
    render(
      <CalculatorPageHeader
        title="Tool"
        description={ABOUT}
        onShare={() => undefined}
        shareDisabled
      />
    );

    expect(
      screen.getByRole('button', { name: 'Share this calculation' })
    ).toBeDisabled();
  });

  it('renders the eyebrow and the extra children row', () => {
    render(
      <CalculatorPageHeader
        title="Tool"
        description={ABOUT}
        eyebrow="Format Comparison"
        icon={Crop}
        accentTone="indigo"
      >
        <button type="button">Mode</button>
      </CalculatorPageHeader>
    );

    expect(screen.getByText('Format Comparison')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mode' })).toBeInTheDocument();
  });
});

describe('CalculatorLayout title placement', () => {
  it('renders its own header by default', () => {
    render(
      <CalculatorLayout title="Tool" description={ABOUT}>
        <div>inputs</div>
      </CalculatorLayout>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tool');
  });

  it('leaves the h1 to the card when titleInCard is set', () => {
    render(
      <CalculatorLayout titleInCard>
        <section aria-label="Preview">
          <PageTitleBar title="Tool" description={ABOUT} />
        </section>
      </CalculatorLayout>
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Preview' })).toContainElement(
      headings[0] ?? null
    );
  });
});
