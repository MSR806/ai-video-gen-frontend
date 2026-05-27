const config = {
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
  },
  overrides: [
    {
      files: ['src/presentation/styles/globals.css', 'src/app/globals.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
  ignoreFiles: ['node_modules/**', '.next/**', 'coverage/**', 'playwright-report/**'],
};

export default config;
