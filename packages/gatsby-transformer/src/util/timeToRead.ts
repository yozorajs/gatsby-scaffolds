import type { Literal, Root } from '@yozora/ast'
import { CodeType, InlineMathType, MathType } from '@yozora/ast'
import { traverseAst } from '@yozora/ast-util'

/**
 * Estimate the time required to read.
 * @param ast
 * @param wordsPerMinute the number of words read per minute
 * @returns
 */
const wordRegex = /[-a-zA-Z0-9]+|\p{Script=Han}/gu
export function timeToRead(ast: Root, wordsPerMinute?: number): number {
  // eslint-disable-next-line no-param-reassign
  if (wordsPerMinute == null) wordsPerMinute = 140

  let wordCount = 0
  traverseAst(ast, null, o => {
    const { value } = o as Literal
    switch (o.type) {
      case InlineMathType:
        wordCount += value.length / 5
        break
      case MathType:
        wordCount += value.length / 3
        break
      case CodeType:
        wordCount += Math.min(value.length, 50) / 5
        break
      default:
        if (value != null) {
          const m = value.match(wordRegex)
          if (m === null) wordCount += 1
          else wordCount += m.length
        }
    }
  })
  const result = Math.ceil((wordCount / wordsPerMinute) * 60)
  return result
}
