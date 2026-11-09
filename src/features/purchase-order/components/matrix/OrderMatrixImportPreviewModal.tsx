import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Building2,
  Calendar,
  Store,
} from 'lucide-react';
import type { ExcelValidationResult } from '../../lib/matrixExcelService';

interface OrderMatrixImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ExcelValidationResult | null;
  onConfirmApply: () => void;
}

export const OrderMatrixImportPreviewModal: FC<OrderMatrixImportPreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  onConfirmApply,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'errors' | 'warnings' | 'valid'>('all');

  // Filter items to display
  const allNotices = useMemo(() => {
    if (!result) return [];
    return [...result.errors, ...result.warnings];
  }, [result]);

  const displayedItems = useMemo(() => {
    if (!result) return [];
    if (filterTab === 'errors') return result.errors;
    if (filterTab === 'warnings') return result.warnings;
    return allNotices;
  }, [filterTab, result, allNotices]);

  if (!isOpen || !result) return null;

  const hasErrors = result.summary.errorCount > 0;
  const canApply = result.valid && result.summary.validCells > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1060,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 1080,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Modal Header — Kiểu CISCA Clean & Professional */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e3a8a', // Deep Navy CISCA
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={20} color="#67e8f9" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '0.2px' }}>
                Excel取込結果 — Kiểm tra và nạp ma trận đặt hàng
              </h3>
              <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>
                Tệp: <b style={{ color: '#ffffff' }}>{result.fileName}</b> ({Math.max(1, Math.round(result.fileSize / 1024))} KB)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#93c5fd',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* 5.1. Summary Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {/* Card: Valid cells */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Ô hợp lệ (Sẵn sàng)
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>
                {result.summary.validCells}
              </div>
            </div>
          </div>

          {/* Card: Error cells */}
          <div
            style={{
              backgroundColor: hasErrors ? '#fff1f2' : '#ffffff',
              border: hasErrors ? '1px solid #fecdd3' : '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: hasErrors ? '#fee2e2' : '#f1f5f9',
                color: hasErrors ? '#dc2626' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Ô phát hiện lỗi
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: hasErrors ? '#b91c1c' : '#475569' }}>
                {result.summary.errorCount}
              </div>
            </div>
          </div>

          {/* Card: Warnings */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fef08a',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#fef9c3',
                color: '#ca8a04',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Cảnh báo lưu ý
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#a16207' }}>
                {result.summary.warningCount}
              </div>
            </div>
          </div>

          {/* Card: Ignored cells */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Ô bỏ qua / Trùng cũ
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#475569' }}>
                {result.summary.ignoredCells}
              </div>
            </div>
          </div>
        </div>

        {/* 5.1. Scope Status Badges (Khớp chi nhánh? Khớp NCC? Khớp kỳ?) */}
        {result.scopeStatus && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 600, color: '#475569', marginRight: 4 }}>
              Xác thực phạm vi:
            </span>

            {/* Chi nhánh badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 11.5,
                backgroundColor: result.scopeStatus.branchMatched ? '#dcfce7' : '#fee2e2',
                color: result.scopeStatus.branchMatched ? '#15803d' : '#b91c1c',
                border: `1px solid ${result.scopeStatus.branchMatched ? '#bbf7d0' : '#fca5a5'}`,
              }}
            >
              <Store size={13} />
              <span>
                Chi nhánh:{' '}
                {result.scopeStatus.branchMatched
                  ? `Khớp (${result.scopeStatus.branchExpected})`
                  : `Sai! File: ${result.scopeStatus.branchActual || 'Khác'} ≠ UI: ${result.scopeStatus.branchExpected}`}
              </span>
            </div>

            {/* NCC badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 11.5,
                backgroundColor: result.scopeStatus.supplierMatched ? '#dcfce7' : '#fee2e2',
                color: result.scopeStatus.supplierMatched ? '#15803d' : '#b91c1c',
                border: `1px solid ${result.scopeStatus.supplierMatched ? '#bbf7d0' : '#fca5a5'}`,
              }}
            >
              <Building2 size={13} />
              <span>
                NCC:{' '}
                {result.scopeStatus.supplierMatched
                  ? `Khớp (${result.scopeStatus.supplierExpected})`
                  : `Sai! File: ${result.scopeStatus.supplierActual || 'Khác'} ≠ UI: ${result.scopeStatus.supplierExpected}`}
              </span>
            </div>

            {/* Kỳ đặt hàng badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 11.5,
                backgroundColor: result.scopeStatus.periodMatched ? '#dcfce7' : '#fee2e2',
                color: result.scopeStatus.periodMatched ? '#15803d' : '#b91c1c',
                border: `1px solid ${result.scopeStatus.periodMatched ? '#bbf7d0' : '#fca5a5'}`,
              }}
            >
              <Calendar size={13} />
              <span>
                Kỳ ma trận:{' '}
                {result.scopeStatus.periodMatched
                  ? `Khớp (${result.scopeStatus.periodExpected})`
                  : `Lệch kỳ! (${result.scopeStatus.periodExpected})`}
              </span>
            </div>
          </div>
        )}

        {/* 5.2. Filter Navigation Tabs */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterTab === 'all' ? '#1e3a8a' : '#f1f5f9',
              color: filterTab === 'all' ? '#ffffff' : '#475569',
            }}
          >
            Tất cả phản hồi ({allNotices.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('errors')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterTab === 'errors' ? '#dc2626' : '#f1f5f9',
              color: filterTab === 'errors' ? '#ffffff' : '#475569',
            }}
          >
            Chỉ xem lỗi ({result.summary.errorCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('warnings')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterTab === 'warnings' ? '#d97706' : '#f1f5f9',
              color: filterTab === 'warnings' ? '#ffffff' : '#475569',
            }}
          >
            Chỉ xem cảnh báo ({result.summary.warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('valid')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterTab === 'valid' ? '#16a34a' : '#f1f5f9',
              color: filterTab === 'valid' ? '#ffffff' : '#475569',
            }}
          >
            Ô sẽ nạp ({result.summary.validCells})
          </button>
        </div>

        {/* Modal Body: Tables */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', minHeight: 280 }}>
          {filterTab === 'valid' ? (
            /* 5.4. Bảng nội dung import hợp lệ (cellsToApply) */
            result.cellsToApply.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Không có ô số lượng hợp lệ nào để áp dụng.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12.5,
                  border: '1px solid #bbf7d0',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f0fdf4', color: '#166534', borderBottom: '2px solid #bbf7d0' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 45 }}>#</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 80 }}>Dòng Excel</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: 110 }}>Mã SP</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: 160 }}>Tên SP</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: 130 }}>NCC</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 110 }}>Ngày giao</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>SL hiện tại</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: 95 }}>SL từ Excel</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cellsToApply.map((cell, idx) => (
                    <tr
                      key={`${cell.productId}_${cell.deliveryDate}_${idx}`}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                        {cell.row > 0 ? cell.row : '-'}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                        {cell.productCode}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#1e293b', fontWeight: 500 }}>
                        {cell.productName}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#475569', fontSize: 12 }}>
                        {cell.supplierName || '-'}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
                        {cell.dateLabel || cell.deliveryDate}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b', fontWeight: 500 }}>
                        {cell.currentQty}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        {cell.quantity}
                      </td>
                      <td style={{ padding: '7px 12px', color: cell.note?.includes('⚠️') ? '#b45309' : '#166534', fontSize: 12 }}>
                        {cell.note || '✅ Sẵn sàng nạp'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : displayedItems.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>
                Tuyệt vời! Không phát hiện lỗi nào trong tệp Excel.
              </div>
              <div style={{ fontSize: 13, color: '#64748b', maxWidth: 450 }}>
                Tất cả {result.summary.validCells} ô dữ liệu số lượng đều thỏa mãn điều kiện kinh doanh, MOQ và lịch
                giao hàng của chi nhánh.
              </div>
            </div>
          ) : (
            /* 5.3. Bảng chi tiết validate (errors / warnings) — 9 Cột */
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                border: '1px solid #fecdd3',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    borderBottom: '2px solid #172554',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: 40 }}>#</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: 75 }}>Dòng Excel</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: 105 }}>Mã SP</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: 150 }}>Tên SP</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 100 }}>Ngày giao</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 85 }}>Giá trị nhập</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 90 }}>Mức</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 140 }}>Mã lỗi</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Thông báo</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item, idx) => {
                  const isErr = item.type === 'ERROR';
                  return (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: isErr ? '#fef2f2' : '#fffbeb',
                        borderBottom: isErr ? '1px solid #fee2e2' : '1px solid #fef3c7',
                        color: isErr ? '#991b1b' : '#92400e',
                      }}
                    >
                      {/* # */}
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b' }}>
                        {idx + 1}
                      </td>

                      {/* Dòng Excel */}
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                        {item.row > 0 ? item.row : '-'}
                      </td>

                      {/* Mã SP */}
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.productCode || '-'}
                      </td>

                      {/* Tên SP */}
                      <td style={{ padding: '7px 10px', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.productName || '-'}
                      </td>

                      {/* Ngày giao */}
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 11.5 }}>
                        {item.dateLabel || item.deliveryDate || '-'}
                      </td>

                      {/* Giá trị nhập */}
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.inputValue !== undefined ? String(item.inputValue) : '-'}
                      </td>

                      {/* Mức */}
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: isErr ? '#dc2626' : '#d97706',
                            color: '#ffffff',
                          }}
                        >
                          {isErr ? 'ERROR' : 'WARNING'}
                        </span>
                      </td>

                      {/* Mã lỗi */}
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>
                        {item.code}
                      </td>

                      {/* Thông báo */}
                      <td style={{ padding: '7px 12px', fontWeight: 500, lineHeight: 1.4 }}>
                        {item.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Status Alert Banner */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: hasErrors ? '#fff1f2' : canApply ? '#f0fdf4' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {hasErrors ? (
            <>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
                Tệp Excel có chứa {result.summary.errorCount} lỗi. Bạn cần sửa các lỗi trong danh sách trên trước khi có thể áp dụng vào ma trận.
              </div>
            </>
          ) : canApply ? (
            <>
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                Dữ liệu hợp lệ! Có tổng cộng <b>{result.summary.validCells}</b> ô số lượng sẵn sàng nạp vào bản thảo ma trận đặt hàng.
              </div>
            </>
          ) : (
            <>
              <Info size={18} color="#64748b" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                Không có ô số lượng thay đổi nào để nạp vào ma trận.
              </div>
            </>
          )}
        </div>

        {/* 5.5. Modal Footer Controls */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: '0 20px',
              borderRadius: 8,
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng / Hủy
          </button>

          <button
            type="button"
            onClick={onConfirmApply}
            disabled={!canApply}
            style={{
              height: 38,
              padding: '0 24px',
              borderRadius: 8,
              backgroundColor: canApply ? '#16a34a' : '#cbd5e1',
              border: 'none',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: canApply ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: canApply ? '0 2px 6px rgba(22, 163, 74, 0.35)' : 'none',
            }}
          >
            <span>Áp dụng vào ma trận</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderMatrixImportPreviewModal;
