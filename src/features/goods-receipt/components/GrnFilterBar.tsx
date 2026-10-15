import type { FC } from 'react';
import { Search, RotateCcw, Filter, Calendar, Truck, Clock, AlertTriangle, Layers } from 'lucide-react';
import type { GrnFilterState, GrnFilterTab, UserRole } from '../types/grn.types';
import { MOCK_GRN_BRANCHES, MOCK_GRN_SUPPLIERS } from '../lib/mockGrnData';

interface GrnFilterBarProps {
  filterInputs: GrnFilterState;
  role: UserRole;
  employeeBranchId?: string;
  activeTab: GrnFilterTab;
  tabCounts: {
    all: number;
    today: number;
    draft: number;
    mismatch: number;
  };
  onTabChange: (tab: GrnFilterTab) => void;
  onFilterChange: <K extends keyof GrnFilterState>(key: K, value: GrnFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
}

export const GrnFilterBar: FC<GrnFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = 'BR-01',
  activeTab,
  tabCounts,
  onTabChange,
  onFilterChange,
  onSearch,
  onReset,
}) => {
  const isEmployee = role === 'employee';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 12,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* ── Dòng 1: Tìm kiếm + Chi nhánh + Nhà cung cấp + Trạng thái ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 1. Keyword search */}
        <div style={{ position: 'relative', width: 280, minWidth: 220, flex: '1 1 260px' }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={filterInputs.keyword}
            onChange={(e) => onFilterChange('keyword', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
            placeholder="Tìm theo Mã GRN, Mã PO, NCC, Lô, Thủ kho..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 32,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Chi nhánh nhận */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Chi nhánh nhận:
          </label>
          {isEmployee ? (
            <div
              style={{
                height: 34,
                padding: '0 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#1e293b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Nhân viên chỉ có quyền xem dữ liệu tại chi nhánh được phân công"
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}
              />
              {MOCK_GRN_BRANCHES.find((b) => b.id === employeeBranchId)?.name || employeeBranchId}
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                Cố định
              </span>
            </div>
          ) : (
            <select
              value={filterInputs.branchId}
              onChange={(e) => onFilterChange('branchId', e.target.value)}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: filterInputs.branchId !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                color: filterInputs.branchId !== 'ALL' ? '#0f766e' : '#334155',
                backgroundColor: filterInputs.branchId !== 'ALL' ? '#f0fdfa' : '#ffffff',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">-- Tất cả chi nhánh --</option>
              {MOCK_GRN_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 3. Nhà cung cấp */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Nhà cung cấp:
          </label>
          <select
            value={filterInputs.supplierId}
            onChange={(e) => onFilterChange('supplierId', e.target.value)}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: filterInputs.supplierId !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: filterInputs.supplierId !== 'ALL' ? '#0f766e' : '#334155',
              backgroundColor: filterInputs.supplierId !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">-- Tất cả nhà cung cấp --</option>
            {MOCK_GRN_SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Trạng thái */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
            <Filter size={12} color="#64748b" />
            <span>Trạng thái:</span>
          </label>
          <select
            value={filterInputs.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: filterInputs.status !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: filterInputs.status !== 'ALL' ? '#0f766e' : '#334155',
              backgroundColor: filterInputs.status !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="TODAY">Scheduled (Lịch nhận)</option>
            <option value="DRAFT">Draft (Đang kiểm hàng)</option>
            <option value="CONFIRMED">Confirmed (Đã nhập kho)</option>
            <option value="MISMATCH">Mismatch (Lệch PO)</option>
            <option value="CANCELED">Cancelled (Đã hủy)</option>
          </select>
        </div>
      </div>

      {/* ── Dòng 2: Quick Tabs + Khoảng ngày + Nút Tìm kiếm & Đặt lại ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px dashed #f1f5f9',
        }}
      >
        {/* Quick View Tabs Pill Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
            <Layers size={13} />
            Xem nhanh:
          </span>

          {/* Tất cả */}
          <button
            type="button"
            onClick={() => onTabChange('ALL')}
            style={{
              height: 28,
              padding: '0 9px',
              fontSize: 11.5,
              fontWeight: activeTab === 'ALL' ? 700 : 500,
              borderRadius: 5,
              border: activeTab === 'ALL' ? '1px solid #0f766e' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'ALL' ? '#f0fdfa' : '#ffffff',
              color: activeTab === 'ALL' ? '#0f766e' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>Tất cả</span>
            <span
              style={{
                padding: '0 5px',
                fontSize: 10.5,
                borderRadius: 8,
                backgroundColor: activeTab === 'ALL' ? '#ccfbf1' : '#f1f5f9',
                color: activeTab === 'ALL' ? '#0f766e' : '#64748b',
                fontWeight: 700,
              }}
            >
              {tabCounts.all}
            </span>
          </button>

          {/* Hôm nay */}
          <button
            type="button"
            onClick={() => onTabChange('TODAY')}
            style={{
              height: 28,
              padding: '0 9px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 5,
              border: activeTab === 'TODAY' ? '1.5px solid #0284c7' : '1px solid #bae6fd',
              backgroundColor: activeTab === 'TODAY' ? '#e0f2fe' : '#f0f9ff',
              color: '#0369a1',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Truck size={12} />
            <span>Hôm nay</span>
            <span
              style={{
                padding: '0 5px',
                fontSize: 10.5,
                borderRadius: 8,
                backgroundColor: '#bae6fd',
                color: '#0369a1',
                fontWeight: 800,
              }}
            >
              {tabCounts.today}
            </span>
          </button>

          {/* Chờ duyệt (Draft) */}
          <button
            type="button"
            onClick={() => onTabChange('DRAFT')}
            style={{
              height: 28,
              padding: '0 9px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 5,
              border: activeTab === 'DRAFT' ? '1.5px solid #d97706' : '1px solid #fde68a',
              backgroundColor: activeTab === 'DRAFT' ? '#fef3c7' : '#fffdf5',
              color: '#b45309',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Clock size={12} />
            <span>Chờ duyệt</span>
            <span
              style={{
                padding: '0 5px',
                fontSize: 10.5,
                borderRadius: 8,
                backgroundColor: '#fde68a',
                color: '#b45309',
                fontWeight: 700,
              }}
            >
              {tabCounts.draft}
            </span>
          </button>

          {/* Lệch hàng (Mismatch) */}
          <button
            type="button"
            onClick={() => onTabChange('MISMATCH')}
            style={{
              height: 28,
              padding: '0 9px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 5,
              border: activeTab === 'MISMATCH' ? '1.5px solid #dc2626' : '1px solid #fca5a5',
              backgroundColor: activeTab === 'MISMATCH' ? '#fee2e2' : '#fff5f5',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <AlertTriangle size={12} />
            <span>Lệch hàng</span>
            <span
              style={{
                padding: '0 5px',
                fontSize: 10.5,
                borderRadius: 8,
                backgroundColor: '#fca5a5',
                color: '#991b1b',
                fontWeight: 800,
              }}
            >
              {tabCounts.mismatch}
            </span>
          </button>
        </div>

        {/* Center/Right: Date range + Search & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* Từ ngày */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} color="#64748b" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Từ ngày:
            </span>
            <input
              type="date"
              value={filterInputs.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Đến ngày */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Đến ngày:
            </span>
            <input
              type="date"
              value={filterInputs.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Nút Tìm kiếm & Đặt lại */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={onSearch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'var(--blue-primary, #0f766e)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Áp dụng bộ lọc tìm kiếm"
            >
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Đặt lại toàn bộ tiêu chí lọc"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
