import { isNonBlankString } from '@guanghechen/option-helper'
import type { Root, YastNode, YastResource } from '@yozora/ast'
import { DefinitionType, ImageType, LinkType } from '@yozora/ast'
import { traverseAST } from '@yozora/ast-util'
import crypto from 'crypto'
import fs from 'fs-extra'
import path from 'path'
import env from './env'

/**
 * Resolve ast urls.
 * @param ast
 * @param resolveUrl
 */
export async function resolveAstUrls(
  ast: Root,
  resolveUrl: (url: string) => Promise<string | null>,
): Promise<void> {
  const promises: Array<Promise<void>> = []
  traverseAST(ast, [DefinitionType, LinkType, ImageType], node => {
    const o = node as YastNode & YastResource
    if (o.url != null) {
      const promise = resolveUrl(o.url).then(url => {
        o.url = url ?? o.url
      })
      promises.push(promise)
    }
  })

  try {
    await Promise.all(promises)
  } catch (error) {
    console.error('[resolveAstUrls] error:', error)
  }
}

/**
 * Join url path with `prefix` and normalize the result.
 *
 * @param prefix
 * @param path
 * @returns
 */
export function resolveUrl(
  ...pathPieces: Array<string | null | undefined>
): string {
  const pieces: string[] = pathPieces.filter(isNonBlankString)
  if (pieces.length <= 0) return ''

  // If the last path piece is a absolute url path, then return it directly,
  // otherwise, resolved it with previous url paths.
  const lastPiece = pieces[pieces.length - 1]
  return /^([/]|\w+:[/]{2})/.test(lastPiece)
    ? lastPiece
    : pieces
        .join('/')
        .replace(/[/]+/g, '/')
        .replace(/[/][.][/]/g, '/')
        .trim()
}

/**
 * Create a public URL for a static file.
 * @param absoluteFilepath
 */
export async function serveStaticFile(
  absoluteFilepath: string,
): Promise<string | null> {
  if (!fs.existsSync(absoluteFilepath)) return null

  const finger: string = await calcFingerOfFile(absoluteFilepath)
  const urlPath = '/static/' + finger + '/' + path.basename(absoluteFilepath)
  const publicStaticDir = path.join(process.cwd(), 'public')
  const staticFilepath = path.join(publicStaticDir, urlPath)

  // Static file not exist yet.
  if (!fs.existsSync(staticFilepath)) {
    fs.copySync(absoluteFilepath, staticFilepath)
  }

  return urlPath
}

/**
 * Calc hash of content of a file.
 * @param filepath
 * @param algorithm
 */
export function calcFingerOfFile(
  filepath: string,
  algorithm = 'sha1',
): Promise<string> {
  /**
   * In a production environment, only the absolute dir path of the file is
   * used to generate the the file's finger.
   */
  if (env.isEnvProduction) {
    const finger = crypto
      .createHash(algorithm)
      .update(path.dirname(filepath))
      .digest('hex')
    return Promise.resolve(finger)
  }

  /**
   * Otherwise, generate a finger from the file content nn order to meet the
   * real-time file changes.
   */
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm)
    const stream = fs.createReadStream(filepath)
    stream.on('error', err => reject(err))
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}
