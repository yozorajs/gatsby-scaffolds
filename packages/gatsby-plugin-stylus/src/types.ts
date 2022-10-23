/**
 * Plugin options.
 */
export interface GatsbyPluginStylusOptions {
  /**
   * Webpack.Rule for.
   * @default {}
   */
  stylusRule?: any
  /**
   * Webpack.Rule.
   * @default {}
   */
  moduleStylusRule?: any
  /**
   * Whether to generate *.sourcemap.
   * @default false
   */
  shouldUseSourceMap?: boolean
  /**
   * Whether to generate *.d.ts for *.styl files.
   * @default false
   */
  shouldGenerateDts?: boolean
  /**
   * Options for 'css-loader'
   */
  cssLoaderOptions?: any
  /**
   * Options for 'stylus-loader'.
   */
  stylusLoaderOptions?: any
  /**
   * Options for 'postcss-loader'.
   */
  postcssLoaderOptions?: any
}
