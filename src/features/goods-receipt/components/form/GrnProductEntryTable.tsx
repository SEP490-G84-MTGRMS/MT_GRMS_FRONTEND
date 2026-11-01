import { useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import {
  Boxes,
  Barcode,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { GrnItemDetail, RejectionReason } from '../../types/grn.types';
import { REJECTION_REASON_LABELS } from '../../types/grn.types';

interface GrnProductEntryTableProps {
  items: GrnItemDetail[];
  readOnly?: boolean;
  onItemChange: (itemId: string, field: keyof GrnItemDetail, value: any) => void;
  onAddNewRow?: () => void;
  onRemoveRow?: (itemId: string) => void;
  onBarcodeScan?: (code: string) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const GrnProductEntryTable: FC<GrnProductEntryTableProps> = ({
  items,
  readOnly = false,
  onItemChange,
  onAddNewRow,
  onRemoveRow,
  onBarcodeScan,
}) => {
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [barcodeAlert, setBarcodeAlert] = useState<string | null>(null);

  // Check if an expiration date is within 30 days (FEFO alert)
  const isNearExpiry = (expDateStr?: string): boolean => {
    if (!expDateStr) return false;
    const exp = new Date(expDateStr);
    if (isNaN(exp.getTime())) return false;
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 30;
  };

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeQuery.trim();
      if (!code) return;

      if (onBarcodeScan) {
        onBarcodeScan(code);
        setBarcodeQuery('');
        return;
      }

      // Default internal scanning logic (GR-02)
      const targetItem = items.find(
        (it) =>
          it.productCode.toLowerCase() === code.toLowerCase() ||
          it.productName.toLowerCase().includes(code.toLowerCase())
      );

      if (targetItem) {
        const nextReceived = targetItem.receivedQty + 1;
        const nextAccepted = Math.min(nextReceived, targetItem.orderedQty);
        onItemChange(targetItem.id, 'receivedQty', nextReceived);
        onItemChange(targetItem.id, 'acceptedQty', nextAccepted);
        onItemChange(targetItem.id, 'differenceQty', nextAccepted - targetItem.orderedQty);
        onItemChange(targetItem.id, 'lineTotal', nextAccepted * targetItem.unitPrice);

        setBarcodeAlert(`Đã quét SKU ${targetItem.productCode}: +1 cho "${targetItem.productName}"`);
        setTimeout(() => setBarcodeAlert(null), 3000);
      } else {
        setBarcodeAlert(`Không tìm thấy sản phẩm mã "${code}" trong đơn PO này!`);
        setTimeout(() => setBarcodeAlert(null), 4000);
      }
      setBarcodeQuery('');
    }
  };

  const totalOrderedQty = items.reduce((acc, it) => acc + (it.orderedQty || 0), 0);
  const totalReceivedQty = items.reduce((acc, it) => acc + (it.receivedQty || 0), 0);
  const totalAcceptedQty = items.reduce((acc, it) => acc + (it.acceptedQty !== undefined ? it.acceptedQty : it.receivedQty || 0), 0);
  const totalRejectedQty = items.reduce((acc, it) => acc + (it.rejectedQty || 0), 0);
  const totalGoodsAmount = items.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Table Header Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Boxes size={16} color="#0d9488" />
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
            Danh sách mặt hàng kiểm đếm thực tế
          </h2>
          <span
            style={{
              padding: '1px 8px',
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            {items.length} SKU
          </span>
          {totalRejectedQty > 0 && (
            <span
              style={{
                padding: '1px 8px',
                borderRadius: 12,
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              ⚠️ Từ chối {totalRejectedQty} mặt hàng lỗi
            </span>
          )}
        </div>

        {/* Barcode Search Input & Add Extra Row */}
        {!readOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 340 }}>
              <Barcode
                size={16}
                color="#64748b"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Quét mã vạch hoặc gõ SKU, ấn Enter để nhận..."
                style={{
                  width: '100%',
                  height: 32,
                  paddingLeft: 34,
                  paddingRight: 10,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {onAddNewRow && (
              <button
                type="button"
                onClick={onAddNewRow}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}
                title="Thêm dòng hàng bổ sung nếu có biên bản giao bù"
              >
                <Plus size={13} />
                <span>+ Thêm dòng</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barcode Feedback Alert Message */}
      {barcodeAlert && (
        <div
          style={{
            marginBottom: 12,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: barcodeAlert.includes('Không tìm thấy') ? '#fef2f2' : '#f0fdf4',
            color: barcodeAlert.includes('Không tìm thấy') ? '#dc2626' : '#15803d',
            border: `1px solid ${barcodeAlert.includes('Không tìm thấy') ? '#fca5a5' : '#86efac'}`,
          }}
        >
          {barcodeAlert.includes('Không tìm thấy') ? (
            <AlertCircle size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          <span>{barcodeAlert}</span>
        </div>
      )}

      {/* Table Container with Horizontal Scroll */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1280,
            borderCollapse: 'collapse',
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          {/* Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 34 }}>STT</th>
              <th style={{ padding: '9px 10px', width: 90 }}>MÃ SKU</th>
              <th style={{ padding: '9px 10px', width: 170 }}>TÊN SẢN PHẨM</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 55 }}>ĐVT</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 65 }}>SL ĐẶT</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 80 }}>THỰC NHẬN</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 85 }}>CHẤP NHẬN (*)</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 75 }}>TỪ CHỐI</th>
              <th style={{ padding: '9px 10px', width: 160 }}>LÝ DO TỪ CHỐI</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 70 }}>LỆCH PO</th>
              <th style={{ padding: '9px 10px', width: 130 }}>MÃ LÔ (BATCH NO)</th>
              <th style={{ padding: '9px 10px', width: 135 }}>HẠN DÙNG (EXP)</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: 90 }}>ĐƠN GIÁ</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 105 }}>THÀNH TIỀN</th>
              {!readOnly && (
                <th style={{ padding: '9px 8px', textAlign: 'center', width: 36 }}>XÓA</th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 14 : 15}
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Chưa có sản phẩm nào. Vui lòng chọn đơn đặt hàng PO để tải danh sách hàng hóa!
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const diff = row.differenceQty;
                const rejectedCount = row.rejectedQty || 0;
                const isMismatch = diff !== 0 || rejectedCount > 0;
                const isNearExp = isNearExpiry(row.expiryDate);
                const hasExcessDelivery = row.receivedQty > row.orderedQty;

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: rejectedCount > 0 ? '#fff5f5' : isMismatch ? '#fffbfb' : '#ffffff',
                      transition: 'background-color 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {/* 1. STT */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                      {idx + 1}
                    </td>

                    {/* 2. Mã SKU */}
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#0d9488' }}>
                      {row.productCode}
                    </td>

                    {/* 3. Tên sản phẩm */}
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{row.productName}</span>
                        {hasExcessDelivery && (
                          <span style={{ fontSize: 10.5, color: '#9333ea', fontWeight: 600 }}>
                            ⚠️ NCC giao thừa {row.receivedQty - row.orderedQty} (Chặn nhập vượt PO)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. ĐVT */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#475569' }}>
                      {row.unit}
                    </td>

                    {/* 5. SL đặt */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>
                      {row.orderedQty}
                    </td>

                    {/* 6. SL thực nhận */}
                    <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                      {readOnly ? (
                        <span style={{ fontWeight: 600, color: '#334155' }}>{row.receivedQty}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.receivedQty}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            onItemChange(row.id, 'receivedQty', val);
                            // Tự động gán acceptedQty nếu chưa sửa riêng
                            const newAccepted = Math.min(val, row.orderedQty);
                            onItemChange(row.id, 'acceptedQty', newAccepted);
                            const newRejected = Math.max(0, val - newAccepted);
                            onItemChange(row.id, 'rejectedQty', newRejected);
                            onItemChange(row.id, 'differenceQty', newAccepted - row.orderedQty);
                            onItemChange(row.id, 'lineTotal', newAccepted * row.unitPrice);
                          }}
                          style={{
                            width: 68,
                            height: 28,
                            padding: '0 6px',
                            textAlign: 'right',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            fontWeight: 600,
                            fontSize: 12,
                            color: '#0f172a',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* 7. SL Chấp nhận (*) */}
                    <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                      {readOnly ? (
                        <span style={{ fontWeight: 700, color: '#0d9488' }}>
                          {row.acceptedQty}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={Math.min(row.receivedQty, row.orderedQty)}
                          value={row.acceptedQty}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            const cappedVal = Math.min(val, row.receivedQty, row.orderedQty);
                            onItemChange(row.id, 'acceptedQty', cappedVal);
                            const newRejected = Math.max(0, row.receivedQty - cappedVal);
                            onItemChange(row.id, 'rejectedQty', newRejected);
                            onItemChange(row.id, 'differenceQty', cappedVal - row.orderedQty);
                            onItemChange(row.id, 'lineTotal', cappedVal * row.unitPrice);
                          }}
                          style={{
                            width: 68,
                            height: 28,
                            padding: '0 6px',
                            textAlign: 'right',
                            borderRadius: 4,
                            border: '1.5px solid #0d9488',
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: '#0f172a',
                            backgroundColor: '#f0fdfa',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* 8. SL Từ chối */}
                    <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: rejectedCount > 0 ? '#dc2626' : '#94a3b8',
                          fontSize: 12,
                        }}
                      >
                        {rejectedCount}
                      </span>
                    </td>

                    {/* 9. Lý do từ chối */}
                    <td style={{ padding: '6px 8px' }}>
                      {rejectedCount > 0 ? (
                        readOnly ? (
                          <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                            {row.rejectionReason ? REJECTION_REASON_LABELS[row.rejectionReason] : 'Chưa chọn lý do'}
                          </span>
                        ) : (
                          <select
                            value={row.rejectionReason || ''}
                            onChange={(e) => onItemChange(row.id, 'rejectionReason', e.target.value as RejectionReason)}
                            style={{
                              width: '100%',
                              height: 28,
                              borderRadius: 4,
                              border: !row.rejectionReason ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                              fontSize: 11,
                              color: !row.rejectionReason ? '#dc2626' : '#0f172a',
                              backgroundColor: !row.rejectionReason ? '#fff1f2' : '#ffffff',
                              outline: 'none',
                            }}
                          >
                            <option value="">-- Chọn lý do từ chối --</option>
                            {Object.entries(REJECTION_REASON_LABELS).map(([code, label]) => (
                              <option key={code} value={code}>
                                {label}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* 10. Lệch PO */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {diff === 0 ? (
                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>Đủ 100%</span>
                      ) : diff < 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            fontWeight: 700,
                            fontSize: 11,
                            border: '1px solid #fca5a5',
                          }}
                          title={`Giao thiếu ${Math.abs(diff)} ${row.unit} so với đơn PO`}
                        >
                          <AlertTriangle size={11} />
                          {diff}
                        </span>
                      ) : (
                        <span style={{ color: '#7e22ce', fontWeight: 700, fontSize: 11 }}>
                          +{diff}
                        </span>
                      )}
                    </td>

                    {/* 11. Mã Lô (Batch No) */}
                    <td style={{ padding: '6px 8px' }}>
                      {readOnly ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                          {row.batchCode || '—'}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={row.batchCode || ''}
                          onChange={(e) => onItemChange(row.id, 'batchCode', e.target.value)}
                          placeholder="VD: LOT-202610A"
                          style={{
                            width: '100%',
                            height: 28,
                            padding: '0 6px',
                            borderRadius: 4,
                            border: !row.batchCode ? '1px dashed #f59e0b' : '1px solid #cbd5e1',
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                            color: '#0f172a',
                            backgroundColor: '#ffffff',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </td>

                    {/* 12. Hạn dùng (EXP) */}
                    <td style={{ padding: '6px 8px' }}>
                      {readOnly ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11.5, color: '#334155' }}>{row.expiryDate || '—'}</span>
                          {isNearExp && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 4px',
                                borderRadius: 3,
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                              }}
                            >
                              ⚠️ Cận HSD (&lt;30 ngày)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <input
                            type="date"
                            value={row.expiryDate || ''}
                            onChange={(e) => onItemChange(row.id, 'expiryDate', e.target.value)}
                            style={{
                              width: '100%',
                              height: 28,
                              padding: '0 4px',
                              borderRadius: 4,
                              border: isNearExp ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                              fontSize: 11,
                              color: '#0f172a',
                              backgroundColor: '#ffffff',
                              outline: 'none',
                            }}
                          />
                          {isNearExp && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 4px',
                                borderRadius: 3,
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                              }}
                            >
                              ⚠️ Cận HSD (&lt;30 ngày)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 13. Đơn giá */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>
                      {formatCurrency(row.unitPrice)}
                    </td>

                    {/* 14. Thành tiền */}
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        fontSize: 12.5,
                      }}
                    >
                      {formatCurrency(row.lineTotal)}
                    </td>

                    {/* 15. Xóa */}
                    {!readOnly && (
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {onRemoveRow && (
                          <button
                            type="button"
                            onClick={() => onRemoveRow(row.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 4,
                            }}
                            title="Xóa dòng"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Totals */}
          {items.length > 0 && (
            <tfoot>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: 12,
                  color: '#0f172a',
                }}
              >
                <td colSpan={4} style={{ padding: '10px 10px', textAlign: 'right' }}>
                  TỔNG CỘNG KIỂM ĐẾM:
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#475569' }}>
                  {totalOrderedQty}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>
                  {totalReceivedQty}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0d9488' }}>
                  {totalAcceptedQty}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: totalRejectedQty > 0 ? '#dc2626' : '#94a3b8' }}>
                  {totalRejectedQty}
                </td>
                <td colSpan={4}></td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#475569' }}>
                  Tiền hàng:
                </td>
                <td
                  style={{
                    padding: '10px 10px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: '#0d9488',
                  }}
                >
                  {formatCurrency(totalGoodsAmount)}
                </td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
