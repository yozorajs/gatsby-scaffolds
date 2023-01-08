// eslint-disable-next-line import/no-extraneous-dependencies
import createRollupConfig from '@guanghechen/rollup-config'
import path from 'node:path'

export default async function rollupConfig() {
  const { default: manifest } = await import(
    path.resolve('package.json'),
    { assert: { type: 'json' } },
  )
  const config = await createRollupConfig({
    manifest,
    shouldSourceMap: false,
    pluginOptions: {
      typescriptOptions: { tsconfig: 'tsconfig.src.json' },
    },
  })

  const tsConfig = config[0]
  return [
    ...config,
    {
      ...tsConfig,
      input: "src/gatsby-browser.ts",
      output: [{
        format: 'esm',
        file: './gatsby-browser.js',
        exports: 'named',
        sourcemap: false,
      }]
    },
    {
      ...tsConfig,
      input: "src/gatsby-node.ts",
      output: [{
        format: 'esm',
        file: './gatsby-node.js',
        exports: 'named',
        sourcemap: false,
      }]
    },
  ]
}
