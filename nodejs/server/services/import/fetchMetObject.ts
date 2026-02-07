/**
 * Stage 1 — Fetch. HTTP GET to Met API; return parsed JSON as unknown.
 * No validation, no normalization. Throw only on network failure or non-JSON response.
 */

const MET_OBJECT_URL = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';

export async function fetchMetObject(objectId: number): Promise<unknown> {
  const url = `${MET_OBJECT_URL}/${objectId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Met API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Met API response is not JSON');
  }

  const json = await response.json();
  return json as unknown;
}
