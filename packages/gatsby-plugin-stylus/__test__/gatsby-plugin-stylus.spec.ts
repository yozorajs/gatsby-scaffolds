import { onCreateWebpackConfig } from '../src'

describe(`gatsby-plugin-stylus`, () => {
  const actions = {
    setWebpackConfig: jest.fn(),
  }

  // loaders "mocks"
  const loaders = {
    miniCssExtract: (): string => `miniCssExtract`,
    css: (args: any): string => `css(${JSON.stringify(args)})`,
    postcss: (args: any): string => `postcss(${JSON.stringify(args)})`,
    null: (): string => `null`,
  }

  beforeEach(() => {
    actions.setWebpackConfig.mockReset()
  })

  const stylusPlugin = jest.fn().mockReturnValue(`foo`)

  const tests = {
    stages: [`develop`, `build-javascript`, `develop-html`, `build-html`],
    options: {
      'Empty options': {},
      'No options': undefined,
      'Stylus options #1': {
        stylusRule: {
          use: [stylusPlugin()],
        },
        moduleStylusRule: {
          test: /\.custom\.styl$/,
          use: [stylusPlugin()],
          import: [`file.js`, `file2.js`],
        },
      },
      'Stylus options #2': {
        shouldGenerateDts: true,
        shouldUseSourceMap: true,
      },
      'PostCss plugins': {
        postCssPlugins: [`test1`],
      },
      'css-loader use commonjs': {
        cssLoaderOptions: {
          esModule: false,
          modules: {
            namedExport: false,
          },
        },
      },
    },
  }

  tests.stages.forEach(stage => {
    for (const label in tests.options) {
      const options = tests.options[label]
      it(`Stage: ${stage} / ${label}`, () => {
        onCreateWebpackConfig(
          {
            actions,
            loaders,
            stage,
          } as any,
          options,
        )
        expect(actions.setWebpackConfig).toMatchSnapshot()
      })
    }
  })
})
