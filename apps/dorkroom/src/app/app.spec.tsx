import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

describe('App', () => {
  it('should render the app structure', () => {
    const { getByText, getByRole } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Check that the app title is rendered
    expect(getByText('Dorkroom')).toBeInTheDocument();

    // Check that main navigation is present
    expect(getByRole('main')).toBeInTheDocument();
  });

  it('should include primary navigation elements', () => {
    const { getByText, getAllByRole } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Check that navigation links are present
    const links = getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    // Check for main navigation elements
    expect(getByText('Home')).toBeInTheDocument();
    expect(getByText('Development')).toBeInTheDocument();
    expect(getByText('Printing')).toBeInTheDocument();
    expect(getByText('Shooting')).toBeInTheDocument();
  });
});
