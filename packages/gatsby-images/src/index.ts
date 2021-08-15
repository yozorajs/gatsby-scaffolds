import type { Image, ImageReference, YastNode } from '@yozora/ast'
import { ImageReferenceType, ImageType } from '@yozora/ast'
import { calcDefinitionMap, traverseAst } from '@yozora/ast-util'
import type { AstMutateApi } from '@yozora/gatsby-transformer'
import chalk from 'chalk'
import { slash } from 'gatsby-core-utils'
import { fluid } from 'gatsby-plugin-sharp'
import path from 'path'
import { EMPTY_ALT } from './constant'
import type { GatsbyYozoraImagesOptions, ResolvedImageData } from './types'
import { getImageInfo, isRelativeUrl } from './util'

type ImageNode = YastNode &
  Omit<Image, 'type'> &
  Omit<ImageReference, 'type'> &
  Record<string, string>

const defaultFluidArgs = {
  maxWidth: 650,
  wrapperStyle: '',
  backgroundColor: 'white',
  linkImagesToOriginal: true,
  showCaptions: false,
  markdownCaptions: false,
  withWebp: false,
  withAvif: false,
  tracedSVG: false,
  loading: 'lazy',
  disableBgImageOnAlpha: false,
  disableBgImage: false,
}

/**
 * Return a promise, so provide a chance to waiting for the task finished
 * before moving forward.
 * @param param0
 * @param pluginOptions
 * @returns
 */
function mutateYozoraAst(
  {
    files,
    pathPrefix,
    cache,
    markdownNode,
    markdownAST,
    reporter,
    getNode,
  }: AstMutateApi,
  pluginOptions: GatsbyYozoraImagesOptions = {},
): Promise<void> {
  const options = { ...defaultFluidArgs, pathPrefix, ...pluginOptions }
  const { definitionMap } = calcDefinitionMap(markdownAST)
  const markdownImageNodes: ImageNode[] = []

  traverseAst(markdownAST, [ImageReferenceType, ImageType], node =>
    markdownImageNodes.push(node as unknown as ImageNode),
  )

  // Takes a node and generates the needed images and then returns
  // the needed HTML replacement for the image
  async function generateImagesAndUpdateNode(
    node: ImageNode,
    overWrites: Record<string, unknown> = {},
  ): Promise<ResolvedImageData | null> {
    // Check if this markdownNode has a File parent. This plugin
    // won't work if the image isn't hosted locally.
    if (markdownNode.parent == null) return null
    const parentNode = getNode(markdownNode.parent)
    if (parentNode == null || parentNode.dir == null) return null

    const imagePath: string = slash(
      path.join(parentNode.dir as string, getImageInfo(node.url).url),
    )
    const imageNode = files.find(
      file => file != null && file.absolutePath === imagePath,
    )
    if (imageNode == null || imageNode.absolutePath == null) return null

    const fluidResult = await fluid({
      file: imageNode,
      args: { ...options },
      reporter,
      cache,
    })

    if (!fluidResult) return null

    // Generate default alt tag
    const srcSplit = getImageInfo(node.url).url.split(`/`)
    const fileName = srcSplit[srcSplit.length - 1]
    const fileNameNoExt = fileName.replace(/\.[^/.]+$/, ``)
    const defaultAlt = fileNameNoExt.replace(/[^A-Z0-9]/gi, ` `)
    const isEmptyAlt = node.alt === EMPTY_ALT
    const alt = isEmptyAlt ? '' : overWrites.alt ?? node.alt ?? defaultAlt
    const title = node.title ?? alt

    const loading = options.loading ?? 'lazy'
    if (![`lazy`, `eager`, `auto`].includes(loading)) {
      reporter.warn(
        reporter.stripIndent(`
          ${chalk.bold(loading)} is an invalid value for the ${chalk.bold(
          `loading`,
        )} option. Please pass one of "lazy", "eager" or "auto".
        `),
      )
    }

    return {
      alt: alt as string,
      title: title as string,
      src: fluidResult.src,
      srcSet: fluidResult.srcSet,
      sizes: fluidResult.sizes,
      loading: loading as 'lazy' | 'eager' | 'auto',
    }
  }

  async function process(node: ImageNode): Promise<ImageNode | null> {
    let originalNode: ImageNode = node
    const overWrites: Record<string, unknown> = {}

    // consider as imageReference node
    if (node.url == null && node.identifier != null) {
      originalNode = node
      // eslint-disable-next-line no-param-reassign
      node = definitionMap[originalNode.identifier] as unknown as ImageNode

      // no definition found for image reference,
      // so there's nothing for us to do.
      if (!node) return null

      // pass original alt from referencing node
      overWrites.alt = originalNode.alt
    }

    const fileType = getImageInfo(node.url).ext

    // Ignore gifs as we can't process them,
    // svgs as they are already responsive by definition
    if (isRelativeUrl(node.url) && fileType !== `gif` && fileType !== `svg`) {
      const imageData = await generateImagesAndUpdateNode(node, overWrites)
      if (imageData == null) return null

      // Resolve url.
      // eslint-disable-next-line no-param-reassign
      node.url = imageData.src
      originalNode.alt = imageData.alt
      originalNode.src = imageData.src
      originalNode.srcSet = imageData.srcSet
      originalNode.sizes = imageData.sizes
      originalNode.loading = imageData.loading
      return originalNode
    }

    return null
  }

  return Promise.all(markdownImageNodes.map(process))
    .then(nodes => nodes.filter((node): node is ImageNode => node != null))
    .then((nodes: YastNode[]) => void nodes)
}

export default mutateYozoraAst
