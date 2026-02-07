/**
 * Stage 2 — Validation. Zod passthrough; collect issues via safeParse.
 * Never throw for bad external data. Set status: invalid (missing objectID), partial (objectID present, optional invalid), ok.
 */

import type { ArtworkValidationIssue, ArtworkValidationStatus } from '../../models/Artwork.js';
import { MetRawArtworkSchema } from '../../models/Artwork.js';

export interface ValidationResult {
  status: ArtworkValidationStatus;
  issues: ArtworkValidationIssue[];
}

function zodIssuesToValidationIssues(
  path: string,
  message: string
): ArtworkValidationIssue {
  return { field: path || 'root', reason: message };
}

export function validateMetRaw(raw: unknown): { raw: unknown; validation: ValidationResult } {
  const result = MetRawArtworkSchema.safeParse(raw);

  if (result.success) {
    return {
      raw,
      validation: { status: 'ok', issues: [] },
    };
  }

  const issues: ArtworkValidationIssue[] = result.error.issues.map((issue) =>
    zodIssuesToValidationIssues(
      issue.path.length > 0 ? issue.path.join('.') : 'root',
      issue.message
    )
  );

  const rawObj = raw as Record<string, unknown>;
  const hasValidObjectID = typeof rawObj?.objectID === 'number';
  const status: ArtworkValidationStatus = hasValidObjectID ? 'partial' : 'invalid';

  return {
    raw,
    validation: { status, issues },
  };
}
