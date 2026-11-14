import { useMemo } from 'react';
import type { CSSProperties, FC } from 'react';
import {
  X,
  FileSpreadsheet,
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

type RowLevel = 'OK' | 'ERROR' | 'WARNING';

interface UnifiedRow {
  level: RowLevel;
  row: number;
  productCode: string;
  productName: string;
  supplierName?: string;
  dateLabel: string;
  value: string;
  code: string;
  detail: string;
}

const levelOrder: Record<RowLevel, number> = { ERROR: 0, WARNING: 1, OK: 2 };

const levelStyle: Record<
  RowLevel,
  { rowBg: string; border: string; text: string; badgeBg: string; badgeLabel: string }
> = {
  ERROR: {
    rowBg: '#fef2f2',
    border: '#fecaca',
    text: '#991b1b',
    badgeBg: '#dc2626',
    badgeLabel: 'Lỗi',
  },
  WARNING: {
    rowBg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
    badgeBg: '#d97706',
    badgeLabel: 'Cảnh báo',
  },
  OK: {
    rowBg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#166534',
    badgeBg: '#16a34a',
    badgeLabel: 'OK',
  },
};

const thStyle: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 12,
  color: '#ffffff',
  whiteSpace: 'nowrap',
};

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Không hiện GUID trong badge xác thực phạm vi. */
const scopeLabel = (value?: string): string => {
  const t = (value || '').trim();
  if (!t || GUID_RE.test(t)) return '';
  // "Tên (guid)" → chỉ giữ phần tên
  return t.replace(/\s*\([0-9a-f]{8}-[0-9a-f-]{27}\)\s*$/i, '').trim();
};

const formatMatched = (expected?: string) => {
  const label = scopeLabel(expected);
  return label ? `Khớp (${label})` : 'Khớp';
};

const formatMismatch = (actual?: string, expected?: string) => {
  const a = scopeLabel(actual) || 'Khác';
  const e = scopeLabel(expected);
  return e ? `Sai! File: ${a} ≠ UI: ${e}` : `Sai! File: ${a}`;
};

