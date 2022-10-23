/**
 * Options for this plugin.
 */
export interface IGatsbyYozoraImagesOptions {
  /**
   * Set the browser's native lazy loading attribute.
   * @default 'lazy'
   */
  loading?: 'lazy' | 'eager' | 'auto'
}

/**
 * Result of generateImagesAndUpdateNode
 */
export interface IResolvedImageData {
  alt: string
  title: string
  src: string
  srcSet: string
  sizes: string
  loading: 'lazy' | 'eager' | 'auto'
}
