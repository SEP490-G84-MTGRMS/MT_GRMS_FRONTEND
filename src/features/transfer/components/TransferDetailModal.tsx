import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Trash2,
  Copy,
  Download,
  ExternalLink,
  Printer,
  Search,
  CheckCircle,
  Truck,
  Clock,
  Ban,
  FileText,
} from 'lucide-react';
import type { TransferOrder, TransferItem, TransferStatus } from '../types';
import { CancelTransferModal } from './CancelTransferModal';

interface TransferDetailModalProps {
  isOpen: boolean;
  transfer: TransferOrder | null;
  onClose: () => void;
  onUpdateTransfer?: (updated: TransferOrder) => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  isOpen,
  transfer: initialTransfer,
  onClose,
  onUpdateTransfer,
}) => {
  const navigate = useNavigate();
  const [currentTransfer, setCurrentTransfer] = useState<TransferOrder | null>(initialTransfer);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Search filter on items
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [receiveNote, setReceiveNote] = useState('');

  useEffect(() => {
    setCurrentTransfer(initialTransfer);
    setReceiveNote(initialTransfer?.discrepancyNote || '');
    setFilterCode('');
    setFilterName('');
  }, [initialTransfer, isOpen]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !currentTransfer) return null;

  const handleConfirmCancel = (reason: string) => {
    const updated: TransferOrder = {
      ...currentTransfer,
      status: 'Cancelled',
      cancelReason: reason,
    };
    setCurrentTransfer(updated);
    if (onUpdateTransfer) {
      onUpdateTransfer(updated);
    }
  };

  const handleDuplicate = () => {
    onClose();
    navigate('/store-owner/transfers/create');
  };

  const handleExport = () => {
    alert(`Đang xuất file Excel cho phiếu chuyển ${currentTransfer.transferCode}...`);
  };

  const handlePrint = () => {
    alert('Đang kết nối máy in để in Biên bản giao nhận hàng hóa...');
  };

  const isTransit = currentTransfer.status === 'In-Transit';

  // Filter items
  const filteredItems = currentTransfer.items.filter((it) => {
    if (filterCode.trim() && !it.productCode.toLowerCase().includes(filterCode.trim().toLowerCase())) {
      return false;
    }
    if (filterName.trim() && !it.productName.toLowerCase().includes(filterName.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalQty = currentTransfer.items.reduce((sum, it) => sum + it.sentQty, 0);

  const renderStatus = (status: TransferStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="transfer-status-text draft">
            <Clock size={13} /> Phiếu tạm
          </span>
        );
      case 'In-Transit':
        return (
          <span className="transfer-status-text transit">
            <Truck size={13} /> Đang chuyển
          </span>
        );
      case 'Received':
        return (
          <span className="transfer-status-text received">
            <CheckCircle size={13} /> Đã nhận
          </span>
        );
      case 'Cancelled':
        return (
          <span className="transfer-status-text cancelled">
            <Ban size={13} /> Đã hủy
          </span>
        );
    }
  };

  return (
    <>
      <div
        className="custom-modal-backdrop"
        style={{
          zIndex: 1100,
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="custom-modal-box"
          style={{
            maxWidth: 960,
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(15, 118, 110, 0.25)',
            border: '1px solid #edf2f9',
          }}
        >
          {/* 1. Top Summary Bar (Khớp hình ảnh wireframe: Checkbox, ★, Mã, Ngày, Chi nhánh, Tổng tiền, Status, nút X) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="checkbox" style={{ accentColor: '#0F766E', cursor: 'pointer' }} />
              <span style={{ color: currentTransfer.isFavorite ? '#eab308' : '#94a3b8', fontSize: 16 }}>
                {currentTransfer.isFavorite ? '★' : '☆'}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F766E' }}>
                {currentTransfer.transferCode}
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{currentTransfer.transferDate}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>
                {currentTransfer.fromBranchName}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>&rarr;</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>
                {currentTransfer.toBranchName}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {currentTransfer.totalAmount.toLocaleString()} đ
              </span>
              {renderStatus(currentTransfer.status)}
            </div>

            {/* Nút đóng X */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#475569',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Đóng (X)"
            >
              <X size={16} />
            </button>
          </div>

          {/* 2. Tab Navigation */}
          <div style={{ padding: '0 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 18px',
                borderBottom: '2px solid #0F766E',
                color: '#0F766E',
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              Chi tiết nhận hàng
            </div>
          </div>

          {/* 3. Modal Body (Scrollable) */}
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header thông tin phiếu */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {currentTransfer.transferCode}
                </h2>
                <span style={{ color: '#0F766E', fontWeight: 600, fontSize: 13 }}>
                  [{currentTransfer.status === 'In-Transit' ? 'Đang chuyển' : currentTransfer.status === 'Received' ? 'Đã nhận' : currentTransfer.status === 'Draft' ? 'Phiếu tạm' : 'Đã hủy'}]
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Người tạo: <b>{currentTransfer.createdBy}</b>
              </div>
            </div>

            {/* Hộp Chuyển từ & Chuyển đến */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>Chuyển từ:</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {currentTransfer.fromBranchName}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {currentTransfer.transferDate}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>Chuyển đến:</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {currentTransfer.toBranchName}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {currentTransfer.receiveDate ? currentTransfer.receiveDate : `Dự kiến: ${currentTransfer.expectedDeliveryDate || 'Chưa cập nhật'}`}
                </div>
              </div>
            </div>

            {/* Ô tìm kiếm mặt hàng */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 200 }}>
                <input
                  type="text"
                  className="filter-input"
                  style={{ paddingLeft: 32, borderRadius: 8 }}
                  placeholder="Tìm mã hàng"
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
              </div>

              <div style={{ position: 'relative', width: 280 }}>
                <input
                  type="text"
                  className="filter-input"
                  style={{ paddingLeft: 32, borderRadius: 8 }}
                  placeholder="Tìm tên hàng"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
              </div>
            </div>

            {/* Bảng danh sách hàng hóa */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
              <table className="transfer-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Mã hàng</th>
                    <th>Tên hàng</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Số lượng chuyển</th>
                    <th style={{ width: 150, textAlign: 'right' }}>Giá chuyển/nhận</th>
                    <th style={{ width: 160, textAlign: 'right' }}>Thành tiền chuyển</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it: TransferItem) => (
                    <tr key={it.id}>
                      <td>
                        <span className="transfer-link">{it.productCode}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                        {it.batchNumber && (
                          <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 2 }}>
                            Lô: {it.batchNumber} &bull; HSD: {it.expiryDate}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
                        {it.sentQty}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {it.unitPrice.toLocaleString()} đ
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {it.amount.toLocaleString()} đ
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                        <FileText size={28} style={{ margin: '0 auto 6px auto', opacity: 0.4 }} />
                        Không tìm thấy hàng hóa phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ghi chú & Thống kê tổng */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: 24,
                alignItems: 'start',
                paddingTop: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                  ✏ {currentTransfer.note ? `Ghi chú chuyển: ${currentTransfer.note}` : 'Chưa có ghi chú chuyển'}
                </div>
                <textarea
                  className="filter-input"
                  style={{
                    width: '100%',
                    minHeight: 70,
                    borderRadius: 12,
                    resize: 'vertical',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                  placeholder="Ghi chú nhận..."
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13.5,
                  color: '#334155',
                  textAlign: 'right',
                }}
              >
                <div>
                  Tổng số mặt hàng: <b>{currentTransfer.items.length}</b>
                </div>
                <div>
                  Tổng SL chuyển: <b style={{ fontSize: 15 }}>{totalQty}</b>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                  Tổng giá trị chuyển:&nbsp;
                  <b style={{ fontSize: 17, color: '#0F766E' }}>
                    {currentTransfer.totalAmount.toLocaleString()} đ
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Bottom Toolbar: Các nút hành động Hủy, Sao chép, Xuất file | Nhận hàng, In */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Trái */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {currentTransfer.status !== 'Cancelled' && (
                <button
                  type="button"
                  className="btn-secondary-white"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 size={15} /> Hủy
                </button>
              )}

              <button
                type="button"
                className="btn-secondary-white"
                onClick={handleDuplicate}
              >
                <Copy size={15} /> Sao chép
              </button>

              <button
                type="button"
                className="btn-secondary-white"
                onClick={handleExport}
              >
                <Download size={15} /> Xuất file
              </button>
            </div>

            {/* Phải */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isTransit ? (
                <button
                  type="button"
                  className="btn-primary-teal"
                  onClick={() => {
                    onClose();
                    navigate(`/store-owner/transfers/${currentTransfer.id}/receive`);
                  }}
                >
                  <CheckCircle size={15} /> Nhận hàng
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary-white"
                  onClick={onClose}
                >
                  <ExternalLink size={15} /> Đóng
                </button>
              )}

              <button
                type="button"
                className="btn-secondary-white"
                onClick={handlePrint}
              >
                <Printer size={15} /> In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Hủy Phiếu */}
      <CancelTransferModal
        isOpen={isCancelModalOpen}
        transferCode={currentTransfer.transferCode}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
      />
    </>
  );
};
