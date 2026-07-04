import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

function safeCompare(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireTemaApiKey(): RequestHandler {
  return (req, res, next) => {
    const expectedApiKey = process.env.TEMA_API_KEY;
    const providedApiKey = req.header('x-tema-api-key');

    if (
      typeof expectedApiKey !== 'string' ||
      expectedApiKey.length === 0 ||
      typeof providedApiKey !== 'string' ||
      !safeCompare(providedApiKey, expectedApiKey)
    ) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}
