import type { FC } from 'react';
import {
  ListChecks,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { GrnDetailItem, GrnRemainingOption, PoStatusPreview } from '../../types/grn.types';

interface GrnPoRemainingTableProps {
  poReference: string;
  items: GrnDetailItem[];
  poStatusPreview: PoStatusPreview;
  onRemainingOptionChange: (itemId: string, option: GrnRemainingOption) => void;
  onPoStatusChange: (status: PoStatusPreview) => void;
  readOnly?: boolean;
}

export const GrnPoRemainingTable: FC<GrnPoRemainingTableProps> = ({
  poReference,
  items,
  poStatusPreview,
  onRemainingOptionChange,
  onPoStatusChange,
  readOnly = false,
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
            Cập nhật trạng thái đơn PO (PO Update After Post)
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
              <th style={{ padding: '9px 12px', minWidth: 220 }}>Sản phẩm</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 110 }}>
                Đặt (Ordered)
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 120 }}>
                + Đã nhận
              </th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 110 }}>
                Còn thiếu
              </th>
              <th style={{ padding: '9px 12px', minWidth: 360 }}>
                Hướng xử lý lượng thiếu (Remaining Handling Options)
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const ordered = item.orderedQty || 0;
              const received = item.receivedQty || 0;
              const diff = received - ordered;
              const shortage = diff < 0 ? Math.abs(diff) : 0;
              const selectedOption = item.remainingOption || 'backorder';

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
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <strong style={{ color: '#0f766e' }}>
                      {received} {item.unit}
                    </strong>
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
                        {shortage} {item.unit}
                      </span>
                    ) : diff > 0 ? (
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>+{diff} (Thừa)</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>0</span>
                    )}
                  </td>

                  {/* Handling Options */}
                  <td style={{ padding: '9px 12px' }}>
                    {shortage > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: readOnly ? 'default' : 'pointer',
                            fontSize: 12.5,
                            fontWeight: selectedOption === 'backorder' ? 700 : 500,
                            color: selectedOption === 'backorder' ? '#0f766e' : '#475569',
                          }}
                        >
                          <input
                            type="radio"
                            name={`rem_option_${item.id}`}
                            value="backorder"
                            checked={selectedOption === 'backorder'}
                            disabled={readOnly}
                            onChange={() => onRemainingOptionChange(item.id, 'backorder')}
                            style={{ cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
                          />
                          <span>(•) NCC sẽ giao bù đợt sau (PO giữ mở)</span>
                        </label>

                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: readOnly ? 'default' : 'pointer',
                            fontSize: 12.5,
                            fontWeight: selectedOption === 'cancel' ? 700 : 500,
                            color: selectedOption === 'cancel' ? '#b45309' : '#475569',
                          }}
                        >
                          <input
                            type="radio"
                            name={`rem_option_${item.id}`}
                            value="cancel"
                            checked={selectedOption === 'cancel'}
                            disabled={readOnly}
                            onChange={() => onRemainingOptionChange(item.id, 'cancel')}
                            style={{ cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
                          />
                          <span>(•) Hủy phần thiếu (Đóng dòng)</span>
                        </label>
                      </div>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#16a34a',
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Đã giao đủ 100%</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PO Status Preview Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: poStatusPreview === 'COMPLETED' ? '#f0fdf4' : '#fffbeb',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Trạng thái PO sau khi duyệt:
          </span>
          {readOnly ? (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                backgroundColor: poStatusPreview === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                color: poStatusPreview === 'COMPLETED' ? '#15803d' : '#b45309',
                border: `1px solid ${poStatusPreview === 'COMPLETED' ? '#86efac' : '#fde68a'}`,
              }}
            >
              {poStatusPreview === 'COMPLETED'
                ? '✅ COMPLETED (Đã đóng tất cả dòng đơn PO)'
                : '🚚 PARTIALLY_RECEIVED (Còn thiếu hàng - Đơn PO tiếp tục mở)'}
            </span>
          ) : (
            <select
              value={poStatusPreview}
              onChange={(e) => onPoStatusChange(e.target.value as PoStatusPreview)}
              style={{
                height: 32,
                padding: '0 10px',
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: poStatusPreview === 'COMPLETED' ? '#15803d' : '#b45309',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="PARTIALLY_RECEIVED">
                🚚 PARTIALLY_RECEIVED (Còn thiếu hàng - Đơn PO tiếp tục mở)
              </option>
              <option value="COMPLETED">
                ✅ COMPLETED (Tất cả phần thiếu đã hủy / Đã đóng đơn PO)
              </option>
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
          <ArrowRight size={14} color="#64748b" />
          {poStatusPreview === 'COMPLETED' ? (
            <span style={{ color: '#15803d', fontWeight: 600 }}>
              Tất cả dòng sản phẩm đã hoàn thành hoặc hủy phần thiếu. Đơn PO sẽ được đóng lại.
            </span>
          ) : (
            <span style={{ color: '#b45309', fontWeight: 600 }}>
              Đơn PO sẽ được giữ ở trạng thái Chờ giao bổ sung cho lần nhập hàng tiếp theo.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
