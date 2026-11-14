import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  Plus,
  Download,
  Search,
  Truck,
  CheckCircle,
  FileText,
} from 'lucide-react';
import type { Branch, TransferOrder, TransferStatus } from '../types';
import { transferService } from '../services/transferService';
import { TransferFilterSidebar } from '../components/TransferFilterSidebar';
import { TransferDetailModal } from '../components/TransferDetailModal';
import { TablePagination } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const TransferListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);

  // User role & current branch context (BR-SEC-02 simulation)
  const user = useAuthStore((state) => state.user);
  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  // Filters
  const [searchCode, setSearchCode] = useState('');
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<TransferStatus[]>([
    'Draft',
    'In-Transit',
    'Received',
    'Cancelled',
  ]);
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'custom'>('this_month');
  const [customDate, setCustomDate] = useState('');
  const [recvStatus, setRecvStatus] = useState<'all' | 'match' | 'mismatch'>('all');
  const [dateField, setDateField] = useState<'transfer' | 'receive'>('transfer');

  // Modals & Selection
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadTransfers = useCallback(() => {
    setIsLoading(true);
    if (selectedStatuses.length === 0) {
      setTransfers([]);
      setTotalItems(0);
      setIsLoading(false);
      return;
    }
    const activeStatuses = selectedStatuses.map((status) => status === 'In-Transit' ? 'InTransit' : status);
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const date = timeRange === 'this_month' && dateField === 'transfer' ? monthStart : timeRange === 'custom' && customDate ? new Date(`${customDate}T00:00:00`).toISOString() : undefined;
    transferService.list({
      page: pageIndex, pageSize, search: searchCode.trim() || undefined,
      fromBranchId: fromBranchId || undefined, toBranchId: toBranchId || undefined,
      statuses: activeStatuses.length ? activeStatuses : undefined,
      receiveStatus: recvStatus,
      fromDate: date,
      toDate: timeRange === 'custom' && customDate ? customDate : undefined,
      dateField,
    })
      .then((result) => { setTransfers(result.items); setTotalItems(result.totalItems); })
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Không tải được phiếu điều chuyển.', 'warning'))
      .finally(() => setIsLoading(false));
  }, [pageIndex, pageSize, searchCode, fromBranchId, toBranchId, selectedStatuses, timeRange, customDate, dateField, recvStatus]);

  useEffect(() => { void loadTransfers(); }, [loadTransfers]);

  useEffect(() => {
    transferService
      .branches()
      .then((data) => {
        setBranches(data);
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Không tải được danh sách chi nhánh.', 'warning');
      });
  }, []);

  useEffect(() => { setPageIndex(1); }, [searchCode, fromBranchId, toBranchId, selectedStatuses, timeRange, customDate, recvStatus, dateField]);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = (status: TransferStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const handleResetFilters = () => {
    setSearchCode('');
    setFromBranchId('');
    setToBranchId('');
    setSelectedStatuses(['Draft', 'In-Transit', 'Received', 'Cancelled']);
    setTimeRange('this_month');
    setCustomDate('');
    setRecvStatus('all');
    setDateField('transfer');
  };

  const handleToggleFavorite = (_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast('Thao tác đánh dấu yêu thích chưa được API hỗ trợ.', 'warning');
  };

  // Filter logic including BR-SEC-02
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // BR-SEC-02: Branch Isolation for Employee
      if (!isStoreOwner && user?.branchId) {
        const isRelated = t.fromBranchId === user.branchId || t.toBranchId === user.branchId;
        if (!isRelated) return false;
      }

      // Search code
      if (searchCode.trim()) {
        const kw = searchCode.trim().toLowerCase();
        if (!t.transferCode.toLowerCase().includes(kw)) return false;
      }

      // From branch
      if (fromBranchId && t.fromBranchId !== fromBranchId) return false;

      // To branch
      if (toBranchId && t.toBranchId !== toBranchId) return false;

      // Status
      if (!selectedStatuses.includes(t.status)) return false;

      // Recv status
      if (recvStatus === 'match') {
        const isAllMatch = t.items.every((it) => it.receivedQty === it.sentQty);
        if (!isAllMatch || t.status !== 'Received') return false;
      } else if (recvStatus === 'mismatch') {
        const hasMismatch = t.items.some((it) => (it.receivedQty ?? it.sentQty) < it.sentQty);
        if (!hasMismatch) return false;
      }

      return true;
    });
  }, [transfers, isStoreOwner, user?.branchId, searchCode, fromBranchId, toBranchId, selectedStatuses, recvStatus]);

  const totalTransferValue = filteredTransfers.reduce((sum, t) => sum + t.totalAmount, 0);
  const pagedTransfers = useMemo(() => {
    return filteredTransfers;
  }, [filteredTransfers]);

  const exportExcel = async () => {
    if (!filteredTransfers.length) {
      showToast('Không có phiếu chuyển để xuất.', 'warning');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Phiếu chuyển');
    sheet.addRow(['Mã phiếu', 'Ngày chuyển', 'Chi nhánh gửi', 'Chi nhánh nhận', 'Trạng thái', 'Tổng tiền']);
    filteredTransfers.forEach((transfer) => sheet.addRow([
      transfer.transferCode, transfer.transferDate, transfer.fromBranchName, transfer.toBranchName, transfer.status, transfer.totalAmount,
    ]));
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 22; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'danh-sach-phieu-chuyen.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderStatus = (status: TransferStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              whiteSpace: 'nowrap',
            }}
          >
            Phiếu tạm
          </span>
        );
      case 'In-Transit':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap',
            }}
          >
            Đang chuyển
          </span>
        );
      case 'Received':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              whiteSpace: 'nowrap',
            }}
          >
            Đã nhận
          </span>
        );
      case 'Cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              whiteSpace: 'nowrap',
            }}
          >
            Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="transfer-container">
      {/* Toast Notification */}
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Title Area bên ngoài, phía trên Header Toolbar */}
      <div className="transfer-title-area">
        <Truck size={28} color="#0F766E" />
        <h1>Chuyển hàng</h1>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 9999,
            backgroundColor: '#ccfbf1',
            color: '#0f766e',
          }}
        >
          {filteredTransfers.length} phiếu
        </span>
      </div>

      {/* 1. Header Toolbar Đồng nhất Design System (24px radius, Deep Teal) */}
      <div className="transfer-header-toolbar">


        {/* Ô tìm kiếm nhanh bo tròn dạng pill */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative', margin: '0 12px' }}>
          <input
            type="text"
            className="filter-input"
            style={{ paddingLeft: 34, borderRadius: 9999 }}
            placeholder="Theo mã phiếu chuyển (TRFxxxxxx)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
        </div>

        {/* Hành động chính bên phải */}
        <div className="transfer-header-actions">
          {/* User role and branch are taken from the authenticated session. */}

          <button
            type="button"
            className="btn-primary-teal"
            onClick={() => navigate('/store-owner/transfers/create')}
          >
            <Plus size={16} /> Chuyển hàng
          </button>

          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => void exportExcel()}
            title="Xuất file Excel"
          >
            <Download size={15} /> Xuất file
          </button>
        </div>
      </div>

      {/* 2. Main Body Grid: Sidebar (280px) + Table (1fr) */}
      <div className="transfer-grid">
        {/* Cột trái: Bộ lọc Sidebar */}
        <TransferFilterSidebar
          branches={branches}
          fromBranchId={fromBranchId}
          onChangeFromBranch={setFromBranchId}
          toBranchId={toBranchId}
          onChangeToBranch={setToBranchId}
          selectedStatuses={selectedStatuses}
          onToggleStatus={handleToggleStatus}
          timeRange={timeRange}
          onChangeTimeRange={setTimeRange}
          customDate={customDate}
          onChangeCustomDate={setCustomDate}
          dateField={dateField}
          onChangeDateField={setDateField}
          recvStatus={recvStatus}
          onChangeRecvStatus={setRecvStatus}
          onResetFilters={handleResetFilters}
        />

        {/* Cột phải: Bảng dữ liệu phiếu chuyển bo tròn 24px */}
        <div className="transfer-table-wrapper">
          {/* Summary bar */}
          <div className="transfer-table-summary-bar">
            <div>
              Hiển thị <b>{filteredTransfers.length}</b> phiếu chuyển
            </div>
            <div>
              Tổng giá trị chuyển: <b style={{ color: '#0F766E', fontSize: 14.5 }}>{totalTransferValue.toLocaleString()} đ</b>
            </div>
          </div>

          <div className="transfer-table-scroll supplier-table-scroll-container">
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredTransfers.length > 0 &&
                        selectedIds.length === filteredTransfers.length
                      }
                      onChange={() => {
                        if (selectedIds.length === filteredTransfers.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(filteredTransfers.map((t) => t.id));
                        }
                      }}
                      style={{ accentColor: '#0F766E', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: 36, textAlign: 'center' }}>★</th>
                  <th style={{ width: 140 }}>Mã chuyển hàng</th>
                  <th style={{ width: 140 }}>Ngày chuyển</th>
                  <th style={{ width: 140 }}>Ngày nhận</th>
                  <th>Từ chi nhánh</th>
                  <th>Tới chi nhánh</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Giá trị chuyển</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pagedTransfers.map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  const isReceiving = t.status === 'In-Transit';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => {
                        setSelectedTransfer(t);
                        setIsDetailModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedIds(selectedIds.filter((id) => id !== t.id));
                            } else {
                              setSelectedIds([...selectedIds, t.id]);
                            }
                          }}
                          style={{ accentColor: '#0F766E', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(t.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 15,
                            color: t.isFavorite ? '#eab308' : '#94a3b8',
                            padding: 0,
                          }}
                        >
                          {t.isFavorite ? '★' : '☆'}
                        </button>
                      </td>
                      <td>
                        <span className="transfer-link">
                          {t.transferCode}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>{t.transferDate}</td>
                      <td style={{ fontSize: 13, color: '#475569' }}>
                        {t.receiveDate ? (
                          t.receiveDate
                        ) : isReceiving ? (
                          <button
                            type="button"
                            className="btn-primary-teal"
                            style={{
                              padding: '3px 10px',
                              fontSize: 12,
                              borderRadius: 9999,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/store-owner/transfers/${t.id}/receive`);
                            }}
                          >
                            <CheckCircle size={13} /> Nhận hàng
                          </button>
                        ) : t.status === 'Draft' ? (
                          <span style={{ fontStyle: 'italic', color: '#64748b' }}>(Chưa nhận)</span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#dc2626' }}>(Đã hủy)</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.fromBranchName}</td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.toBranchName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {t.totalAmount.toLocaleString()} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>{renderStatus(t.status)}</td>
                    </tr>
                  );
                })}

                      {isLoading && <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center' }}>Đang tải phiếu...</td></tr>}
      {!isLoading && filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <FileText size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Không tìm thấy phiếu chuyển hàng nào</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Vui lòng kiểm tra lại điều kiện lọc hoặc tạo phiếu chuyển mới.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={pageIndex}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[10, 15, 20, 50]}
            onPageChange={(page) => setPageIndex(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(1);
            }}
            itemLabel="phiếu chuyển"
          />
        </div>
      </div>

      {/* Modal Pop-up Chi tiết phiếu chuyển hàng */}
      <TransferDetailModal
        isOpen={isDetailModalOpen}
        transfer={selectedTransfer}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdateTransfer={(updated) => {
          setTransfers(transfers.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTransfer(updated);
        }}
      />
    </div>
  );
};
