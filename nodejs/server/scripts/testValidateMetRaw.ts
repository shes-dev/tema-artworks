/**
 * Phase 3 — Test Stage 2: validateMetRaw classifies ok / invalid / partial; raw untouched.
 */

import { validateMetRaw } from '../services/import/metValidation.js';

const valid = { objectID: 1, title: 'Test' };
const invalid = { title: 'No ID' };
const partialPayload = { objectID: 2, additionalImages: 'not-an-array' };

(function run() {
  const out1 = validateMetRaw(valid);
  const out2 = validateMetRaw(invalid);
  const out3 = validateMetRaw(partialPayload);

  console.log('Valid:', out1.validation.status, out1.validation.issues.length);
  console.log('Invalid:', out2.validation.status);
  console.log('Partial:', out3.validation.status, out3.validation.issues.length);

  if (out1.validation.status !== 'ok' || out1.validation.issues.length !== 0) {
    console.error('Expected valid payload -> ok, 0 issues');
    process.exit(1);
  }
  if (out2.validation.status !== 'invalid') {
    console.error('Expected missing objectID -> invalid');
    process.exit(1);
  }
  if (out3.validation.status !== 'partial' || out3.validation.issues.length === 0) {
    console.error('Expected invalid optional field -> partial with issues');
    process.exit(1);
  }

  if (out1.raw !== valid) {
    console.error('Expected raw reference unchanged (valid)');
    process.exit(1);
  }
  if (out2.raw !== invalid) {
    console.error('Expected raw reference unchanged (invalid)');
    process.exit(1);
  }

  console.log('Stage 2 (validate): ok, invalid, partial; raw untouched.');
  process.exit(0);
})();
