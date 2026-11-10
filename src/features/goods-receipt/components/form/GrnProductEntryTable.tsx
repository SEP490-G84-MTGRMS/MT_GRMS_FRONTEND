import { useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import {
  Boxes,
  Barcode,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  SplitSquareVertical,
} from 'lucide-react';
import type { GrnItemDetail, RejectionReason } from '../../types/grn.types';
import { REJECTION_REASON_LABELS } from '../../types/grn.types';

interface GrnProductEntryTableProps {
  items: GrnItemDetail[];
  readOnly?: boolean;
  onItemChange: (itemId: string, field: keyof GrnItemDetail, value: any) => void;
  onRemoveRow?: (itemId: string) => void;
  onSplitLot?: (itemId: string) => void;
  onBarcodeScan?: (code: string) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

const groupKey = (row: GrnItemDetail): string =>
  String(row.purchaseOrderDetailId || row.productId || row.productCode);

export const GrnProductEntryTable: FC<GrnProductEntryTableProps> = ({
  items,
  readOnly = false,
  onItemChange,
  onRemoveRow,
  onSplitLot,
  onBarcodeScan,
}) => {
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [barcodeAlert, setBarcodeAlert] = useState<string | null>(null);

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
        onItemChange(targetItem.id, 'receivedQty', nextReceived);

        setBarcodeAlert(`Đã quét SKU ${targetItem.productCode}: +1 cho "${targetItem.productName}"`);
        setTimeout(() => setBarcodeAlert(null), 3000);
      } else {
        setBarcodeAlert(`Không tìm thấy sản phẩm mã "${code}" trong đơn PO này!`);
        setTimeout(() => setBarcodeAlert(null), 4000);
      }
      setBarcodeQuery('');
    }
  };

  const orderedSeen = new Set<string>();
  const totalOrderedQty = items.reduce((acc, it) => {
    const key = groupKey(it);
    if (orderedSeen.has(key)) return acc;
    orderedSeen.add(key);
    return acc + (it.orderedQty || 0);
  }, 0);
  const totalReceivedQty = items.reduce((acc, it) => acc + (it.receivedQty || 0), 0);
  const shortageSeen = new Set<string>();
  const totalShortageQty = items.reduce((acc, it) => {
    const key = groupKey(it);
    if (shortageSeen.has(key)) return acc;
    shortageSeen.add(key);
    const gRec = items
      .filter((x) => groupKey(x) === key)
      .reduce((s, x) => s + (x.receivedQty || 0), 0);
    return acc + Math.max(0, (it.orderedQty || 0) - gRec);
  }, 0);
  const totalGoodsAmount = items.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

  const groupReceived = (row: GrnItemDetail) =>
    items
      .filter((it) => groupKey(it) === groupKey(row))
      .reduce((s, it) => s + (it.receivedQty || 0), 0);

  const canRemove = (row: GrnItemDetail) =>
    items.filter((it) => groupKey(it) === groupKey(row)).length > 1;

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
          {totalShortageQty > 0 && (
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
              Thiếu {totalShortageQty} so với PO — chọn lý do
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
              <th style={{ padding: '9px 10px', width: 300, minWidth: 300, maxWidth: 300 }}>
                TÊN SẢN PHẨM
              </th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 55 }}>ĐVT</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 65 }}>SL ĐẶT</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 80 }}>THỰC NHẬN</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', width: 75 }}>THIẾU</th>
              <th style={{ padding: '9px 10px', width: 180 }}>LÝ DO THIẾU / TỪ CHỐI</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 70 }}>LỆCH PO</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', width: 88 }}>QL BATCH</th>
              <th style={{ padding: '9px 10px', width: 180, minWidth: 180 }}>MÃ LÔ</th>
              <th style={{ padding: '9px 10px', width: 120 }}>NGÀY SX</th>
              <th style={{ padding: '9px 10px', width: 125 }}>HẠN SD</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: 90 }}>ĐƠN GIÁ</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', width: 105 }}>THÀNH TIỀN</th>
              {!readOnly && (
                <th style={{ padding: '9px 8px', textAlign: 'center', width: 72 }}>THAO TÁC</th>
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
                const gReceived = groupReceived(row);
                const groupDiff = gReceived - row.orderedQty;
                const shortageQty = Math.max(0, -groupDiff);
                const isShort = shortageQty > 0;
                const isMismatch = groupDiff !== 0;
                const hasExcessDelivery = gReceived > row.orderedQty;
                const manageBatch = Boolean(row.hasBatches ?? row.manageBatch);
                const siblingCount = items.filter((it) => groupKey(it) === groupKey(row)).length;
                const isFirstInGroup =
                  items.findIndex((it) => groupKey(it) === groupKey(row)) === idx;

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isShort ? '#fff5f5' : isMismatch ? '#fffbfb' : '#ffffff',
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
                      {siblingCount > 1 && (
                        <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 600 }}>
                          Lô {items.filter((it) => groupKey(it) === groupKey(row)).indexOf(row) + 1}/{siblingCount}
                        </div>
                      )}
                    </td>

                    {/* 3. Tên sản phẩm */}
                    <td
                      style={{
                        padding: '8px 10px',
                        fontWeight: 600,
                        color: '#0f172a',
                        width: 300,
                        minWidth: 300,
                        maxWidth: 300,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{row.productName}</span>
                        {hasExcessDelivery && (
                          <span style={{ fontSize: 10.5, color: '#9333ea', fontWeight: 600 }}>
                            Tổng các lô ({gReceived}) vượt SL đặt {row.orderedQty}
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

                    {/* 6. SL thực nhận (= chấp nhận) */}
                    <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={row.receivedQty}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          onItemChange(row.id, 'receivedQty', val);
                        }}
                        style={{
                          width: 68,
                          height: 28,
                          padding: '0 6px',
                          textAlign: 'right',
                          borderRadius: 4,
                          border: '1.5px solid ' + (readOnly ? '#cbd5e1' : '#0d9488'),
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: readOnly ? '#475569' : '#0f172a',
                          backgroundColor: readOnly ? '#f1f5f9' : '#f0fdfa',
                          outline: 'none',
                          cursor: readOnly ? 'not-allowed' : 'text',
                        }}
                      />
                    </td>

                    {/* 7. SL thiếu (= SL đặt − tổng thực nhận nhóm) */}
                    <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isShort ? '#dc2626' : '#94a3b8',
                          fontSize: 12,
                        }}
                      >
                        {isFirstInGroup ? shortageQty : '—'}
                      </span>
                    </td>

                    {/* 8. Lý do từ chối / giao thiếu */}
                    <td style={{ padding: '6px 8px' }}>
                      {isShort && isFirstInGroup ? (
                        <select
                          value={row.rejectionReason || ''}
                          disabled={readOnly}
                          onChange={(e) =>
                            onItemChange(row.id, 'rejectionReason', e.target.value as RejectionReason)
                          }
                          style={{
                            width: '100%',
                            height: 28,
                            borderRadius: 4,
                            border: readOnly ? '1px solid #cbd5e1' : (!row.rejectionReason ? '1.5px solid #dc2626' : '1px solid #cbd5e1'),
                            fontSize: 11,
                            color: readOnly ? '#475569' : (!row.rejectionReason ? '#dc2626' : '#0f172a'),
                            backgroundColor: readOnly ? '#f1f5f9' : (!row.rejectionReason ? '#fff1f2' : '#ffffff'),
                            outline: 'none',
                            cursor: readOnly ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="">-- Chọn lý do thiếu/từ chối --</option>
                          {Object.entries(REJECTION_REASON_LABELS).map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* 10. Lệch PO (theo tổng nhóm SKU) */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {groupDiff === 0 ? (
                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>Đủ 100%</span>
                      ) : groupDiff < 0 ? (
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
                          title={`Tổng các lô thiếu ${Math.abs(groupDiff)} so với PO`}
                        >
                          <AlertTriangle size={11} />
                          {groupDiff}
                        </span>
                      ) : (
                        <span style={{ color: '#7e22ce', fontWeight: 700, fontSize: 11 }}>
                          +{groupDiff}
                        </span>
                      )}
                    </td>

                    {/* 11. Quản lý batch — lấy cấu hình từ bảng Product */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={manageBatch}
                        disabled={true}
                        title={
                          manageBatch
                            ? 'Sản phẩm quản lý theo Lô & HSD (cấu hình từ danh mục sản phẩm)'
                            : 'Sản phẩm không quản lý theo Lô & HSD'
                        }
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'not-allowed',
                          accentColor: '#0d9488',
                        }}
                      />
                    </td>

                    {/* 12. Mã Lô */}
                    <td style={{ padding: '6px 8px', width: 180, minWidth: 180 }}>
                      {!manageBatch ? (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      ) : (
                        <input
                          type="text"
                          value={row.batchCode || ''}
                          disabled={readOnly}
                          onChange={(e) => onItemChange(row.id, 'batchCode', e.target.value)}
                          placeholder="BAT-..."
                          style={{
                            width: '100%',
                            minWidth: 160,
                            height: 28,
                            padding: '0 6px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                            color: readOnly ? '#475569' : '#0f172a',
                            backgroundColor: readOnly ? '#f1f5f9' : '#ffffff',
                            cursor: readOnly ? 'not-allowed' : 'text',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </td>

                    {/* 13. Ngày SX (MFG) */}
                    <td style={{ padding: '6px 8px' }}>
                      {!manageBatch ? (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      ) : (
                        <input
                          type="date"
                          value={row.manufactureDate || ''}
                          disabled={readOnly}
                          onChange={(e) => onItemChange(row.id, 'manufactureDate', e.target.value)}
                          style={{
                            width: '100%',
                            height: 28,
                            padding: '0 4px',
                            borderRadius: 4,
                            border: readOnly
                              ? '1px solid #cbd5e1'
                              : !row.manufactureDate
                              ? '1.5px solid #f59e0b'
                              : '1px solid #cbd5e1',
                            fontSize: 11,
                            color: readOnly ? '#475569' : '#0f172a',
                            backgroundColor: readOnly ? '#f1f5f9' : '#ffffff',
                            cursor: readOnly ? 'not-allowed' : 'text',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </td>

                    {/* 14. Hạn SD (EXP) */}
                    <td style={{ padding: '6px 8px' }}>
                      {!manageBatch ? (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      ) : (
                        <input
                          type="date"
                          value={row.expiryDate || ''}
                          disabled={readOnly}
                          onChange={(e) => onItemChange(row.id, 'expiryDate', e.target.value)}
                          style={{
                            width: '100%',
                            height: 28,
                            padding: '0 4px',
                            borderRadius: 4,
                            border: readOnly
                              ? '1px solid #cbd5e1'
                              : !row.expiryDate
                              ? '1.5px solid #f59e0b'
                              : '1px solid #cbd5e1',
                            fontSize: 11,
                            color: readOnly ? '#475569' : '#0f172a',
                            backgroundColor: readOnly ? '#f1f5f9' : '#ffffff',
                            cursor: readOnly ? 'not-allowed' : 'text',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </td>

                    <td style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>
                      {formatCurrency(row.unitPrice)}
                    </td>

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

                    {!readOnly && (
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 2 }}>
                          {onSplitLot && (
                            <button
                              type="button"
                              onClick={() => onSplitLot(row.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#0d9488',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4,
                              }}
                              title="Tách lô (thêm dòng cùng SKU)"
                            >
                              <SplitSquareVertical size={14} />
                            </button>
                          )}
                          {onRemoveRow && canRemove(row) && (
                            <button
                              type="button"
                              onClick={() => onRemoveRow(row.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4,
                              }}
                              title="Xóa dòng lô này"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
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
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0d9488' }}>
                  {totalReceivedQty}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: totalShortageQty > 0 ? '#dc2626' : '#94a3b8' }}>
                  {totalShortageQty}
                </td>
                <td colSpan={5}></td>
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