export const OrderMatrixImportPreviewModal: FC<OrderMatrixImportPreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  onConfirmApply,
}) => {
  const unifiedRows = useMemo((): UnifiedRow[] => {
    if (!result) return [];

    const errorRows: UnifiedRow[] = (result.errors || []).map((e) => ({
      level: 'ERROR' as const,
      row: e.row ?? 0,
      productCode: e.productCode || '-',
      productName: e.productName || '-',
      dateLabel: e.dateLabel || e.deliveryDate || '-',
      value: e.inputValue !== undefined ? String(e.inputValue) : '-',
      code: e.code || '-',
      detail: e.message || '-',
    }));

    const warningRows: UnifiedRow[] = (result.warnings || []).map((w) => ({
      level: 'WARNING' as const,
      row: w.row ?? 0,
      productCode: w.productCode || '-',
      productName: w.productName || '-',
      dateLabel: w.dateLabel || w.deliveryDate || '-',
      value: w.inputValue !== undefined ? String(w.inputValue) : '-',
      code: w.code || '-',
      detail: w.message || '-',
    }));

    const okRows: UnifiedRow[] = (result.cellsToApply || []).map((c) => ({
      level: 'OK' as const,
      row: c.row ?? 0,
      productCode: c.productCode || '-',
      productName: c.productName || '-',
      supplierName: c.supplierName,
      dateLabel: c.dateLabel || c.deliveryDate || '-',
      value: String(c.quantity),
      code: 'READY',
      detail: c.note || `Sẵn sàng nạp (hiện tại: ${c.currentQty})`,
    }));

    return [...errorRows, ...warningRows, ...okRows].sort((a, b) => {
      const byLevel = levelOrder[a.level] - levelOrder[b.level];
      if (byLevel !== 0) return byLevel;
      return (a.row || 0) - (b.row || 0);
    });
  }, [result]);

  if (!isOpen || !result) return null;

  const hasErrors = result.summary.errorCount > 0;
  const canApply =
    result.summary.validCells > 0 && result.cellsToApply.length > 0 && (!hasErrors || result.valid);

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
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e3a8a',
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
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.2px',
                }}
              >
                Excel取込結果 — Kiểm tra và nạp ma trận đặt hàng
              </h3>
              <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>
                Tệp: <b style={{ color: '#ffffff' }}>{result.fileName}</b> (
                {Math.max(1, Math.round(result.fileSize / 1024))} KB)
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

        {/* Thống kê dạng text */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: 13,
            color: '#334155',
            lineHeight: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 18px',
            alignItems: 'center',
          }}
        >
          <span>
            Ô hợp lệ: <b style={{ color: '#15803d' }}>{result.summary.validCells}</b>
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span>
            Ô lỗi: <b style={{ color: '#b91c1c' }}>{result.summary.errorCount}</b>
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span>
            Cảnh báo: <b style={{ color: '#a16207' }}>{result.summary.warningCount}</b>
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span>
            Ô bỏ qua / trùng: <b style={{ color: '#475569' }}>{result.summary.ignoredCells}</b>
          </span>
        </div>

        {/* Scope badges */}
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
                  ? formatMatched(result.scopeStatus.branchExpected)
                  : formatMismatch(
                      result.scopeStatus.branchActual,
                      result.scopeStatus.branchExpected
                    )}
              </span>
            </div>

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
                  ? formatMatched(result.scopeStatus.supplierExpected)
                  : formatMismatch(
                      result.scopeStatus.supplierActual,
                      result.scopeStatus.supplierExpected
                    )}
              </span>
            </div>

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
                  ? formatMatched(result.scopeStatus.periodExpected)
                  : `Lệch kỳ!${
                      scopeLabel(result.scopeStatus.periodExpected)
                        ? ` (${scopeLabel(result.scopeStatus.periodExpected)})`
                        : ''
                    }`}
              </span>
            </div>
          </div>
        )}

        {/* Một bảng gộp — màu theo trạng thái */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', minHeight: 280 }}>
          {unifiedRows.length === 0 ? (
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
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info size={28} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Không có dòng phản hồi từ tệp Excel.</div>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
                border: '1px solid #e2e8f0',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#1e3a8a' }}>
                  <th style={{ ...thStyle, textAlign: 'center', width: 40 }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 72 }}>Dòng</th>
                  <th style={{ ...thStyle, width: 110 }}>Mã SP</th>
                  <th style={{ ...thStyle, minWidth: 140 }}>Tên SP</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 110 }}>Ngày giao</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Giá trị</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 88 }}>Trạng thái</th>
                  <th style={{ ...thStyle, width: 100 }}>Mã</th>
                  <th style={thStyle}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {unifiedRows.map((item, idx) => {
                  const s = levelStyle[item.level];
                  return (
                    <tr
                      key={`${item.level}-${item.row}-${item.productCode}-${item.dateLabel}-${idx}`}
                      style={{
                        backgroundColor: s.rowBg,
                        borderBottom: `1px solid ${s.border}`,
                        color: s.text,
                      }}
                    >
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b' }}>
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: '7px 8px',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: '#64748b',
                        }}
                      >
                        {item.row > 0 ? item.row : '-'}
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {item.productCode}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 500, lineHeight: 1.35 }}>
                        {item.productName}
                        {item.supplierName ? (
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                            {item.supplierName}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 12 }}>
                        {item.dateLabel}
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                        }}
                      >
                        {item.value}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: s.badgeBg,
                            color: '#ffffff',
                          }}
                        >
                          {s.badgeLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {item.code}
                      </td>
                      <td style={{ padding: '7px 12px', fontWeight: 500, lineHeight: 1.4 }}>
                        {item.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Status banner */}
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
                Tệp Excel có {result.summary.errorCount} lỗi. Sửa các dòng đỏ trong bảng trước khi áp
                dụng vào ma trận.
              </div>
            </>
          ) : canApply ? (
            <>
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                Dữ liệu hợp lệ! Có <b>{result.summary.validCells}</b> ô sẵn sàng nạp vào bản thảo ma
                trận.
                {result.summary.warningCount > 0
                  ? ` (kèm ${result.summary.warningCount} cảnh báo — vẫn có thể nạp)`
                  : ''}
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

        {/* Footer */}
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
