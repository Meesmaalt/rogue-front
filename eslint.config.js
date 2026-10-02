export default [
  { ignores: ['dist/**', 'node_modules/**', 'src/**/*.ts'] },
  {
    files: ['*.js', '*.mjs', '*.cjs'],
    rules: {
      'no-debugger': 'error',
      'no-console': 'warn',
    },
  },
];
