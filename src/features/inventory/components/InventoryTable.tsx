import type { CSSProperties, FC } from 'react';
import { Eye } from 'lucide-react';
import type { InventoryItem } from '../types/inventory.types';

interface Props {
  items: InventoryItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewBatches: (item: InventoryItem) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const th: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '8px 10px',
  fontSize: 12.5,
  borderBottom: '1px solid #f1f5f9',
  color: '#1e293b',
};

const statusBadge = (status: InventoryItem['status']) => {
  if (status === 'Out') return { label: 'Hết hàng', bg: '#fce8e6', color: '#c5221f' };
  if (status === 'Low') return { label: 'Sắp hết', bg: '#feefc3', color: '#b06000' };
  return { label: 'Đủ hàng', bg: '#e6f4ea', color: '#137333' };
};

export const InventoryTable: FC<Props> = ({
  items,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewBatches,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const end = Math.min(pageIndex * pageSize, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', width: 40 }}>#</th>
              <th style={th}>SKU / Barcode</th>
              <th style={th}>Tên sản phẩm</th>
              <th style={th}>Nhóm</th>
              <th style={th}>Chi nhánh</th>
              <th style={th}>Vị trí</th>
              <th style={{ ...th, textAlign: 'center' }}>ĐVT</th>
              <th style={{ ...th, textAlign: 'right' }}>Tồn thực</th>
              <th style={{ ...th, textAlign: 'right' }}>Đã giữ</th>
              <th style={{ ...th, textAlign: 'right' }}>Khả dụng</th>
              <th style={{ ...th, textAlign: 'right' }}>Đang nhập</th>
              <th style={{ ...th, textAlign: 'right' }}>Điểm đặt</th>
              <th style={{ ...th, textAlign: 'right' }}>Giá vốn</th>
              <th style={{ ...th, textAlign: 'right' }}>Giá trị</th>
              <th style={{ ...th, textAlign: 'center' }}>Trạng thái</th>
              <th style={{ ...th, textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ ...td, textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Không có dòng tồn kho phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const badge = statusBadge(item.status);
                const rowNo = start + idx;
                return (
                  <tr key={item.id}>
                    <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{rowNo}</td>
                    <td style={td}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#0f766e' }}>
                        {item.sku}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{item.productName}</td>
                    <td style={td}>{item.categoryLabel}</td>
                    <td style={td}>{item.branchName}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{item.location}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: item.onHand === 0 ? '#dc2626' : '#0f172a' }}>
                      {fmt(item.onHand)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: item.committed > 0 ? '#dc2626' : '#64748b' }}>
                      {fmt(item.committed)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: item.available <= item.reorderPoint ? '#dc2626' : '#16a34a' }}>
                      {fmt(item.available)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: item.onOrder > 0 ? '#2563eb' : '#94a3b8' }}>
                      {fmt(item.onOrder)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>{fmt(item.reorderPoint)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(item.avgCost)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(item.totalValue)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => onViewBatches(item)}
                        title="Xem các lô và hạn sử dụng của sản phẩm này"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 28,
                          padding: '0 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} />
                        <span>{item.batchCount} lô · HSD</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 2px 0',
          flexShrink: 0,
          fontSize: 12,
          color: '#475569',
        }}
      >
        <div>
          {totalCount === 0 ? 'Không có dữ liệu' : `Dòng ${start}–${end} / ${totalCount}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
          <button type="button" className="po-btn po-btn-secondary" style={{ height: 30 }} disabled={pageIndex <= 1} onClick={() => onPageChange(pageIndex - 1)}>
            Trước
          </button>
          <span style={{ fontWeight: 700 }}>{pageIndex}/{totalPages}</span>
          <button type="button" className="po-btn po-btn-secondary" style={{ height: 30 }} disabled={pageIndex >= totalPages} onClick={() => onPageChange(pageIndex + 1)}>
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};
