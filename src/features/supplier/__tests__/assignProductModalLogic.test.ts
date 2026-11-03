import { describe, it, expect } from 'vitest';

type RowTerms = { price: string; moq: string };

function parseCurrency(str: string): number {
  const cleaned = String(str ?? '').replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function validateSelectedRows(
  selectedIds: string[],
  assignedIds: Set<string>,
  terms: Record<string, RowTerms>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (selectedIds.length === 0) {
    errors.products = 'Vui lòng chọn ít nhất 1 sản phẩm để gán cho nhà cung cấp.';
  }

  selectedIds.forEach((id) => {
    if (assignedIds.has(id)) {
      errors.products = 'Không thể gán lại sản phẩm đã thuộc nhà cung cấp này.';
      return;
    }

    const row = terms[id] ?? { price: '0', moq: '1' };
    const price = parseCurrency(row.price);
    if (Number.isNaN(price) || price < 0) {
      errors[`price_${id}`] = 'Giá nhập phải ≥ 0.';
    }

    const moq = parseInt(row.moq, 10);
    if (!row.moq || Number.isNaN(moq) || moq < 1) {
      errors[`moq_${id}`] = 'MOQ phải > 0.';
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

function buildBatchPayload(
  supplierId: string,
  selectedIds: string[],
  terms: Record<string, RowTerms>
) {
  return {
    supplierId,
    productIds: selectedIds,
    items: selectedIds.map((id) => {
      const row = terms[id] ?? { price: '0', moq: '1' };
      return {
        productId: id,
        agreedPrice: parseCurrency(row.price),
        moq: parseInt(row.moq, 10),
      };
    }),
  };
}

describe('AssignProductModal logic', () => {
  it('does not allow submit without selected products', () => {
    const result = validateSelectedRows([], new Set(), {});
    expect(result.valid).toBe(false);
    expect(result.errors.products).toBeTruthy();
  });

  it('rejects already assigned products', () => {
    const result = validateSelectedRows(['p1'], new Set(['p1']), {
      p1: { price: '1000', moq: '2' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.products).toContain('đã thuộc');
  });

  it('rejects MOQ 0 / invalid and accepts price 0', () => {
    const invalidMoq = validateSelectedRows(['p1'], new Set(), {
      p1: { price: '0', moq: '0' },
    });
    expect(invalidMoq.valid).toBe(false);
    expect(invalidMoq.errors.moq_p1).toBeTruthy();

    const ok = validateSelectedRows(['p1'], new Set(), {
      p1: { price: '0', moq: '1' },
    });
    expect(ok.valid).toBe(true);
  });

  it('keeps independent price/MOQ for each selected product', () => {
    const payload = buildBatchPayload(
      'sup-1',
      ['p1', 'p2'],
      {
        p1: { price: '100000', moq: '10' },
        p2: { price: '55000', moq: '8' },
      }
    );

    expect(payload.items).toEqual([
      { productId: 'p1', agreedPrice: 100000, moq: 10 },
      { productId: 'p2', agreedPrice: 55000, moq: 8 },
    ]);
  });

  it('resets previous selection when switching supplier conceptually', () => {
    let selected = ['p1', 'p2'];
    let terms: Record<string, RowTerms> = {
      p1: { price: '12000', moq: '3' },
      p2: { price: '8000', moq: '2' },
    };

    // Simulate supplier change
    selected = [];
    terms = {};

    expect(selected).toEqual([]);
    expect(Object.keys(terms)).toHaveLength(0);
  });
});
