import { render } from '@testing-library/react';

import DorkroomUi from './ui';

describe('DorkroomUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DorkroomUi />);
    expect(baseElement).toBeTruthy();
  });
});
