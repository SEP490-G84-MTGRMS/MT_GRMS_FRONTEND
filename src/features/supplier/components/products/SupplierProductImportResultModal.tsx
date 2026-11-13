import type { FC } from 'react';
import { CheckCircle2, FileSpreadsheet, X, XCircle } from 'lucide-react';
import type { SupplierProductExcelImportResult } from '../../api/supplierProductApi';

interface Props {
  isOpen: boolean;
  result: SupplierProductExcelImportResult | null;
  onClose: () => void;
}

const fmtMoney = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('vi-VN').format(Number(n)) + ' đ';
};

export const SupplierProductImportResultModal: FC<Props> = ({ isOpen, result, onClose }) => {
  if (!isOpen || !result) return null;

  const ok = result.summary.failedCount === 0;
  const rows = result.rows || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1080,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 18px',
            background: ok ? '#065f46' : '#9f1239',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Kết quả import giá nhập sỉ &amp; MOQ</div>
              <div style={{ fontSize: 12, opacity: 0.92 }}>
                {result.fileName} — {result.supplierCode} {result.supplierName} —{' '}
                {result.summary.successCount}/{result.summary.totalRows} thành công
                {result.summary.failedCount > 0 ? ` · ${result.summary.failedCount} lỗi` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, overflow: 'auto' }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 14,
              flexWrap: 'wrap',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '4px 10px', borderRadius: 999 }}>
              Thành công: {result.summary.successCount}
            </span>
            <span style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 10px', borderRadius: 999 }}>
              Lỗi: {result.summary.failedCount}
            </span>
            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: 999 }}>
              Tổng dòng: {result.summary.totalRows}
            </span>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', width: 56 }}>Dòng</th>
                  <th style={{ padding: '10px 12px', width: 110 }}>SKU</th>
                  <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                  <th style={{ padding: '10px 12px', width: 120, textAlign: 'right' }}>Giá nhập</th>
                  <th style={{ padding: '10px 12px', width: 70, textAlign: 'center' }}>MOQ</th>
                  <th style={{ padding: '10px 12px', width: 90, textAlign: 'center' }}>KQ</th>
                  <th style={{ padding: '10px 12px' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOk = String(r.status).toUpperCase() === 'OK';
                  return (
                    <tr key={`${r.row}-${r.sku}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{r.row}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{r.sku || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{r.productName || '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(r.agreedWholesalePrice)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>{r.moq ?? '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 700,
                            fontSize: 12,
                            color: isOk ? '#047857' : '#b91c1c',
                          }}
                        >
                          {isOk ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {isOk ? 'OK' : 'Lỗi'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12.5, color: isOk ? '#334155' : '#991b1b' }}>
                        {r.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="po-btn po-btn-primary" onClick={onClose} style={{ height: 36 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierProductImportResultModal;
