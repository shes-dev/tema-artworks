import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import type { IArtworkDAL } from './dal/artworkDAL.types.js';
import { MongoArtworkDAL } from './dal/mongodbArtworkDAL.js';
import { initDb } from './db/database.js';
import importRouter from './routes/import.js';
import importsRouter from './routes/imports.js';
import { createCollectionRouter } from './routes/collection.js';
import { createDailyArtworkRouter } from './routes/dailyArtwork.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

export function createApp(artworkDAL: IArtworkDAL) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/', importRouter);
  app.use('/', importsRouter);
  app.use('/', createCollectionRouter(artworkDAL));
  app.use('/', createDailyArtworkRouter(artworkDAL));

  // Root route
  app.get('/', (req, res) => {
    res.json({ message: 'Artwork Collection API' });
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'tema-artworks-api',
    });
  });

  // Error handler - must have 4 parameters (err, req, res, next)
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const statusCode = (err as { statusCode?: number }).statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  // 404 handler - must be last and must NOT call next()
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
}

// Initialize database and start server
export async function startServer() {
  try {
    const artworkDAL = new MongoArtworkDAL();
    await initDb();
    await artworkDAL.ensureIndexes();
    const app = createApp(artworkDAL);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

const isDirectExecution =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  void startServer();
}

