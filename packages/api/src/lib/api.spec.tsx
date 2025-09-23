import { render } from '@testing-library/react';

import DorkroomApi from './api';

describe('DorkroomApi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DorkroomApi />);
    expect(baseElement).toBeTruthy();
  });
});
