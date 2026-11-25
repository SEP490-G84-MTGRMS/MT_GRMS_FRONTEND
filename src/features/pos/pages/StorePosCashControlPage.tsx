import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import {
  CheckCircle2,
  Save,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Clock,
  User,
  Check,
  X,
  Sliders,
  AlertTriangle,
  Info,
  Building2,
  Search,
  RotateCcw,
} from 'lucide-react';
import { posShiftApi } from '../api/posShiftApi';
import type { ShiftCashMovementDto } from '../types/posShift.types';
import { TablePagination } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import { useAuthStore } from '../../../stores/useAuthStore';

export const StorePosCashControlPage: FC = () => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || '';

  // Chi nhánh đang chọn đồng bộ từ TopNav
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedBranchName, setSelectedBranchName] = useState<string>('Toàn hệ thống');

  // Cấu hình hạn mức
  const [threshold, setThreshold] = useState<number>(200000);
  const [shiftTotalLimit, setShiftTotalLimit] = useState<number>(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  // Toast chuẩn AdminToast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Bộ lọc & phân trang
  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PENDING_EXPENSE' | 'UNCONFIRMED_DROP'>('ALL');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [dropPage, setDropPage] = useState(1);
  const [dropPageSize, setDropPageSize] = useState(10);

  // Dữ liệu duyệt
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMovements, setPendingMovements] = useState<ShiftCashMovementDto[]>([]);
  const [unconfirmedDrops, setUnconfirmedDrops] = useState<ShiftCashMovementDto[]>([]);

  // Modal từ chối chi két
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    // Đồng bộ chi nhánh đang chọn từ TopNav
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const branch = customEvent.detail;
      if (branch) {
        setSelectedBranchId(branch.id || 'ALL');
        setSelectedBranchName(branch.name || 'Toàn hệ thống');
      }
    };

    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) {
        const branch = JSON.parse(stored);
        if (branch) {
          setSelectedBranchId(branch.id || 'ALL');
          setSelectedBranchName(branch.name || 'Toàn hệ thống');
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Tải cấu hình hạn mức
      const cfg = await posShiftApi.getCashMovementSettings();
      if (cfg) {
        setThreshold(cfg.cashOutApprovalThreshold ?? 200000);
        setShiftTotalLimit(cfg.cashOutShiftTotalLimit ?? 0);
      }

      // 2. Tải danh sách chờ duyệt theo chi nhánh (ALL => không truyền branchId để lấy toàn bộ tenant)
      const branchParam = selectedBranchId === 'ALL' ? undefined : selectedBranchId;

      const summary = await posShiftApi.getPendingMovements(branchParam);
      if (summary?.movements) {
        const pendings = summary.movements.filter(
          (m) => m.status === 'PendingApproval' || m.status === 2
        );
        const drops = summary.movements.filter(
          (m) => ((m.category === 'CASH_DRAW' || m.category === 2) && !m.isConfirmedByOwner)
        );
        setPendingMovements(pendings);
        setUnconfirmedDrops(drops);
      } else {
        setPendingMovements([]);
        setUnconfirmedDrops([]);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu kiểm soát quỹ POS:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lưu cấu hình hạn mức
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await posShiftApi.updateCashMovementSettings({
        cashOutApprovalThreshold: Number(threshold) || 0,
        cashOutShiftTotalLimit: Number(shiftTotalLimit) || 0,
      });

      // Cập nhật lưu local dự phòng offline
      if (currentTenantId) {
        const storageKey = `pos_payment_config_${currentTenantId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.cashOutApprovalThreshold = threshold;
            parsed.cashOutShiftTotalLimit = shiftTotalLimit;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch {
            // ignore malformed local cache
          }
        }
      }

      showToast('Đã lưu cấu hình hạn mức duyệt chi két thành công!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể lưu cấu hình hạn mức', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Duyệt phiếu chi
  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.approveCashMovement(id);
      showToast('Đã duyệt xuất tiền phiếu chi két thành công!', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể duyệt phiếu chi', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Từ chối phiếu chi
  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối phiếu chi!', 'warning');
      return;
    }
    setActionLoadingId(rejectingId);
    try {
      await posShiftApi.rejectCashMovement(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      showToast('Đã từ chối phiếu chi két.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể từ chối phiếu chi', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xác nhận đã nhận tiền rút két
  const handleConfirmDrop = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.confirmCashDrop(id);
      showToast('Đã xác nhận nhận đủ tiền rút két!', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể xác nhận nhận tiền rút két', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPendingMovements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return pendingMovements;
    return pendingMovements.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.createdByName || '').toLowerCase().includes(q) ||
        (m.reason || '').toLowerCase().includes(q)
    );
  }, [pendingMovements, searchTerm]);

  const filteredUnconfirmedDrops = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return unconfirmedDrops;
    return unconfirmedDrops.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.createdByName || '').toLowerCase().includes(q) ||
        (m.reason || '').toLowerCase().includes(q)
    );
  }, [unconfirmedDrops, searchTerm]);

  const paginatedPendingMovements = useMemo(() => {
    const start = (pendingPage - 1) * pendingPageSize;
    return filteredPendingMovements.slice(start, start + pendingPageSize);
  }, [filteredPendingMovements, pendingPage, pendingPageSize]);

  const paginatedUnconfirmedDrops = useMemo(() => {
    const start = (dropPage - 1) * dropPageSize;
    return filteredUnconfirmedDrops.slice(start, start + dropPageSize);
  }, [filteredUnconfirmedDrops, dropPage, dropPageSize]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0 24px' }}>
      {/* 1. Compact Standard Header */}
      <div className="so-list-header">
        <h1 className="so-list-title">Hạn Mức &amp; Duyệt Chi Két POS</h1>
        <div className="so-list-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              color: '#0f766e',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
            }}
            title="Đang đồng bộ tự động theo chi nhánh được chọn trên thanh Topbar"
          >
            <Building2 size={15} />
            <span>Phiếu đang xem: <b>{selectedBranchName}</b></span>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="so-list-filter-reset"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc chuẩn so-list-filter */}
      <div className="so-list-filter">
        <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap' }}>
          <div className="so-list-filter-field" style={{ flex: '1 1 260px', minWidth: 220 }}>
            <label className="so-list-filter-label">Tìm phiếu:</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={draftSearchTerm}
                onChange={(e) => setDraftSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchTerm(draftSearchTerm);
                    setPendingPage(1);
                    setDropPage(1);
                  }
                }}
                placeholder="Tìm mã phiếu, tên thu ngân, lý do chi..."
                className="so-list-filter-input"
                style={{ width: '100%', paddingLeft: 28, paddingRight: draftSearchTerm ? 26 : 10 }}
              />
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              {draftSearchTerm && (
                <button
                  type="button"
                  onClick={() => setDraftSearchTerm('')}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="so-list-filter-field">
            <label className="so-list-filter-label">Loại phiếu:</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setPendingPage(1); setDropPage(1); }}
              className={`so-list-filter-select ${typeFilter !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            >
              <option value="ALL">Tất cả loại phiếu</option>
              <option value="PENDING_EXPENSE">Phiếu chi chờ duyệt ({pendingMovements.length})</option>
              <option value="UNCONFIRMED_DROP">Rút két chờ nhận ({unconfirmedDrops.length})</option>
            </select>
          </div>

          <div className="so-list-filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setSearchTerm(draftSearchTerm);
                setPendingPage(1);
                setDropPage(1);
              }}
              className="so-list-filter-search"
            >
              <Search size={13} /> Tìm kiếm
            </button>
            <button
              type="button"
              disabled={!draftSearchTerm && !searchTerm && typeFilter === 'ALL'}
              onClick={() => { setDraftSearchTerm(''); setSearchTerm(''); setTypeFilter('ALL'); setPendingPage(1); setDropPage(1); }}
              className="so-list-filter-reset"
            >
              <RotateCcw size={13} /> Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick KPI Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {/* KPI 1: Chờ duyệt chi */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: pendingMovements.length > 0 ? '1.5px solid #fecdd3' : '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>Phiếu chi chờ phê duyệt</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: pendingMovements.length > 0 ? '#e11d48' : '#0f172a', marginTop: 4 }}>
              {pendingMovements.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
              {pendingMovements.length > 0 ? 'Cần chủ xem xét chấp thuận' : 'Không có yêu cầu tồn đọng'}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: pendingMovements.length > 0 ? '#ffe4e6' : '#f1f5f9',
              color: pendingMovements.length > 0 ? '#e11d48' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUpCircle size={22} />
          </div>
        </div>

        {/* KPI 2: Chờ nhận rút két */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: unconfirmedDrops.length > 0 ? '1.5px solid #bae6fd' : '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>Khoản nộp rút két chờ nhận</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: unconfirmedDrops.length > 0 ? '#0284c7' : '#0f172a', marginTop: 4 }}>
              {unconfirmedDrops.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
              {unconfirmedDrops.length > 0 ? 'Thu ngân đã trích két nộp tiền' : 'Đã xác nhận đầy đủ'}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: unconfirmedDrops.length > 0 ? '#e0f2fe' : '#f1f5f9',
              color: unconfirmedDrops.length > 0 ? '#0284c7' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownCircle size={22} />
          </div>
        </div>

        {/* KPI 3: Hạn mức tự duyệt */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>Hạn mức tự duyệt chi</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f766e', marginTop: 4 }}>
              {threshold === 0 ? '0 đ (Duyệt tất cả)' : `${threshold.toLocaleString('vi-VN')} đ`}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
              Áp dụng cho tất cả chi nhánh
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sliders size={20} />
          </div>
        </div>

        {/* KPI 5: Trần tổng chi / ca */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>Trần tổng chi / ca (chưa áp dụng)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
              {shiftTotalLimit === 0 ? 'Không giới hạn' : `${shiftTotalLimit.toLocaleString('vi-VN')} đ`}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
              Hệ thống chưa kiểm tra trần này
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={20} />
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Cấu hình hạn mức (Trái) & Danh sách duyệt (Phải) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 460px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* CARD TRÁI: Cấu hình hạn mức phê duyệt */}
        <form
          onSubmit={handleSaveSettings}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
            <Sliders size={20} className="text-teal-700" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Cấu Hình Hạn Mức Duyệt Chi
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: '#f0fdfa', borderRadius: 8, border: '1px solid #ccfbf1' }}>
            <Info size={18} className="text-teal-700 flex-shrink-0" style={{ marginTop: 2 }} />
            <span style={{ fontSize: 12.5, color: '#0f766e', lineHeight: 1.5 }}>
              Hạn mức áp dụng cho tất cả chi nhánh. Danh sách phiếu bên phải theo chi nhánh đang chọn.
            </span>
          </div>

          {/* Trường 1: Hạn mức duyệt chi mỗi lần */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Hạn mức duyệt chi tự động cho mỗi lần chi (VNĐ):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={0}
                step={10000}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>đ</span>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[0, 100000, 200000, 500000, 1000000, 2000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setThreshold(val)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: threshold === val ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                    backgroundColor: threshold === val ? '#ccfbf1' : '#f8fafc',
                    color: threshold === val ? '#0f766e' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {val === 0 ? '0 đ (Bắt buộc duyệt hết)' : `${val.toLocaleString('vi-VN')} đ`}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
              Phiếu chi không vượt mức được ghi nhận ngay; vượt mức cần chủ cửa hàng duyệt.
            </p>
          </div>

          {/* Trường 2: Hạn mức tổng chi / ca */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Trần tổng chi vặt mỗi ca (chưa áp dụng):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={0}
                step={100000}
                value={shiftTotalLimit}
                onChange={(e) => setShiftTotalLimit(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>đ</span>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[0, 500000, 1000000, 2000000, 5000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setShiftTotalLimit(val)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: shiftTotalLimit === val ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                    backgroundColor: shiftTotalLimit === val ? '#ccfbf1' : '#f8fafc',
                    color: shiftTotalLimit === val ? '#0f766e' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {val === 0 ? '0 đ (Không giới hạn)' : `${val.toLocaleString('vi-VN')} đ`}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
              Giá trị này hiện chỉ được lưu; hệ thống chưa kiểm tra tổng chi theo ca.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            style={{
              marginTop: 10,
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              height: 44,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
            }}
          >
            <Save size={18} />
            <span>{isSavingSettings ? 'Đang lưu thiết lập...' : 'Lưu Thiết Lập Hạn Mức'}</span>
          </button>
        </form>

        {/* CỘT PHẢI: Danh sách chờ xử lý */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* PHẦN 1: Danh sách phiếu chi két chờ phê duyệt */}
          {(typeFilter === 'ALL' || typeFilter === 'PENDING_EXPENSE') && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowUpCircle size={20} className="text-rose-600" />
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Phiếu Chi Két Chờ Phê Duyệt ({filteredPendingMovements.length})
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 20,
                    backgroundColor: filteredPendingMovements.length > 0 ? '#ffe4e6' : '#f1f5f9',
                    color: filteredPendingMovements.length > 0 ? '#b91c1c' : '#64748b',
                  }}
                >
                  {filteredPendingMovements.length > 0 ? 'Có yêu cầu chi vặt cần duyệt' : 'Đã duyệt hết'}
                </span>
              </div>

              {filteredPendingMovements.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <CheckCircle2 size={40} className="text-emerald-500" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    Không có phiếu chi nào đang chờ phê duyệt
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                    Mọi khoản chi vặt tại quầy hiện tại đều tuân thủ hạn mức duyệt tự động.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {paginatedPendingMovements.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: 16,
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                                Phiếu chi: #{item.id.slice(0, 8)}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                Chờ Chủ duyệt
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={13} />
                                {item.createdByName || 'Thu ngân'}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                {item.occurredAtUtc
                                  ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(item.occurredAtUtc) ? item.occurredAtUtc : `${item.occurredAtUtc}Z`).toLocaleString('vi-VN')
                                  : 'Vừa tạo'}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#e11d48' }}>
                              -{item.amount.toLocaleString('vi-VN')} đ
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Vượt hạn mức tự duyệt</span>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            fontSize: 13,
                            color: '#334155',
                          }}
                        >
                          <b>Lý do chi:</b> {item.reason || 'Chi vặt phát sinh tại quầy thu ngân'}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(item.id);
                              setRejectionReason('');
                            }}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: '1px solid #fecdd3',
                              backgroundColor: '#ffffff',
                              color: '#e11d48',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <X size={14} />
                            <span>Từ chối</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 16px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#0f766e',
                              color: '#ffffff',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.2)',
                            }}
                          >
                            <Check size={14} />
                            <span>{actionLoadingId === item.id ? 'Đang duyệt...' : 'Duyệt xuất tiền'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <TablePagination
                    currentPage={pendingPage}
                    pageSize={pendingPageSize}
                    totalItems={filteredPendingMovements.length}
                    pageSizeOptions={[10, 20, 30]}
                    itemLabel="phiếu chi"
                    onPageChange={setPendingPage}
                    onPageSizeChange={(s) => { setPendingPageSize(s); setPendingPage(1); }}
                  />
                </>
              )}
            </div>
          )}

          {/* PHẦN 2: Danh sách tiền rút két chờ xác nhận (Cash Drops) */}
          {(typeFilter === 'ALL' || typeFilter === 'UNCONFIRMED_DROP') && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowDownCircle size={20} className="text-sky-600" />
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Khoản Rút Két Nộp Quỹ Chờ Xác Nhận ({filteredUnconfirmedDrops.length})
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 20,
                    backgroundColor: filteredUnconfirmedDrops.length > 0 ? '#e0f2fe' : '#f1f5f9',
                    color: filteredUnconfirmedDrops.length > 0 ? '#0284c7' : '#64748b',
                  }}
                >
                  {filteredUnconfirmedDrops.length > 0 ? 'Chờ Chủ xác nhận đã nhận tiền' : 'Đã nhận đủ'}
                </span>
              </div>

              {filteredUnconfirmedDrops.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <CheckCircle2 size={40} className="text-sky-500" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    Không có khoản nộp tiền rút két nào đang chờ xác nhận
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                    Mọi khoản rút két giảm tải tiền mặt trong ca đã được Chủ cửa hàng xác nhận đầy đủ.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {paginatedUnconfirmedDrops.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: 16,
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                                Rút két nộp tiền: #{item.id.slice(0, 8)}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                Chờ Chủ nhận tiền
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={13} />
                                {item.createdByName || 'Thu ngân'}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                {item.occurredAtUtc
                                  ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(item.occurredAtUtc) ? item.occurredAtUtc : `${item.occurredAtUtc}Z`).toLocaleString('vi-VN')
                                  : 'Vừa tạo'}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7' }}>
                              +{item.amount.toLocaleString('vi-VN')} đ
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Tiền mặt giao nộp</span>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            fontSize: 13,
                            color: '#334155',
                          }}
                        >
                          <b>Ghi chú:</b> {item.reason || 'Rút tiền mặt khỏi két nộp về chủ cửa hàng để giảm tồn quỹ'}
                        </div>

                        {/* Action */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleConfirmDrop(item.id)}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 18px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                            }}
                          >
                            <Check size={14} />
                            <span>{actionLoadingId === item.id ? 'Đang xử lý...' : 'Xác nhận đã nhận đủ tiền'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <TablePagination
                    currentPage={dropPage}
                    pageSize={dropPageSize}
                    totalItems={filteredUnconfirmedDrops.length}
                    pageSizeOptions={[10, 20, 30]}
                    itemLabel="khoản rút két"
                    onPageChange={setDropPage}
                    onPageSizeChange={(s) => { setDropPageSize(s); setDropPage(1); }}
                  />
                </>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Modal từ chối phê duyệt phiếu chi */}
      {rejectingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e11d48' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Từ Chối Yêu Cầu Chi Tiền</h3>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
              Vui lòng nhập lý do từ chối để thu ngân tại quầy nắm rõ và không thực hiện xuất quỹ cho khoản này.
            </p>

            <textarea
              rows={3}
              placeholder="VD: Khoản chi này không thuộc danh mục chi vặt của cửa hàng, cần hóa đơn đỏ..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                marginTop: 10,
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setRejectionReason('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoadingId === rejectingId}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {actionLoadingId === rejectingId ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}


      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}
    </div>
  );
};

