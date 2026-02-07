/**
 * Unit tests for fetchMetObject with mocked HTTP.
 * We mock global fetch; no network. Assert JSON returned and that we do not validate/normalize.
 * Type is unknown at runtime; we only assert the function returns the parsed body.
 */

import { jest } from '@jest/globals';
import { fetchMetObject } from '../../services/import/fetchMetObject.js';

const mockJson = { objectID: 123, title: 'Test' };

const defaultMockResponse = {
  ok: true,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => mockJson,
};

let mockFetch: ReturnType<typeof jest.fn>;

beforeEach(() => {
  mockFetch = jest.fn(async () => defaultMockResponse);
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchMetObject', () => {
  it('returns parsed JSON as the response body', async () => {
    const result = await fetchMetObject(123);
    expect(result).toEqual(mockJson);
  });

  it('returns type unknown (caller may narrow)', async () => {
    const result = await fetchMetObject(1);
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  it('calls the expected URL', async () => {
    await fetchMetObject(456);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/456'
    );
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    await expect(fetchMetObject(999)).rejects.toThrow(/Met API error/);
  });

  it('throws when content-type is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => ({}),
    });
    await expect(fetchMetObject(1)).rejects.toThrow(/not JSON/);
  });
});
