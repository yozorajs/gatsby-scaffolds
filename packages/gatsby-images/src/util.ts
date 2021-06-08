import path from 'path'
import queryString from 'query-string'

export interface ImageInfo {
  ext: string
  url: string
  query: Record<string, unknown>
}

/**
 * Calc image info from uri.
 * @param uri
 * @returns
 */
export function getImageInfo(uri: string): ImageInfo {
  const { url, query } = queryString.parseUrl(uri)
  return {
    ext: path.extname(url).split(`.`).pop() ?? '',
    url,
    query,
  }
}

/**
 * Check whether if the given url is a relative url
 * @param url
 * @returns
 * @see https://github.com/sindresorhus/is-relative-url
 * @see https://github.com/sindresorhus/is-absolute-url
 */
export function isRelativeUrl(url: string): boolean {
  // Don't match Windows paths `c:\`
  if (/^[a-zA-Z]:\\/.test(url)) return true

  // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
  // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)
}
