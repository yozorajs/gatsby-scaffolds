<header>
  <h1 align="center">
    <a href="https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-plugin-stylus#readme">@guanghechen/gatsby-plugin-stylus</a>
  </h1>
  <div align="center">
    <a href="https://www.npmjs.com/package/@guanghechen/gatsby-plugin-stylus">
      <img
        alt="Npm Version"
        src="https://img.shields.io/npm/v/@guanghechen/gatsby-plugin-stylus.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@guanghechen/gatsby-plugin-stylus">
      <img
        alt="Npm Download"
        src="https://img.shields.io/npm/dm/@guanghechen/gatsby-plugin-stylus.svg"
      />
    </a>
    <a href="https://www.npmjs.com/package/@guanghechen/gatsby-plugin-stylus">
      <img
        alt="Npm License"
        src="https://img.shields.io/npm/l/@guanghechen/gatsby-plugin-stylus.svg"
      />
    </a>
    <a href="https://github.com/nodejs/node">
      <img
        alt="Node.js Version"
        src="https://img.shields.io/node/v/@guanghechen/gatsby-plugin-stylus"
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


Provides drop-in support for Stylus, and generate `*.d.ts` for Stylus files.

## Install

* npm

  ```bash
  npm install @guanghechen/gatsby-plugin-stylus --save-dev
  ```

* yarn

  ```bash
  yarn add @guanghechen/gatsby-plugin-stylus --dev
  ```

## Usage

Add configs in `gatsby-config.js`:

```javascript
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: '@guanghechen/gatsby-plugin-stylus',
      options: {
        shouldUseSourceMap: false,
        shouldGenerateDts: true,
        cssLoaderOptions: {
          modules: {
            localIdentContext: path.resolve(__dirname, 'src'),
            exportLocalsConvention: 'camelCaseOnly',
          }
        }
      }
    }
  ]
}
```

Then, import `*.module.styl` in `js|jsx|ts|tsx` files:

```tsx
import classes from './style.module.styl'

console.log('classes:', classes)
```

### Options

Name                    | Required  | Type    | Default |  Description
:----------------------:|:---------:|:-------:|:-------:|:------------------:
`stylusRule`            | `false`   | object  | -       | Additional webpack rule for `*.styl`
`moduleStylusRule`      | `false`   | object  | -       | Additional webpack rule for `*.module.styl`
`shouldUseSourceMap`    | `false`   | boolean | `false` | Whether to generate sourcemaps
`shouldGenerateDts`     | `false`   | boolean | `false` | Whether to generate `*d.ts` for `*.module.styl` files
`cssLoaderOptions`      | `false`   | object  | -       | Options for [css-loader][]
`stylusLoaderOptions`   | `false`   | object  | -       | Options for [stylus-loader][]
`postcssLoaderOptions`  | `false`   | object  | -       | Options for [postcss-loader][]

---

* `shouldGenerateDts` only works for stylus files enabled `module` options. You
  can change the file pattern of the modular stylus by modifying
  `moduleStylusRule.test`, similar to the following similar to the following
  configuration.

  ```javascript {7}
  // gatsby-config.js
  module.exports = {
    plugins: [
      {
        resolve: '@guanghechen/gatsby-plugin-stylus',
        options: {
          moduleStylusRule: {
            test: /\.custom\.styl$/,
          },
          shouldGenerateDts: true,
          cssLoaderOptions: {
            modules: {
              localIdentContext: path.resolve(__dirname, 'src'),
              exportLocalsConvention: 'camelCaseOnly',
            }
          }
        }
      }
    ]
  }
  ```


[homepage]: https://github.com/yozorajs/gatsby-scaffolds/tree/main/packages/gatsby-plugin-stylus#readme
[css-loader]: https://github.com/webpack-contrib/css-loader
[postcss-loader]: https://github.com/webpack-contrib/postcss-loader
[stylus-loader]: https://github.com/webpack-contrib/stylus-loader
