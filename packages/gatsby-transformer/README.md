<header>
  <h1 align="center">
    <a href="https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-transformer#readme">@yozora/gatsby-transformer</a>
  </h1>
  <div align="center">
    <a href="https://www.npmjs.com/package/@yozora/gatsby-transformer">
      <img
        alt="Npm Version"
        src="https://img.shields.io/npm/v/@yozora/gatsby-transformer.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@yozora/gatsby-transformer">
      <img
        alt="Npm Download"
        src="https://img.shields.io/npm/dm/@yozora/gatsby-transformer.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@yozora/gatsby-transformer">
      <img
        alt="Npm License"
        src="https://img.shields.io/npm/l/@yozora/gatsby-transformer.svg"
      />
    </a>
    <a href="https://github.com/nodejs/node">
      <img
        alt="Node.js Version"
        src="https://img.shields.io/node/v/@yozora/gatsby-transformer"
      />
    </a>
    <a href="https://github.com/gatsbyjs/gatsby">
      <img
        alt="Gatsby Version"
        src="https://img.shields.io/npm/dependency-version/@guanghechen/rollup-config/peer/gatsby"
      />
    </a>
    <a href="https://github.com/facebook/jest">
      <img
        alt="Tested with Jest"
        src="https://img.shields.io/badge/tested_with-jest-9c465e.svg"
      />
    </a>
    <a href="https://github.com/prettier/prettier">
      <img
        alt="Code Style: prettier"
        src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square"
      />
    </a>
  </div>
</header>
<br/>

A gatsby plugin for transforming markdown files to markdown ast through 
[Yozora][yozora-repo] Parser, Inspired by [gatsby-transformer-remark][].

## Install

This plugin depends on Yozora Parser, as of now, you can choose 
[@yozora/parser][] (Recommend) or [@yozora/parser-gfm][] or [@yozora/parser-gfm-ex].

* npm

  ```bash
  npm install @yozora/gatsby-transformer @yozora/parser --save-dev
  ```

* yarn

  ```bash
  yarn add @yozora/gatsby-transformer @yozora/parser --dev
  ```

## Usage

Add configs in `gatsby-config.js`:

```javascript
// gatsby-config.js
const { YozoraParser } = require('@yozora/parser')

module.exports = {
  plugins: [
    {
      resolve: '@yozora/gatsby-transformer',
      options: {
        parser: new YozoraParser(),
        preferFootnoteReferences: true,
        frontmatter: {
          excerpt_separator: '<!-- more -->',
        }
      }
    }
  ]
}
```

### Options

Name                        | Required  | Default
:---------------------------|:----------|:-----------
`parser`                    | `true`    | -
`preferFootnoteReferences`  | `false`   | `false`
`presetDefinitions`         | `false`   | -
`presetFootnoteDefinitions` | `false`   | -
`headingIdentifierPrefix`   | `false`   | `heading-`
`footnoteIdentifierPrefix`  | `false`   | `footnote-`
`shouldStripChineseChars`   | `false`   | `false`
`wordsPerMinute`            | `false`   | 80
`frontmatter`               | `false`   | -
`plugins`                   | `false`   | -


* `parser`: A [yozora][yozora-repo] parser.

* `preferFootnoteReferences`: Replace footnotes into footnote references and 
  footnote reference definitions.

* `presetDefinitions`: Preset link reference definitions.

* `presetFootnoteDefinitions`: Preset footnote reference definitions.

* `headingIdentifierPrefix`: The identifier prefix of the headings that 
  constitutes the toc (Table of Content).

* `footnoteIdentifierPrefix`: The identifier prefix of the footnote references
  and footnote reference definitions.

* `shouldStripChineseChars`: Whether to remove line end between two chinese characters.

* `wordsPerMinute`: The number of words read per minute.

* `frontmatter`: Options for [gray-matter][].

* `plugins`: Plugins of [@yozora/gatsby-transformer][], similar with the
  plugins option of [gatsby-transformer-remark][].

  ```typescript
  /**
  * Api passed to the options.plugins
  */
  export interface AstMutateApi {
    files: Node[]
    markdownNode: Node
    markdownAST: Root
    pathPrefix: string
    getNode(id: string): Node
    reporter: Reporter
    cache: GatsbyCache
  }

  function plugin(api: AstMutateApi, pluginOptions: any): void
  ```

  - `api`: passed by [@yozora/gatsby-transformer][]
  - `pluginOptions`: defined in `gatsby-config.js`, such as the highlighted 
    line in the following code (line eight)

    ```javascript {8}
    const presetDefinitions = []
    const presetFootnoteDefinitions = []

    {
      resolve: '@yozora/gatsby-transformer',
      options: {
        parser: new YozoraParser({
          defaultParseOptions: {
            shouldReservePosition: false,
            presetDefinitions,
            presetFootnoteDefinitions,
          },
        }),
        presetDefinitions,
        presetFootnoteDefinitions,
        preferFootnoteReferences: true,
        shouldStripChineseCharacters: true,
        frontmatter: {
          excerpt_separator: '<!-- more -->',
        },
        plugins: [
          {
            resolve: '@yozora/gatsby-images',
            options: {},    // this is the pluginOptions.
          },
        ],
      },
    }
    ```


## FAQ

* How to deal with images referenced in markdown files, like [gatsby-remark-images][] does?

  See [@yozora/gatsby-images][].


## Related

* [@yozora/gatsby-images][]
* [@yozora/ast][]
* [@yozora/parser][]
* [@yozora/parser-gfm][]
* [@yozora/parser-gfm-ex][]
* [gatsby-transformer-remark][]
* [gray-matter][]


[homepage]: https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-transformer#readme
[yozora-repo]: https://github.com/yozorajs/yozora
[@yozora/gatsby-transformer]: https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-transformer#readme
[@yozora/gatsby-images]: https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-images#readme
[@yozora/ast]: https://www.npmjs.com/package/@yozora/ast
[@yozora/parser]: https://www.npmjs.com/package/@yozora/parser
[@yozora/parser-gfm]: https://www.npmjs.com/package/@yozora/parser-gfm
[@yozora/parser-gfm-ex]: https://www.npmjs.com/package/@yozora/parser-gfm-ex
[gatsby-transformer-remark]: https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-transformer-remark
[gatsby-remark-images]: https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-remark-images
[gray-matter]: https://github.com/jonschlinkert/gray-matter
