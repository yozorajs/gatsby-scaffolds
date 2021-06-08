import { isFunction } from '@guanghechen/option-helper'
import type { CreateSchemaCustomizationArgs } from 'gatsby'
import type { TransformerYozoraOptions } from './types'

const typeDefs = `
  enum MarkdownHeadingLevels {
    h1
    h2
    h3
    h4
    h5
    h6
  }

  type MarkdownYozoraTocNode {
    depth: MarkdownHeadingLevels!
    identifier: String!
    contents: JSON!
    children: [MarkdownYozoraTocNode]!
  }

  type MarkdownYozoraToc {
    children: JSON!
  }

  type MarkdownYozoraTag {
    title: String!
    identifier: String!
  }

  type MarkdownYozoraCategoryItem {
    title: String!
    identifier: String!
  }

  type MarkdownYozora implements Node @infer @childOf(mimeTypes: ["text/markdown", "text/x-markdown"]) {
    id: ID!
    access: String!
    title: String!
    description: String!
    createAtISO: String!
    createAt: String!
    updateAt: String!
    timeToRead: String!
    tags: [MarkdownYozoraTag]!
    categories: [[MarkdownYozoraCategoryItem]]!
    toc: MarkdownYozoraToc!
    ast: JSON!
    html: String!
    excerpt: String!
    excerptAst: JSON!
    definitionMap: JSON!
    footnoteDefinitionMap: JSON!
  }
`

/**
 * Create custom graphql schema.
 *
 * @param {*} api
 * @param {*} options
 */
export async function createSchemaCustomization(
  api: CreateSchemaCustomizationArgs,
  options: TransformerYozoraOptions,
): Promise<void> {
  api.actions.createTypes(typeDefs)

  /**
   * This allows sub-plugins to use Node APIs bound to
   * `@guanghechen/gatsby-transformer-yozora` to customize the GraphQL schema.
   * This makes it possible for sub-plugins to modify types owned by
   * `@guanghechen/gatsby-transformer-remark`.
   */
  const plugins = options.plugins ?? []
  for (const plugin of plugins) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolvedPlugin = require(plugin.resolve)
    if (isFunction(resolvedPlugin.createSchemaCustomization)) {
      resolvedPlugin.createSchemaCustomization(api, plugin.options)
    }
  }
}
