import { useState, useMemo, useRef, useEffect, useCallback, type FC } from 'react';
import { Plus } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { ConfirmDialog } from '../../../components/common';
import { PromotionFilterBar } from '../components/promotions/PromotionFilterBar';
import { PromotionTable } from '../components/promotions/PromotionTable';
import { PromotionModal } from '../components/promotions/PromotionModal';
import { promotionApi, type PromotionDto } from '../api/promotionApi';
import { employeeApi } from '../../employee/api/employeeApi';
import type { PromotionItem, PromotionFilterState, PromotionType, PromotionStatus } from '../types/promotion.types';
import '../promotion.css';

export const PromotionListPage: FC = () => {
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [filter, setFilter] = useState<PromotionFilterState>({
    searchTerm: '',
    type: 'ALL',
    status: 'ALL',
    branch: 'ALL',
  });
  const [codeFilter, setCodeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);
  const [deleteTargetPromo, setDeleteTargetPromo] = useState<PromotionItem | null>(null);

  useEffect(() => {
    employeeApi.getBranches().then((list) => {
      if (Array.isArray(list)) {
        setDbBranches(list.map((b) => ({ id: b.id, name: b.name })));
      }
    }).catch(() => {});

    // Đồng bộ chi nhánh đang chọn từ TopNav (mtgrms_active_branch & event mtgrms:branch-changed)
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const branch = customEvent.detail;
      if (branch) {
        setFilter((prev) => ({
          ...prev,
          branch: branch.id === 'ALL' ? 'ALL' : (branch.name || branch.id),
        }));
      }
    };

    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) {
        const branch = JSON.parse(stored);
        if (branch) {
          setFilter((prev) => ({
            ...prev,
            branch: branch.id === 'ALL' ? 'ALL' : (branch.name || branch.id),
          }));
        }
      }
    } catch {
      // fallback
    }

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, []);

  const branchNames = useMemo(() => dbBranches.map((b) => b.name), [dbBranches]);
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    dbBranches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [dbBranches]);

  const mapDtoToItem = useCallback((dto: PromotionDto): PromotionItem => {
    let parsedTiers: any[] | null = null;
    let cleanDescription = dto.description || '';
    if (dto.description && dto.description.includes('[TIERS_JSON]')) {
      const match = dto.description.match(/\[TIERS_JSON\]([\s\S]*?)\[\/TIERS_JSON\]/);
      if (match && match[1]) {
        try {
          parsedTiers = JSON.parse(match[1]);
          cleanDescription = dto.description.replace(/\[TIERS_JSON\][\s\S]*?\[\/TIERS_JSON\]/g, '').trim();
        } catch (e) {
          console.warn('Failed to parse tiers from description:', e);
        }
      }
    }

    let fallbackTiers: any[] = [];
    if (!parsedTiers && dto.conditions?.length) {
      if (dto.type === 'BUY_X_GET_Y') {
        const buyCond = dto.conditions.find((c) => c.productRole === 'BUY');
        const giftConds = dto.conditions.filter((c) => c.productRole === 'GIFT');
        const targetGiftConds = giftConds.length > 0 ? giftConds : dto.conditions;
        fallbackTiers = targetGiftConds.map((c, i) => {
          let unit = 'Cái';
          if (c.note && c.note.startsWith('ĐVT: ')) {
            unit = c.note.replace('ĐVT: ', '').trim();
          }
          return {
            id: c.id || `tier-${i}`,
            tierLevel: i + 1,
            discountType: 'PERCENT' as const,
            discountValue: 0,
            buyProductId:
              buyCond?.productId && buyCond.productId !== '00000000-0000-0000-0000-000000000000'
                ? buyCond.productId
                : undefined,
            buyProductName: buyCond?.productName,
            requiredQty: buyCond?.minQty || c.minQty || 1,
            giftProductId:
              c.productId && c.productId !== '00000000-0000-0000-0000-000000000000' ? c.productId : undefined,
            giftProductName: c.productName,
            giftUnit: unit,
            giftQty: buyCond ? c.minQty || 1 : 1,
          };
        });
      } else {
        fallbackTiers = dto.conditions.map((c, i) => {
          let unit = 'Cái';
          if (c.note && c.note.startsWith('ĐVT: ')) {
            unit = c.note.replace('ĐVT: ', '').trim();
          }
          return {
            id: c.id || `tier-${i}`,
            tierLevel: i + 1,
            minOrderValue: dto.minOrderValue,
            discountType: (dto.discountValue <= 100 ? 'PERCENT' : 'FIXED_AMOUNT') as 'PERCENT' | 'FIXED_AMOUNT',
            discountValue: c.discountValue ?? dto.discountValue,
            maxDiscount: dto.maxDiscountAmount,
            requiredQty: c.minQty,
            giftProductId:
              c.productId && c.productId !== '00000000-0000-0000-0000-000000000000' ? c.productId : undefined,
            giftProductName: c.productName,
            giftUnit: unit,
            giftQty: c.minQty,
          };
        });
      }
    }

    const tiers = parsedTiers && parsedTiers.length > 0
      ? parsedTiers
      : fallbackTiers.length > 0
      ? fallbackTiers
      : [
          {
            id: `tier-1`,
            tierLevel: 1,
            minOrderValue: dto.minOrderValue,
            discountType: (dto.discountValue <= 100 ? 'PERCENT' : 'FIXED_AMOUNT') as 'PERCENT' | 'FIXED_AMOUNT',
            discountValue: dto.discountValue,
            maxDiscount: dto.maxDiscountAmount,
            giftUnit: 'Cái',
          },
        ];

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

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const start = toLocalDateStr(dto.startDate);
    const end = toLocalDateStr(dto.endDate);

    let computedStatus: PromotionStatus = 'ACTIVE';
    if (end && today > end) {
      computedStatus = 'EXPIRED';
    } else if (!dto.isActive) {
      computedStatus = 'PAUSED';
    } else if (start && today < start) {
      computedStatus = 'UPCOMING';
    } else {
      computedStatus = 'ACTIVE';
    }

    const branches = dto.targetBranches
      ? dto.targetBranches.split(',').map((b: string) => b.trim()).filter(Boolean)
      : ['ALL'];

    return {
      id: dto.id,
      code: dto.promotionCode,
      name: dto.promotionName,
      type: (dto.type as PromotionType) || 'ORDER_DISCOUNT',
      startDate: start,
      endDate: end,
      status: computedStatus,
      isActive: Boolean(dto.isActive),
      branches,
      tiers,
      usageCount: dto.usedCount,
      budgetLimit: dto.budgetLimit,
      totalDiscountGiven: dto.totalDiscountGiven,
      description: cleanDescription,
      createdAt: dto.createdAt?.slice(0, 10) || '',
    };
  }, []);

  const loadPromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await promotionApi.getPromotions({
        searchTerm: filter.searchTerm || undefined,
        type: filter.type !== 'ALL' ? filter.type : undefined,
        status: filter.status !== 'ALL' ? filter.status : undefined,
      });
      if (res?.items) {
        setPromotions(res.items.map(mapDtoToItem));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách khuyến mãi:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter.searchTerm, filter.type, filter.status, mapDtoToItem]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

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

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((item) => {
      if (codeFilter.trim()) {
        const qCode = codeFilter.trim().toLowerCase();
        if (!item.code.toLowerCase().includes(qCode)) return false;
      }
      // Search
      if (filter.searchTerm.trim()) {
        const query = filter.searchTerm.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        if (!matchCode && !matchName) return false;
      }
      // Type
      if (filter.type !== 'ALL' && item.type !== filter.type) {
        return false;
      }
      // Status
      if (filter.status !== 'ALL' && item.status !== filter.status) {
        return false;
      }
      // Branch
      if (filter.branch !== 'ALL' && !item.branches.includes('ALL')) {
        const filterStr = filter.branch.toLowerCase();
        const matchedBranchObj = dbBranches.find(
          (b) => b.id.toLowerCase() === filterStr || b.name.toLowerCase().includes(filterStr) || filterStr.includes(b.name.toLowerCase())
        );
        const branchIdsToMatch = [filterStr];
        const branchNamesToMatch = [filterStr];
        if (matchedBranchObj) {
          branchIdsToMatch.push(matchedBranchObj.id.toLowerCase());
          branchNamesToMatch.push(matchedBranchObj.name.toLowerCase());
        }

        const matchesBranch = item.branches.some((b) => {
          const bLower = b.toLowerCase();
          if (bLower === 'all') return true;
          // Direct ID or name match
          if (branchIdsToMatch.includes(bLower)) return true;
          if (branchNamesToMatch.some((name) => bLower.includes(name) || name.includes(bLower))) return true;
          // Look up mapped name if b is an ID
          const mappedName = branchMap.get(b)?.toLowerCase();
          if (mappedName && branchNamesToMatch.some((name) => mappedName.includes(name) || name.includes(mappedName))) return true;
          return false;
        });
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [promotions, filter, codeFilter, dbBranches, branchMap]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PromotionItem) => {
    setEditingPromo(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string) => {
    const target = promotions.find((p) => p.id === id);
    if (!target) return;
    if (target.status === 'EXPIRED') {
      showToast('Chương trình đã hết hạn, không thể thay đổi trạng thái.', 'error');
      return;
    }
    try {
      const serverActive = await promotionApi.togglePromotionStatus(id);
      setPromotions((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const nextActive = typeof serverActive === 'boolean' ? serverActive : !item.isActive;
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let nextStatus: PromotionStatus = 'ACTIVE';
            if (item.endDate && today > item.endDate) {
              nextStatus = 'EXPIRED';
            } else if (!nextActive) {
              nextStatus = 'PAUSED';
            } else if (item.startDate && today < item.startDate) {
              nextStatus = 'UPCOMING';
            } else {
              nextStatus = 'ACTIVE';
            }
            showToast(
              nextActive
                ? `Đã kích hoạt chương trình "${item.name}"!`
                : `Đã tạm dừng chương trình "${item.name}"!`,
              'info'
            );
            return { ...item, isActive: nextActive, status: nextStatus };
          }
          return item;
        })
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Không thể cập nhật trạng thái chương trình khuyến mãi.';
      showToast(errMsg, 'error');
    }
  };

  const handleDelete = (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    if (!promo) return;
    if (promo.status === 'ACTIVE') {
      showToast('Không thể xóa chương trình đang chạy. Hãy tạm ngưng chương trình trước.', 'error');
      return;
    }
    setDeleteTargetPromo(promo);
  };

  const confirmDeletePromo = async () => {
    if (!deleteTargetPromo) return;
    const target = deleteTargetPromo;
    setDeleteTargetPromo(null);
    try {
      await promotionApi.deletePromotion(target.id);
    } catch {
      showToast('Không thể xóa chương trình. Vui lòng kiểm tra trạng thái và thử lại.', 'error');
      return;
    }
    setPromotions((prev) => prev.filter((item) => item.id !== target.id));
    showToast(`Đã xóa chương trình "${target.name}" thành công!`, 'warning');
  };

  const handleSavePromo = async (savedPromo: PromotionItem) => {
    try {
      const firstTier = savedPromo.tiers[0];
      const discountVal = firstTier ? firstTier.discountValue : 0;
      const minOrderVal = firstTier ? (firstTier.minOrderValue || 0) : 0;
      const maxDiscount = firstTier ? firstTier.maxDiscount : undefined;

      const conditions: Array<{
        productId: string;
        productName?: string;
        productRole: 'BUY' | 'GIFT' | 'DISCOUNT';
        minQty: number;
        discountValue?: number;
        note?: string;
      }> = [];

      if (savedPromo.type === 'BUY_X_GET_Y') {
        for (const [idx, t] of (savedPromo.tiers || []).entries()) {
          if (t.buyProductId && t.buyProductId !== '00000000-0000-0000-0000-000000000000') {
            conditions.push({
              productId: t.buyProductId,
              productName: t.buyProductName,
              productRole: 'BUY',
              minQty: t.requiredQty || 1,
              discountValue: 0,
            });
          }
          if (t.giftProductId && t.giftProductId !== '00000000-0000-0000-0000-000000000000') {
            conditions.push({
              productId: t.giftProductId,
              productName: t.giftProductName || `Quà tặng bậc ${idx + 1}`,
              productRole: 'GIFT',
              minQty: t.giftQty || 1,
              discountValue: 0,
              note: t.giftUnit ? `ĐVT: ${t.giftUnit}` : undefined,
            });
          }
        }
      }

      if (savedPromo.type === 'PRODUCT_DISCOUNT') {
        for (const t of savedPromo.tiers) {
          if (!t.buyProductId) throw new Error('Phải chọn sản phẩm giảm giá');
          conditions.push({ productId: t.buyProductId, productName: t.buyProductName, productRole: 'DISCOUNT', minQty: 1, discountValue: t.discountValue, note: t.discountType });
        }
      }
      // Serialize tiers into description metadata so all tiers persist across DB reloads
      const tiersJson = JSON.stringify(savedPromo.tiers || []);
      const cleanDesc = (savedPromo.description || '').replace(/\[TIERS_JSON\][\s\S]*?\[\/TIERS_JSON\]/g, '').trim();
      const descriptionWithTiers = cleanDesc ? `${cleanDesc}\n[TIERS_JSON]${tiersJson}[/TIERS_JSON]` : `[TIERS_JSON]${tiersJson}[/TIERS_JSON]`;

      const isStillActive = editingPromo
        ? (savedPromo.isActive ?? (savedPromo.status !== 'PAUSED'))
        : (savedPromo.isActive ?? true);
      const effectiveStartDate = savedPromo.startDate ? `${savedPromo.startDate}T00:00:00+07:00` : new Date().toISOString();
      const effectiveEndDate = savedPromo.endDate ? `${savedPromo.endDate}T23:59:59+07:00` : new Date().toISOString();

      if (editingPromo) {
        await promotionApi.updatePromotion(savedPromo.id, {
          promotionName: savedPromo.name,
          type: savedPromo.type,
          discountValue: discountVal,
          minOrderValue: minOrderVal,
          maxDiscountAmount: maxDiscount,
          usageLimit: undefined,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          isActive: isStillActive,
          description: descriptionWithTiers,
          targetBranches: savedPromo.branches.join(','),
          budgetLimit: savedPromo.budgetLimit,
          conditions: conditions.length > 0 ? conditions : undefined,
        });
      } else {
        await promotionApi.createPromotion({
          promotionCode: savedPromo.code,
          promotionName: savedPromo.name,
          type: savedPromo.type,
          discountValue: discountVal,
          minOrderValue: minOrderVal,
          maxDiscountAmount: maxDiscount,
          usageLimit: undefined,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          isActive: isStillActive,
          description: descriptionWithTiers,
          targetBranches: savedPromo.branches.join(','),
          budgetLimit: savedPromo.budgetLimit,
          conditions: conditions.length > 0 ? conditions : undefined,
        });
      }
      await loadPromotions();
      setIsModalOpen(false);
      setEditingPromo(null);
      showToast(`Đã lưu chương trình "${savedPromo.name}" thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi lưu chương trình khuyến mãi:', err);
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu chương trình khuyến mãi!', 'error');
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
      {/* Compact Standard Header */}
      <div className="so-list-header" style={{ flexShrink: 0, marginBottom: 12 }}>
        <h1 className="so-list-title">Quản Lý Khuyến Mãi &amp; Ưu Đãi</h1>
        <div className="so-list-header-actions">
          <button onClick={handleOpenCreate} className="btn-primary-pill">
            <Plus className="w-4 h-4" />
            <span>Tạo mới chương trình</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ flexShrink: 0 }}>
        <PromotionFilterBar
          filter={filter}
          onFilterChange={setFilter}
          onRefresh={loadPromotions}
          codeTerm={codeFilter}
          onCodeTermChange={setCodeFilter}
        />
      </div>

      {/* Table */}
      <PromotionTable
        promotions={filteredPromotions}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        branchMap={branchMap}
      />

      {/* Create / Edit Modal */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePromo}
        editingPromo={editingPromo}
        branches={branchNames}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetPromo)}
        title="Xóa chương trình khuyến mãi"
        message={`Bạn có chắc chắn muốn xóa chương trình "${deleteTargetPromo?.name || ''}" (${deleteTargetPromo?.code || ''})? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa chương trình"
        variant="danger"
        onConfirm={confirmDeletePromo}
        onCancel={() => setDeleteTargetPromo(null)}
      />
    </div>
  );
};
