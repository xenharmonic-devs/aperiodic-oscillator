module.exports = [
  ...require('gts'),
  {
    ignores: ['dist/**', 'docs/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 0,
    },
  },
];
