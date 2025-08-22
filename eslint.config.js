const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettierPlugin = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  // Global ignores
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  // JavaScript configuration
  pluginJs.configs.recommended,
  // TypeScript configuration
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_+' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^(../|./).+.js$/]',
          message: 'Use extensionless imports for internal TS modules.',
        },
      ],
    },
  },
  // Prettier configuration
  prettierConfig,
  {
    files: ["src/**/*.ts"],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  // Jest configuration
  {
    files: ["**/*.test.ts"],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
  // ESLint config file itself
  {
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
