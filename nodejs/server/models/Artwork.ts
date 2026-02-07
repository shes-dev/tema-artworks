/**
 * Canonical artwork document type and Zod schemas.
 * Contract definition only — no DAL, Mongo, import pipeline, or business logic.
 * This file defines what an artwork is; everything else in the system must obey it.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export type ArtworkSource = 'met';

/**
 * Validation status rules (documentation only; no runtime enforcement here):
 * - "ok"       → required identifiers present; normalized document built successfully
 * - "partial"  → identifier present; normalized built with missing/failed optional fields
 * - "invalid"  → missing sourceObjectId or structurally unusable input
 */
export type ArtworkValidationStatus = 'ok' | 'partial' | 'invalid';

export interface ArtworkValidationIssue {
  field: string;
  reason: string;
}

export interface ArtworkNormalized {
  title?: string;
  artistName?: string;
  objectDate?: string;
  yearStart?: number;
  yearEnd?: number;
  medium?: string;
  classification?: string;
  images: {
    primary?: string;
    additional: string[];
  };
  tags: string[];
}

/**
 * importedAt = last successful import time.
 * version = ingestion-logic version (e.g. "v1"), NOT app release version.
 */
export interface ArtworkMetadata {
  importedAt: Date;
  version: string;
}

export interface ArtworkDocument {
  source: ArtworkSource;
  sourceObjectId: number;
  normalized: ArtworkNormalized;
  raw: unknown;
  validation: {
    status: ArtworkValidationStatus;
    issues: ArtworkValidationIssue[];
  };
  metadata: ArtworkMetadata;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/**
 * MET API raw response schema. Used for safe parsing only; never mutate.
 * Passthrough allows all other fields from the API without validation errors.
 */
export const MetRawArtworkSchema = z
  .object({
    objectID: z.number(),
    title: z.string().optional(),
    artistDisplayName: z.string().optional(),
    objectDate: z.string().optional(),
    medium: z.string().optional(),
    department: z.string().optional(),
    primaryImage: z.string().optional(),
    primaryImageSmall: z.string().optional(),
    additionalImages: z.array(z.string()).optional(),
  })
  .passthrough();

export type MetRawArtwork = z.infer<typeof MetRawArtworkSchema>;

export const ArtworkNormalizedSchema = z.object({
  title: z.string().optional(),
  artistName: z.string().optional(),
  objectDate: z.string().optional(),
  yearStart: z.number().optional(),
  yearEnd: z.number().optional(),
  medium: z.string().optional(),
  classification: z.string().optional(),
  images: z.object({
    primary: z.string().optional(),
    additional: z.array(z.string()).default([]),
  }),
  tags: z.array(z.string()).default([]),
});

export const ArtworkValidationSchema = z.object({
  status: z.enum(['ok', 'partial', 'invalid']),
  issues: z.array(
    z.object({
      field: z.string(),
      reason: z.string(),
    })
  ),
});

/**
 * version = ingestion logic version (e.g. "v1"), not app release version.
 */
export const ArtworkMetadataSchema = z.object({
  importedAt: z.date(),
  version: z.string(),
});

export const ArtworkDocumentSchema = z.object({
  source: z.literal('met'),
  sourceObjectId: z.number(),
  normalized: ArtworkNormalizedSchema,
  raw: z.unknown(),
  validation: ArtworkValidationSchema,
  metadata: ArtworkMetadataSchema,
});
