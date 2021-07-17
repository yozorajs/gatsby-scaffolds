import { isFunction } from '@guanghechen/option-helper'
import { collectIntervals } from '@guanghechen/parse-lineno'
import {
  CodeType,
  FootnoteDefinitionType,
  FootnoteReferenceType,
  HtmlType,
  TextType,
} from '@yozora/ast'
import type {
  Code,
  Definition,
  FootnoteDefinition,
  HeadingToc,
  Root,
  Text,
  YastAssociation,
  YastLiteral,
  YastParent,
} from '@yozora/ast'
import {
  calcDefinitionMap,
  calcFootnoteDefinitionMap,
  calcHeadingToc,
  searchNode,
  shallowCloneAst,
  traverseAST,
} from '@yozora/ast-util'
import { stripChineseCharacters } from '@yozora/character'
import renderMarkdown, { defaultRendererMap } from '@yozora/html-markdown'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import fs from 'fs-extra'
import type { Node, SetFieldsOnGraphQLNodeTypeArgs } from 'gatsby'
import path from 'path'
import type { TransformerYozoraOptions } from './types'
import env from './util/env'
import { normalizeTagOrCategory } from './util/string'
import { timeToRead } from './util/timeToRead'
import { resolveAstUrls, resolveUrl, serveStaticFile } from './util/url'

dayjs.extend(duration)

let fileNodes: Node[] | null = null
const astPromiseMap = new Map<string, Promise<Root>>()

const htmlRendererMap = {
  [HtmlType]: () => '',
  [FootnoteReferenceType]: () => '',
  ...defaultRendererMap,
}

/**
 * Gatsby hook.
 *
 * Set customized graphql fields.
 *
 * @param api
 * @param options
 */
