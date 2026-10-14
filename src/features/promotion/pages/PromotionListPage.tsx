import { useState, useMemo, useRef, type FC } from 'react';
import { Gift, Plus, Tag, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { PromotionKpiCards, type KpiCardItem } from '../components/common/PromotionKpiCards';
import { PromotionFilterBar } from '../components/promotions/PromotionFilterBar';
import { PromotionTable } from '../components/promotions/PromotionTable';
import { PromotionModal } from '../components/promotions/PromotionModal';
import { INITIAL_PROMOTIONS } from '../mock/promotionMockData';
import type { PromotionItem, PromotionFilterState } from '../types/promotion.types';
import '../promotion.css';

export const PromotionListPage: FC = () => {
  const [promotions, setPromotions] = useState<PromotionItem[]>(INITIAL_PROMOTIONS);
  const [filter, setFilter] = useState<PromotionFilterState>({
    searchTerm: '',
    type: 'ALL',
    status: 'ALL',
    branch: 'ALL',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);

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
      if (filter.branch !== 'ALL' && !item.branches.includes('ALL') && !item.branches.includes(filter.branch)) {
        return false;
      }
      return true;
    });
  }, [promotions, filter]);

  // KPI Calculations
  const kpiCards: KpiCardItem[] = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p.status === 'ACTIVE').length;
    const upcoming = promotions.filter((p) => p.status === 'UPCOMING').length;
    const totalDiscount = promotions.reduce((acc, p) => acc + (p.totalDiscountGiven || 0), 0);

    return [
      {
        id: 'kpi-1',
        title: 'Tổng số CTKM',
        value: total,
        subText: 'Đang quản lý trên toàn chuỗi',
        icon: <Tag className="w-5 h-5" />,
        colorClass: 'kpi-icon-teal',
      },
      {
        id: 'kpi-2',
        title: 'Đang triển khai',
        value: active,
        subText: 'Có hiệu lực tại các quầy thu ngân',
        icon: <CheckCircle2 className="w-5 h-5" />,
        colorClass: 'kpi-icon-blue',
      },
      {
        id: 'kpi-3',
        title: 'Sắp diễn ra',
        value: upcoming,
        subText: 'Đã lên lịch trong tháng',
        icon: <Clock className="w-5 h-5" />,
        colorClass: 'kpi-icon-amber',
      },
      {
        id: 'kpi-4',
        title: 'Tổng chiết khấu đã trao',
        value: `${(totalDiscount / 1000000).toFixed(1)}M đ`,
        subText: 'Giá trị ưu đãi tích lũy khách nhận',
        icon: <Sparkles className="w-5 h-5" />,
        colorClass: 'kpi-icon-purple',
      },
    ];
  }, [promotions]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PromotionItem) => {
    setEditingPromo(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    setPromotions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          showToast(
            nextStatus === 'ACTIVE'
              ? `Đã kích hoạt chương trình "${item.name}"!`
              : `Đã tạm dừng chương trình "${item.name}"!`,
            'info'
          );
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleDelete = (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    if (window.confirm('Bạn có chắc chắn muốn xóa chương trình khuyến mãi này không?')) {
      setPromotions((prev) => prev.filter((item) => item.id !== id));
      showToast(`Đã xóa chương trình "${promo?.name || id}" thành công!`, 'warning');
    }
  };

  const handleSavePromo = (savedPromo: PromotionItem) => {
    setPromotions((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPromo.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedPromo;
        return next;
      }
      return [savedPromo, ...prev];
    });
    showToast(`Đã lưu chương trình "${savedPromo.name}" thành công!`);
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

      {/* KPI Cards */}
      <PromotionKpiCards cards={kpiCards} />

      {/* Filter Bar */}
      <PromotionFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={() => setPromotions(INITIAL_PROMOTIONS)}
      />

      {/* Table */}
      <PromotionTable
        promotions={filteredPromotions}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      {/* Create / Edit Modal */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePromo}
        editingPromo={editingPromo}
      />
    </div>
  );
};
