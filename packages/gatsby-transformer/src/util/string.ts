/**
 *
 */
export interface TagOrCategoryItem {
  /**
   * Display text.
   */
  title: string
  /**
   * Unique identifier.
   */
  identifier: string
}

/**
 * Normalize token such as tag or category
 * @param title
 * @returns
 */
export function normalizeTagOrCategory(title: string): TagOrCategoryItem {
  return {
    title: title,
    identifier: title.toLowerCase().trim().replace(/\s+/g, ' '),
  }
}
