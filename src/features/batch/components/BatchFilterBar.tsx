import type { FC } from 'react';
import { Search, RotateCcw, Filter, Printer, Building2 } from 'lucide-react';
import type { BatchFilterState, BatchStatus, UserRole } from '../types/batch.types';
import { MOCK_BATCH_BRANCHES } from '../lib/mockBatchData';

interface BatchFilterBarProps {
  filterInputs: BatchFilterState;
  role: UserRole;
  employeeBranchId?: string;
  totalFiltered: number;
  totalAll: number;
  onFilterChange: <K extends keyof BatchFilterState>(key: K, value: BatchFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
  onPrint: () => void;
}

export const BatchFilterBar: FC<BatchFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = 'BR-01',
  totalFiltered,
  totalAll,
  onFilterChange,
  onSearch,
  onReset,
  onPrint,
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
      {/* ── Hàng 1: Bộ lọc chính (Tìm kiếm + Chi nhánh + Trạng thái hạn dùng + Hành động) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 1. Ô tìm kiếm từ khóa đa năng */}
        <div style={{ position: 'relative', width: 320, minWidth: 240, flex: '1 1 280px' }}>
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
            placeholder="Tìm theo Tên sản phẩm, SKU, Mã lô, Nhà cung cấp..."
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

        {/* 2. Chi nhánh lưu kho */}
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
            <Building2 size={13} color="#64748b" />
            <span>Chi nhánh:</span>
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
              {MOCK_BATCH_BRANCHES.find((b) => b.id === employeeBranchId)?.name || employeeBranchId}
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
              {MOCK_BATCH_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 3. Trạng thái hạn sử dụng */}
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
            <Filter size={13} color="#64748b" />
            <span>Trạng thái hạn dùng:</span>
          </label>
          <select
            value={filterInputs.status}
            onChange={(e) => onFilterChange('status', e.target.value as 'ALL' | BatchStatus)}
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
            <option value="Expired">☠️ Quá hạn (≤ 0 ngày)</option>
            <option value="Critical">🚨 Khẩn cấp (1 - 3 ngày)</option>
            <option value="Warning">⚠️ Cảnh báo (4 - 30 ngày)</option>
            <option value="Normal">✅ An toàn (&gt; 30 ngày)</option>
          </select>
        </div>

        {/* 4. Action Buttons */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
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
            title="Áp dụng tìm kiếm"
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
              height: 34,
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

          <button
            type="button"
            onClick={onPrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f766e',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="In báo cáo kiểm kê hạn sử dụng ra khổ giấy A4"
          >
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* ── Hàng 2: Dòng thông tin kết quả lọc ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          borderTop: '1px dashed #f1f5f9',
          paddingTop: 6,
        }}
      >
        <div>
          Đang hiển thị <b>{totalFiltered}</b> trên tổng số <b>{totalAll}</b> lô hàng được theo dõi FEFO.
        </div>
        {(filterInputs.keyword || filterInputs.branchId !== 'ALL' || filterInputs.status !== 'ALL') && (
          <div style={{ color: '#0d9488', fontWeight: 600 }}>
            * Bộ lọc đang hoạt động
          </div>
        )}
      </div>
    </div>
  );
};
