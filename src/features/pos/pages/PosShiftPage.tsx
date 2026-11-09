import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  History,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Banknote,
  RefreshCw,
  AlertCircle,
  X,
  UserCheck,
  AlertTriangle,
  Building2,
  Eye,
} from 'lucide-react';
import { posShiftApi } from '../api/posShiftApi';
import type { ShiftDetailResponse, ConfirmHandoverRequest } from '../types/posShift.types';
import { employeeApi } from '../../employee/api/employeeApi';
import { TablePagination } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

interface BranchOption {
  id: string;
  name: string;
}

export const PosShiftPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER';

  // Quay về trang gọi (Work schedule hoặc POS checkout)
  const branchFromUrl = searchParams.get('branchId');
  const returnPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : isStoreOwner
      ? '/store-owner/employees/schedule'
      : '/pos';

  // Danh sách chi nhánh thực tế từ API
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Chi nhánh đang chọn (GUID hợp lệ)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branchFromUrl || user?.branchId || ''
  );

  // Bộ lọc dải thời gian
  const [timePreset, setTimePreset] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  // Trạng thái dữ liệu
  const [shifts, setShifts] = useState<ShiftDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal Xác nhận bàn giao ca
  const [handoverShift, setHandoverShift] = useState<ShiftDetailResponse | null>(null);
  const [selectedDetailShift, setSelectedDetailShift] = useState<ShiftDetailResponse | null>(null);
  const [handoverDecision, setHandoverDecision] = useState<'CONFIRMED' | 'DISPUTED'>('CONFIRMED');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState<boolean>(false);
  const isOwnerOrAdmin = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  // Tải danh sách chi nhánh thực tế từ CSDL
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((list) => {
      if (!isMounted) return;
      if (list && list.length > 0) {
        setBranches(list);
        // Nếu selectedBranchId chưa hợp lệ (rỗng hoặc mock BR-), gán sang branch thật đầu tiên
        if (!selectedBranchId || selectedBranchId.startsWith('BR-')) {
          const match = branchFromUrl
            ? list.find((b) => b.id === branchFromUrl || b.name.includes(branchFromUrl))
            : list.find((b) => b.id === user?.branchId);
          const initialId = match ? match.id : list[0].id;
          setSelectedBranchId(initialId);
          setSearchParams({ branchId: initialId });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [branchFromUrl, user?.branchId]);

  // Tải danh sách lịch sử ca từ Backend API
  const fetchShiftHistory = useCallback(async () => {
    if (!selectedBranchId || selectedBranchId.startsWith('BR-')) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let fromIso: string | undefined;
      let toIso: string | undefined;

      const now = new Date();
      if (timePreset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        fromIso = start.toISOString();
      } else if (timePreset === '7days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromIso = start.toISOString();
      } else if (timePreset === '30days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        fromIso = start.toISOString();
      }

      const res = await posShiftApi.getShiftHistory(selectedBranchId, fromIso, toIso);
      setShifts(res || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Lỗi tải lịch sử ca:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tải lịch sử ca làm việc.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, timePreset]);

  useEffect(() => {
    fetchShiftHistory();
  }, [fetchShiftHistory]);

  // Cập nhật URL khi chọn chi nhánh
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSearchParams({ branchId });
  };

  // Tính 4 thẻ KPI tổng hợp từ dữ liệu thực tế
  const kpiMetrics = useMemo(() => {
    const totalCount = shifts.length;
    const totalOpeningFloat = shifts.reduce((sum, s) => sum + s.openingFloat, 0);
    const totalActualCash = shifts.reduce((sum, s) => sum + (s.actualCashCounted ?? s.expectedCash), 0);
    const totalDiscrepancy = shifts.reduce((sum, s) => sum + (s.discrepancy ?? 0), 0);
    const totalBankRevenue = shifts.reduce((sum, s) => sum + (s.totalBankRevenue || 0), 0);

    return {
      totalCount,
      totalOpeningFloat,
      totalActualCash,
      totalDiscrepancy,
      totalBankRevenue,
    };
  }, [shifts]);

  // Dữ liệu phân trang
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shifts.slice(start, start + pageSize);
  }, [shifts, currentPage, pageSize]);

  // Xử lý gửi xác nhận bàn giao
  const handleConfirmHandoverSubmit = async () => {
    if (!handoverShift) return;
    if (handoverDecision === 'DISPUTED' && !disputeReason.trim()) {
      alert('Vui lòng nhập lý do khiếu nại bàn giao lệch tiền.');
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const request: ConfirmHandoverRequest = {
        status: handoverDecision === 'CONFIRMED' ? 2 : 3,
        disputeReason: handoverDecision === 'DISPUTED' ? disputeReason.trim() : null,
      };

      await posShiftApi.confirmHandover(handoverShift.id, request);
      alert(
        handoverDecision === 'CONFIRMED'
          ? 'Đã xác nhận nhận bàn giao ca thành công!'
          : 'Đã gửi khiếu nại bàn giao ca thành công!'
      );
      setHandoverShift(null);
      setDisputeReason('');
      await fetchShiftHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi gửi xác nhận bàn giao ca.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const formatVND = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getHandoverBadge = (status: number | string) => {
    if (status === 2 || status === 'CONFIRMED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
          }}
        >
          <CheckCircle2 size={13} />
          <span>Đã xác nhận</span>
        </span>
      );
    }
    if (status === 3 || status === 'DISPUTED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          <AlertTriangle size={13} />
          <span>Khiếu nại</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: '#fffbeb',
          color: '#b45309',
          border: '1px solid #fde68a',
        }}
      >
        <Clock size={13} />
        <span>Chờ bàn giao</span>
      </span>
    );
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* ─── 1. HEADER DUY NHẤT ĐỒNG BỘ ─── */}
      <header className="pos-shift-unified-header" style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="pos-back-to-sales-btn"
              onClick={() => navigate(returnPath)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Quay lại giao diện trước"
            >
              <ArrowLeft size={15} />
              <span>{isStoreOwner ? 'Lịch Làm Việc' : 'Bán Hàng'}</span>
            </button>

            <div style={{ width: 1, height: 28, backgroundColor: '#E2E8F0' }} />

            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} className="text-teal-700" />
                <span>Lịch Sử Chốt Ca &amp; Bàn Giao Quầy</span>
              </h1>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Nhật ký các phiên ca thu ngân, đối soát chênh lệch két tiền mặt và xác nhận bàn giao
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Lọc Chi Nhánh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={16} className="text-slate-500" />
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                style={{
                  height: 36,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F766E',
                  fontWeight: 600,
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Làm Mới */}
            <button
              type="button"
              onClick={fetchShiftHistory}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Tải lại dữ liệu lịch sử ca"
            >
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. THÂN TRANG NỘI DUNG ─── */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto" style={{ padding: '20px 24px' }}>
        {/* THANH BỘ LỌC THỜI GIAN */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Khoảng thời gian:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: '7days', label: '7 ngày qua' },
                { key: '30days', label: '30 ngày qua' },
                { key: 'all', label: 'Tất cả' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setTimePreset(btn.key as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: timePreset === btn.key ? '#0F766E' : '#CBD5E1',
                    backgroundColor: timePreset === btn.key ? '#F0FDFA' : '#FFFFFF',
                    color: timePreset === btn.key ? '#0F766E' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#64748B' }}>
            Tổng số: <b>{shifts.length}</b> phiên ca ghi nhận
          </div>
        </div>

        {/* 4 THẺ KPI TỔNG HỢP LỊCH SỬ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F766E', fontSize: 12.5, fontWeight: 600 }}>
              <Clock size={16} />
              <span>Tổng Số Phiên Ca</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {kpiMetrics.totalCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>ca</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontSize: 12.5, fontWeight: 600 }}>
              <Wallet size={16} />
              <span>Tổng Tiền Đầu Ca</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {formatVND(kpiMetrics.totalOpeningFloat)}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 12.5, fontWeight: 600 }}>
              <Banknote size={16} />
              <span>Tổng Tiền Thực Đếm</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {formatVND(kpiMetrics.totalActualCash)}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: kpiMetrics.totalDiscrepancy < 0 ? '#DC2626' : '#D97706', fontSize: 12.5, fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>Chênh Lệch Két (Tổng)</span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: kpiMetrics.totalDiscrepancy < 0 ? '#DC2626' : kpiMetrics.totalDiscrepancy > 0 ? '#059669' : '#0F172A',
                marginTop: 8,
              }}
            >
              {kpiMetrics.totalDiscrepancy > 0 ? `+${formatVND(kpiMetrics.totalDiscrepancy)}` : formatVND(kpiMetrics.totalDiscrepancy)}
            </div>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* BẢNG LỊCH SỬ CÁC CA LÀM VIỆC */}
        <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} className="text-teal-700" />
              <span>Danh Sách Các Phiên Ca Bán Hàng ({shifts.length})</span>
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '10px 14px' }}>Mã ca</th>
                  <th style={{ padding: '10px 14px' }}>Thời gian mở - đóng</th>
                  <th style={{ padding: '10px 14px' }}>Thu ngân</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tiền đầu ca</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tiền lý thuyết</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thực đếm</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Chênh lệch</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Bàn giao</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={20} className="spin text-teal-700" style={{ margin: '0 auto 8px' }} />
                      <div>Đang tải lịch sử ca làm việc từ hệ thống...</div>
                    </td>
                  </tr>
                ) : paginatedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <AlertCircle size={24} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 600, color: '#334155' }}>Không có ca làm việc nào trong khoảng thời gian này</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Hãy chọn khoảng thời gian khác hoặc kiểm tra lại chi nhánh đã chọn.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedShifts.map((s) => {
                    const diff = s.discrepancy ?? 0;
                    const isPendingHandover = s.handoverStatus === 1 || s.handoverStatus === 'PENDING';
                    const cashierDisplay = s.participants && s.participants.length > 0
                      ? s.participants.map((p) => p.fullName || p.userName).join(', ')
                      : 'Thu ngân quầy';

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {s.shiftCode}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontSize: 12 }}>
                          <div><b>Mở:</b> {formatDate(s.openedAtUtc)}</div>
                          <div><b>Đóng:</b> {s.closedAtUtc ? formatDate(s.closedAtUtc) : <span style={{ color: '#10B981' }}>Đang mở</span>}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#1E293B' }}>
                          <span title={cashierDisplay} style={{ maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cashierDisplay}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                          {formatVND(s.openingFloat)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#0F766E', fontWeight: 600 }}>
                          {formatVND(s.expectedCash)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                          {s.actualCashCounted !== null && s.actualCashCounted !== undefined ? formatVND(s.actualCashCounted) : '---'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {diff === 0 ? (
                            <span style={{ color: '#059669' }}>Khớp (0 đ)</span>
                          ) : diff > 0 ? (
                            <span style={{ color: '#059669' }}>+{formatVND(diff)}</span>
                          ) : (
                            <span style={{ color: '#DC2626' }}>{formatVND(diff)}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {getHandoverBadge(s.handoverStatus)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedDetailShift(s)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #0F766E',
                                backgroundColor: '#F0FDFA',
                                color: '#0F766E',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Xem chi tiết phiên ca & Lý do chênh lệch"
                            >
                              <Eye size={13} />
                              <span>Chi tiết</span>
                            </button>

                            {isPendingHandover && !isOwnerOrAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setHandoverShift(s);
                                  setHandoverDecision('CONFIRMED');
                                  setDisputeReason('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #D97706',
                                  backgroundColor: '#FFFBEB',
                                  color: '#B45309',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Xác nhận nhận tiền bàn giao ca này"
                              >
                                <UserCheck size={13} />
                                <span>Nhận ca</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG */}
          {shifts.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0' }}>
              <TablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={shifts.length}
                itemLabel="ca làm việc"
                pageSizeOptions={[10, 20, 50]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─── 3. MODAL XÁC NHẬN BÀN GIAO CA (HANDOVER CONFIRMATION) ─── */}
      {handoverShift && (
        <div className="pos-modal-overlay" onClick={() => setHandoverShift(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: 480, background: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} className="text-teal-700" />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Xác Nhận Nhận Bàn Giao Ca #{handoverShift.shiftCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoverShift(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: '#334155' }}>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748B' }}>Số tiền ca trước để lại két:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E', fontSize: 14 }}>
                    {formatVND(handoverShift.retainedFloatAmount || handoverShift.actualCashCounted || handoverShift.expectedCash)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Người bàn giao:</span>
                  <span style={{ fontWeight: 600 }}>
                    {handoverShift.participants?.length ? handoverShift.participants[0].fullName || handoverShift.participants[0].userName : 'Thu ngân'}
                  </span>
                </div>
              </div>

              {/* Lựa chọn xác nhận */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                  <input
                    type="radio"
                    name="handoverDecision"
                    value="CONFIRMED"
                    checked={handoverDecision === 'CONFIRMED'}
                    onChange={() => setHandoverDecision('CONFIRMED')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span style={{ fontWeight: 600, color: '#065F46' }}>
                    ✓ Khớp tiền: Tôi xác nhận đã nhận đủ số tiền mặt bàn giao trên.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="handoverDecision"
                    value="DISPUTED"
                    checked={handoverDecision === 'DISPUTED'}
                    onChange={() => setHandoverDecision('DISPUTED')}
                    style={{ accentColor: '#DC2626' }}
                  />
                  <span style={{ fontWeight: 600, color: '#991B1B' }}>
                    ✕ Khiếu nại: Số tiền thực tế trong két không khớp / bị sai lệch.
                  </span>
                </label>
              </div>

              {/* Ô nhập lý do khiếu nại */}
              {handoverDecision === 'DISPUTED' && (
                <div style={{ marginTop: 10, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>
                    Lý do khiếu nại (bắt buộc):
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="VD: Kiểm đếm thực tế thiếu 150.000đ so với số tiền bàn giao..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #FECACA',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setHandoverShift(null)}
                  disabled={isSubmittingHandover}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHandoverSubmit}
                  disabled={isSubmittingHandover}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: handoverDecision === 'CONFIRMED' ? '#0F766E' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingHandover ? 'Đang gửi...' : 'Xác Nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHIÊN CA BÁN HÀNG & LÝ DO CHÊNH LỆCH */}
      {selectedDetailShift && (
        <div
          className="pos-modal-overlay"
          onClick={() => setSelectedDetailShift(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 720,
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
              padding: 20,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={18} className="text-teal-700" />
                  <span>Chi Tiết Phiên Ca Bán Hàng ({selectedDetailShift.shiftCode})</span>
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Tên ca: <b>{selectedDetailShift.shiftName}</b> &bull; Mở: {formatDate(selectedDetailShift.openedAtUtc)} &bull; Đóng: {selectedDetailShift.closedAtUtc ? formatDate(selectedDetailShift.closedAtUtc) : 'Đang mở'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailShift(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nhân viên trực ca */}
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5 }}>
                <span style={{ color: '#64748B' }}>Nhân viên trực ca: </span>
                <b style={{ color: '#0F172A' }}>
                  {selectedDetailShift.participants?.length
                    ? selectedDetailShift.participants.map((p) => p.fullName || p.userName).join(', ')
                    : 'Thu ngân quầy'}
                </b>
              </div>

              {/* Bảng chỉ số đối soát tiền két Z-Report */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', marginBottom: 8 }}>
                  📊 Báo Cáo Kết Toán Tiền Két (Z-Report):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Vốn đầu ca (Opening Float):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{formatVND(selectedDetailShift.openingFloat)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Doanh thu chuyển khoản (VietQR):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0284C7' }}>{formatVND(selectedDetailShift.totalBankRevenue)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng nạp thêm vào két (+):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>+{formatVND(selectedDetailShift.totalCashIn)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng chi / rút tiền khỏi két (-):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>-{formatVND(selectedDetailShift.totalCashOut)}</div>
                  </div>
                  <div style={{ background: '#ECFDF5', padding: '8px 12px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: 11.5, color: '#065F46' }}>Tiền mặt lý thuyết trong két:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#065F46' }}>{formatVND(selectedDetailShift.expectedCash)}</div>
                  </div>
                  <div style={{ background: '#F0F9FF', padding: '8px 12px', borderRadius: 6, border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: 11.5, color: '#0369A1' }}>Tiền thực đếm lúc chốt ca:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0369A1' }}>
                      {selectedDetailShift.actualCashCounted !== null && selectedDetailShift.actualCashCounted !== undefined
                        ? formatVND(selectedDetailShift.actualCashCounted)
                        : '---'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chênh lệch két & Lý do giải trình */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: (selectedDetailShift.discrepancy ?? 0) === 0 ? '1px solid #86EFAC' : '1.5px solid #FECACA',
                  backgroundColor: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#F0FDF4' : '#FEF2F2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#991B1B' }}>
                    ⚖️ Kết quả đối soát chênh lệch:
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#DC2626' }}>
                    {(selectedDetailShift.discrepancy ?? 0) === 0
                      ? 'Khớp chuẩn (0 đ)'
                      : (selectedDetailShift.discrepancy ?? 0) > 0
                        ? `Thừa +${formatVND(selectedDetailShift.discrepancy!)}`
                        : `Thiếu ${formatVND(selectedDetailShift.discrepancy!)}`}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
                  <b>Lý do giải trình chênh lệch / Ghi chú ca:</b>
                  <div style={{ marginTop: 2, padding: '6px 10px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0', fontStyle: selectedDetailShift.notes ? 'normal' : 'italic' }}>
                    {selectedDetailShift.notes || 'Không có ghi chú hoặc khiếu nại phát sinh trong ca.'}
                  </div>
                </div>
                {selectedDetailShift.retainedFloatAmount !== undefined && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#475569' }}>
                    <span>Để lại két ca sau: <b>{formatVND(selectedDetailShift.retainedFloatAmount || 0)}</b></span>
                    <span>Nộp két an toàn / Chủ: <b>{formatVND(selectedDetailShift.droppedToSafeAmount || 0)}</b></span>
                  </div>
                )}
              </div>

              {/* Lịch sử phiếu thu/chi trong ca */}
              {selectedDetailShift.cashMovements && selectedDetailShift.cashMovements.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>
                    📑 Lịch Sử Phiếu Thu / Chi Trong Ca ({selectedDetailShift.cashMovements.length}):
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          <th style={{ padding: '6px 10px' }}>Thời gian</th>
                          <th style={{ padding: '6px 10px' }}>Loại</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Số tiền</th>
                          <th style={{ padding: '6px 10px' }}>Lý do</th>
                          <th style={{ padding: '6px 10px' }}>Người lập</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetailShift.cashMovements.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{formatDate(m.occurredAtUtc)}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{ fontWeight: 600, color: m.movementType === 1 || m.movementType === 'IN' ? '#059669' : '#DC2626' }}>
                                {m.movementType === 1 || m.movementType === 'IN' ? '[+] Thu' : '[-] Chi'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{formatVND(m.amount)}</td>
                            <td style={{ padding: '6px 10px' }}>{m.reason}</td>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{m.createdByName || 'Thu ngân'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setSelectedDetailShift(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
