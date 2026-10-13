/**
 * Item in pagination array: number for page number, string '...' for ellipsis
 */
export type PaginationItem = number | '...';

/**
 * Generates an array of page numbers and ellipsis based on current page and total pages.
 *
 * @param currentPage Current active page (1-based)
 * @param totalPages Total number of pages
 * @param siblingCount Number of sibling pages on each side of active page (default 1)
 * @returns Array of page numbers and ellipsis strings
 */
export function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  // If total pages is 7 or less, display all page numbers directly
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    // Current page is near the start: [1, 2, 3, 4, 5, '...', totalPages]
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    // Current page is near the end: [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + 1 + i
    );
    return [1, '...', ...rightRange];
  }

  // Current page is in the middle: [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, '...', ...middleRange, '...', totalPages];
}
