import { isFunction } from '@guanghechen/helper-is'
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

  type MarkdownYozoraFrontmatter2 {
    aplayer: JSON
    wechatThumbnail: String
  }

  type MarkdownYozora implements Node @infer @childOf(mimeTypes: ["text/markdown", "text/x-markdown"]) {
    id: ID!
    title: String!
    description: String!
    createdAtISO: String!
    createAtISO: String!
    createdAt: String!
    createAt: String!
    updatedAt: String!
    updateAt: String!
    timeToRead: String!
    tags: [String]!
    categories: [[String]]!
    toc: MarkdownYozoraToc!
    ast: JSON!
    html: String!
    excerpt: String!
    excerptAst: JSON!
    definitionMap: JSON!
    footnoteDefinitionMap: JSON!
    ecmaImports: JSON!
    frontmatter2: MarkdownYozoraFrontmatter2!
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
   * This allows sub-plugins to use Node APIs bound to `@guanghechen/gatsby-transformer-yozora`
   * to customize the GraphQL schema. This makes it possible for sub-plugins to modify types
   * owned by `@guanghechen/gatsby-transformer-remark`.
   */
  const plugins = options.plugins ?? []
  for (const plugin of plugins) {
    const { createSchemaCustomization } = await import(plugin.resolve)
    if (isFunction(createSchemaCustomization)) {
      createSchemaCustomization(api, plugin.options)
    }
  }
}

createSchemaCustomization.typeDefs = typeDefs
