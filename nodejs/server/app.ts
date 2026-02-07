import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoArtworkDAL } from './dal/mongodbArtworkDAL.js';
import { initDb } from './db/database.js';
import importRouter from './routes/import.js';
import importsRouter from './routes/imports.js';
import { createCollectionRouter } from './routes/collection.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Shared artwork DAL for read APIs; indexes ensured at startup
const artworkDAL = new MongoArtworkDAL();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', importRouter);
app.use('/', importsRouter);
app.use('/', createCollectionRouter(artworkDAL));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Artwork Collection API' });
});

// Error handler - must have 4 parameters (err, req, res, next)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler - must be last and must NOT call next()
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDb();
    await artworkDAL.ensureIndexes();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