export async function setFieldsOnGraphQLNodeType(
  api: SetFieldsOnGraphQLNodeTypeArgs,
  options: TransformerYozoraOptions,
): Promise<any> {
  const { slugField = 'slug' } = options.frontmatter || {}
  const urlPrefix: string = resolveUrl(api.pathPrefix, api.basePath as string)
  const {
    parser,
    preferFootnoteReferences = false,
    headingIdentifierPrefix = 'heading-',
    footnoteIdentifierPrefix = 'footnote-',
    presetDefinitions,
    presetFootnoteDefinitions,
    shouldStripChineseCharacters = false,
    wordsPerMinute,
    frontmatter = {},
    plugins = [],
  } = options

  /**
   * Calc Yast Root from markdownNode.
   *
   * @param markdownNode
   * @returns
   */
  async function getAst(markdownNode: Node): Promise<Root> {
    const cacheKey =
      'transformer-yozora-markdown-ast:' + markdownNode.internal.contentDigest

    // Check from cache.
    const cachedAST = await api.cache.get(cacheKey)
    if (cachedAST != null) return cachedAST

    // Check from promise cache.
    const promise = astPromiseMap.get(cacheKey)
    if (promise != null) return await promise

    // Get all file nodes.
    if (!env.isEnvProduction || fileNodes == null) {
      fileNodes = api.getNodesByType('File')
    }

    // Execute hooks to mutate source contents before parse processing.
    for (const plugin of plugins) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const requiredPlugin = require(plugin.resolve)
      if (isFunction(requiredPlugin.mutateSource)) {
        await requiredPlugin.mutateSource(
          {
            ...api,
            markdownNode,
            files: fileNodes,
            urlPrefix,
            cache: (api.getCache as any)(plugin.name ?? plugin.resolve),
          },
          plugin.options,
        )
      }
    }

    const slug: string = (markdownNode as any).frontmatter[slugField] ?? ''
    const astPromise: Promise<Root> = (async function (): Promise<Root> {
      const absoluteDirPath = path.dirname(markdownNode.absolutePath as string)
      const ast: Root = parser.parse(markdownNode.internal.content || '', {
        presetDefinitions,
        presetFootnoteDefinitions,
      })

      // Execute hooks to mutate ast.
      for (const plugin of plugins) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const requiredPlugin = require(plugin.resolve)

        // Allow both exports = function(), and exports.default = function()
        const defaultFunction = isFunction(requiredPlugin)
          ? requiredPlugin
          : isFunction(requiredPlugin.default)
          ? requiredPlugin.default
          : undefined

        if (defaultFunction) {
          await defaultFunction(
            {
              ...api,
              markdownAST: ast,
              markdownNode,
              files: fileNodes,
              urlPrefix,
              cache: (api.getCache as any)(plugin.name ?? plugin.resolve),
            },
            plugin.options,
          )
        }
      }

      // Resolve ast urls.
      await resolveAstUrls(ast, (url: string): Promise<string | null> => {
        if (/^[/](?![/])/.test(url)) {
          return Promise.resolve(resolveUrl(urlPrefix, slug, url))
        } else {
          return serveStaticFile(path.join(absoluteDirPath, url))
        }
      })

      // Resolve footnote definitions
      traverseAST(
        ast,
        [FootnoteReferenceType, FootnoteDefinitionType],
        (node): void => {
          const o = node as unknown as YastAssociation
          if (/^\d+$/.test(o.identifier)) {
            o.identifier = footnoteIdentifierPrefix + o.identifier
          }
        },
      )

      // Remove line end between two chinese characters.
      if (shouldStripChineseCharacters) {
        traverseAST(ast, [TextType], node => {
          const text = node as Text
          text.value = stripChineseCharacters(text.value)
        })
      }

      // load source files
      const sourcefileRegex = /(?:^|\b)sourcefile="([^"]+)"/
      const sourcelineRegex = /(?:^|\b)sourceline="([^"]+)"/
      traverseAST(ast, [CodeType], (node): void => {
        const { meta } = node as Code
        if (meta == null) return

        const sourcefileMatch = sourcefileRegex.exec(meta!)
        if (sourcefileMatch == null) return

        const filepath = path.join(absoluteDirPath, sourcefileMatch[1])
        try {
          if (fs.existsSync(filepath)) {
            const content = fs.readFileSync(filepath, 'utf-8')
            let value: string = content

            const sourcelineMatch = sourcelineRegex.exec(meta!)
            if (sourcelineMatch != null) {
              const lineIntervals: Array<[number, number]> = collectIntervals(
                sourcelineMatch[1],
              )

              let commonIndent = Number.MAX_SAFE_INTEGER
              const indentRegex = /^\s*/
              if (lineIntervals.length > 0) {
                const lines: string[] = content.split(/\r|\n|\n\r/g)
                const requiredLines: string[] = []
                for (const [x, y] of lineIntervals) {
                  if (x < 0) continue
                  if (x >= lines.length) break
                  for (let i = x - 1; i < y; ++i) {
                    if (commonIndent > 0) {
                      const indent = indentRegex.exec(lines[i])![0].length
                      if (indent < lines[i].length && indent < commonIndent) {
                        commonIndent = indent
                      }
                    }
                    requiredLines.push(lines[i])
                  }
                }

                // Trim common indents.
                if (
                  commonIndent < Number.MAX_SAFE_INTEGER &&
                  commonIndent > 0
                ) {
                  value = requiredLines
                    .map(x => x.slice(commonIndent))
                    .join('\n')
                } else {
                  value = requiredLines.join('\n')
                }
              }
            }
            // eslint-disable-next-line no-param-reassign
            ;(node as Code).value = value
          }
        } catch (error) {
          console.warn('[Try to resolve source code file]:', filepath, error)
        }
      })

      return ast
    })()
    astPromiseMap.set(cacheKey, astPromise)

    try {
      const ast = await astPromise
      await api.cache.set(cacheKey, ast)
      return ast
    } finally {
      astPromiseMap.delete(cacheKey)
    }
  }

  /**
   * Calc Yozora Markdown AST of excerpt content.
   * @param fullAst
   * @param param1
   * @returns
   */
  async function getExcerptAst(
    fullAst: Root,
    { pruneLength, excerptSeparator }: GetExcerptAstOptions,
  ): Promise<Root> {
    if (excerptSeparator != null) {
      const separator = excerptSeparator.trim()

      const childIndexList: number[] | null = searchNode(fullAst, node => {
        const { value } = node as YastLiteral
        return value != null && value.trim() === separator
      })

      if (childIndexList != null) {
        const excerptAst = { ...fullAst }
        let node: YastParent = excerptAst
        for (const childIndex of childIndexList) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const nextNode = { ...node.children[childIndex] } as YastParent
          node.children = node.children.slice(0, childIndex)
          node.children.push(nextNode)
          node = nextNode
        }
        return excerptAst
      }
    }

    if (fullAst.children.length <= 0) return fullAst

    // Try to truncate excerpt.
    let totalExcerptLengthSoFar = 0
    let parentOfLastLiteralNode: YastParent | null = null as YastParent | null
    let indexOfLastLiteralNode = 0
    const excerptAst = shallowCloneAst(fullAst, (node, parent, index) => {
      if (totalExcerptLengthSoFar >= pruneLength) return true
      const { value } = node as YastLiteral
      if (value != null) {
        parentOfLastLiteralNode = parent
        indexOfLastLiteralNode = index
        totalExcerptLengthSoFar += value.length
      }
      return false
    })

    if (
      parentOfLastLiteralNode != null &&
      parentOfLastLiteralNode!.type === 'text' &&
      totalExcerptLengthSoFar > pruneLength
    ) {
      // Try truncate last LiteralNode
      const parent = parentOfLastLiteralNode!
      parent.children = parent.children.map((node, i) => {
        if (i !== indexOfLastLiteralNode) return node
        return {
          ...node,
          value: (node as YastLiteral).value.slice(
            totalExcerptLengthSoFar - pruneLength,
          ),
        }
      })
    }
    return excerptAst
  }

  /**
   * Render Yozora ast into html string.
   * @param ast
   * @param preferReferences
   * @returns
   */
  function astToHTML(ast: Root, preferReferences: boolean): string {
    const definitionMap = calcDefinitionMap(ast, undefined, presetDefinitions)
    const footnoteDefinitionMap = calcFootnoteDefinitionMap(
      ast,
      undefined,
      presetFootnoteDefinitions,
      preferReferences,
      footnoteIdentifierPrefix,
    )
    return renderMarkdown(
      ast,
      definitionMap,
      footnoteDefinitionMap,
      htmlRendererMap,
    )
  }

  const result = {
    title: {
      type: 'String',
      async resolve(markdownNode: Node): Promise<string> {
        const { title } = (markdownNode.frontmatter ?? {}) as Record<
          string,
          string
        >
        if (title != null) return title

        // Try to resolve the markdownNode relative filepath,
        // otherwise, return it id.
        const parent: Node = api.getNode(markdownNode.parent!)
        if (parent == null) return markdownNode.id
        return (parent.relativePath as string) ?? markdownNode.id
      },
    },
    description: {
      type: 'String',
      async resolve(markdownNode: Node): Promise<string> {
        const { description } = (markdownNode.frontmatter ?? {}) as Record<
          string,
          string
        >
        if (description != null) return description
        return result.title.resolve(markdownNode)
      },
    },
    createAtISO: {
      type: 'String',
      async resolve(markdownNode: Node): Promise<string> {
        const { createAt, date } = (markdownNode.frontmatter ?? {}) as any
        const d = createAt ?? date
        return dayjs(d).toISOString()
      },
    },
    createAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      async resolve(
        markdownNode: Node,
        { formatString }: GetCreateAtOptions,
      ): Promise<string> {
        const { createAt, date } = (markdownNode.frontmatter ?? {}) as any
        const d = createAt ?? date
        if (formatString == null) return dayjs(d).toJSON()
        return dayjs(d).format(formatString)
      },
    },
    updateAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      async resolve(
        markdownNode: Node,
        { formatString }: GetCreateAtOptions,
      ): Promise<string> {
        const { updateAt, createAt, date } = (markdownNode.frontmatter ??
          {}) as any
        const d = updateAt ?? createAt ?? date
        if (formatString == null) return dayjs(d).toJSON()
        return dayjs(d).format(formatString)
      },
    },
    timeToRead: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      async resolve(
        markdownNode: Node,
        { formatString }: GetCreateAtOptions,
      ): Promise<string> {
        const ast = await getAst(markdownNode)
        const seconds = timeToRead(ast, wordsPerMinute)
        return dayjs.duration(seconds * 1000).format(formatString)
      },
    },
    tags: {
      type: '[String]!',
      async resolve(markdownNode: Node): Promise<string[]> {
        const tags = ((markdownNode.frontmatter ?? {}) as any).tags ?? []
        return tags.map(normalizeTagOrCategory)
      },
    },
    categories: {
      type: '[[String]]!',
      async resolve(markdownNode: Node): Promise<string[][]> {
        const categories =
          ((markdownNode.frontmatter ?? {}) as any).categories ?? []
        return categories.map((category: string[]) =>
          category.map(normalizeTagOrCategory),
        )
      },
    },
    toc: {
      type: 'MarkdownYozoraToc!',
      async resolve(markdownNode: Node): Promise<HeadingToc> {
        const ast = await getAst(markdownNode)
        const toc = calcHeadingToc(ast, headingIdentifierPrefix)
        return toc
      },
    },
    ast: {
      type: 'JSON',
      async resolve(markdownNode: Node): Promise<Root> {
        const ast = await getAst(markdownNode)
        return ast
      },
    },
    html: {
      type: 'String',
      args: {
        preferReferences: {
          type: 'Boolean',
          defaultValue: preferFootnoteReferences,
        },
      },
      async resolve(
        markdownNode: Node,
        { preferReferences }: GetHtmlOptions,
      ): Promise<string> {
        const ast = await getAst(markdownNode)
        return astToHTML(ast, preferReferences)
      },
    },
    excerptAst: {
      type: 'JSON',
      args: {
        pruneLength: {
          type: 'Int',
          defaultValue: 140,
        },
      },
      async resolve(
        markdownNode: Node,
        { pruneLength }: GetExcerptAstOptions,
      ): Promise<Root> {
        const fullAst = await getAst(markdownNode)
        const excerptAst = await getExcerptAst(fullAst, {
          pruneLength,
          excerptSeparator: frontmatter.excerpt_separator,
        })
        return excerptAst
      },
    },
    excerpt: {
      type: 'String',
      args: {
        preferReferences: {
          type: 'Boolean',
          defaultValue: preferFootnoteReferences,
        },
        pruneLength: {
          type: 'Int',
          defaultValue: 140,
        },
      },
      async resolve(
        markdownNode: Node,
        { preferReferences, pruneLength }: GetExcerptOptions,
      ): Promise<string> {
        const fullAst = await getAst(markdownNode)
        const ast = await getExcerptAst(fullAst, {
          pruneLength,
          excerptSeparator: frontmatter.excerpt_separator,
        })
        return astToHTML(ast, preferReferences)
      },
    },
    definitionMap: {
      type: 'JSON',
      args: {},
      async resolve(
        markdownNode: Node,
      ): Promise<Record<string, Readonly<Definition>>> {
        const ast = await getAst(markdownNode)
        const definitionMap = calcDefinitionMap(
          ast,
          undefined,
          presetDefinitions,
        )
        return definitionMap
      },
    },
    footnoteDefinitionMap: {
      type: 'JSON',
      args: {
        preferReferences: {
          type: 'Boolean',
          defaultValue: preferFootnoteReferences,
        },
      },
      async resolve(
        markdownNode: Node,
        { preferReferences }: GetFootnoteDefinitionsOptions,
      ): Promise<Record<string, FootnoteDefinition>> {
        const ast = await getAst(markdownNode)
        const footnoteDefinitionMap = calcFootnoteDefinitionMap(
          ast,
          undefined,
          presetFootnoteDefinitions,
          preferReferences,
          footnoteIdentifierPrefix,
        )
        return footnoteDefinitionMap
      },
    },
    frontmatter2: {
      type: 'MarkdownYozoraFrontmatter2',
      async resolve(markdownNode: Node) {
        const absoluteDirPath = path.dirname(
          markdownNode.absolutePath as string,
        )
        const serve = async (_url: string | null): Promise<string | null> => {
          if (_url == null) return _url

          const url = _url.trim()
          if (!/^\./.test(url)) return url

          const filepath: string = path.join(absoluteDirPath, url)
          return await serveStaticFile(filepath)
        }

        const { aplayer } = markdownNode.frontmatter as any
        if (aplayer != null && aplayer.audio != null) {
          const audioList = Array.isArray(aplayer.audio)
            ? aplayer.audio
            : [aplayer.audio]
          for (const audio of audioList) {
            if (audio.cover != null) audio.cover = await serve(audio.cover)
            if (audio.url != null) audio.url = await serve(audio.url)
            if (audio.lrc != null) audio.lrc = await serve(audio.lrc)
          }
        }
        return { aplayer }
      },
    },
  }
  return result
}

interface GetHtmlOptions {
  preferReferences: boolean
}

interface GetExcerptOptions {
  preferReferences: boolean
  pruneLength: number
  excerptSeparator?: string
}

interface GetExcerptAstOptions {
  pruneLength: number
  excerptSeparator?: string
}

interface GetFootnoteDefinitionsOptions {
  preferReferences: boolean
}

interface GetCreateAtOptions {
  formatString?: string
}

interface GetUpdateAtOptions {
  formatString?: string
}
