import { DorkroomApiError } from '../../dorkroom/types';

describe('Types', () => {
  describe('DorkroomApiError', () => {
    it('should create error with message only', () => {
      const error = new DorkroomApiError('Test error');

      expect(error.name).toBe('DorkroomApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
      expect(error.endpoint).toBeUndefined();
    });

    it('should create error with status code', () => {
      const error = new DorkroomApiError('Not found', 404);

      expect(error.name).toBe('DorkroomApiError');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.endpoint).toBeUndefined();
    });

    it('should create error with all parameters', () => {
      const error = new DorkroomApiError('Server error', 500, '/api/films');

      expect(error.name).toBe('DorkroomApiError');
      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe('/api/films');
    });

    it('should be instance of Error', () => {
      const error = new DorkroomApiError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DorkroomApiError);
    });

    it('should have correct stack trace', () => {
      const error = new DorkroomApiError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DorkroomApiError');
    });
  });
});
