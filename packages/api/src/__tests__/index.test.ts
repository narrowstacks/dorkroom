import * as apiExports from '../index';

describe('API Package Exports', () => {
  it('should export DorkroomClient', () => {
    expect(apiExports.DorkroomClient).toBeDefined();
    expect(typeof apiExports.DorkroomClient).toBe('function');
  });

  it('should export HttpTransport', () => {
    expect(apiExports.HttpTransport).toBeDefined();
    expect(typeof apiExports.HttpTransport).toBe('function');
  });

  it('should export DorkroomApiError', () => {
    expect(apiExports.DorkroomApiError).toBeDefined();
    expect(typeof apiExports.DorkroomApiError).toBe('function');
  });

  it('should export all types', () => {
    // Check that types are properly exported by creating instances
    const error = new apiExports.DorkroomApiError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DorkroomApiError');

    const client = new apiExports.DorkroomClient();
    expect(client).toBeDefined();

    const transport = new apiExports.HttpTransport('https://example.com');
    expect(transport).toBeDefined();
  });
});
