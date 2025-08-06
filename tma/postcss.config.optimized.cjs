module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
    'cssnano': {
      preset: ['advanced', {
        // Более агрессивные оптимизации CSS
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        mergeLonghand: true,
        mergeRules: true,
        minifySelectors: true,
        reduceIdents: true,
        discardUnused: true,
        autoprefixer: false, // Отключаем, т.к. используем отдельный autoprefixer
        zindex: false, // Отключаем для безопасности
        discardOverridden: true,
        normalizeUrl: true,
        normalizeUnicode: true,
        reduceTransforms: true,
        convertValues: true,
        calc: {
          precision: 5
        }
      }]
    },
    'postcss-combine-duplicated-selectors': {},
    'postcss-combine-media-query': {},
    'postcss-sort-media-queries': {},
    'postcss-discard-duplicates': {}
  }
}