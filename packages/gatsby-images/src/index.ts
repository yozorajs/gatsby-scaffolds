import type { Image, ImageReference, Node } from '@yozora/ast'
import { ImageReferenceType, ImageType } from '@yozora/ast'
import { calcDefinitionMap, traverseAst } from '@yozora/ast-util'
import type { AstMutateApi } from '@yozora/gatsby-transformer'
import chalk from 'chalk'
import { slash } from 'gatsby-core-utils'
import { fluid } from 'gatsby-plugin-sharp'
import path from 'path'
import { DEFAULT_OPTIONS, EMPTY_ALT, supportedImgExts } from './constant'
import type { IGatsbyYozoraImagesOptions, IResolvedImageData } from './types'
import { getImageInfo, isRelativeUrl } from './util'

type ImageNode = Node & Omit<Image, 'type'> & Omit<ImageReference, 'type'> & Record<string, string>

/**
 * Return a promise, so provide a chance to waiting for the task finished before moving forward.
 *
 * @param api
 * @param pluginOptions
 * @returns
 */
export default async function mutateYozoraAst(
  api: AstMutateApi,
  pluginOptions: IGatsbyYozoraImagesOptions = {},
): Promise<Node[]> {
  const { files, markdownNode, markdownAST, pathPrefix, reporter, cache, getNode } = api
  const options = { ...DEFAULT_OPTIONS, pathPrefix, ...pluginOptions }

  const { definitionMap } = calcDefinitionMap(markdownAST, undefined, options.presetDefinitions)
  const markdownImageNodes: ImageNode[] = []

  traverseAst(markdownAST, [ImageReferenceType, ImageType], node =>
    markdownImageNodes.push(node as unknown as ImageNode),
  )

  // Takes a node and generates the needed images and then returns
  // the needed HTML replacement for the image
  async function generateImagesAndUpdateNode(
    node: ImageNode,
    overWrites: Record<string, unknown> = {},
  ): Promise<IResolvedImageData | null> {
    // Check if this markdownNode has a File parent. This plugin
    // won't work if the image isn't hosted locally.
    if (markdownNode.parent == null) return null
    const parentNode = getNode(markdownNode.parent)
    if (parentNode == null || parentNode.dir == null) return null

    const imagePath: string = slash(path.join(parentNode.dir as string, getImageInfo(node.url).url))
    const imageNode = files.find(file => file != null && file.absolutePath === imagePath)
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

    const loading = options.loading
    if (![`lazy`, `eager`, `auto`].includes(loading)) {
      reporter.warn(
        reporter.stripIndent(`
          ${chalk.bold(loading)} is an invalid value for the ${chalk.bold(
          `loading`,
        )} option. Please pass one of "lazy", "eager" or "auto".
        `),
      )
    }

    const decoding = options.decoding
    if (![`async`, `sync`, `auto`].includes(decoding)) {
      reporter.warn(
        reporter.stripIndent(`
        ${chalk.bold(decoding)} is an invalid value for the ${chalk.bold(
          `decoding`,
        )} option. Please pass one of "async", "sync" or "auto".
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
      decoding: decoding as 'sync' | 'async' | 'auto',
    }
  }

  async function process(node: ImageNode): Promise<ImageNode | null> {
    let originalNode: ImageNode = node
    const overWrites: Record<string, unknown> = {}

    // consider as imageReference node
    if (!node.url && node.identifier) {
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
    if (isRelativeUrl(node.url) && supportedImgExts.has(fileType)) {
      const imageData = await generateImagesAndUpdateNode(node, overWrites)
      if (imageData == null) return null

      // Resolve url.
      // eslint-disable-next-line no-param-reassign
      node.url = imageData.src
      originalNode.alt = imageData.alt
      originalNode.src = imageData.src
      originalNode.srcSet = imageData.srcSet
      originalNode.sizes = imageData.sizes
      if (imageData.loading) originalNode.loading = imageData.loading
      if (imageData.decoding) originalNode.decoding = imageData.decoding
      return originalNode
    }

    return null
  }

  return Promise.all(markdownImageNodes.map(process)).then(nodes =>
    nodes.filter((node): node is ImageNode => node != null),
  )
}
