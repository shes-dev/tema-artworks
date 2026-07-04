import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../../app.js';
import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import { selectDailyMetObjectId } from '../../services/dailyArtwork.js';

function makeDoc(sourceObjectId: number): ArtworkDocument {
  return {
    source: 'met',
    sourceObjectId,
    raw: { objectID: sourceObjectId },
    normalized: {
      title: 'Authorized Artwork',
      artistName: 'Authorized Artist',
      objectDate: '1901',
      images: {
        primary: 'https://example.com/authorized.jpg',
        additional: [],
      },
      tags: [],
    },
    validation: { status: 'ok', issues: [] },
    metadata: { importedAt: new Date('2026-07-04T00:00:00.000Z'), version: 'v1' },
  };
}

function createDal(doc: ArtworkDocument | null): IArtworkDAL {
  return {
    persistArtwork: async (persistedDoc) => persistedDoc,
    findBySourceId: async () => doc,
    findCollectionPage: async () => ({ items: [], total: 0 }),
    findLastImportedObjectIds: async () => [],
  };
}

async function startServer(dal: IArtworkDAL): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp(dal);
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe('dailyArtwork routes', () => {
  const originalTemaApiKey = process.env.TEMA_API_KEY;

  afterEach(() => {
    if (originalTemaApiKey == null) {
      delete process.env.TEMA_API_KEY;
    } else {
      process.env.TEMA_API_KEY = originalTemaApiKey;
    }
  });

  it('returns 401 when the API key is missing', async () => {
    process.env.TEMA_API_KEY = 'test-secret';
    const dateKey = '2026-07-04';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const { server, baseUrl } = await startServer(createDal(makeDoc(sourceObjectId)));

    try {
      const response = await fetch(`${baseUrl}/daily-artwork?date_key=${dateKey}`);
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    } finally {
      await stopServer(server);
    }
  });

  it('returns 401 when the API key is invalid', async () => {
    process.env.TEMA_API_KEY = 'test-secret';
    const dateKey = '2026-07-04';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const { server, baseUrl } = await startServer(createDal(makeDoc(sourceObjectId)));

    try {
      const response = await fetch(`${baseUrl}/daily-artwork?date_key=${dateKey}`, {
        headers: { 'x-tema-api-key': 'wrong-secret' },
      });
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    } finally {
      await stopServer(server);
    }
  });

  it('fails closed when TEMA_API_KEY is not configured', async () => {
    delete process.env.TEMA_API_KEY;
    const dateKey = '2026-07-04';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const { server, baseUrl } = await startServer(createDal(makeDoc(sourceObjectId)));

    try {
      const response = await fetch(`${baseUrl}/daily-artwork?date_key=${dateKey}`, {
        headers: { 'x-tema-api-key': 'test-secret' },
      });
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    } finally {
      await stopServer(server);
    }
  });

  it('returns the daily artwork payload for a valid API key', async () => {
    process.env.TEMA_API_KEY = 'test-secret';
    const dateKey = '2026-07-04';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const { server, baseUrl } = await startServer(createDal(makeDoc(sourceObjectId)));

    try {
      const response = await fetch(`${baseUrl}/daily-artwork?date_key=${dateKey}`, {
        headers: { 'x-tema-api-key': 'test-secret' },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          date_key: dateKey,
          title: 'Authorized Artwork',
          artist: 'Authorized Artist',
          object_date: '1901',
          source: 'met',
          source_object_id: sourceObjectId,
        })
      );
    } finally {
      await stopServer(server);
    }
  });

  it('rejects malformed date_key values', async () => {
    process.env.TEMA_API_KEY = 'test-secret';
    const dateKey = '2026-99-99';
    const sourceObjectId = selectDailyMetObjectId('2026-07-04');
    const { server, baseUrl } = await startServer(createDal(makeDoc(sourceObjectId)));

    try {
      const response = await fetch(`${baseUrl}/daily-artwork?date_key=${dateKey}`, {
        headers: { 'x-tema-api-key': 'test-secret' },
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: 'date_key must be YYYY-MM-DD',
      });
    } finally {
      await stopServer(server);
    }
  });

  it('returns a small process health payload without auth', async () => {
    const { server, baseUrl } = await startServer(createDal(null));

    try {
      const response = await fetch(`${baseUrl}/healthz`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        service: 'tema-artworks-api',
      });
    } finally {
      await stopServer(server);
    }
  });
});
