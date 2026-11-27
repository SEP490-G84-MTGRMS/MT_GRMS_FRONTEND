import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import {
  X,
  Copy,
  Trash2,
  Download,
  ExternalLink,
  Printer,
  Search,
  CheckCircle,
  Truck,
  Clock,
  Ban,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { TransferOrder, TransferItem } from '../types';
import { CancelTransferModal } from './CancelTransferModal';
import { getTransferErrorMessage, transferService } from '../services/transferService';
import { formatDateTimeVN, formatDateVN } from '../utils/transferDate';
import { useAuthStore } from '../../../stores/useAuthStore';

interface TransferDetailModalProps {
  isOpen: boolean;
  transfer: TransferOrder | null;
  onClose: () => void;
  onUpdateTransfer?: (updated: TransferOrder) => void;
}

const TRANSFER_ACTION_LABELS: Record<string, string> = {
  Created: 'Tạo phiếu',
  Submitted: 'Gửi duyệt',
  Dispatched: 'Xuất kho gửi',
  Received: 'Đã nhận hàng',
  Cancelled: 'Hủy phiếu',
  ReturnedToSource: 'Hoàn trả kho nguồn',
  UrgentRequestAllocated: 'Phân bổ yêu cầu khẩn',
};

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  Draft: 'Phiếu tạm',
  Pending: 'Chờ xử lý',
  InTransit: 'Đang chuyển',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

const getTransferStatusDisplayLabel = (transfer: TransferOrder): string => {
  if (transfer.status === 'Completed') {
    if (transfer.completionResult === 'Returned') return 'Đã hoàn trả kho nguồn';
    if (transfer.completionResult === 'ReceivedWithDiscrepancy' || transfer.hasDiscrepancy) {
      return 'Hoàn tất có chênh lệch';
    }
    return 'Hoàn tất';
  }
  return TRANSFER_STATUS_LABELS[transfer.status] || transfer.status;
};

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  isOpen,
  transfer: initialTransfer,
  onClose,
  onUpdateTransfer,
}) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'STORE_OWNER';
  const transferBasePath = window.location.pathname.startsWith('/employee') ? '/employee/transfers' : '/store-owner/transfers';
  const [currentTransfer, setCurrentTransfer] = useState<TransferOrder | null>(initialTransfer);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Search filter on items
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isReturnPromptOpen, setIsReturnPromptOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    setCurrentTransfer(initialTransfer);
    setFilterCode('');
    setFilterName('');
    setActionError(null);
    setIsSubmittingAction(false);
    setIsReturnPromptOpen(false);
    setReturnReason('');
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

  const isReturned = currentTransfer.status === 'Completed' && currentTransfer.completionResult === 'Returned';
  const isDiscrepancy =
    currentTransfer.status === 'Completed' &&
    !isReturned &&
    (currentTransfer.completionResult === 'ReceivedWithDiscrepancy' || Boolean(currentTransfer.hasDiscrepancy));
  const showReconciliationColumns =
    (currentTransfer.status === 'Completed' && !isReturned) ||
    currentTransfer.items.some((it) => (it.receivedQty ?? 0) > 0 || (it.damagedQty ?? 0) > 0 || Boolean(it.note));

  const handleConfirmCancel = async (reason: string) => {
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = await transferService.cancel(currentTransfer.id, reason);
      setCurrentTransfer(updated);
      onUpdateTransfer?.(updated);
    } catch (error) {
      setActionError(getTransferErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const applyAction = async (action: 'submit' | 'dispatch') => {
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = action === 'submit'
        ? await transferService.submit(currentTransfer.id)
        : await transferService.dispatch(currentTransfer.id);
      setCurrentTransfer(updated);
      onUpdateTransfer?.(updated);
    } catch (error) {
      setActionError(getTransferErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReturnToSource = () => {
    setActionError(null);
    setReturnReason('');
    setIsReturnPromptOpen(true);
  };

  const handleConfirmReturnToSource = async () => {
    if (isSubmittingAction) return;
    const trimmed = returnReason.trim();
    if (!trimmed) {
      setActionError('Vui lòng nhập lý do hoàn trả hàng về kho nguồn.');
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = await transferService.returnToSource(currentTransfer.id, trimmed);
      setCurrentTransfer(updated);
      onUpdateTransfer?.(updated);
      setIsReturnPromptOpen(false);
      setReturnReason('');
    } catch (error) {
      setActionError(getTransferErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDuplicate = () => {
    onClose();
    navigate(
      window.location.pathname.startsWith('/employee') ? `${transferBasePath}/request` : `${transferBasePath}/create`,
      { state: { duplicateFrom: currentTransfer } }
    );
  };
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Chi tiết phiếu chuyển');
    sheet.addRow(['Mã phiếu', currentTransfer.transferCode]);
    sheet.addRow(['Trạng thái', getTransferStatusDisplayLabel(currentTransfer)]);
    sheet.addRow(['Chi nhánh gửi', currentTransfer.fromBranchName]);
    sheet.addRow(['Chi nhánh nhận', currentTransfer.toBranchName]);
    sheet.addRow(['Ngày chuyển', currentTransfer.transferDate]);
    sheet.addRow([
      'Ngày nhận',
      isReturned ? 'Không nhận (đã hoàn trả kho nguồn)' : currentTransfer.receiveDate || 'Chưa nhận',
    ]);
    sheet.addRow([]);
    sheet.addRow([
      'Mã SP',
      'Tên sản phẩm',
      'Lô',
      'HSD',
      'SL gửi',
      'SL nhận tốt',
      'SL hỏng (cách ly)',
      'SL thiếu',
      'Lý do chênh lệch',
      ...(isOwner ? ['Đơn giá', 'Thành tiền'] : []),
    ]);
    currentTransfer.items.forEach((item) => {
      const recv = item.receivedQty ?? 0;
      const dmg = item.damagedQty ?? 0;
      const shortage = currentTransfer.status === 'Completed' && !isReturned
        ? Math.max(0, item.sentQty - recv - dmg)
        : 0;
      sheet.addRow([
        item.productCode,
        item.productName,
        item.batchNumber ?? '',
        item.expiryDate ? formatDateVN(item.expiryDate, '') : '',
        item.sentQty,
        recv,
        dmg,
        shortage,
        item.note ?? '',
        ...(isOwner ? [item.unitPrice, item.amount] : []),
      ]);
    });
    sheet.getRow(8).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 22; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTransfer.transferCode}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const isTransit = currentTransfer.status === 'InTransit';
  const isSourceBranch = user?.branchId === currentTransfer.fromBranchId;
  const isDestinationBranch = user?.branchId === currentTransfer.toBranchId;
  const canOperateSource = isOwner || isSourceBranch;
  const canOperateDestination = isOwner || isDestinationBranch;

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

  const totalSent = currentTransfer.items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalReceivedGood = currentTransfer.items.reduce((sum, it) => sum + (it.receivedQty ?? 0), 0);
  const totalDamaged = currentTransfer.items.reduce((sum, it) => sum + (it.damagedQty ?? 0), 0);
  const totalShortage = currentTransfer.items.reduce(
    (sum, it) => sum + Math.max(0, it.sentQty - (it.receivedQty ?? 0) - (it.damagedQty ?? 0)),
    0
  );

  const formatVnd = (amount: number): string => `${amount.toLocaleString('vi-VN')} đ`;

  const renderStatus = (transfer: TransferOrder) => {
    if (transfer.status === 'Completed') {
      if (transfer.completionResult === 'Returned') {
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={13} /> Đã hoàn trả kho nguồn
          </span>
        );
      }
      if (transfer.completionResult === 'ReceivedWithDiscrepancy' || transfer.hasDiscrepancy) {
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              whiteSpace: 'nowrap',
            }}
          >
            <AlertTriangle size={13} /> Hoàn tất có chênh lệch
          </span>
        );
      }
      return (
        <span className="transfer-status-text received">
          <CheckCircle size={13} /> Hoàn tất
        </span>
      );
    }

    switch (transfer.status) {
      case 'Draft':
        return (
          <span className="transfer-status-text draft">
            <Clock size={13} /> Phiếu tạm
          </span>
        );
      case 'Pending':
        return (
          <span className="transfer-status-text pending">
            <Clock size={13} /> Chờ xử lý
          </span>
        );
      case 'InTransit':
        return (
          <span className="transfer-status-text transit">
            <Truck size={13} /> Đang chuyển
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

  const tableColSpan =
    (showReconciliationColumns ? 7 : 3) + (isOwner ? 2 : 0);

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
            maxWidth: 1060,
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
          {/* 1. Top Summary Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              flexWrap: 'nowrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px', minWidth: 0, flex: 1 }}>
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
              {isOwner && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {formatVnd(currentTransfer.totalAmount)}
                </span>
              )}
              {renderStatus(currentTransfer)}
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
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Đóng (X)"
              aria-label="Đóng"
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
              Chi tiết phiếu điều chuyển
            </div>
          </div>

          {/* 3. Modal Body (Scrollable) */}
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {actionError && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
                {actionError}
              </div>
            )}
            {isReturnPromptOpen && (
              <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                  Xác nhận hoàn trả hàng về kho nguồn
                </div>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Nhập lý do hoàn trả (bắt buộc)..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary-white" disabled={isSubmittingAction} onClick={() => setIsReturnPromptOpen(false)}>Hủy</button>
                  <button type="button" className="btn-primary-teal" disabled={isSubmittingAction} onClick={() => void handleConfirmReturnToSource()}>Xác nhận hoàn trả</button>
                </div>
              </div>
            )}

            {/* Header thông tin phiếu */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {currentTransfer.transferCode}
                </h2>
                <span
                  style={{
                    color: isReturned ? '#6d28d9' : isDiscrepancy ? '#c2410c' : '#0F766E',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  [{getTransferStatusDisplayLabel(currentTransfer)}]
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Người tạo: <b>{currentTransfer.createdBy}</b>
              </div>
            </div>

            {currentTransfer.history && currentTransfer.history.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Lịch sử xử lý</h3>
                {currentTransfer.history.map((entry) => (
                  <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '145px 1fr', gap: 10, padding: '7px 0', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>{formatDateTimeVN(entry.createdAt)}</span>
                    <span>
                      <b>{TRANSFER_ACTION_LABELS[entry.action] || entry.action}</b> ·{' '}
                      {entry.fromStatus ? (TRANSFER_STATUS_LABELS[entry.fromStatus] || entry.fromStatus) : 'Khởi tạo'} →{' '}
                      {TRANSFER_STATUS_LABELS[entry.toStatus] || entry.toStatus}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
                <div style={{ fontSize: 12, color: isReturned ? '#6d28d9' : '#64748b', fontWeight: isReturned ? 600 : 400, marginTop: 2 }}>
                  {isReturned
                    ? 'Không nhận (đã hoàn trả kho nguồn)'
                    : currentTransfer.receiveDate
                      ? currentTransfer.receiveDate
                      : `Dự kiến: ${currentTransfer.expectedDeliveryDate ? formatDateVN(currentTransfer.expectedDeliveryDate) : 'Chưa cập nhật'}`}
                </div>
              </div>
            </div>

            {/* Tổng kết chênh lệch nếu có */}
            {isDiscrepancy && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#9a3412',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                  <AlertTriangle size={16} />
                  <span>Tổng kết chênh lệch kiểm nhận</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>SL gửi: <b>{totalSent}</b></span>
                  <span>SL nhận tốt: <b style={{ color: '#15803d' }}>{totalReceivedGood}</b></span>
                  <span>SL hỏng (cách ly): <b style={{ color: '#dc2626' }}>{totalDamaged}</b></span>
                  <span>SL thiếu: <b style={{ color: '#c2410c' }}>{totalShortage}</b></span>
                </div>
              </div>
            )}

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
                    <th style={{ width: 120 }}>Mã hàng</th>
                    <th>Tên hàng</th>
                    <th style={{ width: 90, textAlign: 'center' }}>SL gửi</th>
                    {showReconciliationColumns && (
                      <>
                        <th style={{ width: 95, textAlign: 'center' }}>SL nhận tốt</th>
                        <th style={{ width: 115, textAlign: 'center' }}>SL hỏng (cách ly)</th>
                        <th style={{ width: 85, textAlign: 'center' }}>SL thiếu</th>
                        <th style={{ minWidth: 160 }}>Lý do chênh lệch</th>
                      </>
                    )}
                    {isOwner && <th style={{ width: 130, textAlign: 'right' }}>Giá chuyển/nhận</th>}
                    {isOwner && <th style={{ width: 140, textAlign: 'right' }}>Thành tiền chuyển</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it: TransferItem) => {
                    const recvQty = it.receivedQty ?? 0;
                    const dmgQty = it.damagedQty ?? 0;
                    const shortage = Math.max(0, it.sentQty - recvQty - dmgQty);
                    const lineHasIssue = showReconciliationColumns && (dmgQty > 0 || shortage > 0);
                    return (
                      <tr key={it.id} style={lineHasIssue ? { backgroundColor: '#fffbeb' } : undefined}>
                        <td>
                          <span className="transfer-link">{it.productCode}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                          {it.batchNumber && (
                            <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 2 }}>
                              Lô: {it.batchNumber} &bull; HSD: {formatDateVN(it.expiryDate)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
                          {it.sentQty}
                        </td>
                        {showReconciliationColumns && (
                          <>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>
                              {recvQty}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: dmgQty > 0 ? '#dc2626' : '#64748b' }}>
                              {dmgQty}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: shortage > 0 ? '#c2410c' : '#64748b' }}>
                              {shortage}
                            </td>
                            <td style={{ fontSize: 12.5, color: it.note ? '#9a3412' : '#94a3b8' }}>
                              {it.note || '—'}
                            </td>
                          </>
                        )}
                        {isOwner && (
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {formatVnd(it.unitPrice)}
                          </td>
                        )}
                        {isOwner && (
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E', whiteSpace: 'nowrap' }}>
                            {formatVnd(it.amount)}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={tableColSpan} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
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
                gridTemplateColumns: '1fr 340px',
                gap: 24,
                alignItems: 'start',
                paddingTop: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {currentTransfer.note ? `Ghi chú chuyển: ${currentTransfer.note}` : 'Chưa có ghi chú chuyển'}
                </div>
                {currentTransfer.discrepancyNote && (
                  <div
                    style={{
                      fontSize: 13,
                      color: isReturned ? '#5b21b6' : '#b45309',
                      backgroundColor: isReturned ? '#f5f3ff' : '#fffbeb',
                      border: `1px solid ${isReturned ? '#ddd6fe' : '#fde68a'}`,
                      borderRadius: 10,
                      padding: '8px 12px',
                    }}
                  >
                    {isReturned ? 'Lý do hoàn trả kho nguồn' : 'Ghi chú nhận / chênh lệch'}: {currentTransfer.discrepancyNote}
                  </div>
                )}
                {currentTransfer.cancelReason && (
                  <div style={{ fontSize: 13, color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px' }}>
                    Lý do hủy: {currentTransfer.cancelReason}
                  </div>
                )}
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
                  Tổng SL gửi: <b style={{ fontSize: 15 }}>{totalSent}</b>
                </div>
                {showReconciliationColumns && (
                  <>
                    <div>
                      Tổng SL nhận tốt: <b style={{ color: '#15803d' }}>{totalReceivedGood}</b>
                    </div>
                    {totalDamaged > 0 && (
                      <div>
                        Tổng SL hỏng (cách ly): <b style={{ color: '#dc2626' }}>{totalDamaged}</b>
                      </div>
                    )}
                    {totalShortage > 0 && (
                      <div>
                        Tổng SL thiếu: <b style={{ color: '#c2410c' }}>{totalShortage}</b>
                      </div>
                    )}
                  </>
                )}
                {isOwner && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                    Tổng giá trị chuyển:&nbsp;
                    <b style={{ fontSize: 17, color: '#0F766E', whiteSpace: 'nowrap' }}>
                      {formatVnd(currentTransfer.totalAmount)}
                    </b>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Bottom Toolbar */}
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
              {(currentTransfer.status === 'Draft' || currentTransfer.status === 'Pending') && canOperateSource && (
                <button
                  type="button"
                  className="btn-secondary-white"
                  disabled={isSubmittingAction}
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
              {currentTransfer.status === 'Draft' && isOwner ? (
                <button type="button" className="btn-primary-teal" disabled={isSubmittingAction} onClick={() => void applyAction('submit')}>
                  <ExternalLink size={15} /> Gửi phiếu
                </button>
              ) : currentTransfer.status === 'Pending' && canOperateSource ? (
                <button type="button" className="btn-primary-teal" disabled={isSubmittingAction} onClick={() => void applyAction('dispatch')}>
                  <Truck size={15} /> Xác nhận xuất
                </button>
              ) : isTransit ? (
                <>
                  {canOperateSource && (
                    <button type="button" className="btn-secondary-white" disabled={isSubmittingAction} onClick={() => void handleReturnToSource()}>
                      <Truck size={15} /> Hàng đã về kho nguồn
                    </button>
                  )}
                  {canOperateDestination && (
                    <button
                      type="button"
                      className="btn-primary-teal"
                      onClick={() => {
                        onClose();
                        navigate(`${transferBasePath}/${currentTransfer.id}/receive`);
                      }}
                    >
                      <CheckCircle size={15} /> Nhận hàng
                    </button>
                  )}
                </>
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
