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
  onUpdateStatus: (id: string, status: TaxSnapshotStatus) => Promise<void>;
  onOpenExportModal: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxSnapshotDetailDrawer: FC<Props> = ({
  snapshot,
  isOpen,
  onClose,
  onUpdateStatus,
  onOpenExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'orders'>('summary');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(5);

  if (!isOpen || !snapshot) return null;

  const handleStatusChange = async (nextStatus: TaxSnapshotStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(snapshot.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const paginatedOrders = mockOrdersPool.slice(
    (orderPage - 1) * orderPageSize,
    orderPage * orderPageSize
  );

  return (
    <div className="tax-drawer-backdrop" onClick={onClose}>
      <div className="tax-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tax-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Kỳ tính thuế Quý {snapshot.quarter}/{snapshot.year}
              </h2>
              <TaxSnapshotStatusBadge status={snapshot.status} />
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
                  <span>Quy định biểu thuế Hộ kinh doanh (Thông tư 40/2021/TT-BTC)</span>
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: 8, lineHeight: 1.6, color: '#134E4A' }}>
                  Ngành nghề: <strong>Phân phối, cung cấp hàng hóa (bán buôn, bán lẻ tiệm tạp hóa)</strong>
                  <br />
                  • Thuế GTGT: <strong style={{ color: '#0F766E' }}>1.0%</strong> trên tổng doanh thu thực tế phát sinh
                  <br />
                  • Thuế TNCN: <strong style={{ color: '#8B5CF6' }}>0.5%</strong> trên tổng doanh thu thực tế phát sinh
                  <br />
                  • Tổng thuế nộp: <strong style={{ color: '#0F766E' }}>1.5%</strong> doanh thu chịu thuế
                </div>
              </div>

              {/* Number Details Calculation Card */}
              <div className="tax-calc-card">
                <div className="tax-calc-row bordered-bottom">
                  <span style={{ color: '#475569', fontWeight: 600 }}>Tổng doanh thu bán lẻ chịu thuế</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    {formatVND(snapshot.taxableRevenue)}
                  </span>
                </div>

                <div className="tax-calc-row">
                  <span style={{ color: '#64748B' }}>Thuế GTGT phải nộp (1%)</span>
                  <span style={{ fontWeight: 700, color: '#0D9488', fontSize: '0.98rem' }}>
                    {formatVND(snapshot.vatAmount)}
                  </span>
                </div>

                <div className="tax-calc-row">
                  <span style={{ color: '#64748B' }}>Thuế TNCN phải nộp (0.5%)</span>
                  <span style={{ fontWeight: 700, color: '#8B5CF6', fontSize: '0.98rem' }}>
                    {formatVND(snapshot.pitAmount)}
                  </span>
                </div>

                <div className="tax-calc-row bordered-top">
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      Tổng tiền thuế phải nộp
                    </span>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Đã bao gồm 1% VAT + 0.5% TNCN</div>
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
                    {new Date(snapshot.generatedAt).toLocaleString('vi-VN')}
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

                {snapshot.note && (
                  <div style={{ paddingTop: 8, borderTop: '1px solid #E2E8F0', marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Ghi chú:</span> {snapshot.note}
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
                    {paginatedOrders.map((ord) => (
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
            onClick={() => onOpenExportModal(snapshot)}
            className="btn-secondary-pill"
          >
            <Download size={16} />
            <span>Xuất tờ khai Form 01</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {snapshot.status === 'Draft' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Finalized')}
                className="btn-primary-pill"
              >
                <FileCheck size={16} />
                <span>Chốt số liệu</span>
              </button>
            )}

            {snapshot.status === 'Finalized' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Submitted')}
                className="btn-primary-pill"
              >
                <span>Đánh dấu Đã nộp tờ khai</span>
                <ArrowRight size={16} />
              </button>
            )}

            {snapshot.status === 'Submitted' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Paid')}
                className="btn-primary-pill"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
              >
                <CheckCircle2 size={16} />
                <span>Xác nhận Đã nộp thuế</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
