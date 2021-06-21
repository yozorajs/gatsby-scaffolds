/**
 * Normalize token such as tag or category
 * @param title
 * @returns
 */
export function normalizeTagOrCategory(title: string): string {
  return title.trim().replace(/[\s]+/g, ' ')
}
