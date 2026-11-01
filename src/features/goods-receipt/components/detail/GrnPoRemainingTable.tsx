import type { FC } from 'react';
import {
  ListChecks,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { GrnDetailItem } from '../../types/grn.types';

interface GrnPoRemainingTableProps {
  poReference: string;
  items: GrnDetailItem[];
  readOnly?: boolean;
}

export const GrnPoRemainingTable: FC<GrnPoRemainingTableProps> = ({
  poReference,
  items,
  readOnly: _readOnly = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar matching GrnFormHeaderCard */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ListChecks size={18} color="#0d9488" />
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              margin: 0,
            }}
          >
            Đối soát số lượng đơn PO gốc &amp; Trạng thái hoàn tất
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
          <span style={{ color: '#64748b' }}>Đơn mua hàng gốc:</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 700,
              fontFamily: 'monospace',
              border: '1px solid #bfdbfe',
            }}
          >
            <Layers size={12} />
            {poReference}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          className="po-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              <th style={{ padding: '9px 12px', width: 140 }}>Mã PO</th>
              <th style={{ padding: '9px 12px', minWidth: 200 }}>Sản phẩm</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 100 }}>
                Đặt (Ordered)
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 100 }}>
                Thực nhận
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 110 }}>
                Chấp nhận (+)
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 95 }}>
                Từ chối
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 105 }}>
                Giao thiếu
              </th>
              <th style={{ padding: '9px 12px', minWidth: 250 }}>
                Ghi chú đối soát &amp; Quy tắc V1
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const ordered = item.orderedQty || 0;
              const received = item.receivedQty || 0;
              const accepted = item.acceptedQty !== undefined ? item.acceptedQty : received;
              const rejected = item.rejectedQty || Math.max(0, received - accepted);
              const shortage = Math.max(0, ordered - received);

              return (
                <tr
                  key={item.id || idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdff',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdff';
                  }}
                >
                  {/* PO Ref */}
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#64748b', fontSize: 12 }}>
                    {poReference}
                  </td>

                  {/* Product */}
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.productName}</span>
                    <span style={{ marginLeft: 6, fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                      ({item.productCode})
                    </span>
                  </td>

                  {/* Ordered */}
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569' }}>
                    {ordered} {item.unit}
                  </td>

                  {/* Received */}
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>
                    {received} {item.unit}
                  </td>

                  {/* Accepted */}
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <strong style={{ color: '#0d9488' }}>
                      {accepted} {item.unit}
                    </strong>
                  </td>

                  {/* Rejected */}
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: rejected > 0 ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
                    {rejected} {item.unit}
                  </td>

                  {/* Shortage */}
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    {shortage > 0 ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid #fca5a5',
                        }}
                      >
                        -{shortage} {item.unit}
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Đủ</span>
                    )}
                  </td>

                  {/* Notes & Rule description */}
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>
                    {shortage > 0 ? (
                      <span style={{ color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={12} color="#d97706" />
                        Giao thiếu {shortage} — Đóng dòng PO, tính vào nhu cầu đặt đợt sau
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        Giao nhận hoàn tất 100%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PO Status Preview Callout - Enforcing Section 8.2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: '#f0fdf4',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Trạng thái PO khi hoàn tất:
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
            }}
          >
            ✅ COMPLETED (Đóng toàn bộ đơn PO theo chuẩn MT-GRMS V1)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>
          <Info size={14} />
          <span>Theo nghiệp vụ V1: Khi Goods Receipt hoàn tất, PO chuyển sang COMPLETED kể cả khi giao thiếu (không backorder).</span>
        </div>
      </div>
    </div>
  );
};
