
const tseslint = require('typescript-eslint');

module.exports = tseslint.config({
  files: ['**/*.ts'],
  ignores: ['**/*.config.js', 'dist'],
  extends: [tseslint.configs.recommended],
  rules: {
    semi: 'error',
    'prefer-const': 'error'
  }
});
