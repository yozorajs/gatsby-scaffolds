import type { Definition } from '@yozora/ast'

/**
 * Options for this plugin.
 */
export interface IGatsbyYozoraImagesOptions {
  /**
   * Set the background color of the image to match the background image of your design.
   *
   * Note:
   *    - set this option to transparent for a transparent image background.
   *    - set this option to none to completely remove the image background.
   */
  backgroundColor?: string
  /**
   * Set the browser’s native decoding attribute.
   * @default 'async'
   */
  decoding?: 'sync' | 'async' | 'auto'
  /**
   * Remove background image and its’ inline style. Useful to prevent Stylesheet too long error on AMP.
   */
  disableBgImage?: boolean
  /**
   * Images containing transparent pixels around the edges results in images with blurry edges.
   * As a result, these images do not work well with the “blur up” technique used in this plugin.
   * As a workaround to disable background images with blurry edges on images containing transparent
   * pixels, enable this setting.
   */
  disableBgImageOnAlpha?: boolean
  /**
   * Set the browser's native lazy loading attribute.
   * @default 'lazy'
   */
  loading?: 'lazy' | 'eager' | 'auto'
  /**
   * The maxWidth in pixels of the div where the markdown will be displayed.
   * This value is used when deciding what the width of the various responsive thumbnails should be.
   * @default 650
   */
  maxWidth?: number
  /**
   * Preset definitions.
   */
  presetDefinitions?: ReadonlyArray<Definition>
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
  loading: 'lazy' | 'eager' | 'auto' | undefined
  decoding: 'sync' | 'async' | 'auto' | undefined
}
