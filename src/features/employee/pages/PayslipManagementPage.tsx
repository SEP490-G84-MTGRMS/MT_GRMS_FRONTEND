import React, { useState, useMemo } from 'react';
import type { PayslipDetailedRecord, Branch } from '../types';
import { MOCK_PAYSLIPS_MANAGEMENT, MOCK_BRANCHES, MOCK_JOB_TITLES } from '../services/mockData';
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
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [viewingPayslip, setViewingPayslip] = useState<PayslipDetailedRecord | null>(null);
  const [payingPayslip, setPayingPayslip] = useState<PayslipDetailedRecord | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState<boolean>(false);

  // Format Helpers
  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return `${num.toLocaleString('vi-VN')} đ`;
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
      // 4. Job title
      if (selectedJobTitle !== 'ALL' && item.jobTitle !== selectedJobTitle) {
        return false;
      }
      // 5. Keyword search
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchName = item.employeeName.toLowerCase().includes(q);
        const matchCode = item.employeeCode.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchTitle = item.jobTitle.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId && !matchTitle) {
          return false;
        }
      }
      return true;
    });
  }, [payslips, periodMonth, statusFilter, selectedBranch, selectedJobTitle, keyword]);

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
    setSelectedJobTitle('ALL');
  };

  return (
    <div className="emp-page-container">
      {/* ─── 1. HEADER BAR ĐỒNG NHẤT VỚI HỆ THỐNG ─── */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h2 className="emp-header-title">
            <span>Bảng tính lương</span>
            <span className="count-badge">{filteredPayslips.length}</span>
          </h2>

          {/* Ô tìm kiếm bo tròn full pill */}
          <div className="emp-search-box">
            <span className="emp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo mã, tên NV, chức danh..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Điều hướng kỳ tháng đồng nhất với Attendance / WorkSchedule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8FAFC',
              padding: '4px 12px',
              borderRadius: 9999,
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#475569',
              }}
              onClick={handlePrevMonth}
              title="Tháng trước"
            >
              &larr;
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>{monthLabel}</span>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#475569',
              }}
              onClick={handleNextMonth}
              title="Tháng sau"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Nút hành động chuẩn */}
        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            + Khởi tạo bảng lương
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={handleBatchPay}
            disabled={selectedIds.length === 0}
            style={{
              opacity: selectedIds.length === 0 ? 0.6 : 1,
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            💳 Chi trả hàng loạt {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ In danh sách
          </button>

          {/* Action Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ width: 40, padding: 0 }}
              onClick={() => setShowActionDropdown(!showActionDropdown)}
            >
              &bull;&bull;&bull;
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
                  📥 Xuất file Excel
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
                  ➕ Tính lại lương tháng
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

          {/* Nhóm 3: Chi nhánh */}
          <div className="emp-filter-group">
            <div className="emp-filter-title">
              <span>Chi nhánh</span>
            </div>
            <label className="emp-radio-label">
              <input
                type="radio"
                name="payroll_branch"
                checked={selectedBranch === 'ALL'}
                onChange={() => setSelectedBranch('ALL')}
              />
              <span>Tất cả chi nhánh</span>
            </label>
            {branches.map((b) => (
              <label key={b.id} className="emp-radio-label">
                <input
                  type="radio"
                  name="payroll_branch"
                  checked={selectedBranch === b.name}
                  onChange={() => setSelectedBranch(b.name)}
                />
                <span>{b.name}</span>
              </label>
            ))}
          </div>

          {/* Nhóm 4: Chức danh */}
          <div className="emp-filter-group">
            <div className="emp-filter-title">
              <span>Chức danh</span>
            </div>
            <select
              className="emp-filter-select"
              value={selectedJobTitle}
              onChange={(e) => setSelectedJobTitle(e.target.value)}
            >
              <option value="ALL">-- Tất cả chức danh --</option>
              {MOCK_JOB_TITLES.map((jt) => (
                <option key={jt.id} value={jt.name}>
                  {jt.name}
                </option>
              ))}
            </select>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ─── 2.1 THẺ THỐNG KÊ KPI ĐỒNG NHẤT HỆ THỐNG ─── */}
          <div className="emp-kpi-grid">
            {/* Card 1: Tổng số phiếu */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Số phiếu lương</span>
                <div className="emp-kpi-icon emp-kpi-icon--teal">👥</div>
              </div>
              <div className="emp-kpi-value">{stats.totalCount}</div>
              <div className="emp-kpi-sub">Nhân sự trong kỳ {monthLabel}</div>
            </div>

            {/* Card 2: Tổng quỹ lương */}
            <div className="emp-kpi-card">
              <div className="emp-kpi-header">
                <span className="emp-kpi-label">Tổng quỹ thực nhận</span>
                <div className="emp-kpi-icon emp-kpi-icon--blue">💰</div>
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
                <div className="emp-kpi-icon emp-kpi-icon--amber">⏳</div>
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
                <div className="emp-kpi-icon emp-kpi-icon--emerald">✓</div>
              </div>
              <div className="emp-kpi-value" style={{ color: '#059669' }}>
                {formatVND(stats.paidNet)}
              </div>
              <div className="emp-kpi-sub">Đã ghi nhận bút toán chi</div>
            </div>
          </div>

          {/* ─── 2.2 BẢNG DỮ LIỆU PHIẾU LƯƠNG CHUẨN KIOTVIET ─── */}
          <div className="emp-table-container">
            <table className="emp-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
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
                  <th style={{ width: 50, textAlign: 'center' }}></th>
                  <th style={{ width: 110 }}>Mã NV</th>
                  <th>Tên nhân viên</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Kỳ lương</th>
                  <th style={{ textAlign: 'center' }}>Công chuẩn | OT</th>
                  <th style={{ textAlign: 'right' }}>Lương cơ sở</th>
                  <th style={{ textAlign: 'right' }}>Thực nhận (Net)</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Ngày trả</th>
                  <th style={{ textAlign: 'center', width: 150 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      style={{
                        textAlign: 'center',
                        padding: '50px 20px',
                        color: '#94A3B8',
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
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
                        style={{
                          background: isSelected ? '#F0FDFA' : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            style={{ accentColor: '#0F766E' }}
                            checked={isSelected}
                            onChange={() => handleToggleRow(item.id)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="emp-avatar-cell" style={{ margin: '0 auto' }}>
                            {initials}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0F766E' }}>
                            {item.employeeCode}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            {item.employeeName}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>
                            {item.jobTitle} &bull; {item.branchName}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                          {item.periodMonth}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{item.workedDays}</span> công
                          {item.otHours > 0 && (
                            <span style={{ color: '#0F766E', fontWeight: 600, marginLeft: 4 }}>
                              | {item.otHours}h OT
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748B' }}>
                          {formatVND(item.contractBaseSalary)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: '#047857',
                            fontSize: 14,
                          }}
                        >
                          {formatVND(item.netSalary)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isPaid ? (
                            <span className="emp-status-pill active">
                              ✓ Đã thanh toán
                            </span>
                          ) : (
                            <span className="emp-status-pill warning">
                              Chưa thanh toán
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: '#64748B' }}>
                          {item.paidAt ? item.paidAt.split(' ')[0] : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              className="emp-btn emp-btn-secondary"
                              style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                              onClick={() => setViewingPayslip(item)}
                            >
                              Chi tiết
                            </button>
                            {!isPaid ? (
                              <button
                                type="button"
                                className="emp-btn emp-btn-primary"
                                style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                                onClick={() => setPayingPayslip(item)}
                              >
                                💳 Trả lương
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#059669',
                                  padding: '0 6px',
                                }}
                              >
                                Hoàn tất
                              </span>
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
