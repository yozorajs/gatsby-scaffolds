import { isDate } from '@guanghechen/option-helper'
import type { CreateNodeArgs, Node, NodeInput } from 'gatsby'
import frontmatter from 'gray-matter'
import type { TransformerYozoraOptions } from './types'

/**
 *
 * @param {*} param0
 * @returns
 */
export function unstable_shouldOnCreateNode({ node }: { node: Node }): boolean {
  return (
    node.internal.mediaType === `text/markdown` ||
    node.internal.mediaType === `text/x-markdown`
  )
}

/**
 *
 * @param {*} api
 * @param {*} options
 * @returns
 */
export async function onCreateNode(
  api: CreateNodeArgs,
  options: TransformerYozoraOptions,
): Promise<NodeInput | undefined> {
  const { node } = api
  if (!unstable_shouldOnCreateNode({ node })) return

  const {
    actions: { createNode, createParentChildLink },
    reporter,
    createContentDigest,
    createNodeId,
    loadNodeContent,
  } = api

  try {
    const content = await loadNodeContent(node)
    const { slugField, ...grayMatterOptions } = options.frontmatter ?? {}
    const data = frontmatter(content, grayMatterOptions)

    // format data
    if (data.data) {
      const formattedData = {}
      for (const [key, val] of Object.entries(data.data)) {
        if (isDate(val)) formattedData[key] = val.toJSON()
        else formattedData[key] = val
      }
      data.data = formattedData
    }

    const rawMarkdownBody = data.content.trimStart()
    const markdownNode: Node = {
      id: createNodeId(`${node.id} >>> MarkdownYozora`),
      parent: node.id,
      children: [],
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      internal: {
        type: 'MarkdownYozora',
        content: rawMarkdownBody,
      } as Partial<Node['internal']> as Node['internal'],
      excerpt: data.excerpt,
      frontmatter: { ...data.data },
    }

    // Add path to the markdown file path
    if (node.internal.type === 'File') {
      markdownNode.absolutePath = node.absolutePath
    }

    markdownNode.internal.contentDigest = createContentDigest(markdownNode)
    createNode(markdownNode)
    createParentChildLink({ parent: node, child: markdownNode })
    return markdownNode
  } catch (error) {
    reporter.panicOnBuild(
      'Error processing Markdown ' +
        (node.absolutePath
          ? `file ${node.absolutePath}`
          : `in node ${node.id}`) +
        ':\n\n' +
        error.message,
    )
  }
}
