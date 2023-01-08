export const DEFAULT_OPTIONS = {
  maxWidth: 650,
  wrapperStyle: '',
  backgroundColor: 'white',
  decoding: 'async',
  disableBgImageOnAlpha: false,
  disableBgImage: false,
  linkImagesToOriginal: true,
  loading: 'lazy',
  markdownCaptions: false,
  showCaptions: false,
  withWebp: false,
  withAvif: false,
  tracedSVG: false,
}

export const EMPTY_ALT = 'YOZORA_EMPTY_ALT'

export const imageClass = 'gatsby-resp-image-image'
export const imageWrapperClass = 'gatsby-resp-image-wrapper'
export const imageBackgroundClass = 'gatsby-resp-image-background-image'

export const supportedImgExts: Set<string> = new Set<string>([
  'jpeg',
  'jpg',
  'png',
  'webp',
  'tif',
  'tiff',
  'avif',
])
