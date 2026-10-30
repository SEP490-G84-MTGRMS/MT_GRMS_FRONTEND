import { useState, useMemo, useRef, type FC } from 'react';
import {
  Ticket,
  Plus,
  Search,
  RotateCw,
  X,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { VoucherBatchTable } from '../components/vouchers/VoucherBatchTable';
import { VoucherBatchModal } from '../components/vouchers/VoucherBatchModal';
import { GenerateCodesModal } from '../components/vouchers/GenerateCodesModal';
import { INITIAL_VOUCHER_BATCHES } from '../mock/promotionMockData';
import type {
  VoucherBatchItem,
  VoucherFilterState,
  VoucherCodeItem,
} from '../types/promotion.types';
import '../promotion.css';

export const VoucherListPage: FC = () => {
  const [batches, setBatches] = useState<VoucherBatchItem[]>(INITIAL_VOUCHER_BATCHES);
  const [filter, setFilter] = useState<VoucherFilterState>({
    searchTerm: '',
    discountType: 'ALL',
    status: 'ALL',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<VoucherBatchItem | null>(null);
  const [generateTargetBatch, setGenerateTargetBatch] = useState<VoucherBatchItem | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Filtered
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (filter.searchTerm.trim()) {
        const query = filter.searchTerm.toLowerCase();
        const matchCode = b.batchCode.toLowerCase().includes(query);
        const matchName = b.name.toLowerCase().includes(query);
        const matchPrefix = b.prefix.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchPrefix) return false;
      }
      if (filter.discountType !== 'ALL' && b.discountType !== filter.discountType) {
        return false;
      }
      if (filter.status !== 'ALL' && b.status !== filter.status) {
        return false;
      }
      return true;
    });
  }, [batches, filter]);

  const handleToggleBatchStatus = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          const nextStatus = b.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          showToast(
            nextStatus === 'ACTIVE'
              ? `Đã kích hoạt lưu hành đợt "${b.name}"!`
              : `Đã tạm dừng đợt "${b.name}"!`,
            'info'
          );
          return {
            ...b,
            status: nextStatus,
          };
        }
        return b;
      })
    );
  };

  const handleOpenCreate = () => {
    setEditingBatch(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (batch: VoucherBatchItem) => {
    setEditingBatch(batch);
    setIsCreateModalOpen(true);
  };

  const handleDeleteBatch = (batchId: string) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa đợt voucher "${target.name}"?`)) {
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      showToast(`Đã xóa đợt voucher "${target.name}" thành công!`);
    }
  };

  const handleSaveBatch = (savedBatch: VoucherBatchItem) => {
    if (editingBatch) {
      setBatches((prev) =>
        prev.map((b) => (b.id === savedBatch.id ? savedBatch : b))
      );
      showToast(`Đã cập nhật đợt voucher "${savedBatch.name}" thành công!`);
    } else {
      setBatches((prev) => [savedBatch, ...prev]);
      showToast(`Đã phát hành đợt voucher "${savedBatch.name}" thành công!`);
    }
    setIsCreateModalOpen(false);
    setEditingBatch(null);
  };

  const handleGenerateCodes = (batchId: string, additionalCodes: VoucherCodeItem[]) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          return {
            ...b,
            totalQuantity: b.totalQuantity + additionalCodes.length,
            codes: [...b.codes, ...additionalCodes],
          };
        }
        return b;
      })
    );
    showToast(`Đã sinh thêm ${additionalCodes.length} mã voucher mới!`);
  };

  return (
    <div className="promotion-page">
      {/* Shared AdminToast */}
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}

      {/* Top Header */}
      <div className="promotion-topbar">
        <div className="promotion-topbar-title">
          <div className="promotion-topbar-icon">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="promotion-topbar-text">
            <h1>Quản Lý Voucher & Coupon</h1>
            <p>Phát hành theo đợt, tạo mã hàng loạt và theo dõi tỷ lệ sử dụng mã ưu đãi</p>
          </div>
        </div>

        <div className="promotion-topbar-actions">
          <button onClick={handleOpenCreate} className="btn-primary-pill">
            <Plus className="w-4 h-4" />
            <span>Tạo mới đợt phát hành</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="promotion-filter-bar">
        <div className="promotion-filter-left">
          <div className="promotion-search-box">
            <Search className="w-4 h-4 promotion-search-icon" />
            <input
              type="text"
              value={filter.searchTerm}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
              placeholder="Tìm theo tên đợt, mã đợt, tiền tố prefix..."
              className="promotion-search-input"
            />
            {filter.searchTerm && (
              <button
                onClick={() => setFilter({ ...filter, searchTerm: '' })}
                className="promotion-clear-btn"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filter.discountType}
            onChange={(e) => setFilter({ ...filter, discountType: e.target.value })}
            className="promotion-select"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="FIXED_AMOUNT">Giảm tiền mặt (VNĐ)</option>
            <option value="PERCENT">Giảm phần trăm (%)</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="promotion-select"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang lưu hành</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>

          <button
            onClick={() => setBatches(INITIAL_VOUCHER_BATCHES)}
            className="btn-secondary-pill"
            title="Tải lại dữ liệu"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Batch Table with Codes Accordion */}
      <VoucherBatchTable
        batches={filteredBatches}
        onOpenGenerateCodes={(batch) => setGenerateTargetBatch(batch)}
        onToggleBatchStatus={handleToggleBatchStatus}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteBatch}
      />

      {/* Create / Edit Batch Modal */}
      <VoucherBatchModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBatch(null);
        }}
        onSave={handleSaveBatch}
        editingBatch={editingBatch}
      />

      {/* Generate Extra Codes Modal */}
      <GenerateCodesModal
        isOpen={!!generateTargetBatch}
        onClose={() => setGenerateTargetBatch(null)}
        batch={generateTargetBatch}
        onGenerate={handleGenerateCodes}
      />
    </div>
  );
};
