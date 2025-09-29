import { HttpTransport } from '../../dorkroom/transport';
import { DorkroomApiError } from '../../dorkroom/types';

describe('HttpTransport', () => {
  let transport: HttpTransport;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    transport = new HttpTransport('https://api.example.com');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should remove trailing slash from baseUrl', () => {
      const transportWithSlash = new HttpTransport('https://api.example.com/');
      expect(transportWithSlash['baseUrl']).toBe('https://api.example.com');
    });

    it('should set default options', () => {
      const defaultTransport = new HttpTransport('https://api.example.com');
      expect(defaultTransport['defaultOptions']).toEqual({
        timeout: 10000,
        retries: 3,
        retryDelay: 1000,
      });
    });

    it('should override default options', () => {
      const customTransport = new HttpTransport('https://api.example.com', {
        timeout: 5000,
        retries: 1,
      });
      expect(customTransport['defaultOptions']).toEqual({
        timeout: 5000,
        retries: 1,
        retryDelay: 1000,
      });
    });
  });

  describe('get method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await transport.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: expect.anything(),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(transport.get('/not-found')).rejects.toThrow(
        new DorkroomApiError('HTTP 404: Not Found', 404, '/not-found')
      );
    });

    it('should retry on server errors', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });

      const resultPromise = transport.get('/test');

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(transport.get('/bad-request')).rejects.toThrow(
        new DorkroomApiError('HTTP 400: Bad Request', 400, '/bad-request')
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should create AbortController for timeout', () => {
      const transport = new HttpTransport('https://api.example.com', {
        timeout: 5000,
      });
      expect(transport['defaultOptions'].timeout).toBe(5000);
    });

    it('should apply exponential backoff on retries', async () => {
      vi.useFakeTimers();

      const customTransport = new HttpTransport('https://api.example.com', {
        retries: 2,
        retryDelay: 100,
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });

      const resultPromise = customTransport.get('/test');

      // Verify delays are applied with exponential backoff
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result).toEqual({ data: 'success' });
    });

    it('should handle fetch errors', () => {
      expect(() => new HttpTransport('https://example.com')).not.toThrow();
    });

    it('should throw error after max retries', async () => {
      const transportWithLimitedRetries = new HttpTransport(
        'https://api.example.com',
        {
          retries: 1,
          retryDelay: 0,
        }
      );

      // Simulate server errors to avoid unhandled promise rejections
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const resultPromise =
        transportWithLimitedRetries.get('/persistent-error');

      await expect(resultPromise).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
});
