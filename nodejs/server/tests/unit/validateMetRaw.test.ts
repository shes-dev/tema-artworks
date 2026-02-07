/**
 * Unit tests for validateMetRaw. No DB, no network.
 * Raw input must remain immutable; no exceptions thrown.
 */

import { validateMetRaw } from '../../services/import/metValidation.js';

const validPayload = { objectID: 1, title: 'Test', artistDisplayName: 'Artist' };
const missingObjectId = { title: 'No ID' };
const partialPayload = { objectID: 2, additionalImages: 'not-an-array' };
const nullObjectId = { objectID: null };
const stringObjectId = { objectID: '123' };

describe('validateMetRaw', () => {
  it('returns status "ok" for valid MET payload', () => {
    const result = validateMetRaw(validPayload);
    expect(result.validation.status).toBe('ok');
    expect(result.validation.issues).toHaveLength(0);
  });

  it('returns status "invalid" when objectID is missing', () => {
    const result = validateMetRaw(missingObjectId);
    expect(result.validation.status).toBe('invalid');
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it('returns status "invalid" when objectID is null', () => {
    const result = validateMetRaw(nullObjectId);
    expect(result.validation.status).toBe('invalid');
  });

  it('returns status "invalid" when objectID is not a number', () => {
    const result = validateMetRaw(stringObjectId);
    expect(result.validation.status).toBe('invalid');
  });

  it('returns status "partial" for malformed/partial payload (objectID present, optional invalid)', () => {
    const result = validateMetRaw(partialPayload);
    expect(result.validation.status).toBe('partial');
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it('does not throw for any input', () => {
    expect(() => validateMetRaw(validPayload)).not.toThrow();
    expect(() => validateMetRaw(missingObjectId)).not.toThrow();
    expect(() => validateMetRaw(partialPayload)).not.toThrow();
    expect(() => validateMetRaw(null)).not.toThrow();
    expect(() => validateMetRaw({})).not.toThrow();
  });

  it('returns raw reference unchanged (immutable)', () => {
    const out1 = validateMetRaw(validPayload);
    expect(out1.raw).toBe(validPayload);

    const out2 = validateMetRaw(missingObjectId);
    expect(out2.raw).toBe(missingObjectId);

    const out3 = validateMetRaw(partialPayload);
    expect(out3.raw).toBe(partialPayload);
  });
});
