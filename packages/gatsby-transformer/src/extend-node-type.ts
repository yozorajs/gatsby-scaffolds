import { isFunction } from '@guanghechen/helper-is'
import { collectIntervals } from '@guanghechen/parse-lineno'
import {
  CodeType,
  DefinitionType,
  EcmaImportType,
  FootnoteDefinitionType,
  FootnoteReferenceType,
  HtmlType,
  TextType,
} from '@yozora/ast'
import type {
  Association,
  Code,
  Definition,
  EcmaImport,
  FootnoteDefinition,
  Literal,
  Parent,
  Root,
  Text,
} from '@yozora/ast'
import type { IHeadingToc } from '@yozora/ast-util'
import {
  calcDefinitionMap,
  calcExcerptAst,
  calcFootnoteDefinitionMap,
  calcHeadingToc,
  collectNodes,
  searchNode,
  shallowMutateAstInPreorder,
  traverseAst,
} from '@yozora/ast-util'
import { stripChineseCharacters } from '@yozora/character'
import renderMarkdown, { defaultRendererMap } from '@yozora/html-markdown'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration.js'
import type { Node, SetFieldsOnGraphQLNodeTypeArgs } from 'gatsby'
import fs from 'node:fs'
import path from 'node:path'
import type { TransformerYozoraOptions } from './types'
import * as env from './util/env'
import { normalizeTagOrCategory } from './util/string'
import { timeToRead } from './util/timeToRead'
import { resolveAstUrls, resolveUrl, serveStaticFile } from './util/url'

dayjs.extend(duration)

let fileNodes: Node[] | null = null
const astPromiseMap = new Map<string, Promise<Root>>()

