import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_BRANCH_LIST } from '../lib/mockData';
import type { BranchListItem, BranchFilterState } from '../types/po.types';
import { BranchOrderTable } from '../components/branch/BranchOrderTable';
import {
  Building2,
  History,
  Search,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import '../purchase-order.css';

const DEFAULT_FILTERS: BranchFilterState = {
  keyword: '',
  branchCode: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  pageIndex: 1,
  pageSize: 10,
};

const parseLastUpdated = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === '—') return null;
  const parts = dateStr.trim().split(' ');
  if (!parts[0]) return null;
  const dmy = parts[0].split('/');
  if (dmy.length !== 3) return null;
  const day = parseInt(dmy[0], 10);
  const month = parseInt(dmy[1], 10) - 1;
  const year = parseInt(dmy[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
};

export const BranchOrderListPage: FC = () => {
  const navigate = useNavigate();

  // State
  const [branches] = useState<BranchListItem[]>(MOCK_BRANCH_LIST);
  const [filterInputs, setFilterInputs] = useState<BranchFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BranchFilterState>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPageIndex(1);
  };

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Branch code options
  const branchCodeOptions = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      if (b.code) set.add(b.code);
    });
    return Array.from(set);
  }, [branches]);

  // Filtered branches (only recomputed when appliedFilters changes)
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      // Keyword
      if (appliedFilters.keyword.trim()) {
        const kw = appliedFilters.keyword.trim().toLowerCase();
        const match =
          b.code.toLowerCase().includes(kw) ||
          b.name.toLowerCase().includes(kw) ||
          b.address.toLowerCase().includes(kw) ||
          b.managerName.toLowerCase().includes(kw);
        if (!match) return false;
      }

      // Branch Code
      if (appliedFilters.branchCode !== 'all') {
        if (b.code !== appliedFilters.branchCode) return false;
      }

      // Status
      if (appliedFilters.status !== 'all') {
        if (b.status !== appliedFilters.status) return false;
      }

      // Date from
      if (appliedFilters.dateFrom) {
        const from = new Date(appliedFilters.dateFrom);
        from.setHours(0, 0, 0, 0);
        const itemDate = parseLastUpdated(b.lastUpdated);
        if (!itemDate || itemDate < from) return false;
      }

      // Date to
      if (appliedFilters.dateTo) {
        const to = new Date(appliedFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        const itemDate = parseLastUpdated(b.lastUpdated);
        if (!itemDate || itemDate > to) return false;
      }

      return true;
    });
  }, [branches, appliedFilters]);

  // Paged branches
  const pagedBranches = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredBranches.slice(start, start + pageSize);
  }, [filteredBranches, pageIndex, pageSize]);

  const handleSearch = () => {
    setAppliedFilters({ ...filterInputs });
    setPageIndex(1);
  };

  const handleResetFilters = () => {
    setFilterInputs(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageIndex(1);
  };

  const handleOrder = (branchId: string) => {
    navigate(`/store-owner/purchase-orders/create-matrix?branchId=${branchId}`);
  };

  const handleViewDetail = (branch: BranchListItem) => {
    navigate(`/store-owner/purchase-orders/create-matrix?branchId=${branch.id}&mode=view`);
  };

  return (
    <div className="po-matrix-container">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── 1. Page Header (matching OrderMatrixHeader style) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Building2 size={22} style={{ color: 'var(--blue-primary)' }} />
            Đặt hàng theo chi nhánh
          </h1>
        </div>

        {/* Optional Action: Lịch sử đơn hàng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              showToast('Tính năng lịch sử đơn hàng đang được cập nhật.', 'info');
            }}
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 14px' }}
            title="Xem lịch sử các đơn mua hàng đã tạo"
          >
            <History size={14} />
            <span>Lịch sử đơn hàng</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Filter Bar (matching OrderMatrixFilterBar po-unified-bar) ── */}
      <div className="po-unified-bar">
        {/* Search input (thu nhỏ width lại) */}
        <div className="po-ctrl-search" style={{ width: 175, flex: '0 0 175px' }}>
          <Search size={14} className="po-ctrl-search-icon" />
          <input
            type="text"
            className="po-ctrl-search-input"
            placeholder="Tìm tên, địa chỉ..."
            value={filterInputs.keyword}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            onChange={(e) =>
              setFilterInputs((prev) => ({
                ...prev,
                keyword: e.target.value,
              }))
            }
          />
        </div>

        <div className="po-bar-divider" />

        {/* Mã chi nhánh Dropdown */}
        <div className="po-bar-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Mã CN:
          </label>
          <select
            className="po-ctrl-select"
            style={{ minWidth: 105 }}
            value={filterInputs.branchCode}
            onChange={(e) =>
              setFilterInputs((prev) => ({
                ...prev,
                branchCode: e.target.value,
              }))
            }
          >
            <option value="all">Tất cả mã</option>
            {branchCodeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="po-bar-divider" />

        {/* Status Dropdown */}
        <div className="po-bar-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Trạng thái:
          </label>
          <select
            className="po-ctrl-select"
            style={{ minWidth: 135 }}
            value={filterInputs.status}
            onChange={(e) =>
              setFilterInputs((prev) => ({
                ...prev,
                status: e.target.value as BranchFilterState['status'],
              }))
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="po-bar-divider" />

        {/* Date From - Date To (Thời gian cập nhật) */}
        <div className="po-bar-group">
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Calendar size={13} style={{ color: '#64748b' }} />
            Cập nhật:
          </label>
          <input
            type="date"
            className="po-ctrl-date"
            style={{ width: 128 }}
            value={filterInputs.dateFrom}
            title="Từ ngày cập nhật"
            onChange={(e) =>
              setFilterInputs((prev) => ({
                ...prev,
                dateFrom: e.target.value,
              }))
            }
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          <input
            type="date"
            className="po-ctrl-date"
            style={{ width: 128 }}
            value={filterInputs.dateTo}
            title="Đến ngày cập nhật"
            onChange={(e) =>
              setFilterInputs((prev) => ({
                ...prev,
                dateTo: e.target.value,
              }))
            }
          />
        </div>

        {/* Cụm nút thao tác căn phải: Tìm kiếm & Đặt lại */}
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Nút Tìm kiếm */}
          <button
            type="button"
            onClick={handleSearch}
            className="po-ctrl-btn-search"
            title="Thực hiện tìm kiếm theo bộ lọc"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 16px',
              borderRadius: 7,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          {/* Nút Reset / Đặt lại */}
          <button
            type="button"
            className="po-ctrl-btn-reset"
            onClick={handleResetFilters}
            title="Đặt lại toàn bộ bộ lọc về mặc định"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 32,
              padding: '0 14px',
              borderRadius: 7,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* ── 3. Main Matrix Table Layout (matching po-table-flex) ── */}
      <div className="po-table-flex">
        <BranchOrderTable
          branches={pagedBranches}
          totalCount={filteredBranches.length}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={handlePageSizeChange}
          onViewDetail={handleViewDetail}
          onOrder={handleOrder}
        />
      </div>
    </div>
  );
};

export default BranchOrderListPage;
