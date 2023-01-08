import type { AstMutateApi } from '@yozora/gatsby-transformer'
import { DEFAULT_OPTIONS, imageBackgroundClass, imageClass, imageWrapperClass } from './constant'
import type { IGatsbyYozoraImagesOptions } from './types'

export function onRouteUpdate(
  api: AstMutateApi,
  pluginOptions: IGatsbyYozoraImagesOptions = {},
): void {
  const options = Object.assign({}, DEFAULT_OPTIONS, pluginOptions)
  const imgWrappers = document.querySelectorAll(`.${imageWrapperClass}`)

  // https://css-tricks.com/snippets/javascript/loop-queryselectorall-matches/
  // for cross-browser looping through NodeList without polyfills
  for (let i = 0; i < imgWrappers.length; i++) {
    const imageWrapper = imgWrappers[i]
    const bgEl = imageWrapper.querySelector(`.${imageBackgroundClass}`) as HTMLElement | null
    const imgEl = imageWrapper.querySelector(`.${imageClass}`) as HTMLImageElement | null

    const onImageLoad = (): void => {
      if (bgEl) bgEl.style.transition = 'opacity 0.5s 0.5s'
      if (imgEl) imgEl.style.transition = 'opacity 0.5s'
      onImageComplete()
    }

    const onImageComplete = (): void => {
      if (bgEl) bgEl.style.opacity = '0'
      if (imgEl) {
        imgEl.style.opacity = '1'
        imgEl.style.color = 'inherit'
        imgEl.style.boxShadow = `inset 0px 0px 0px 400px ${options.backgroundColor}`
        imgEl.removeEventListener('load', onImageLoad)
        imgEl.removeEventListener('error', onImageComplete)
      }
    }

    if (imgEl) {
      imgEl.style.opacity = '0'
      imgEl.addEventListener('load', onImageLoad)
      imgEl.addEventListener('error', onImageComplete)
      if (imgEl.complete) {
        onImageComplete()
      }
    }
  }
}
