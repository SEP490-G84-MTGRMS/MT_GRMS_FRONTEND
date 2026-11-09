import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import {
  ShieldCheck,
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
} from 'lucide-react';
import { posShiftApi } from '../api/posShiftApi';
import type { ShiftCashMovementDto } from '../types/posShift.types';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AN_NHIEN_BRANCHES } from '../mock/posMockData';
import { branchManagementApi } from '../../../pages/store/api/branchManagementApi';

export const StorePosCashControlPage: FC = () => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_an_nhien_02';
  const isAnNhienStore = currentTenantId === 'tenant_an_nhien_02';

  // Chi nhánh đang chọn
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Cấu hình hạn mức
  const [threshold, setThreshold] = useState<number>(200000);
  const [shiftTotalLimit, setShiftTotalLimit] = useState<number>(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Dữ liệu duyệt
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMovements, setPendingMovements] = useState<ShiftCashMovementDto[]>([]);
  const [unconfirmedDrops, setUnconfirmedDrops] = useState<ShiftCashMovementDto[]>([]);

  // Modal từ chối chi két
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [realBranches, setRealBranches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    branchManagementApi.getBranches({ pageSize: 100 })
      .then((res) => {
        if (isMounted && res.data?.items) {
          setRealBranches(res.data.items.map((b) => ({ id: b.id, name: b.name })));
        }
      })
      .catch((err) => {
        console.warn('Không thể tải danh sách chi nhánh thực tế:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const availableBranches = useMemo(() => {
    if (realBranches.length > 0) {
      return realBranches;
    }
    if (isAnNhienStore) {
      return AN_NHIEN_BRANCHES;
    }
    return [
      { id: 'cd5e8d1b-b08b-448d-beff-b85ea5873d52', name: 'Chi nhánh Cầu Giấy (Trung tâm)' },
      { id: 'BR-02', name: 'Chi nhánh Thanh Xuân' },
      { id: 'BR-03', name: 'Chi nhánh Quận 1' },
    ];
  }, [realBranches, isAnNhienStore]);

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
    setSaveMessage(null);
    try {
      await posShiftApi.updateCashMovementSettings({
        cashOutApprovalThreshold: Number(threshold) || 0,
        cashOutShiftTotalLimit: Number(shiftTotalLimit) || 0,
      });

      // Cập nhật lưu local dự phòng offline
      const storageKey = `pos_payment_config_${currentTenantId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.cashOutApprovalThreshold = threshold;
          parsed.cashOutShiftTotalLimit = shiftTotalLimit;
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {}
      }

      setSaveMessage('Đã lưu cấu hình hạn mức duyệt chi két thành công!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể lưu cấu hình hạn mức');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Duyệt phiếu chi
  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.approveCashMovement(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể duyệt phiếu chi');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Từ chối phiếu chi
  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối phiếu chi!');
      return;
    }
    setActionLoadingId(rejectingId);
    try {
      await posShiftApi.rejectCashMovement(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối phiếu chi');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xác nhận đã nhận tiền rút két
  const handleConfirmDrop = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.confirmCashDrop(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xác nhận nhận tiền rút két');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Hạn Mức & Duyệt Chi Két POS
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
                Kiểm soát rủi ro tiền mặt quầy thu ngân &bull; Phê duyệt phiếu chi vặt &bull; Xác nhận tiền rút két nộp quỹ
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Lọc theo Chi nhánh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Chi nhánh:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Toàn bộ chi nhánh</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo thành công */}
      {saveMessage && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            color: '#065f46',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

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
              Mỗi phiếu chi vặt dưới mức này
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
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>Trần tổng chi / ca</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
              {shiftTotalLimit === 0 ? 'Không giới hạn' : `${shiftTotalLimit.toLocaleString('vi-VN')} đ`}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
              Hạn mức lũy kế tối đa trong 1 ca
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
          gridTemplateColumns: 'minmax(380px, 440px) 1fr',
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
              Kiểm soát tự động dòng tiền mặt tại quầy thu ngân. Hạn chế tối đa rủi ro thất thoát hoặc nhân viên tự ý rút tiền chi tiêu mà không có sự đồng ý của Chủ cửa hàng.
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
                  fontFamily: 'monospace',
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
              💡 Phiếu chi dưới mức này được xuất tiền ngay. Chi bằng hoặc lớn hơn mức này bắt buộc Chủ cửa hàng duyệt.
            </p>
          </div>

          {/* Trường 2: Hạn mức tổng chi / ca */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Hạn mức tổng chi vặt tối đa trong 1 ca làm việc:
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
                  fontFamily: 'monospace',
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
              💡 Tổng các khoản chi vặt tích lũy trong ca không được vượt quá mức này. Đặt 0 nếu không giới hạn.
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
                  Phiếu Chi Két Chờ Phê Duyệt ({pendingMovements.length})
                </h3>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 20,
                  backgroundColor: pendingMovements.length > 0 ? '#ffe4e6' : '#f1f5f9',
                  color: pendingMovements.length > 0 ? '#b91c1c' : '#64748b',
                }}
              >
                {pendingMovements.length > 0 ? 'Có yêu cầu chi vặt cần duyệt' : 'Đã duyệt hết'}
              </span>
            </div>

            {pendingMovements.length === 0 ? (
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pendingMovements.map((item) => (
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
                            {item.occurredAtUtc ? new Date(item.occurredAtUtc).toLocaleString('vi-VN') : 'Vừa tạo'}
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
            )}
          </div>

          {/* PHẦN 2: Danh sách tiền rút két chờ xác nhận (Cash Drops) */}
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
                  Khoản Rút Két Nộp Quỹ Chờ Xác Nhận ({unconfirmedDrops.length})
                </h3>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 20,
                  backgroundColor: unconfirmedDrops.length > 0 ? '#e0f2fe' : '#f1f5f9',
                  color: unconfirmedDrops.length > 0 ? '#0284c7' : '#64748b',
                }}
              >
                {unconfirmedDrops.length > 0 ? 'Chờ Chủ xác nhận đã nhận tiền' : 'Đã nhận đủ'}
              </span>
            </div>

            {unconfirmedDrops.length === 0 ? (
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {unconfirmedDrops.map((item) => (
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
                            {item.occurredAtUtc ? new Date(item.occurredAtUtc).toLocaleString('vi-VN') : 'Vừa tạo'}
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
            )}
          </div>


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


    </div>
  );
};

