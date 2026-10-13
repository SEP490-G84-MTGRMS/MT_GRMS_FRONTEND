import { describe, it, expect } from 'vitest';
import { generatePaginationRange } from './pagination.utils';

describe('generatePaginationRange', () => {
  it('returns empty array when totalPages <= 0', () => {
    expect(generatePaginationRange(1, 0)).toEqual([]);
    expect(generatePaginationRange(1, -5)).toEqual([]);
  });

  it('returns direct array [1..totalPages] when totalPages <= 7', () => {
    expect(generatePaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(generatePaginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns right dots only when currentPage is near start (totalPages > 7)', () => {
    const range = generatePaginationRange(2, 10);
    expect(range).toEqual([1, 2, 3, 4, 5, '...', 10]);
  });

  it('returns left dots only when currentPage is near end (totalPages > 7)', () => {
    const range = generatePaginationRange(9, 10);
    expect(range).toEqual([1, '...', 6, 7, 8, 9, 10]);
  });

  it('returns both dots when currentPage is in the middle (totalPages > 7)', () => {
    const range = generatePaginationRange(8, 15);
    expect(range).toEqual([1, '...', 7, 8, 9, '...', 15]);
  });
});
