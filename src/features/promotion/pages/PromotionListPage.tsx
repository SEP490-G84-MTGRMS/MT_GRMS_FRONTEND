import { useState, useMemo, useRef, useEffect, useCallback, type FC } from 'react';
import { Gift, Plus } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { PromotionFilterBar } from '../components/promotions/PromotionFilterBar';
import { PromotionTable } from '../components/promotions/PromotionTable';
import { PromotionModal } from '../components/promotions/PromotionModal';
import { promotionApi, type PromotionDto } from '../api/promotionApi';
import { employeeApi } from '../../employee/api/employeeApi';
import type { PromotionItem, PromotionFilterState, PromotionType, PromotionStatus } from '../types/promotion.types';
import '../promotion.css';

export const PromotionListPage: FC = () => {
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [filter, setFilter] = useState<PromotionFilterState>({
    searchTerm: '',
    type: 'ALL',
    status: 'ALL',
    branch: 'ALL',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);

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

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const start = dto.startDate ? dto.startDate.slice(0, 10) : '';
    const end = dto.endDate ? dto.endDate.slice(0, 10) : '';

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
        const matchesBranch = item.branches.some(
          (b) => b.toLowerCase().includes(filter.branch.toLowerCase()) || filter.branch.toLowerCase().includes(b.toLowerCase())
        );
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [promotions, filter]);

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
    try {
      await promotionApi.togglePromotionStatus(id);
    } catch {
      // Ignored for offline/optimistic updates
    }
    setPromotions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextActive = !item.isActive;
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
  };

  const handleDelete = async (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    if (promo?.status === 'ACTIVE') {
      showToast('Không thể xóa chương trình đang chạy. Hãy tạm ngưng chương trình trước.', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa chương trình khuyến mãi này không?')) {
      try {
        await promotionApi.deletePromotion(id);
      } catch {
        showToast('Không thể xóa chương trình. Vui lòng kiểm tra trạng thái và thử lại.', 'error');
        return;
      }
      setPromotions((prev) => prev.filter((item) => item.id !== id));
      showToast(`Đã xóa chương trình "${promo?.name || id}" thành công!`, 'warning');
    }
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
          if (t.buyProductId) {
            conditions.push({
              productId: t.buyProductId,
              productName: t.buyProductName,
              productRole: 'BUY',
              minQty: t.requiredQty || 1,
              discountValue: 0,
            });
          }
          conditions.push({
            productId: t.giftProductId || '00000000-0000-0000-0000-000000000000',
            productName: t.giftProductName || `Quà tặng bậc ${idx + 1}`,
            productRole: 'GIFT',
            minQty: t.giftQty || 1,
            discountValue: 0,
            note: t.giftUnit ? `ĐVT: ${t.giftUnit}` : undefined,
          });
        }
      } else {
        for (const t of savedPromo.tiers || []) {
          conditions.push({
            productId: t.giftProductId || '00000000-0000-0000-0000-000000000000',
            productName: t.giftProductName,
            productRole: 'DISCOUNT',
            minQty: t.requiredQty || t.giftQty || 1,
            discountValue: t.discountValue,
            note: t.giftUnit ? `ĐVT: ${t.giftUnit}` : undefined,
          });
        }
      }

      // Serialize tiers into description metadata so all tiers persist across DB reloads
      const tiersJson = JSON.stringify(savedPromo.tiers || []);
      const cleanDesc = (savedPromo.description || '').replace(/\[TIERS_JSON\][\s\S]*?\[\/TIERS_JSON\]/g, '').trim();
      const descriptionWithTiers = cleanDesc ? `${cleanDesc}\n[TIERS_JSON]${tiersJson}[/TIERS_JSON]` : `[TIERS_JSON]${tiersJson}[/TIERS_JSON]`;

      const isStillActive = editingPromo
        ? (savedPromo.isActive ?? (savedPromo.status !== 'PAUSED'))
        : (savedPromo.isActive ?? true);
      const effectiveStartDate = savedPromo.startDate ? `${savedPromo.startDate}T00:00:00` : new Date().toISOString();
      const effectiveEndDate = savedPromo.endDate ? `${savedPromo.endDate}T23:59:59` : new Date().toISOString();

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
          conditions,
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
          conditions,
        });
      }
      await loadPromotions();
      showToast(`Đã lưu chương trình "${savedPromo.name}" thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi lưu chương trình khuyến mãi:', err);
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu chương trình khuyến mãi!', 'error');
    }
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
            <Gift className="w-6 h-6" />
          </div>
          <div className="promotion-topbar-text">
            <h1>Quản Lý Khuyến Mãi & Ưu Đãi</h1>
            <p>Thiết lập chiết khấu đơn hàng, mua X tặng Y và ưu đãi theo chi nhánh</p>
          </div>
        </div>

        <div className="promotion-topbar-actions">
          <button onClick={handleOpenCreate} className="btn-primary-pill">
            <Plus className="w-4 h-4" />
            <span>Tạo mới chương trình</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <PromotionFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={loadPromotions}
      />

      {/* Table */}
      <PromotionTable
        promotions={filteredPromotions}
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
    </div>
  );
};
