import type { FC } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';

export interface MatrixExcelImportIssue {
  type?: string;
  row?: number;
  productCode?: string;
  productName?: string;
  deliveryDate?: string;
  dateLabel?: string;
  inputValue?: string | number;
  code?: string;
  message?: string;
}

export interface MatrixExcelSuccessDay {
  deliveryDate: string;
  dateLabel: string;
  appliedCells: number;
  productCount: number;
}

export interface MatrixExcelImportResult {
  success: boolean;
  fileName?: string;
  summary: {
    appliedCells: number;
    skippedOwnerLocked: number;
    errorCount: number;
    warningCount: number;
    successDayCount: number;
  };
  successDays: MatrixExcelSuccessDay[];
  errors: MatrixExcelImportIssue[];
  warnings?: MatrixExcelImportIssue[];
  draftPoId?: string;
}

interface Props {
  isOpen: boolean;
  result: MatrixExcelImportResult | null;
  onClose: () => void;
}

export const OrderMatrixImportResultModal: FC<Props> = ({ isOpen, result, onClose }) => {
  if (!isOpen || !result) return null;

  const errors = result.errors || [];
  const days = result.successDays || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1070,
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
          maxWidth: 920,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: result.success ? '#065f46' : '#9f1239',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Kết quả nạp Excel ma trận</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {result.fileName || 'matrix.xlsx'} — {result.summary.appliedCells} ô /{' '}
                {result.summary.successDayCount} ngày
                {result.summary.errorCount > 0 ? ` — ${result.summary.errorCount} lỗi` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                fontWeight: 700,
                color: '#065f46',
              }}
            >
              <CalendarDays size={16} />
              Ngày import thành công
            </div>
            {days.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Không có ngày nào được nạp thành công.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {days.map((d) => (
                  <div
                    key={d.deliveryDate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #bbf7d0',
                      background: '#f0fdf4',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#14532d' }}>
                          {d.dateLabel || d.deliveryDate}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{d.deliveryDate}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                      {d.appliedCells} ô · {d.productCount} SP
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                fontWeight: 700,
                color: errors.length ? '#be123c' : '#64748b',
              }}
            >
              <AlertCircle size={16} />
              Lỗi cụ thể trong file Excel ({errors.length})
            </div>
            {errors.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Không có lỗi.
              </div>
            ) : (
              <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid #fecdd3', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fff1f2', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Dòng</th>
                      <th style={{ padding: '8px 10px' }}>SKU</th>
                      <th style={{ padding: '8px 10px' }}>Ngày</th>
                      <th style={{ padding: '8px 10px' }}>Giá trị</th>
                      <th style={{ padding: '8px 10px' }}>Mã</th>
                      <th style={{ padding: '8px 10px' }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((e, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #fecdd3' }}>
                        <td style={{ padding: '8px 10px' }}>{e.row ?? '-'}</td>
                        <td style={{ padding: '8px 10px' }}>{e.productCode || '-'}</td>
                        <td style={{ padding: '8px 10px' }}>{e.dateLabel || e.deliveryDate || '-'}</td>
                        <td style={{ padding: '8px 10px' }}>{String(e.inputValue ?? '-')}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'Consolas, monospace' }}>
                          {e.code || '-'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{e.message || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {(result.summary.skippedOwnerLocked > 0 || (result.warnings?.length ?? 0) > 0) && (
            <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', padding: 10, borderRadius: 8 }}>
              Bỏ qua ô đã chốt chủ: {result.summary.skippedOwnerLocked}
              {(result.warnings?.length ?? 0) > 0 ? ` · Cảnh báo: ${result.warnings!.length}` : ''}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="po-btn po-btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderMatrixImportResultModal;
