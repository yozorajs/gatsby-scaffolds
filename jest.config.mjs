import { tsMonorepoConfig } from '@guanghechen/jest-config'
import path from 'node:path'
import url from 'node:url'

export default async function () {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
  const baseConfig = await tsMonorepoConfig(__dirname, { useESM: true })

  const config = {
    ...baseConfig,
    collectCoverageFrom: [...baseConfig.collectCoverageFrom, '<rootDir>/gatsby-node.js'],
    coverageProvider: 'babel',
    coverageThreshold: {
      global: {
        branches: 20,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
    extensionsToTreatAsEsm: ['.ts', '.mts'],
  }
  return config
}
