import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  HelpCircle,
} from 'lucide-react';
import type { PnlLineItem } from '../types/reportsPnl.types';

interface PnlStatementTableProps {
  pnlTree: PnlLineItem[];
  isLoading: boolean;
}

function formatVnd(val: number): string {
  const isNeg = val < 0;
  const absFormatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.abs(val));

  return isNeg ? `(${absFormatted})` : absFormatted;
}

/**
 * Recursive Row component for P&L tree hierarchy.
 */
const PnlTableRow: React.FC<{
  item: PnlLineItem;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}> = ({ item, expandedIds, onToggle }) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);

  let rowClass = 'pnl-row-hover';
  if (item.isTotal) {
    rowClass = 'pnl-row-total';
  } else if (item.isHeader) {
    rowClass = 'pnl-row-header';
  }

  // Padding indent for hierarchy
  const indentPx = item.level === 1 ? 16 : item.level === 2 ? 38 : 60;

  return (
    <>
      <tr className={rowClass}>
        {/* Code Column */}
        <td className="pnl-td" style={{ fontFamily: 'var(--font-mono)', width: '90px', color: '#94A3B8', fontSize: '0.75rem' }}>
          {item.code}
        </td>

        {/* Title with expand toggle */}
        <td className="pnl-td" style={{ paddingLeft: `${indentPx}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '3px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span style={{ width: '20px', display: 'inline-block' }} />
            )}
            <span style={{ fontWeight: item.isHeader || item.isTotal ? 800 : 500 }}>
              {item.title}
            </span>
          </div>
        </td>

        {/* Amount Column */}
        <td className="pnl-td" style={{ textAlign: 'right', fontWeight: item.isTotal ? 800 : 600, width: '180px' }}>
          <span style={{ color: item.isNegative && !item.isTotal ? '#DC2626' : undefined }}>
            {formatVnd(item.amount)}
          </span>
        </td>

        {/* Percentage Column with Mini Progress Bar */}
        <td className="pnl-td" style={{ textAlign: 'right', width: '170px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <div className="pnl-progress-bar-bg">
              <div
                className="pnl-progress-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(item.percentageOfNetRevenue), 100)}%`,
                  backgroundColor: item.isTotal ? 'var(--blue-primary, #0F766E)' : '#14B8A6',
                }}
              />
            </div>
            <span style={{ fontWeight: 700, minWidth: '45px', textAlign: 'right' }}>
              {item.percentageOfNetRevenue}%
            </span>
          </div>
        </td>
      </tr>

      {/* Render children if expanded */}
      {hasChildren &&
        isExpanded &&
        item.children!.map((child) => (
          <PnlTableRow
            key={child.id}
            item={child}
            expandedIds={expandedIds}
            onToggle={onToggle}
          />
        ))}
    </>
  );
};

/**
 * P&L Statement Table with collapsible tree view and formatting.
 */
export const PnlStatementTable: React.FC<PnlStatementTableProps> = ({
  pnlTree,
  isLoading,
}) => {
  const getAllParentIds = (items: PnlLineItem[]): string[] => {
    let ids: string[] = [];
    for (const it of items) {
      if (it.children && it.children.length > 0) {
        ids.push(it.id);
        ids = ids.concat(getAllParentIds(it.children));
      }
    }
    return ids;
  };

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(['sec-1', 'sec-2', 'sec-3', 'item-1-2', 'item-3-2'])
  );

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(getAllParentIds(pnlTree)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="pnl-table-box" style={{ padding: '24px', opacity: 0.6 }}>
        <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '8px', width: '40%', marginBottom: '20px' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: '36px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="pnl-table-box">
      {/* Table Header Controls Bar */}
      <div className="pnl-table-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pnl-card-icon-badge" style={{ background: 'var(--blue-subtle, #CCFBF1)', color: 'var(--blue-primary, #0F766E)' }}>
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main, #111827)', margin: 0 }}>
              Báo Cáo Kết Quả Hoạt Động Kinh Doanh (P&L Statement)
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #4b5563)', margin: '2px 0 0 0' }}>
              Cân đối Doanh thu, Giá vốn xuất kho (FEFO), Chi phí vận hành & Lợi nhuận
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExpandAll}
            className="btn-secondary-pill"
            style={{ fontSize: '0.76rem', padding: '6px 14px' }}
          >
            <Maximize2 size={12} />
            <span>Mở rộng tất cả</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="btn-secondary-pill"
            style={{ fontSize: '0.76rem', padding: '6px 14px' }}
          >
            <Minimize2 size={12} />
            <span>Thu gọn tất cả</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="pnl-table-element">
          <thead>
            <tr>
              <th className="pnl-th" style={{ width: '90px' }}>Mã</th>
              <th className="pnl-th">Khoản Mục Tài Chính</th>
              <th className="pnl-th" style={{ textAlign: 'right', width: '180px' }}>Số Tiền (VNĐ)</th>
              <th className="pnl-th" style={{ textAlign: 'right', width: '170px' }}>Tỷ Lệ / Doanh Thu</th>
            </tr>
          </thead>
          <tbody>
            {pnlTree.map((item) => (
              <PnlTableRow
                key={item.id}
                item={item}
                expandedIds={expandedIds}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Notes */}
      <div style={{ padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid var(--border-subtle, #e5edf8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted, #4b5563)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} style={{ color: 'var(--blue-primary, #0F766E)' }} />
          <span>
            * Số liệu tính toán từ Doanh số bán POS, Giá vốn theo lô FEFO, và Chứng từ chi phí FE-07.
          </span>
        </div>
        <span style={{ fontWeight: 600 }}>Đơn vị tính: VNĐ</span>
      </div>
    </div>
  );
};
