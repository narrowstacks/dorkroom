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
    const { getByRole } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(getByRole('link', { name: /Border/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /Reciprocity/i })).toBeInTheDocument();
  });
});
