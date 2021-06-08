<header>
  <h1 align="center">
    <a href="https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-images#readme">@yozora/gatsby-images</a>
  </h1>
  <div align="center">
    <a href="https://www.npmjs.com/package/@yozora/gatsby-images">
      <img
        alt="Npm Version"
        src="https://img.shields.io/npm/v/@yozora/gatsby-images.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@yozora/gatsby-images">
      <img
        alt="Npm Download"
        src="https://img.shields.io/npm/dm/@yozora/gatsby-images.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@yozora/gatsby-images">
      <img
        alt="Npm License"
        src="https://img.shields.io/npm/l/@yozora/gatsby-images.svg"
      />
    </a>
    <a href="https://github.com/nodejs/node">
      <img
        alt="Node.js Version"
        src="https://img.shields.io/node/v/@yozora/gatsby-images"
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


This plugin couldn't works alone, tt needs to be used as a plugin for 
[@yozora/gatsby-transformer][] which parse the markdown files into Yozora AST.


This plugin inspired by [gatsby-transformer-remark][], it process images 
referenced in markdown files as [gatsby-remark-images][] did within 
[gatsby-transformer-remark][].

## Install

* npm

  ```bash
  npm install @yozora/gatsby-transformer @yozora/gatsby-images --save-dev
  ```

* yarn

  ```bash
  yarn add @yozora/gatsby-transformer @yozora/gatsby-images --dev
  ```

## Usage

Add configs in `gatsby-config.js`:

```javascript
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: '@yozora/gatsby-transformer',
      options: {
        plugins: [
          {
            resolve: '@yozora/gatsby-images',
            options: {},
          }
        ]
      }
    }
  ]
}
```

## Related

* [@yozora/gatsby-transformer][]
* [gatsby-transformer-remark][]
* [gatsby-remark-images][]


[homepage]: https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-images#readme
[@yozora/gatsby-transformer]: https://www.npmjs.com/package/@yozora/gatsby-transformer
[gatsby-transformer-remark]: https://www.npmjs.com/package/gatsby-transformer-remark
[gatsby-remark-images]: https://www.npmjs.com/package/gatsby-remark-images
