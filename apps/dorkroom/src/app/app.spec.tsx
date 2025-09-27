import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

describe('App', () => {
  it('should render the homepage hero', () => {
    const { getByText } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(getByText('Skip the math. Make prints.')).toBeInTheDocument();
  });

  it('should include primary navigation links', () => {
    const { getAllByRole } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    const links = getAllByRole('link');
    const borderLinks = links.filter(link => 
      (link as HTMLElement).textContent?.toLowerCase().includes('border')
    );
    const reciprocityLinks = links.filter(link => 
      (link as HTMLElement).textContent?.toLowerCase().includes('reciprocity')
    );

    expect(borderLinks.length).toBeGreaterThan(0);
    expect(reciprocityLinks.length).toBeGreaterThan(0);
  });
});
