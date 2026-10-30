import type { CSSProperties, FC, KeyboardEvent } from 'react';
import { Search, RotateCcw, Filter, Printer, Building2 } from 'lucide-react';
import type { BatchFilterState, BatchStatus, UserRole } from '../types/batch.types';
import { MOCK_BATCH_BRANCHES } from '../lib/mockBatchData';

interface BatchFilterBarProps {
  filterInputs: BatchFilterState;
  role: UserRole;
  employeeBranchId?: string;
  onFilterChange: <K extends keyof BatchFilterState>(key: K, value: BatchFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
  onPrint: () => void;
}

const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: '#475569',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const inputStyle: CSSProperties = {
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 12.5,
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = (active: boolean): CSSProperties => ({
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: active ? '1px solid #0d9488' : '1px solid #cbd5e1',
  fontSize: 12.5,
  fontWeight: 600,
  color: active ? '#0f766e' : '#334155',
  backgroundColor: active ? '#f0fdfa' : '#ffffff',
  cursor: 'pointer',
  outline: 'none',
});

export const BatchFilterBar: FC<BatchFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = 'BR-01',
  onFilterChange,
  onSearch,
  onReset,
  onPrint,
}) => {
  const isEmployee = role === 'employee';

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 8,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="batch-product-name">
            Tên sản phẩm:
          </label>
          <input
            id="batch-product-name"
            type="text"
            value={filterInputs.productName}
            onChange={(e) => onFilterChange('productName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: Sữa Vinamilk..."
            style={{ ...inputStyle, width: 220 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="batch-sku">
            Mã SKU:
          </label>
          <input
            id="batch-sku"
            type="text"
            value={filterInputs.sku}
            onChange={(e) => onFilterChange('sku', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: DY-SUA-01..."
            style={{ ...inputStyle, width: 150, fontFamily: 'var(--font-mono, monospace)' }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="batch-code">
            Mã lô:
          </label>
          <input
            id="batch-code"
            type="text"
            value={filterInputs.batchCode}
            onChange={(e) => onFilterChange('batchCode', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: BAT-202608-03..."
            style={{ ...inputStyle, width: 170, fontFamily: 'var(--font-mono, monospace)' }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="batch-supplier">
            Nhà cung cấp:
          </label>
          <input
            id="batch-supplier"
            type="text"
            value={filterInputs.supplierName}
            onChange={(e) => onFilterChange('supplierName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: Tươi Sạch..."
            style={{ ...inputStyle, width: 200 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>
      </div>

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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle} htmlFor="batch-branch">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} color="#64748b" />
                Chi nhánh:
              </span>
            </label>
            {isEmployee ? (
              <div
                style={{
                  height: 32,
                  padding: '0 10px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 12.5,
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
                id="batch-branch"
                value={filterInputs.branchId}
                onChange={(e) => onFilterChange('branchId', e.target.value)}
                style={selectStyle(filterInputs.branchId !== 'ALL')}
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

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle} htmlFor="batch-status">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Filter size={13} color="#64748b" />
                Trạng thái hạn dùng:
              </span>
            </label>
            <select
              id="batch-status"
              value={filterInputs.status}
              onChange={(e) => onFilterChange('status', e.target.value as 'ALL' | BatchStatus)}
              style={selectStyle(filterInputs.status !== 'ALL')}
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="Expired">Quá hạn (≤ 0 ngày)</option>
              <option value="Critical">Khẩn cấp (1 - 3 ngày)</option>
              <option value="Warning">Cảnh báo (4 - 30 ngày)</option>
              <option value="Normal">An toàn (&gt; 30 ngày)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
              height: 32,
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
    </div>
  );
};
