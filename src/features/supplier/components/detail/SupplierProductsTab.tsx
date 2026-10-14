import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierProductItem } from '../../types/supplier.types';
import { Package } from 'lucide-react';

interface Props {
  products: SupplierProductItem[];
}

export const SupplierProductsTab: FC<Props> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="supplier-detail-card">
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary)',
            }}>
              <Package size={20} />
            </div>
            <div>
              <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                Danh Mục Sản Phẩm Cung Ứng ({products.length})
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Bảng giá nhập hiện tại và số lượng đặt hàng tối thiểu (MOQ) được duyệt từ NCC.
              </div>
            </div>
          </div>

          {/* Search box */}
          <div style={{ minWidth: 260 }}>
            <input
              type="text"
              placeholder="Tìm theo SKU hoặc tên mặt hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
              style={{ width: '100%', height: 38 }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 30, textAlign: 'center', padding: '10px 4px' }}>
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: 110 }}>Mã SKU</th>
                <th>Tên sản phẩm</th>
                <th style={{ width: 80, textAlign: 'center' }}>ĐVT</th>
                <th style={{ width: 140, textAlign: 'right' }}>Giá nhập hiện tại</th>
                <th style={{ width: 110, textAlign: 'right' }}>MOQ (Tối thiểu)</th>
                <th style={{ width: 120, textAlign: 'center' }}>Ngày áp dụng</th>
                <th style={{ width: 110, textAlign: 'left' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelectOne(p.id)}
                      />
                    </td>
                    <td>
                      <span className="admin-subdomain-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                        {p.sku}
                      </span>
                    </td>
                    <td>
                      <b style={{ color: 'var(--text-main)' }}>{p.name}</b>
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.unit || p.deliveryUoM}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#111827' }}>
                      {fmt(p.importPrice ?? p.agreedPrice ?? 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {p.moq} {p.unit || p.deliveryUoM}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.effectiveDate}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span
                        style={{
                          color: '#16a34a',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Đang phân phối
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Không có sản phẩm nào phù hợp với tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
