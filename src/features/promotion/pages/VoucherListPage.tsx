import { useState, useMemo, useRef, useEffect, useCallback, type FC } from 'react';
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
import { promotionApi, type VoucherBatchDto } from '../api/promotionApi';
import type {
  VoucherBatchItem,
  VoucherFilterState,
} from '../types/promotion.types';
import '../promotion.css';

const toLocalDateStr = (raw?: string) => {
  if (!raw) return '';
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return raw.slice(0, 10);
};

export const VoucherListPage: FC = () => {
  const [batches, setBatches] = useState<VoucherBatchItem[]>([]);
  const [filter, setFilter] = useState<VoucherFilterState>({
    searchTerm: '',
    discountType: 'ALL',
    status: 'ALL',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<VoucherBatchItem | null>(null);
  const [generateTargetBatch, setGenerateTargetBatch] = useState<VoucherBatchItem | null>(null);
  const [codesRefreshSignal, setCodesRefreshSignal] = useState<{ batchId: string; version: number } | null>(null);

  const mapDtoToBatch = useCallback((dto: VoucherBatchDto): VoucherBatchItem => {
    const rawDesc = dto.description || '';
    const cleanDescription = rawDesc.replace(/\[CONFIG_JSON\][\s\S]*?\[\/CONFIG_JSON\]/gi, '').trim();

    return {
      id: dto.id,
      batchCode: dto.batchCode,
      name: dto.name,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderValue: dto.minOrderValue,
      maxDiscount: dto.maxDiscountAmount,
      totalQuantity: dto.totalQuantity,
      usedQuantity: dto.usedQuantity,
      startDate: toLocalDateStr(dto.startDate),
      endDate: toLocalDateStr(dto.endDate),
      status: dto.status,
      prefix: dto.prefix,
      description: cleanDescription,
      allowWithPromotions:
        dto.allowWithPromotions !== undefined
          ? dto.allowWithPromotions
          : rawDesc
          ? !rawDesc.includes('"allowWithPromotions":false')
          : true,
      codes: [],
    };
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const res = await promotionApi.getVoucherBatches({
        searchTerm: filter.searchTerm || undefined,
        status: filter.status !== 'ALL' ? filter.status : undefined,
      });
      if (res?.items) {
        setBatches(res.items.map(mapDtoToBatch));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách voucher từ CSDL:', err);
    }
  }, [filter.searchTerm, filter.status, mapDtoToBatch]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

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

  const handleToggleBatchStatus = async (batchId: string) => {
    try {
      await promotionApi.toggleVoucherBatchStatus(batchId);
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
    } catch {
      showToast('Không thể cập nhật trạng thái đợt voucher.', 'error');
    }
  };

  const handleOpenCreate = () => {
    setEditingBatch(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (batch: VoucherBatchItem) => {
    setEditingBatch(batch);
    setIsCreateModalOpen(true);
  };

  const handleDeleteBatch = async (batchId: string) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    if (target.status === 'ACTIVE') {
      showToast('Không thể xóa đợt voucher đang lưu hành. Hãy tạm dừng trước khi xóa.', 'error');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa đợt voucher "${target.name}"?`)) {
      try {
        await promotionApi.deleteVoucherBatch(batchId);
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
        showToast(`Đã xóa đợt voucher "${target.name}" thành công!`);
      } catch {
        showToast('Không thể xóa đợt voucher. Nếu đang chạy, hãy tạm dừng trước.', 'error');
      }
    }
  };

  const handleSaveBatch = async (savedBatch: VoucherBatchItem) => {
    try {
      const effectiveStartDate = savedBatch.startDate ? `${savedBatch.startDate}T00:00:00+07:00` : new Date().toISOString();
      const effectiveEndDate = savedBatch.endDate ? `${savedBatch.endDate}T23:59:59+07:00` : new Date().toISOString();

      if (editingBatch) {
        await promotionApi.updateVoucherBatch(savedBatch.id, {
          name: savedBatch.name,
          discountType: savedBatch.discountType,
          discountValue: savedBatch.discountValue,
          minOrderValue: savedBatch.minOrderValue,
          maxDiscountAmount: savedBatch.maxDiscount,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          description: savedBatch.description,
          allowWithPromotions: savedBatch.allowWithPromotions,
        });
        showToast(`Đã cập nhật đợt voucher "${savedBatch.name}" thành công!`);
      } else {
        await promotionApi.createVoucherBatch({
          batchCode: savedBatch.batchCode,
          name: savedBatch.name,
          discountType: savedBatch.discountType,
          discountValue: savedBatch.discountValue,
          minOrderValue: savedBatch.minOrderValue,
          maxDiscountAmount: savedBatch.maxDiscount,
          totalQuantity: savedBatch.totalQuantity,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          prefix: savedBatch.prefix,
          description: savedBatch.description,
          allowWithPromotions: savedBatch.allowWithPromotions,
        });
        showToast(`Đã phát hành đợt voucher "${savedBatch.name}" thành công!`);
      }
      await loadBatches();
      setIsCreateModalOpen(false);
      setEditingBatch(null);
    } catch (err: any) {
      console.error('Lỗi khi lưu đợt voucher:', err);
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu đợt voucher vào cơ sở dữ liệu!', 'error');
      throw err;
    }
  };

  const handleGenerateCodes = async (batchId: string, quantity: number) => {
    try {
      const target = batches.find((b) => b.id === batchId);
      const generatedCount = await promotionApi.generateVoucherCodes(batchId, quantity, target?.prefix);
      await loadBatches();
      setCodesRefreshSignal((prev) => ({
        batchId,
        version: (prev?.version ?? 0) + 1,
      }));
      showToast(
        `Đã sinh thành công ${generatedCount ?? quantity} mã voucher mới cho đợt!`
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Không thể sinh thêm mã voucher.';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  return (
    <div
      className="promotion-page"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
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

      {/* Filter Bar chuẩn StoreProductFilter */}
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div className="so-list-filter">
        <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 16px' }}>
          <div className="so-list-filter-field" style={{ flex: '1 1 280px', minWidth: 240 }}>
            <label className="so-list-filter-label">Tìm kiếm:</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={filter.searchTerm}
                onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                placeholder="Tìm theo tên đợt, mã đợt, tiền tố..."
                className="so-list-filter-input"
                style={{ width: '100%', paddingLeft: 30, paddingRight: filter.searchTerm ? 28 : 10 }}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              {filter.searchTerm && (
                <button
                  type="button"
                  onClick={() => setFilter({ ...filter, searchTerm: '' })}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="so-list-filter-field">
            <label className="so-list-filter-label">Loại ưu đãi:</label>
            <select
              value={filter.discountType}
              onChange={(e) => setFilter({ ...filter, discountType: e.target.value })}
              className={`so-list-filter-select ${filter.discountType !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="FIXED_AMOUNT">Giảm tiền mặt (VNĐ)</option>
              <option value="PERCENT">Giảm phần trăm (%)</option>
            </select>
          </div>

          <div className="so-list-filter-field">
            <label className="so-list-filter-label">Trạng thái:</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className={`so-list-filter-select ${filter.status !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang lưu hành</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
          </div>

          <div className="so-list-filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {(filter.searchTerm || filter.discountType !== 'ALL' || filter.status !== 'ALL') && (
              <button
                type="button"
                onClick={() => setFilter({ searchTerm: '', discountType: 'ALL', status: 'ALL' })}
                className="so-list-filter-reset"
                title="Đặt lại bộ lọc"
              >
                <span>Đặt lại</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadBatches}
              className="so-list-filter-search"
              title="Tải lại dữ liệu"
            >
              <RotateCw size={13} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Batch Table with Codes Accordion */}
      <VoucherBatchTable
        batches={filteredBatches}
        codesRefreshSignal={codesRefreshSignal}
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
