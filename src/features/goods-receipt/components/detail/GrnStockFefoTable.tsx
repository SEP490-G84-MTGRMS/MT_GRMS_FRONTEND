import type { FC } from 'react';
import {
  Boxes,
  Scale,
  Gift,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import type { GrnDetailItem } from '../../types/grn.types';

interface GrnStockFefoTableProps {
  items: GrnDetailItem[];
  totalLandedCost: number;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};

const isNearExpiry = (expDateStr?: string): boolean => {
  if (!expDateStr) return false;
  const exp = new Date(expDateStr);
  if (isNaN(exp.getTime())) return false;
  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
};

export const GrnStockFefoTable: FC<GrnStockFefoTableProps> = ({
  items,
  totalLandedCost,
}) => {
  // Calculate total units to allocate Landed Cost
  const totalUnits = items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  const avgLandedCostPerUnit = totalUnits > 0 ? totalLandedCost / totalUnits : 0;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Boxes size={18} color="#0f766e" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
            Tồn kho sẽ cộng & Lô sẽ tạo (FEFO Management)
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '1px 8px',
              borderRadius: 12,
            }}
          >
            {items.length} mặt hàng
          </span>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          <span>Phí VC phân bổ bình quân: </span>
          <strong style={{ color: '#d97706' }}>+{formatCurrency(avgLandedCostPerUnit)}/ĐVT</strong>
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
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', width: 90 }}>SKU</th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', minWidth: 220 }}>Tên sản phẩm</th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', width: 130 }}>Mã Lô (Batch)</th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', width: 130 }}>Hạn sử dụng</th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', textAlign: 'right', width: 100 }}>
                SL nhận
              </th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', textAlign: 'right', width: 105 }}>
                Phí VC/ĐVT
              </th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', textAlign: 'right', width: 110 }}>
                Giá vốn mới
              </th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', textAlign: 'right', width: 110 }}>
                Giá bán lẻ
              </th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', textAlign: 'right', width: 85 }}>
                Margin %
              </th>
              <th style={{ padding: '9px 12px', fontWeight: 700, color: '#334155', minWidth: 150 }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const allocatedFreight = avgLandedCostPerUnit;
              const unitCost = (item.unitPrice || 0) + allocatedFreight;
              const retail = item.retailPrice || (item.unitPrice ? item.unitPrice * 1.35 : 0);
              const margin = retail > 0 ? ((retail - unitCost) / retail) * 100 : 0;
              const nearExp = isNearExpiry(item.expiryDate);

              return (
                <tr
                  key={item.id || idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc',
                  }}
                >
                  {/* SKU */}
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                    {item.productCode}
                  </td>

                  {/* Product Name & Badges */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.productName}</span>
                      {item.isCatchWeight && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                          title="Hàng cân ký / Variable Weight"
                        >
                          <Scale size={11} />
                          <span>Catch-weight</span>
                        </span>
                      )}
                      {item.isGift && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#f3e8ff',
                            color: '#7e22ce',
                            border: '1px solid #e9d5ff',
                          }}
                          title="Hàng khuyến mãi / Biếu tặng"
                        >
                          <Gift size={11} />
                          <span>Biếu tặng</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Batch Code */}
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#0f766e',
                        backgroundColor: '#f0fdfa',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #ccfbf1',
                      }}
                    >
                      {item.batchCode || 'B-CHUA-GAN'}
                    </span>
                  </td>

                  {/* Expiry Date */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={13} color={nearExp ? '#ea580c' : '#64748b'} />
                      <span style={{ fontWeight: 600, color: nearExp ? '#ea580c' : '#334155' }}>
                        {item.expiryDate || 'N/A'}
                      </span>
                      {nearExp && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#ea580c',
                            fontSize: 10,
                          }}
                          title="Sát HSD (<30 ngày)"
                        >
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Received Qty */}
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>
                      {item.receivedQty} {item.unit}
                    </strong>
                  </td>

                  {/* Landed Cost / Unit */}
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                    +{formatCurrency(allocatedFreight)}
                  </td>

                  {/* New Unit Cost */}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                    {formatCurrency(unitCost)}
                  </td>

                  {/* Retail Price */}
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                    {formatCurrency(retail)}
                  </td>

                  {/* Margin % */}
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: margin >= 20 ? '#16a34a' : margin > 0 ? '#ca8a04' : '#dc2626',
                    }}
                  >
                    {margin.toFixed(1)}%
                  </td>

                  {/* Note */}
                  <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 12 }}>
                    {item.note || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
