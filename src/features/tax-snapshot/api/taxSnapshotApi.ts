import type {
  TaxSnapshot,
  TaxSnapshotDetail,
  TaxSnapshotFilterParams,
  TaxPreviewResponse,
  TaxSnapshotKPIs,
  TaxSnapshotStatus,
} from '../types/taxSnapshot';
import { initialTaxSnapshots, mockOrdersPool } from './mockTaxData';

// Local In-Memory Store
let snapshotsStore: TaxSnapshot[] = [...initialTaxSnapshots];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const taxSnapshotApi = {
  /**
   * Fetch all snapshots with filtering
   */
  async getSnapshots(params?: TaxSnapshotFilterParams): Promise<TaxSnapshot[]> {
    await delay(150);
    let result = [...snapshotsStore];

    if (params?.year) {
      result = result.filter((s) => s.year === Number(params.year));
    }
    if (params?.quarter) {
      result = result.filter((s) => s.quarter === Number(params.quarter));
    }
    if (params?.status && params.status !== 'ALL') {
      result = result.filter((s) => s.status === params.status);
    }
    if (params?.keyword) {
      const q = params.keyword.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.note?.toLowerCase().includes(q) ||
          `quý ${s.quarter}/${s.year}`.includes(q) ||
          `q${s.quarter}`.includes(q)
      );
    }

    return result.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.quarter - a.quarter;
    });
  },

  /**
   * Get single snapshot detail with associated orders breakdown
   */
  async getSnapshotById(id: string): Promise<TaxSnapshotDetail | null> {
    await delay(120);
    const item = snapshotsStore.find((s) => s.id === id);
    if (!item) return null;

    return {
      ...item,
      orders: mockOrdersPool,
    };
  },

  /**
   * Preview calculation for a target Year + Quarter
   */
  async previewTaxSnapshot(year: number, quarter: number): Promise<TaxPreviewResponse> {
    await delay(180);

    const existing = snapshotsStore.find(
      (s) => s.year === year && s.quarter === quarter && s.status !== 'Draft'
    );

    if (existing) {
      return {
        year,
        quarter,
        taxableRevenue: existing.taxableRevenue,
        vatRate: existing.vatRate,
        vatAmount: existing.vatAmount,
        pitRate: existing.pitRate,
        pitAmount: existing.pitAmount,
        totalTaxAmount: existing.totalTaxAmount,
        ordersCount: existing.ordersCount,
        orders: mockOrdersPool,
        canCreate: false,
        warningMessage: `Kỳ tính thuế Quý ${quarter}/${year} đã tồn tại ở trạng thái ${existing.status}. Không thể tạo mới.`,
      };
    }

    // Mock aggregate calculation from POS orders for the quarter
    const baseRevenue = 450000000 + (quarter * 25000000);
    const vatRate = 1.0;
    const pitRate = 0.5;
    const vatAmount = Math.round((baseRevenue * vatRate) / 100);
    const pitAmount = Math.round((baseRevenue * pitRate) / 100);
    const totalTaxAmount = vatAmount + pitAmount;

    return {
      year,
      quarter,
      taxableRevenue: baseRevenue,
      vatRate,
      vatAmount,
      pitRate,
      pitAmount,
      totalTaxAmount,
      ordersCount: 850 + quarter * 50,
      orders: mockOrdersPool,
      canCreate: true,
    };
  },

  /**
   * Create a new snapshot record
   */
  async createSnapshot(data: {
    year: number;
    quarter: number;
    note?: string;
    asFinalized?: boolean;
  }): Promise<TaxSnapshot> {
    await delay(200);

    // Compute numbers
    const baseRevenue = 450000000 + (data.quarter * 25000000);
    const vatRate = 1.0;
    const pitRate = 0.5;
    const vatAmount = Math.round((baseRevenue * vatRate) / 100);
    const pitAmount = Math.round((baseRevenue * pitRate) / 100);

    const newSnapshot: TaxSnapshot = {
      id: `tax-${data.year}-q${data.quarter}-${Date.now()}`,
      tenantId: 'tenant-default',
      year: data.year,
      quarter: data.quarter,
      taxableRevenue: baseRevenue,
      vatRate,
      vatAmount,
      pitRate,
      pitAmount,
      totalTaxAmount: vatAmount + pitAmount,
      status: data.asFinalized ? 'Finalized' : 'Draft',
      note: data.note,
      ordersCount: 850 + data.quarter * 50,
      generatedAt: new Date().toISOString(),
    };

    // Remove existing draft for the same quarter if any
    snapshotsStore = snapshotsStore.filter(
      (s) => !(s.year === data.year && s.quarter === data.quarter && s.status === 'Draft')
    );

    snapshotsStore.unshift(newSnapshot);
    return newSnapshot;
  },

  /**
   * Update snapshot status (Draft -> Finalized -> Submitted -> Paid)
   */
  async updateStatus(
    id: string,
    status: TaxSnapshotStatus,
    note?: string
  ): Promise<TaxSnapshot> {
    await delay(150);
    const idx = snapshotsStore.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy kỳ tính thuế tương ứng.');

    const current = snapshotsStore[idx];
    const updated: TaxSnapshot = {
      ...current,
      status,
      note: note || current.note,
      submittedAt: status === 'Submitted' ? new Date().toISOString() : current.submittedAt,
      paidAt: status === 'Paid' ? new Date().toISOString() : current.paidAt,
    };

    snapshotsStore[idx] = updated;
    return updated;
  },

  /**
   * Delete snapshot (Draft only)
   */
  async deleteSnapshot(id: string): Promise<boolean> {
    await delay(120);
    const item = snapshotsStore.find((s) => s.id === id);
    if (!item) throw new Error('Không tìm thấy bản ghi.');
    if (item.status !== 'Draft') {
      throw new Error('Chỉ có thể xóa kỳ tính thuế ở trạng thái Nháp (Draft).');
    }

    snapshotsStore = snapshotsStore.filter((s) => s.id !== id);
    return true;
  },

  /**
   * Calculate overall KPIs for a selected year
   */
  async getKPIs(year: number): Promise<TaxSnapshotKPIs> {
    await delay(100);
    const yearSnapshots = snapshotsStore.filter((s) => s.year === year);

    let totalTaxableRevenueYear = 0;
    let totalVatAmountYear = 0;
    let totalPitAmountYear = 0;
    let totalTaxLiabilityYear = 0;
    let totalTaxPaidYear = 0;

    for (const s of yearSnapshots) {
      totalTaxableRevenueYear += s.taxableRevenue;
      totalVatAmountYear += s.vatAmount;
      totalPitAmountYear += s.pitAmount;
      totalTaxLiabilityYear += s.totalTaxAmount;
      if (s.status === 'Paid') {
        totalTaxPaidYear += s.totalTaxAmount;
      }
    }

    return {
      totalTaxableRevenueYear,
      totalVatAmountYear,
      totalPitAmountYear,
      totalTaxLiabilityYear,
      totalTaxPaidYear,
      remainingTaxPayable: Math.max(0, totalTaxLiabilityYear - totalTaxPaidYear),
    };
  },
};
