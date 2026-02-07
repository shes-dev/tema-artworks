/** Jest config for Phase 7 tests. Use .cjs so it loads under "type": "module". */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/unit/**/*.test.ts', '**/tests/dal/**/*.test.ts', '**/tests/pipeline/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { useESM: true, diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  clearMocks: true,
};
