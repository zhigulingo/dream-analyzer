module.exports = {
  plugins: {
    'cssnano': {
      preset: ['advanced', {
        // Агрессивные оптимизации CSS для Web
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        mergeLonghand: true,
        mergeRules: true,
        minifySelectors: true,
        reduceIdents: true,
        discardUnused: true,
        autoprefixer: false,
        zindex: false,
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