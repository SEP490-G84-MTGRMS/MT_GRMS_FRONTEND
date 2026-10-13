import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  Truck,
  ShieldCheck,
  CheckCircle,
  Clock,
  Ban,
  FileText,
} from 'lucide-react';
import type { TransferOrder, TransferStatus } from '../types';
import { INITIAL_BRANCHES, INITIAL_TRANSFERS } from '../services/mockData';
import { TransferFilterSidebar } from '../components/TransferFilterSidebar';
import { ImportTransferExcelModal } from '../components/ImportTransferExcelModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const TransferListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [transfers, setTransfers] = useState<TransferOrder[]>(INITIAL_TRANSFERS);
  const [branches] = useState(INITIAL_BRANCHES);

  // User role & current branch context (BR-SEC-02 simulation)
  const [userRole, setUserRole] = useState<'StoreOwner' | 'Employee'>('StoreOwner');
  const [currentBranchId, setCurrentBranchId] = useState<string>('1'); // Chi nhánh trung tâm

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
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [recvStatus, setRecvStatus] = useState<'all' | 'match' | 'mismatch'>('all');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

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
    setTimeRange('all');
    setCustomDate('');
    setRecvStatus('all');
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransfers(
      transfers.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  // Filter logic including BR-SEC-02
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // BR-SEC-02: Branch Isolation for Employee
      if (userRole === 'Employee') {
        const isRelated = t.fromBranchId === currentBranchId || t.toBranchId === currentBranchId;
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
  }, [transfers, userRole, currentBranchId, searchCode, fromBranchId, toBranchId, selectedStatuses, recvStatus]);

  const totalTransferValue = filteredTransfers.reduce((sum, t) => sum + t.totalAmount, 0);

  const renderStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="transfer-status-badge transfer-status-draft">
            <Clock size={12} /> Phiếu tạm
          </span>
        );
      case 'In-Transit':
        return (
          <span className="transfer-status-badge transfer-status-transit">
            <Truck size={12} /> Đang chuyển
          </span>
        );
      case 'Received':
        return (
          <span className="transfer-status-badge transfer-status-received">
            <CheckCircle size={12} /> Đã nhận
          </span>
        );
      case 'Cancelled':
        return (
          <span className="transfer-status-badge transfer-status-cancelled">
            <Ban size={12} /> Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* 1. Header Toolbar */}
      <div className="transfer-header-toolbar">
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

        {/* Ô tìm kiếm nhanh theo mã phiếu */}
        <div style={{ flex: 1, maxWidth: 320, position: 'relative', margin: '0 12px' }}>
          <input
            type="text"
            className="filter-input"
            style={{ paddingLeft: 34, borderRadius: 9999 }}
            placeholder="🔍 Theo mã phiếu chuyển (TRFxxxxxx)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
        </div>

        {/* Hành động chính */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* RBAC Role Toggle (BR-SEC-02 test) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} color="#0F766E" />
            <span>Vai trò:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              style={{ border: 'none', background: 'none', fontWeight: 700, color: '#0F766E', outline: 'none', cursor: 'pointer' }}
            >
              <option value="StoreOwner">Chủ chuỗi (Toàn quyền)</option>
              <option value="Employee">Nhân viên kho (Phân quyền BR-SEC-02)</option>
            </select>
            {userRole === 'Employee' && (
              <select
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                style={{ border: 'none', background: 'none', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Tại {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

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
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload size={15} /> Import file
          </button>

          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => showToast(`Đang xuất file Excel cho ${filteredTransfers.length} phiếu chuyển hàng...`)}
          >
            <Download size={15} /> Xuất file
          </button>
        </div>
      </div>

      {/* 2. Grid Body: Sidebar + Table */}
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
          recvStatus={recvStatus}
          onChangeRecvStatus={setRecvStatus}
          onResetFilters={handleResetFilters}
        />

        {/* Cột phải: Bảng dữ liệu phiếu chuyển */}
        <div className="transfer-table-wrapper">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: 13.5,
              color: '#475569',
            }}
          >
            <div>
              Hiển thị <b>{filteredTransfers.length}</b> phiếu chuyển
            </div>
            <div>
              Tổng giá trị chuyển: <b style={{ color: '#0F766E' }}>{totalTransferValue.toLocaleString()} đ</b>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                  <th style={{ width: 110, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  const isReceiving = t.status === 'In-Transit';

                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center' }}>
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
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`favorite-star-btn ${t.isFavorite ? 'active' : ''}`}
                          onClick={(e) => handleToggleFavorite(t.id, e)}
                        >
                          {t.isFavorite ? '★' : '☆'}
                        </button>
                      </td>
                      <td>
                        <span
                          className="transfer-link"
                          onClick={() => navigate(`/store-owner/transfers/${t.id}`)}
                        >
                          {t.transferCode}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>{t.transferDate}</td>
                      <td style={{ fontSize: 13, color: '#475569' }}>
                        {t.receiveDate ? (
                          t.receiveDate
                        ) : isReceiving ? (
                          <span
                            onClick={() => navigate(`/store-owner/transfers/${t.id}/receive`)}
                            style={{ color: '#0F766E', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Nhận hàng &gt;
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.fromBranchName}</td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.toBranchName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {t.totalAmount.toLocaleString()} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>{renderStatusBadge(t.status)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isReceiving ? (
                          <button
                            type="button"
                            className="btn-primary-teal"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => navigate(`/store-owner/transfers/${t.id}/receive`)}
                          >
                            Nhận hàng
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary-white"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => navigate(`/store-owner/transfers/${t.id}`)}
                          >
                            Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
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
        </div>
      </div>

      {/* Modal Import Excel */}
      <ImportTransferExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmUpload={(fileName) => {
          showToast(`Đã import thành công danh sách hàng từ file: ${fileName}`);
        }}
      />
    </div>
  );
};
