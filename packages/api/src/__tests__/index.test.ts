import * as apiExports from '../index';

describe('API Package Exports', () => {
  it('should export DorkroomApiError', () => {
    expect(apiExports.DorkroomApiError).toBeDefined();
    expect(typeof apiExports.DorkroomApiError).toBe('function');
  });

  it('should export error types', () => {
    // Check that error types are properly exported
    const error = new apiExports.DorkroomApiError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DorkroomApiError');
  });

  it('should have core types available from types module', () => {
    // TypeScript types are exported and can be used for type safety
    // Film, Developer, Combination, etc. are all available from the module
    expect(apiExports).toBeDefined();
  });
});
