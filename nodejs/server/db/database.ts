import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import type { ArtworkDocument } from '../models/Artwork.js';
import { loadDemoDataAsArtworkDocuments } from '../services/import/loadDemoData.js';

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  /** Get database instance */
  if (db === null) {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
    const dbName = process.env.DB_NAME || 'tema';
    client = new MongoClient(mongodbUri);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  }
  return db;
}

export async function initDb(): Promise<void> {
  /** Initialize database with demo artworks if empty */
  const db = await getDb();
  const artworksCollection = db.collection<ArtworkDocument>('artworks');

  // Check if artworks already exist
  const count = await artworksCollection.countDocuments({});

  if (count === 0) {
    const documents = await loadDemoDataAsArtworkDocuments(new Date());
    if (documents.length > 0) {
      await artworksCollection.insertMany(documents);
      console.log(`Inserted ${documents.length} demo artworks into database`);
    } else {
      console.log('No demo artwork data found; skipping seed');
    }
  } else {
    console.log(`Database already contains ${count} artworks`);
  }
}
