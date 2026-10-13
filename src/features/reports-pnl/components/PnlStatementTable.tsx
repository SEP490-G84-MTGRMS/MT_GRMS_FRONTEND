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

  // Styling based on level and status
  let rowBg = 'hover:bg-gray-50';
  let textClass = 'text-gray-800 text-xs';
  let borderBottom = 'border-b border-gray-100';

  if (item.isTotal) {
    rowBg = 'bg-teal-50/80 hover:bg-teal-100/70 font-bold';
    textClass = 'text-teal-950 text-xs font-bold';
    borderBottom = 'border-b-2 border-teal-300';
  } else if (item.isHeader) {
    rowBg = 'bg-gray-100/90 hover:bg-gray-200/80 font-bold tracking-wide';
    textClass = 'text-gray-900 text-xs font-bold';
    borderBottom = 'border-b border-gray-200';
  } else if (item.level === 3) {
    textClass = 'text-gray-600 text-xs pl-4';
  }

  // Padding indent for hierarchy
  const indentClass =
    item.level === 1 ? 'pl-4' : item.level === 2 ? 'pl-9' : 'pl-14';

  return (
    <>
      <tr className={`transition-colors duration-150 ${rowBg} ${borderBottom}`}>
        {/* Code */}
        <td className="py-2.5 px-3 text-xs font-mono text-gray-400 w-24 shrink-0">
          {item.code}
        </td>

        {/* Title with expand toggle */}
        <td className={`py-2.5 px-3 ${indentClass}`}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors"
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className={textClass}>{item.title}</span>
          </div>
        </td>

        {/* Amount */}
        <td className="py-2.5 px-3 text-right font-medium text-xs">
          <span
            className={
              item.isNegative && !item.isTotal
                ? 'text-rose-600'
                : item.isTotal
                ? 'text-emerald-900 font-bold'
                : 'text-gray-900'
            }
          >
            {formatVnd(item.amount)}
          </span>
        </td>

        {/* Percentage of Net Revenue */}
        <td className="py-2.5 px-4 text-right text-xs text-gray-500 w-44">
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full ${
                  item.isTotal ? 'bg-emerald-600' : 'bg-teal-500'
                }`}
                style={{
                  width: `${Math.min(Math.abs(item.percentageOfNetRevenue), 100)}%`,
                }}
              />
            </div>
            <span
              className={`font-semibold text-xs w-12 text-right ${
                item.isTotal ? 'text-emerald-900' : 'text-gray-700'
              }`}
            >
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
  // Collect all expandable ids initially expanded
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] border border-teal-200/80 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-teal-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-800 rounded-xl shadow-xs">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Báo Cáo Kết Quả Kinh Doanh (P&L Statement)
            </h3>
            <p className="text-xs text-gray-500">
              Cân đối Doanh thu, Giá vốn xuất kho (FEFO), Chi phí vận hành & Lợi nhuận
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExpandAll}
            className="btn-secondary-pill text-xs py-1 px-3"
          >
            <Maximize2 size={12} />
            Mở rộng tất cả
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="btn-secondary-pill text-xs py-1 px-3"
          >
            <Minimize2 size={12} />
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/75 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-24">Mã</th>
              <th className="py-2.5 px-3">Khoản Mục Tài Chính</th>
              <th className="py-2.5 px-3 text-right w-44">Số Tiền (VNĐ)</th>
              <th className="py-2.5 px-4 text-right w-44">Tỷ Lệ / Doanh Thu</th>
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
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px]">
          <HelpCircle size={13} className="text-gray-400" />
          <span>
            * Số liệu tính toán trực tiếp từ Doanh số bán POS, Giá vốn theo lô FEFO, và Chứng từ chi phí FE-07.
          </span>
        </div>
        <span className="text-[11px] font-medium text-gray-400">Đơn vị: VNĐ</span>
      </div>
    </div>
  );
};
