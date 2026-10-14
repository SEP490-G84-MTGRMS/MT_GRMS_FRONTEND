import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  CreditCard,
  Printer,
  MoreHorizontal,
  Download,
  RefreshCw,
  Users,
  DollarSign,
  Hourglass,
  Check,
  Inbox,
  Building2,
  ChevronDown,
  X,
  Clock,
} from 'lucide-react';
import type { PayslipDetailedRecord, Branch } from '../types';
import { MOCK_PAYSLIPS_MANAGEMENT, MOCK_BRANCHES } from '../services/mockData';
import { CreatePayslipModal } from '../components/CreatePayslipModal';
import { PayslipDetailModal } from '../components/PayslipDetailModal';
import { PayslipPaymentModal } from '../components/PayslipPaymentModal';
import '../employee.css';

export const PayslipManagementPage: React.FC = () => {
  const [payslips, setPayslips] = useState<PayslipDetailedRecord[]>(MOCK_PAYSLIPS_MANAGEMENT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [branches] = useState<Branch[]>(MOCK_BRANCHES);

  // Filters state
  const [keyword, setKeyword] = useState<string>('');
  const [periodMonth, setPeriodMonth] = useState<string>('2026-10');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Searchable Branch Dropdown state
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const [branchSearchKeyword, setBranchSearchKeyword] = useState<string>('');
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBranchList = useMemo(() => {
    if (!branchSearchKeyword.trim()) return branches;
    return branches.filter((b) =>
      b.name.toLowerCase().includes(branchSearchKeyword.toLowerCase().trim())
    );
  }, [branches, branchSearchKeyword]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [viewingPayslip, setViewingPayslip] = useState<PayslipDetailedRecord | null>(null);
  const [payingPayslip, setPayingPayslip] = useState<PayslipDetailedRecord | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState<boolean>(false);

  // Format Helpers
  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0\u00A0₫';
    return `${num.toLocaleString('vi-VN')}\u00A0₫`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const cleanDate = dateStr.split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return cleanDate;
  };

  // Month navigation
  const handlePrevMonth = () => {
    const [year, month] = periodMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    setPeriodMonth(`${yStr}-${mStr}`);
  };

  const handleNextMonth = () => {
    const [year, month] = periodMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    setPeriodMonth(`${yStr}-${mStr}`);
  };

  const monthLabel = useMemo(() => {
    const parts = periodMonth.split('-');
    if (parts.length === 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    return periodMonth;
  }, [periodMonth]);

  // Filtering
  const filteredPayslips = useMemo(() => {
    return payslips.filter((item) => {
      // 1. Period
      if (periodMonth && item.periodMonth !== periodMonth) {
        return false;
      }
      // 2. Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // 3. Branch
      if (selectedBranch !== 'ALL' && !item.branchName?.includes(selectedBranch)) {
        return false;
      }
      // 4. Keyword search
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchName = item.employeeName.toLowerCase().includes(q);
        const matchCode = item.employeeCode.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [payslips, periodMonth, statusFilter, selectedBranch, keyword]);

  // Statistics KPI
  const stats = useMemo(() => {
    const totalCount = filteredPayslips.length;
    const totalNet = filteredPayslips.reduce((sum, item) => sum + item.netSalary, 0);
    const unpaidNet = filteredPayslips
      .filter((item) => item.status === 'UNPAID')
      .reduce((sum, item) => sum + item.netSalary, 0);
    const paidNet = filteredPayslips
      .filter((item) => item.status === 'PAID')
      .reduce((sum, item) => sum + item.netSalary, 0);

    return { totalCount, totalNet, unpaidNet, paidNet };
  }, [filteredPayslips]);

  // Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPayslips.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Payment
  const handleBatchPay = () => {
    const unpaidSelected = filteredPayslips.filter(
      (p) => selectedIds.includes(p.id) && p.status === 'UNPAID'
    );
    if (unpaidSelected.length === 0) {
      alert('Vui lòng chọn ít nhất một phiếu lương chưa thanh toán để chi trả!');
      return;
    }
    const sumAmount = unpaidSelected.reduce((sum, p) => sum + p.netSalary, 0);
    const ok = window.confirm(
      `Xác nhận chi trả đồng loạt ${unpaidSelected.length} phiếu lương?\nTổng số tiền: ${formatVND(
        sumAmount
      )}\nHệ thống sẽ tự động ghi nhận bút toán chi sổ quỹ.`
    );
    if (ok) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setPayslips((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) && item.status === 'UNPAID'
            ? { ...item, status: 'PAID', paidAt: now }
            : item
        )
      );
      setSelectedIds([]);
      alert(`Đã hoàn tất thanh toán thành công ${unpaidSelected.length} phiếu lương!`);
    }
  };

  // Single Pay Confirmation
  const handleConfirmPayment = (payslipId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setPayslips((prev) =>
      prev.map((item) =>
        item.id === payslipId ? { ...item, status: 'PAID', paidAt: now } : item
      )
    );
    alert(`Đã ghi nhận thanh toán thành công cho phiếu lương ${payslipId}!`);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setPeriodMonth('2026-10');
    setStatusFilter('ALL');
    setSelectedBranch('ALL');
    setIsBranchDropdownOpen(false);
    setBranchSearchKeyword('');
  };

  return (
    <div className="emp-page-container">
      {/* ─── 1. HEADER BAR ĐỒNG NHẤT VỚI HỆ THỐNG ─── */}
      <div>
        <h2 className="emp-header-title">
          <span>Bảng tính lương</span>
          <span className="count-badge">{filteredPayslips.length}</span>
        </h2>
      </div>
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Ô tìm kiếm bo tròn full pill */}
          <div className="emp-search-box">
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã, tên NV..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Điều hướng kỳ tháng đồng bộ */}
          <div className="emp-date-navigator">
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handlePrevMonth}
              title="Tháng trước"
            >
              &lt;
            </button>
            <span className="emp-date-navigator-label">{monthLabel}</span>
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handleNextMonth}
              title="Tháng sau"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Nút hành động chuẩn */}
        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            <span>Khởi tạo bảng lương</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={handleBatchPay}
            disabled={selectedIds.length === 0}
            style={{
              opacity: selectedIds.length === 0 ? 0.6 : 1,
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CreditCard size={15} />
            <span>Chi trả hàng loạt {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>In danh sách</span>
          </button>

          {/* Action Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ width: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowActionDropdown(!showActionDropdown)}
            >
              <MoreHorizontal size={18} />
            </button>

            {showActionDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  right: 0,
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0',
                  minWidth: 180,
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => {
                    alert(`Đang xuất bảng lương ${filteredPayslips.length} nhân sự ra tệp Excel (.xlsx)...`);
                    setShowActionDropdown(false);
                  }}
                >
                  <Download size={14} />
                  <span>Xuất file Excel</span>
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => {
                    setIsCreateOpen(true);
                    setShowActionDropdown(false);
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Tính lại lương tháng</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN LAYOUT: SIDEBAR LỌC (TRÁI) + NỘI DUNG (PHẢI) ─── */}
      <div className="emp-main-layout">
        {/* SIDEBAR BỘ LỌC CHUẨN */}
        <aside className="emp-filter-sidebar">
          {/* Nhóm 1: Kỳ lương */}
          <div className="emp-filter-group">
            <div className="emp-filter-title">
              <span>Kỳ tính lương</span>
            </div>
            <input
              type="month"
              className="emp-filter-select"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
            />
          </div>

          {/* Nhóm 2: Trạng thái thanh toán */}
          <div className="emp-filter-group">
            <div className="emp-filter-title">
              <span>Trạng thái</span>
            </div>
            <label className="emp-radio-label">
              <input
                type="radio"
                name="payroll_status"
                checked={statusFilter === 'ALL'}
                onChange={() => setStatusFilter('ALL')}
              />
              <span>Tất cả</span>
            </label>
            <label className="emp-radio-label">
              <input
                type="radio"
                name="payroll_status"
                checked={statusFilter === 'UNPAID'}
                onChange={() => setStatusFilter('UNPAID')}
              />
              <span>Chưa thanh toán (Unpaid)</span>
            </label>
            <label className="emp-radio-label">
              <input
                type="radio"
                name="payroll_status"
                checked={statusFilter === 'PAID'}
                onChange={() => setStatusFilter('PAID')}
              />
              <span>Đã thanh toán (Paid)</span>
            </label>
          </div>

          {/* Nhóm 3: Chi nhánh (Searchable Dropdown tối ưu khi có nhiều chi nhánh) */}
          <div className="emp-filter-group" ref={branchDropdownRef} style={{ position: 'relative' }}>
            <div
              className="emp-filter-title"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
            >
              <span>Chi nhánh</span>
              {selectedBranch !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedBranch('ALL')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0F766E',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Đặt lại về Tất cả chi nhánh"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Ô hiển thị chi nhánh được chọn (Click để mở dropdown) */}
            <div
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#FFFFFF',
                border: isBranchDropdownOpen ? '1px solid #0F766E' : '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.12)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <Building2 size={16} color={selectedBranch === 'ALL' ? '#64748B' : '#0F766E'} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: selectedBranch === 'ALL' ? 500 : 600,
                    color: selectedBranch === 'ALL' ? '#334155' : '#0F766E',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : selectedBranch}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {selectedBranch !== 'ALL' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBranch('ALL');
                    }}
                    title="Bỏ chọn chi nhánh"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    <X size={14} />
                  </button>
                )}
                <ChevronDown
                  size={15}
                  color="#64748B"
                  style={{
                    transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
            </div>

            {/* Menu Popover tìm kiếm & danh sách chi nhánh */}
            {isBranchDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: '#FFFFFF',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {/* Ô tìm kiếm chi nhánh */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '4px 8px',
                    }}
                  >
                    <Search size={14} color="#94A3B8" />
                    <input
                      type="text"
                      placeholder="Tìm chi nhánh..."
                      value={branchSearchKeyword}
                      onChange={(e) => setBranchSearchKeyword(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: 12,
                        width: '100%',
                        background: 'transparent',
                        color: '#0F172A',
                      }}
                    />
                    {branchSearchKeyword && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBranchSearchKeyword('');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách cuộn chi nhánh */}
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    padding: '4px 0',
                  }}
                >
                  {/* Option: Tất cả chi nhánh */}
                  {(!branchSearchKeyword || 'tất cả chi nhánh'.includes(branchSearchKeyword.toLowerCase())) && (
                    <div
                      onClick={() => {
                        setSelectedBranch('ALL');
                        setIsBranchDropdownOpen(false);
                        setBranchSearchKeyword('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: selectedBranch === 'ALL' ? 600 : 400,
                        color: selectedBranch === 'ALL' ? '#0F766E' : '#334155',
                        background: selectedBranch === 'ALL' ? '#F0FDFA' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedBranch !== 'ALL') e.currentTarget.style.background = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedBranch !== 'ALL') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={15} color={selectedBranch === 'ALL' ? '#0F766E' : '#94A3B8'} />
                        <span>Tất cả chi nhánh</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>({branches.length})</span>
                        {selectedBranch === 'ALL' && <Check size={14} color="#0F766E" />}
                      </div>
                    </div>
                  )}

                  {/* Danh sách từng chi nhánh */}
                  {filteredBranchList.map((b) => {
                    const isSelected = selectedBranch === b.name;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBranch(b.name);
                          setIsBranchDropdownOpen(false);
                          setBranchSearchKeyword('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#0F766E' : '#334155',
                          background: isSelected ? '#F0FDFA' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isSelected ? '#0F766E' : '#CBD5E1',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {b.name}
                          </span>
                          {b.isMain && (
                            <span
                              style={{
                                fontSize: 10,
                                background: '#E2E8F0',
                                color: '#475569',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 500,
                              }}
                            >
                              Chính
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} color="#0F766E" style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}

                  {filteredBranchList.length === 0 && (
                    <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                      Không tìm thấy chi nhánh nào
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nút đặt lại */}
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleResetFilters}
          >
            Đặt lại bộ lọc
          </button>
        </aside>

        {/* NỘI DUNG CHÍNH (PHẢI) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* ─── 2.1 THẺ THỐNG KÊ KPI ĐỒNG NHẤT HỆ THỐNG ─── */}
          <div className="emp-kpi-grid">
            {/* Card 1: Tổng số phiếu */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Số phiếu lương</span>
                <div className="emp-kpi-icon emp-kpi-icon--teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#0F766E" />
                </div>
              </div>
              <div className="emp-kpi-value">{stats.totalCount}</div>
              <div className="emp-kpi-sub">Nhân sự trong kỳ {monthLabel}</div>
            </div>

            {/* Card 2: Tổng quỹ lương */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Tổng quỹ thực nhận</span>
                <div className="emp-kpi-icon emp-kpi-icon--blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} color="#1D4ED8" />
                </div>
              </div>
              <div className="emp-kpi-value" style={{ color: '#1D4ED8' }}>
                {formatVND(stats.totalNet)}
              </div>
              <div className="emp-kpi-sub">SUM(NetSalary) tháng</div>
            </div>

            {/* Card 3: Chưa thanh toán */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Chưa chi trả</span>
                <div className="emp-kpi-icon emp-kpi-icon--amber" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hourglass size={18} color="#D97706" />
                </div>
              </div>
              <div className="emp-kpi-value" style={{ color: '#D97706' }}>
                {formatVND(stats.unpaidNet)}
              </div>
              <div className="emp-kpi-sub">Cần duyệt chi qua VietQR/Quỹ</div>
            </div>

            {/* Card 4: Đã thanh toán */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Đã thanh toán</span>
                <div className="emp-kpi-icon emp-kpi-icon--emerald" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={18} color="#059669" />
                </div>
              </div>
              <div className="emp-kpi-value" style={{ color: '#059669' }}>
                {formatVND(stats.paidNet)}
              </div>
              <div className="emp-kpi-sub">Đã ghi nhận bút toán chi</div>
            </div>
          </div>

          {/* ─── 2.2 BẢNG DỮ LIỆU PHIẾU LƯƠNG CHUẨN KIOTVIET ─── */}
          <div className="emp-table-container" style={{ overflowX: 'auto', background: '#FFFFFF' }}>
            <table className="emp-table" style={{ width: '100%', minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: '#0F766E' }}
                      checked={
                        filteredPayslips.length > 0 &&
                        selectedIds.length === filteredPayslips.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: 95, whiteSpace: 'nowrap' }}>Mã NV</th>
                  <th style={{ minWidth: 200, whiteSpace: 'nowrap' }}>Nhân viên</th>
                  <th style={{ width: 110, textAlign: 'center', whiteSpace: 'nowrap' }}>Kỳ lương</th>
                  <th style={{ width: 120, textAlign: 'right', whiteSpace: 'nowrap' }}>Lương cơ sở</th>
                  <th style={{ width: 130, textAlign: 'right', whiteSpace: 'nowrap' }}>Thực nhận (Net)</th>
                  <th style={{ width: 140, textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ width: 100, textAlign: 'center', whiteSpace: 'nowrap' }}>Ngày trả</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: 'center',
                        padding: '50px 20px',
                        color: '#94A3B8',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <Inbox size={36} color="#94A3B8" />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        Không có phiếu lương nào phù hợp
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Vui lòng thử thay đổi kỳ lương hoặc chọn lại các tiêu chí lọc bên trái.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayslips.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isPaid = item.status === 'PAID';
                    const initials = item.employeeName
                      .split(' ')
                      .pop()
                      ?.charAt(0)
                      .toUpperCase() || 'E';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setViewingPayslip(item)}
                        title="Nhấn để xem chi tiết phiếu lương"
                        style={{
                          background: isSelected ? '#F0FDFA' : undefined,
                          cursor: 'pointer',
                        }}
                      >
                        <td
                          style={{ textAlign: 'center', width: 44 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            style={{ accentColor: '#0F766E' }}
                            checked={isSelected}
                            onChange={() => handleToggleRow(item.id)}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#0F766E',
                              background: '#F0FDFA',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #CCFBF1',
                              fontSize: 12.5,
                            }}
                          >
                            {item.employeeCode}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="emp-avatar-cell" style={{ flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13.5, lineHeight: 1.3 }}>
                                {item.employeeName}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#64748B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 2,
                                  whiteSpace: 'nowrap',
                                }}
                                title={item.branchName}
                              >
                                <Building2 size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.branchName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {item.periodMonth.split('-').length === 2
                              ? `Tháng ${item.periodMonth.split('-')[1]}/${item.periodMonth.split('-')[0]}`
                              : item.periodMonth}
                          </span>
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            color: '#64748B',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatVND(item.contractBaseSalary)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: '#047857',
                            fontSize: 14,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatVND(item.netSalary)}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {isPaid ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#059669',
                              }}
                            >
                              <Check size={14} strokeWidth={2.5} />
                              <span>Đã thanh toán</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#D97706',
                              }}
                            >
                              <Clock size={14} strokeWidth={2.2} />
                              <span>Chưa thanh toán</span>
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatDate(item.paidAt)}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 3. MODALS ─── */}
      <CreatePayslipModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreatePayslip={(newSlip) => setPayslips((prev) => [newSlip, ...prev])}
      />

      <PayslipDetailModal
        isOpen={!!viewingPayslip}
        onClose={() => setViewingPayslip(null)}
        payslip={viewingPayslip}
        onPayNow={(p) => {
          setViewingPayslip(null);
          setPayingPayslip(p);
        }}
      />

      <PayslipPaymentModal
        isOpen={!!payingPayslip}
        onClose={() => setPayingPayslip(null)}
        payslip={payingPayslip}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};

export default PayslipManagementPage;
