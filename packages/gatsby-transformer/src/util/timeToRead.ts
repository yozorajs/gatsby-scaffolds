import type { Root, YastLiteral } from '@yozora/ast'
import { InlineMathType, MathType } from '@yozora/ast'
import { traverseAST } from '@yozora/ast-util'

/**
 * Estimate the time required to read.
 * @param ast
 * @param wordsPerMinute the number of words read per minute
 * @returns
 */
const wordRegex = /[-a-zA-Z0-9]+|\p{Script=Han}/gu
export function timeToRead(ast: Root, wordsPerMinute = 80): number {
  let wordCount = 0
  traverseAST(ast, null, o => {
    const { value } = o as YastLiteral
    switch (o.type) {
      case InlineMathType:
        wordCount += value.length / 5
        break
      case MathType:
        wordCount += value.length / 3
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
