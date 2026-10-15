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
import type { GrnItemDetail } from '../../types/grn.types';

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

      // Default internal scanning logic
      const targetItem = items.find(
        (it) =>
          it.productCode.toLowerCase() === code.toLowerCase() ||
          it.productName.toLowerCase().includes(code.toLowerCase())
      );

      if (targetItem) {
        onItemChange(targetItem.id, 'receivedQty', targetItem.receivedQty + 1);
        setBarcodeAlert(`Đã tăng SL thực nhận cho: ${targetItem.productName}`);
        setTimeout(() => setBarcodeAlert(null), 3000);
      } else {
        setBarcodeAlert(`Không tìm thấy sản phẩm "${code}" trong đơn PO này!`);
        setTimeout(() => setBarcodeAlert(null), 4000);
      }
      setBarcodeQuery('');
    }
  };

  const totalOrderedQty = items.reduce((acc, it) => acc + it.orderedQty, 0);
  const totalReceivedQty = items.reduce((acc, it) => acc + it.receivedQty, 0);
  const totalGoodsAmount = items.reduce((acc, it) => acc + it.lineTotal, 0);

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
            {items.length} mặt hàng
          </span>
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
            minWidth: 1080,
            borderCollapse: 'collapse',
            fontSize: 12.5,
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
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 36 }}>STT</th>
              <th style={{ padding: '9px 10px', width: 95 }}>MÃ SKU</th>
              <th style={{ padding: '9px 10px', width: 200 }}>TÊN SẢN PHẨM</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 65 }}>ĐVT</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: 75 }}>SL ĐẶT</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: 95 }}>SL NHẬN (*)</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 85 }}>LỆCH</th>
              <th style={{ padding: '9px 10px', width: 140 }}>MÃ LÔ (BATCH NO) (*)</th>
              <th style={{ padding: '9px 10px', width: 140 }}>HẠN DÙNG (EXP) (*)</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: 95 }}>ĐƠN GIÁ</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 105 }}>THÀNH TIỀN</th>
              {!readOnly && (
                <th style={{ padding: '9px 8px', textAlign: 'center', width: 40 }}>XÓA</th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 11 : 12}
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
                const isMismatch = diff !== 0;
                const isNearExp = isNearExpiry(row.expiryDate);

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isMismatch ? '#fffbfb' : '#ffffff',
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
                      {row.productName}
                    </td>

                    {/* 4. ĐVT */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#475569' }}>
                      {row.unit}
                    </td>

                    {/* 5. SL đặt */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>
                      {row.orderedQty}
                    </td>

                    {/* 6. SL thực nhận */}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {readOnly ? (
                        <span style={{ fontWeight: 700, color: isMismatch ? '#dc2626' : '#0f172a' }}>
                          {row.receivedQty}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.receivedQty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            onItemChange(row.id, 'receivedQty', val);
                          }}
                          style={{
                            width: 75,
                            height: 30,
                            padding: '0 6px',
                            textAlign: 'right',
                            borderRadius: 5,
                            border: isMismatch ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontWeight: 700,
                            fontSize: 13,
                            color: isMismatch ? '#dc2626' : '#0f172a',
                            backgroundColor: isMismatch ? '#fef2f2' : '#ffffff',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* 7. Lệch */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {diff === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>0</span>
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
                          title={`Thiếu ${Math.abs(diff)} ${row.unit} so với đơn PO`}
                        >
                          <AlertTriangle size={11} />
                          {diff}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: '#f3e8ff',
                            color: '#7e22ce',
                            fontWeight: 700,
                            fontSize: 11,
                            border: '1px solid #d8b4fe',
                          }}
                          title={`Thừa ${diff} ${row.unit} so với đơn PO`}
                        >
                          +{diff}
                        </span>
                      )}
                    </td>

                    {/* 8. Mã Lô (Batch No) */}
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
                          placeholder="VD: BAT-2610-01"
                          style={{
                            width: '100%',
                            height: 30,
                            padding: '0 8px',
                            borderRadius: 5,
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

                    {/* 9. Hạn dùng (EXP) & Cảnh báo FEFO */}
                    <td style={{ padding: '6px 8px' }}>
                      {readOnly ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12, color: '#334155' }}>{row.expiryDate || '—'}</span>
                          {isNearExp && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: 3,
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                              }}
                            >
                              ⚠️ Sát HSD (&lt;30 ngày)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <input
                              type="date"
                              value={row.expiryDate || ''}
                              onChange={(e) => onItemChange(row.id, 'expiryDate', e.target.value)}
                              style={{
                                width: '100%',
                                height: 30,
                                padding: '0 6px',
                                borderRadius: 5,
                                border: isNearExp ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                fontSize: 11.5,
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                                outline: 'none',
                              }}
                            />
                          </div>
                          {isNearExp && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: 3,
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                              }}
                            >
                              ⚠️ Sát HSD (&lt;30 ngày)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 10. Đơn giá nhập */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>
                      {formatCurrency(row.unitPrice)}
                    </td>

                    {/* 11. Thành tiền */}
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        fontSize: 13,
                      }}
                    >
                      {formatCurrency(row.lineTotal)}
                    </td>

                    {/* 12. Xóa */}
                    {!readOnly && (
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        {onRemoveRow && (
                          <button
                            type="button"
                            onClick={() => onRemoveRow(row.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 4,
                              color: '#94a3b8',
                              cursor: 'pointer',
                              borderRadius: 4,
                            }}
                            title="Xóa dòng này"
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
        </table>
      </div>

      {/* Table Summary Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 12,
          marginTop: 10,
          borderTop: '1px solid #f1f5f9',
          fontSize: 12.5,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>
            Tổng SL đặt theo PO: <b style={{ color: '#0f172a' }}>{totalOrderedQty}</b>
          </span>
          <span>
            Tổng SL thực nhận: <b style={{ color: '#0f766e' }}>{totalReceivedQty}</b>
          </span>
          {totalReceivedQty !== totalOrderedQty && (
            <span style={{ color: '#dc2626', fontWeight: 600 }}>
              (Chênh lệch: {totalReceivedQty - totalOrderedQty > 0 ? `+${totalReceivedQty - totalOrderedQty}` : totalReceivedQty - totalOrderedQty})
            </span>
          )}
        </div>

        <div>
          <span>Tổng tiền hàng ({items.length} mặt hàng): </span>
          <b style={{ color: '#0d9488', fontSize: 14, fontFamily: 'monospace' }}>
            {formatCurrency(totalGoodsAmount)} VNĐ
          </b>
        </div>
      </div>
    </div>
  );
};
