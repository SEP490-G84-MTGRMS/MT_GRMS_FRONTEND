import { useState } from 'react';
import type { FC } from 'react';
import { Eye, FileCheck, CheckCircle2, Trash2, FileSpreadsheet, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatTaxPeriodLabel, type TaxSnapshot } from '../types/taxSnapshot';
import { TaxSnapshotStatusBadge } from './TaxSnapshotStatusBadge';
import { TablePagination } from '../../../components/common/TablePagination';
import { taxSnapshotApi } from '../api/taxSnapshotApi';

interface Props {
  snapshots: TaxSnapshot[];
  isLoading: boolean;
  onViewDetail: (snapshot: TaxSnapshot) => void;
  onFinalize: (snapshot: TaxSnapshot) => void;
  onMarkPaid: (snapshot: TaxSnapshot) => void;
  onDelete: (snapshot: TaxSnapshot) => void;
  onExport?: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxSnapshotTable: FC<Props> = ({
  snapshots,
  isLoading,
  onViewDetail,
  onFinalize,
  onMarkPaid,
  onDelete,
  onExport,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [integrityResults, setIntegrityResults] = useState<Record<string, { isIntegrityValid: boolean; message: string }>>({});

  const handleVerifyIntegrity = async (s: TaxSnapshot) => {
    try {
      setVerifyingId(s.id);
      const res = await taxSnapshotApi.verifyIntegrity(s.id);
      setIntegrityResults((prev) => ({ ...prev, [s.id]: res }));
    } catch (err: unknown) {
      setIntegrityResults((prev) => ({
        ...prev,
        [s.id]: {
          isIntegrityValid: false,
          message: err instanceof Error ? err.message : 'Không thể xác minh chữ ký số.',
        },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="tax-table-card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#0F766E', fontWeight: 600 }}>Đang tải danh sách kỳ tính thuế...</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="tax-table-card" style={{ padding: 64, textAlign: 'center' }}>
        <FileCheck size={48} style={{ color: '#0F766E', margin: '0 auto 16px auto', display: 'block' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Chưa có kỳ tính thuế nào</h3>
        <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 6 }}>
          Bấm "Chốt sổ kỳ tính thuế" để hệ thống quét doanh thu và lưu trữ biên bản thuế tự động.
        </p>
      </div>
    );
  }

  // Client-side pagination slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSnapshots = snapshots.slice(startIndex, startIndex + pageSize);

  return (
    <div className="tax-table-card">
      <div className="tax-table-wrapper">
        <table className="tax-table">
          <thead>
            <tr>
              <th>Kỳ tính thuế</th>
              <th style={{ textAlign: 'right' }}>Doanh thu phát sinh</th>
              <th style={{ textAlign: 'right' }}>VAT (1%)</th>
              <th style={{ textAlign: 'right' }}>PIT (0.5%)</th>
              <th style={{ textAlign: 'right' }}>Tổng thuế phải nộp</th>
              <th style={{ textAlign: 'center' }}>Số hóa đơn</th>
              <th>Trạng thái</th>
              <th>Ngày tạo / Chốt</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSnapshots.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700, color: '#111827' }}>
                  {formatTaxPeriodLabel(s.periodType, s.periodNumber ?? s.quarter, s.year)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatVND(s.taxableRevenue ?? s.taxableRevenueInPeriod ?? 0)}
                </td>
                <td style={{ textAlign: 'right', color: '#0F766E', fontWeight: 600 }}>
                  {formatVND(s.vatAmount)}
                </td>
                <td style={{ textAlign: 'right', color: '#7C3AED', fontWeight: 600 }}>
                  {formatVND(s.pitAmount)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                  {formatVND(s.totalTaxAmount)}
                </td>
                <td style={{ textAlign: 'center', color: '#64748B' }}>
                  {(s.ordersCount ?? 0).toLocaleString('vi-VN')} đơn
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <TaxSnapshotStatusBadge status={s.status || (s.finalizedAtUtc ? 'Finalized' : 'draft')} />
                    {integrityResults[s.id] && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: integrityResults[s.id].isIntegrityValid ? '#059669' : '#DC2626',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        {integrityResults[s.id].isIntegrityValid ? (
                          <>
                            <ShieldCheck size={11} /> Toàn vẹn HMAC
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={11} /> Sai lệch chữ ký!
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  {s.generatedAt || s.finalizedAtUtc ? new Date(s.generatedAt || s.finalizedAtUtc!).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => onViewDetail(s)}
                      className="tax-action-btn"
                      title="Xem chi tiết & bảng kê"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      onClick={() => handleVerifyIntegrity(s)}
                      disabled={verifyingId === s.id}
                      className="tax-action-btn"
                      style={{
                        color:
                          integrityResults[s.id]?.isIntegrityValid === false
                            ? '#DC2626'
                            : '#0F766E',
                      }}
                      title="Kiểm tra tính toàn vẹn chữ ký số HMAC-SHA256"
                    >
                      {integrityResults[s.id]?.isIntegrityValid === false ? (
                        <ShieldAlert size={15} />
                      ) : (
                        <ShieldCheck size={15} />
                      )}
                    </button>

                    {onExport && (
                      <button
                        onClick={() => onExport(s)}
                        className="tax-action-btn"
                        style={{ color: '#0F766E' }}
                        title="Kết xuất XML/Excel"
                      >
                        <FileSpreadsheet size={15} />
                      </button>
                    )}

                    {s.status === 'Draft' && (
                      <>
                        <button
                          onClick={() => onFinalize(s)}
                          className="tax-action-btn"
                          style={{ color: '#0F766E' }}
                          title="Chốt số liệu kỳ thuế"
                        >
                          <FileCheck size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(s)}
                          className="tax-action-btn delete"
                          title="Xóa nháp"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}

                    {s.status === 'Submitted' && (
                      <button
                        onClick={() => onMarkPaid(s)}
                        className="tax-action-btn"
                        style={{ color: '#059669' }}
                        title="Xác nhận đã hoàn thành nộp thuế"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shared TablePagination Component */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={snapshots.length}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }}
        itemLabel="kỳ tính thuế"
      />
    </div>
  );
};
