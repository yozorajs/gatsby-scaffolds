declare module 'gatsby-plugin-sharp' {
  import type { GatsbyCache, Node, Reporter } from 'gatsby'

  export function fluid(params: {
    file: Node
    args: Record<string, any>
    reporter: Reporter
    cache?: GatsbyCache
  }): Promise<{
    base64: string | any
    aspectRatio: number
    src: string
    srcSet: string
    srcSetType: string
    sizes: string
    originalImg: string
    originalName: string
    density: unknown
    presentationWidth: number
    presentationHeight: number
    tracedSVG?: string
  }>

  export function stats(params: {
    file: Node
    reporter: Reporter
  }): Promise<{ isTransparent: boolean }>

  export function traceSVG(args: Record<string, unknown>): Promise<string>
}
