// Only one rule: `no-undef`. The bundler puts every module in one scope, so a name used without an import still
// builds, but throws a ReferenceError in dev mode (real ES modules). See CLAUDE.md > Traps.
import globals from 'globals';

export default [
  { ignores: ['client/dist/**', 'node_modules/**', '.nodeterm/**', 'infra/**', 'data/**', 'tests/e2e/out/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, ...globals.node, __game: 'readonly', __ui: 'readonly' } },
    rules: { 'no-undef': 'error' },
  },
];
