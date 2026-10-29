import { useState } from 'react';
import type { FC } from 'react';
import { X, FileCheck, CheckCircle2, Download, Receipt, ArrowRight, Layers, Calendar, Hash } from 'lucide-react';
import type { TaxSnapshot, TaxSnapshotStatus } from '../types/taxSnapshot';
import { TaxSnapshotStatusBadge } from './TaxSnapshotStatusBadge';
import { mockOrdersPool } from '../api/mockTaxData';
import { TablePagination } from '../../../components/common/TablePagination';

interface Props {
  snapshot: TaxSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: TaxSnapshotStatus) => Promise<void>;
  onStatusChange?: (id: string, status: TaxSnapshotStatus) => Promise<void>;
  onOpenExportModal?: (snapshot: TaxSnapshot) => void;
  onExport?: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxSnapshotDetailDrawer: FC<Props> = ({
  snapshot,
  isOpen,
  onClose,
  onUpdateStatus,
  onStatusChange,
  onOpenExportModal,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'orders'>('summary');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(5);

  if (!isOpen || !snapshot) return null;

  const handleUpdate = onUpdateStatus || onStatusChange || (async () => {});
  const handleExport = onOpenExportModal || onExport || (() => {});

  const handleStatusChangeInternal = async (nextStatus: TaxSnapshotStatus) => {
    setIsUpdating(true);
    try {
      await handleUpdate(snapshot.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const paginatedOrders = mockOrdersPool.slice(
    (orderPage - 1) * orderPageSize,
    orderPage * orderPageSize
  );

  const ytdRev = snapshot.ytdRevenue || 1417500000;
  const threshold = snapshot.taxExemptionThreshold || 1000000000;
  const taxableExcess = snapshot.taxableRevenueInExcess || Math.max(0, ytdRev - threshold);

  return (
    <div className="tax-drawer-backdrop" onClick={onClose}>
      <div className="tax-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tax-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Kỳ tính thuế Quý {snapshot.quarter ?? snapshot.periodNumber}/{snapshot.year}
              </h2>
              <TaxSnapshotStatusBadge status={snapshot.status || 'draft'} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
              <Hash size={13} />
              <span>Mã tham chiếu:</span>
              <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 6, color: '#0F766E', fontWeight: 700 }}>
                {snapshot.id}
              </code>
            </div>
          </div>

          <button onClick={onClose} className="tax-drawer-close-btn" title="Đóng cửa sổ">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tax-drawer-tabs">
          <button
            onClick={() => setActiveTab('summary')}
            className={'tax-drawer-tab-btn ' + (activeTab === 'summary' ? 'active' : '')}
          >
            <Receipt size={16} />
            <span>Tổng quan nghĩa vụ thuế</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={'tax-drawer-tab-btn ' + (activeTab === 'orders' ? 'active' : '')}
          >
            <Layers size={16} />
            <span>Bảng kê hóa đơn ({mockOrdersPool.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="tax-drawer-body">
          {activeTab === 'summary' ? (
            <>
              {/* Formula Policy Box */}
              <div className="tax-info-box-teal">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0F766E' }}>
                  <Receipt size={16} />
                  <span>Cơ sở tính thuế: Quy định quản lý thuế HKD hiện hành</span>
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: 8, lineHeight: 1.6, color: '#134E4A' }}>
                  Hạn mức miễn thuế theo năm: <strong>1.000.000.000 VNĐ</strong> (cấp Hộ kinh doanh).
                  <br />
                  Doanh thu lũy kế YTD: <strong>{formatVND(ytdRev)}</strong> | Phần vượt chịu thuế: <strong>{formatVND(taxableExcess)}</strong>
                  <br />
                  Thuế GTGT: <strong style={{ color: '#0F766E' }}>{snapshot.vatRate}%</strong>
                  <br />
                  Thuế TNCN: <strong style={{ color: '#8B5CF6' }}>{snapshot.pitRate}%</strong>
                </div>
              </div>

              {/* Number Details Calculation Card */}
              <div className="tax-calc-card">
                <div className="tax-calc-row bordered-bottom">
                  <span style={{ color: '#475569', fontWeight: 600 }}>Doanh thu phát sinh trong quý</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    {formatVND(snapshot.taxableRevenue ?? snapshot.taxableRevenueInPeriod ?? 0)}
                  </span>
                </div>

                <div className="tax-calc-row">
                  <span style={{ color: '#64748B' }}>Doanh thu chịu thuế vượt hạn mức</span>
                  <span style={{ fontWeight: 800, color: '#D97706', fontSize: '1rem' }}>
                    {formatVND(taxableExcess)}
                  </span>
                </div>

                <div className="tax-calc-row">
                  <span style={{ color: '#64748B' }}>Thuế GTGT phải nộp ({snapshot.vatRate}%)</span>
                  <span style={{ fontWeight: 700, color: '#0D9488', fontSize: '0.98rem' }}>
                    {formatVND(snapshot.vatAmount)}
                  </span>
                </div>

                <div className="tax-calc-row">
                  <span style={{ color: '#64748B' }}>Thuế TNCN phải nộp ({snapshot.pitRate}%)</span>
                  <span style={{ fontWeight: 700, color: '#8B5CF6', fontSize: '0.98rem' }}>
                    {formatVND(snapshot.pitAmount)}
                  </span>
                </div>

                <div className="tax-calc-row bordered-top">
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      Tổng tiền thuế phải nộp Quý {snapshot.quarter ?? snapshot.periodNumber}
                    </span>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Đã tính theo cơ chế lũy kế năm</div>
                  </div>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F766E' }}>
                    {formatVND(snapshot.totalTaxAmount)}
                  </span>
                </div>
              </div>

              {/* Timestamps & Audit Trail */}
              <div className="tax-audit-card">
                <div className="tax-audit-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} />
                    <span>Ngày chốt số liệu:</span>
                  </span>
                  <strong style={{ color: '#0F172A' }}>
                    {new Date(snapshot.generatedAt || snapshot.finalizedAtUtc || Date.now()).toLocaleString('vi-VN')}
                  </strong>
                </div>

                {snapshot.submittedAt && (
                  <div className="tax-audit-row">
                    <span>Ngày nộp tờ khai:</span>
                    <strong style={{ color: '#0F172A' }}>
                      {new Date(snapshot.submittedAt).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                )}

                {snapshot.paidAt && (
                  <div className="tax-audit-row">
                    <span>Ngày hoàn tất nộp thuế:</span>
                    <strong style={{ color: '#059669' }}>
                      {new Date(snapshot.paidAt).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                )}

                {snapshot.auditSignatureHash && (
                  <div className="tax-audit-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Mã kiểm tra toàn vẹn dữ liệu nội bộ (HMAC-SHA256):
                    </span>
                    <code style={{ fontSize: '0.72rem', background: '#F8FAFC', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all', color: '#0F766E', width: '100%', boxSizing: 'border-box' }}>
                      {snapshot.auditSignatureHash}
                    </code>
                  </div>
                )}

                {(snapshot.note || snapshot.notes) && (
                  <div style={{ paddingTop: 8, borderTop: '1px solid #E2E8F0', marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Ghi chú:</span> {snapshot.note || snapshot.notes}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Hiển thị các hóa đơn bán lẻ POS cấu thành doanh thu Quý {snapshot.quarter}/{snapshot.year}:
              </div>

              <div className="tax-table-wrapper">
                <table className="tax-table">
                  <thead>
                    <tr>
                      <th>MÃ HÓA ĐƠN</th>
                      <th>THỜI GIAN</th>
                      <th>KHÁCH HÀNG</th>
                      <th>PTTT</th>
                      <th style={{ textAlign: 'right' }}>SỐ TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((ord: any) => (
                      <tr key={ord.orderId}>
                        <td style={{ fontWeight: 700, color: '#0F766E' }}>{ord.orderCode}</td>
                        <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{ord.orderDate}</td>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>{ord.customerName}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                          {formatVND(ord.finalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TablePagination */}
              <TablePagination
                currentPage={orderPage}
                pageSize={orderPageSize}
                totalItems={mockOrdersPool.length}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={setOrderPage}
                onPageSizeChange={(newSize) => {
                  setOrderPageSize(newSize);
                  setOrderPage(1);
                }}
                itemLabel="hóa đơn"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="tax-drawer-footer">
          <button
            onClick={() => handleExport(snapshot)}
            className="btn-secondary-pill"
          >
            <Download size={16} />
            <span>Xuất tờ khai Form 01</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {snapshot.status === 'Draft' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChangeInternal('Finalized')}
                className="btn-primary-pill"
              >
                <FileCheck size={16} />
                <span>Chốt số liệu</span>
              </button>
            )}

            {snapshot.status === 'Finalized' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChangeInternal('Submitted')}
                className="btn-primary-pill"
              >
                <span>Đánh dấu Đã nộp tờ khai</span>
                <ArrowRight size={16} />
              </button>
            )}

            {snapshot.status === 'Submitted' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChangeInternal('Paid')}
                className="btn-primary-pill"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
              >
                <CheckCircle2 size={16} />
                <span>Xác nhận Đã nộp thuế xong</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
