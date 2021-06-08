/**
 * Check if under the production env.
 */
export const isEnvProduction: boolean = process.env.NODE_ENV !== 'production'

const env = {
  isEnvProduction,
}
export default env
