import { render } from '@testing-library/react';

import ReactDemoLogic from './logic';

describe('ReactDemoLogic', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ReactDemoLogic />);
    expect(baseElement).toBeTruthy();
  });
});
