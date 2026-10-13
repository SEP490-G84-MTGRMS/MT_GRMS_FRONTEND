import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Building,
  Calendar,
} from 'lucide-react';
import type {
  BranchOption,
  KpiSummaryData,
  PnlFilterParams,
  PnlLineItem,
} from '../types/reportsPnl.types';

interface PnlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: PnlFilterParams;
  branches: BranchOption[];
  kpi?: KpiSummaryData;
  pnlTree: PnlLineItem[];
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Modal dialog for export options (CSV/Excel download and A4 Print Preview).
 * Fully refactored to 100% Vanilla CSS conforming to MT-GRMS Design System.
 */
export const PnlExportModal: React.FC<PnlExportModalProps> = ({
  isOpen,
  onClose,
  filter,
  branches,
  kpi,
  pnlTree,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'EXCEL' | 'PDF'>('PDF');

  if (!isOpen) return null;

  const currentBranchName =
    branches.find((b) => b.id === filter.branchId)?.name || 'Toàn hệ thống';

  // Export CSV generator
  const handleDownloadCsv = () => {
    const headers = ['Mã', 'Khoản mục tài chính', 'Số tiền (VNĐ)', 'Tỷ lệ % / Doanh thu'];
    const rows: string[] = [headers.join(',')];

    const appendItems = (items: PnlLineItem[]) => {
      for (const it of items) {
        rows.push(
          `"${it.code}","${it.title}",${it.amount},"${it.percentageOfNetRevenue}%"`
        );
        if (it.children && it.children.length > 0) {
          appendItems(it.children);
        }
      }
    };

    appendItems(pnlTree);

    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_PNL_${filter.startDate}_${filter.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Đã xuất báo cáo P&L sang file Excel (.csv) thành công!', 'success');
  };

  const handlePrint = () => {
    onShowToast?.('Đang mở hộp thoại in / xuất bản in PDF khổ A4...', 'info');
    window.print();
  };

  return (
    <div className="pnl-modal-backdrop" onClick={onClose}>
      <div
        className="pnl-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="pnl-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="pnl-card-icon-badge"
              style={{
                background: 'var(--blue-subtle, #CCFBF1)',
                color: 'var(--blue-primary, #0F766E)',
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #111827)' }}>
                In & Xuất Báo Cáo Tài Chính P&L
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
                Xuất file Excel (.csv) hoặc xem trước bản in chuẩn khổ giấy A4
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pnl-modal-close-btn"
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="pnl-modal-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab('PDF')}
            className={`pnl-modal-tab-btn ${activeTab === 'PDF' ? 'active' : ''}`}
          >
            <Printer size={15} />
            Bản In / Xuất PDF (Khổ A4)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXCEL')}
            className={`pnl-modal-tab-btn ${activeTab === 'EXCEL' ? 'active' : ''}`}
          >
            <FileSpreadsheet size={15} />
            Bảng Tính Excel (.CSV)
          </button>
        </div>

        {/* Modal Body */}
        <div className="pnl-modal-body">
          {activeTab === 'PDF' ? (
            /* A4 Print Sheet Preview */
            <div id="printable-pnl-sheet" className="pnl-print-sheet">
              {/* Report Header */}
              <div className="pnl-print-header">
                <div className="pnl-print-header-top">
                  <div>
                    <h3 className="pnl-print-brand">
                      HỆ THỐNG BÁN LẺ TẠP HÓA MT-GRMS
                    </h3>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0 0', color: '#475569' }}>
                      <Building size={13} />
                      Chi nhánh: <strong>{currentBranchName}</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>
                    <p style={{ margin: 0 }}>Mẫu số: B02-DNN</p>
                    <p style={{ margin: '2px 0 0' }}>Ban hành theo TT 133/2016/TT-BTC</p>
                  </div>
                </div>

                <div className="pnl-print-title">
                  <h1>BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)</h1>
                  <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '6px 0 0', color: '#475569' }}>
                    <Calendar size={13} />
                    Thời gian: Từ ngày {filter.startDate} đến ngày {filter.endDate}
                  </p>
                </div>
              </div>

              {/* KPI Mini Summary */}
              {kpi && (
                <div className="pnl-print-kpi-summary">
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase' }}>DOANH THU THUẦN</p>
                    <p style={{ fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {formatVnd(kpi.netRevenue)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase' }}>GIÁ VỐN (COGS)</p>
                    <p style={{ fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {formatVnd(kpi.cogs)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase' }}>CHI PHÍ VẬN HÀNH</p>
                    <p style={{ fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {formatVnd(kpi.operatingExpenses + kpi.shrinkageLoss)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase' }}>LỢI NHUẬN RÒNG</p>
                    <p style={{ fontWeight: 800, color: 'var(--blue-primary, #0F766E)', margin: 0 }}>
                      {formatVnd(kpi.netProfit)}
                    </p>
                  </div>
                </div>
              )}

              {/* Statement Items Table */}
              <table className="pnl-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>Mã</th>
                    <th style={{ textAlign: 'left' }}>Chỉ Tiêu Tài Chính</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Số Tiền (VNĐ)</th>
                    <th style={{ textAlign: 'right', width: '80px' }}>Tỷ Lệ %</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlTree.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: row.isTotal ? '#CCFBF1' : row.isHeader ? '#F8FAFC' : 'transparent',
                        fontWeight: row.isTotal || row.isHeader ? 800 : 500,
                      }}
                    >
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', color: '#64748b' }}>
                        {row.code}
                      </td>
                      <td
                        style={{
                          paddingLeft: `${row.level === 2 ? 24 : row.level === 3 ? 40 : 10}px`,
                        }}
                      >
                        {row.title}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: row.isTotal ? 800 : 600 }}>
                        {formatVnd(row.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {row.percentageOfNetRevenue}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pnl-print-signatures">
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>Người Lập Biểu</p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>(Ký, họ tên)</p>
                  <div style={{ height: '48px' }} />
                  <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>Nhân viên kế toán</p>
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>Kế Toán Trưởng</p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>(Ký, họ tên)</p>
                  <div style={{ height: '48px' }} />
                  <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>Trưởng ban kiểm soát</p>
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>Giám Đốc / Chủ Tiệm</p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>(Ký, đóng dấu)</p>
                  <div style={{ height: '48px' }} />
                  <p style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 700, margin: 0 }}>Store Owner</p>
                </div>
              </div>
            </div>
          ) : (
            /* Excel Tab */
            <div className="pnl-excel-card">
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  background: 'var(--blue-subtle, #CCFBF1)',
                  color: 'var(--blue-primary, #0F766E)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <FileSpreadsheet size={32} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main, #111827)' }}>
                Xuất Bảng Tính Excel (.CSV UTF-8)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 auto 20px', maxWidth: '420px', lineHeight: 1.5 }}>
                File tải về hỗ trợ chuẩn tiếng Việt UTF-8 có BOM, mở trực tiếp bằng Microsoft Excel mà không bị lỗi font chữ.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="btn-primary-pill"
                >
                  <Download size={15} />
                  Tải Xuống File .CSV
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pnl-modal-footer">
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>
            * Nhấn Ctrl+P hoặc nút in để kích hoạt máy in / lưu file PDF
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-pill"
            >
              Đóng
            </button>
            {activeTab === 'PDF' && (
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary-pill"
              >
                <Printer size={15} />
                In / Lưu PDF Ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
