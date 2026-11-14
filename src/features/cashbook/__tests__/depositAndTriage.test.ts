import { describe, it, expect, beforeEach } from 'vitest';
import { cashbookService } from '../services/cashbookService';

describe('Triage Workflow Frontend Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('TRIAGE-01: should retrieve pending triage and resolve an item by Owner', async () => {
    const pendingItems = await cashbookService.getPendingTriage();
    expect(Array.isArray(pendingItems)).toBe(true);

    if (pendingItems.length > 0) {
      const itemToResolve = pendingItems[0];
      const resolved = await cashbookService.resolveTriage(itemToResolve.id, {
        nature: 0, // OperatingExpense
        isTaxDeductible: true,
        category: 'Chi phí mua đá lạnh',
        resolutionNote: 'Đã duyệt hợp lệ theo hóa đơn bán lẻ',
      });

      expect(resolved.id).toBe(itemToResolve.id);
      expect(resolved.status).toBe('PAID');
    }
  });
});