const htmlRendererMap = {
  ...defaultRendererMap,
  [HtmlType]: () => '',
  [EcmaImportType]: () => '',
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
  if (api.type.name !== 'MarkdownYozora') return {}

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
    wordsPerMinute: _defaultWordsPerMinute,
    frontmatter = {},
    plugins = [],
  } = options

  /**
   * Calc Yast Root from markdownNode.
   *
   * @param markdownNode
   * @returns
   */
  async function _getAst(markdownNode: Node): Promise<Root> {
    const cacheKey = 'transformer-yozora-markdown-ast:' + markdownNode.internal.contentDigest

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
      const { mutateSource } = await import(plugin.resolve)
      if (isFunction(mutateSource)) {
        await mutateSource(
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
        const requiredPlugin = await import(plugin.resolve)

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
      traverseAst(ast, [FootnoteReferenceType, FootnoteDefinitionType], (node): void => {
        const o = node as unknown as Association
        if (/^\d+$/.test(o.identifier)) {
          o.identifier = footnoteIdentifierPrefix + o.identifier
        }
      })

      // Remove line end between two chinese characters.
      if (shouldStripChineseCharacters) {
        traverseAst(ast, [TextType], node => {
          const text = node as Text
          text.value = stripChineseCharacters(text.value)
        })
      }

      // load source files
      const sourcefileRegex = /(?:^|\b)sourcefile="([^"]+)"/
      const sourcelineRegex = /(?:^|\b)sourceline="([^"]+)"/
      traverseAst(ast, [CodeType], (node): void => {
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
              const lineIntervals: Array<[number, number]> = collectIntervals(sourcelineMatch[1])

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
                if (commonIndent < Number.MAX_SAFE_INTEGER && commonIndent > 0) {
                  value = requiredLines.map(x => x.slice(commonIndent)).join('\n')
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
   * Calc Yast Root from markdownNode.
   *
   * @param markdownNode
   * @param preferReferences
   * @returns
   */
  async function getAst(markdownNode: Node, preferReferences: boolean): Promise<Root> {
    let ast = await _getAst(markdownNode)
    ast = preferReferences
      ? calcFootnoteDefinitionMap(
          ast,
          undefined,
          presetFootnoteDefinitions,
          true,
          footnoteIdentifierPrefix,
        ).root
      : ast
    calcHeadingToc(ast, headingIdentifierPrefix)
    return ast
  }

  /**
   * Strip ast.
   * @param ast
   * @param shouldStrip
   * @returns
   */
  function stripAst(ast: Root, shouldStrip: boolean): Root {
    return shouldStrip
      ? shallowMutateAstInPreorder(ast, [DefinitionType, FootnoteDefinitionType], () => null)
      : ast
  }

  /**
   * Calc Yozora Markdown AST of excerpt content.
   * @param fullAst
   * @param pruneLength
   * @param excerptSeparator
   * @returns
   */
  function getExcerptAst(fullAst: Root, pruneLength: number, excerptSeparator?: string): Root {
    if (excerptSeparator != null) {
      const separator = excerptSeparator.trim()

      const childIndexList: number[] | null = searchNode(fullAst, node => {
        const { value } = node as Literal
        return value != null && value.trim() === separator
      })

      if (childIndexList != null) {
        const excerptAst = { ...fullAst }
        let node: Parent = excerptAst
        for (const childIndex of childIndexList) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const nextNode = { ...node.children[childIndex] } as Parent
          node.children = node.children.slice(0, childIndex)
          node.children.push(nextNode)
          node = nextNode
        }
        return excerptAst
      }
    }

    // Try to truncate excerpt.
    const excerptAst = calcExcerptAst(fullAst, pruneLength)
    return excerptAst
  }

  /**
   * Render Yozora ast into html string.
   * @param ast
   * @returns
   */
  function astToHTML(_ast: Root): string {
    const { root, definitionMap } = calcDefinitionMap(_ast, undefined, presetDefinitions)
    const { root: ast, footnoteDefinitionMap } = calcFootnoteDefinitionMap(
      root,
      undefined,
      presetFootnoteDefinitions,
      false,
      footnoteIdentifierPrefix,
    )

    return renderMarkdown(ast, definitionMap, footnoteDefinitionMap, htmlRendererMap)
  }

  const getCreatedAtISO = async (markdownNode: Node): Promise<string> => {
    const { createdAt, createAt, date } = (markdownNode.frontmatter ?? {}) as any
    const d = createdAt ?? createAt ?? date
    return dayjs(d).toISOString()
  }

  const getCreatedAt = async (
    markdownNode: Node,
    { formatString }: GetUpdateAtOptions,
  ): Promise<string> => {
    const { createdAt, createAt, date } = (markdownNode.frontmatter ?? {}) as any
    const d = createdAt ?? createAt ?? date
    if (formatString == null) return dayjs(d).toJSON()
    return dayjs(d).format(formatString)
  }

  const getUpdatedAt = async (
    markdownNode: Node,
    { formatString }: GetUpdateAtOptions,
  ): Promise<string> => {
    const { updatedAt, updateAt, createdAt, createAt, date } = (markdownNode.frontmatter ??
      {}) as any
    const d = updatedAt ?? updateAt ?? createdAt ?? createAt ?? date
    if (formatString == null) return dayjs(d).toJSON()
    return dayjs(d).format(formatString)
  }

  const result = {
    title: {
      type: 'String',
      async resolve(markdownNode: Node): Promise<string> {
        const { title } = (markdownNode.frontmatter ?? {}) as Record<string, string>
        if (title != null) return title

        // Try to resolve the markdownNode relative filepath,
        // otherwise, return it id.
        const parent: Node | undefined = api.getNode(markdownNode.parent!)
        if (parent === undefined) return markdownNode.id
        return (parent.relativePath as string) ?? markdownNode.id
      },
    },
    description: {
      type: 'String',
      async resolve(markdownNode: Node): Promise<string> {
        const { description } = (markdownNode.frontmatter ?? {}) as Record<string, string>
        if (description != null) return description
        return result.title.resolve(markdownNode)
      },
    },
    createdAtISO: {
      type: 'String',
      resolve: getCreatedAtISO,
    },
    createAtISO: {
      type: 'String',
      resolve: getCreatedAtISO,
    },
    createdAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      resolve: getCreatedAt,
    },
    createAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      resolve: getCreatedAt,
    },
    updatedAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      getUpdatedAt,
    },
    updateAt: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
      },
      getUpdatedAt,
    },
    timeToRead: {
      type: 'String',
      args: {
        formatString: {
          type: 'String',
          defaultValue: null,
        },
        wordsPerMinute: {
          type: 'Int',
          defaultValue: null,
        },
      },
      async resolve(
        markdownNode: Node,
        { formatString, wordsPerMinute = _defaultWordsPerMinute }: GetTimeToReadOptions,
      ): Promise<string> {
        const { time2Read } = markdownNode.frontmatter as any
        if (time2Read != null) {
          return dayjs.duration(time2Read * 1000).format(formatString)
        }

        const ast = await getAst(markdownNode, false)
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
        const categories = ((markdownNode.frontmatter ?? {}) as any).categories ?? []
        return categories.map((category: string[]) => category.map(normalizeTagOrCategory))
      },
    },
    toc: {
      type: 'MarkdownYozoraToc!',
      async resolve(markdownNode: Node): Promise<IHeadingToc> {
        const ast = await getAst(markdownNode, false)
        const toc = calcHeadingToc(ast, headingIdentifierPrefix)
        return toc
      },
    },
    ast: {
      type: 'JSON',
      args: {
        shouldStrip: {
          type: 'Boolean',
          defaultValue: false,
        },
        preferReferences: {
          type: 'Boolean',
          defaultValue: preferFootnoteReferences,
        },
      },
      async resolve(
        markdownNode: Node,
        { shouldStrip, preferReferences }: GetAstOptions,
      ): Promise<Root> {
        const ast = await getAst(markdownNode, preferReferences)
        return stripAst(ast, shouldStrip)
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
      async resolve(markdownNode: Node, { preferReferences }: GetHtmlOptions): Promise<string> {
        const fullAst = await getAst(markdownNode, preferReferences)
        return astToHTML(fullAst)
      },
    },
    excerptAst: {
      type: 'JSON',
      args: {
        pruneLength: {
          type: 'Int',
          defaultValue: 140,
        },
        shouldStrip: {
          type: 'Boolean',
          defaultValue: false,
        },
        preferReferences: {
          type: 'Boolean',
          defaultValue: preferFootnoteReferences,
        },
      },
      async resolve(
        markdownNode: Node,
        { pruneLength, shouldStrip, preferReferences }: GetExcerptAstOptions,
      ): Promise<Root> {
        const fullAst = await getAst(markdownNode, preferReferences)
        const ast = stripAst(fullAst, shouldStrip)
        const excerptAst = getExcerptAst(ast, pruneLength, frontmatter.excerpt_separator)
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
        const fullAst = await getAst(markdownNode, preferReferences)
        const excerptAst = getExcerptAst(fullAst, pruneLength, frontmatter.excerpt_separator)
        return astToHTML(excerptAst)
      },
    },
    ecmaImports: {
      type: 'JSON',
      args: {},
      async resolve(markdownNode: Node): Promise<EcmaImport[]> {
        const ast = await getAst(markdownNode, false)
        const ecmaImports = collectNodes(ast, [EcmaImportType])
        return ecmaImports as EcmaImport[]
      },
    },
    definitionMap: {
      type: 'JSON',
      args: {},
      async resolve(markdownNode: Node): Promise<Record<string, Readonly<Definition>>> {
        const ast = await getAst(markdownNode, false)
        const { definitionMap } = calcDefinitionMap(ast, undefined, presetDefinitions)
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
        const ast = await getAst(markdownNode, preferReferences)
        const { footnoteDefinitionMap } = calcFootnoteDefinitionMap(
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
      async resolve(markdownNode: Node): Promise<MarkdownYozoraFrontmatter2> {
        const absoluteDirPath = path.dirname(markdownNode.absolutePath as string)
        const serve = async (_url: string | null): Promise<string | null> => {
          if (_url == null) return _url

          const url = _url.trim()
          if (!/^\./.test(url)) return url

          const filepath: string = path.join(absoluteDirPath, url)
          return await serveStaticFile(filepath)
        }

        const result: MarkdownYozoraFrontmatter2 = {}
        const { aplayer, wechatThumbnail } = markdownNode.frontmatter as any
        if (aplayer != null && aplayer.audio != null) {
          const audioList = Array.isArray(aplayer.audio) ? aplayer.audio : [aplayer.audio]
          for (const audio of audioList) {
            if (audio.cover != null) audio.cover = await serve(audio.cover)
            if (audio.url != null) audio.url = await serve(audio.url)
            if (audio.lrc != null) audio.lrc = await serve(audio.lrc)
          }
          result.aplayer = aplayer
        }

        if (wechatThumbnail) result.wechatThumbnail = await serve(wechatThumbnail)
        return result
      },
    },
  }
  return result
}

interface GetHtmlOptions {
  preferReferences: boolean
}

interface GetAstOptions {
  /**
   * Whether if to remove the definitions and footnote definitions.
   */
  shouldStrip: boolean
  /**
   *
   */
  preferReferences: boolean
}

interface GetExcerptOptions {
  preferReferences: boolean
  pruneLength: number
  excerptSeparator?: string
}

interface GetExcerptAstOptions {
  pruneLength: number
  /**
   * Whether if to remove the definitions and footnote definitions.
   */
  shouldStrip: boolean
  /**
   *
   */
  preferReferences: boolean
  /**
   *
   */
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

interface GetTimeToReadOptions {
  formatString?: string
  wordsPerMinute?: number
}

interface MarkdownYozoraFrontmatter2 {
  aplayer?: any | null
  wechatThumbnail?: string | null
}
