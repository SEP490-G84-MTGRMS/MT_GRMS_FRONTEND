import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  HelpCircle,
  Scale,
} from 'lucide-react';
import type { CogsValuationComparison, PnlLineItem } from '../types/reportsPnl.types';

interface PnlStatementTableProps {
  pnlTree: PnlLineItem[];
  isLoading: boolean;
  estimatedTaxAmount?: number;
  cogsComparison?: CogsValuationComparison;
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
 * P&L Statement Table with collapsible tree view, COGS valuation method comparison, and tax linkage.
 */
export const PnlStatementTable: React.FC<PnlStatementTableProps> = ({
  pnlTree,
  isLoading,
  estimatedTaxAmount = 0,
  cogsComparison,
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
              Cân đối Doanh thu, Giá vốn xuất kho (Đối soát S2c-HKD), Chi phí vận hành & Lợi nhuận
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

      {/* COGS Valuation Method Comparison Table (Weighted Average TT152 vs FEFO Specific) */}
      {cogsComparison && (
        <div
          style={{
            margin: '16px 20px 8px',
            padding: '16px',
            borderRadius: '14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={18} style={{ color: '#0F766E' }} />
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                Bảng So Sánh Phương Pháp Tính Giá Vốn Hàng Bán (COGS Valuation Comparison)
              </span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
                background: '#CCFBF1',
                color: '#0F766E',
              }}
            >
              Chuẩn thuế TT 152/2025/TT-BTC: Bình quân gia quyền
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Chỉ tiêu đối chiếu</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Bình quân gia quyền (Sổ thuế TT152)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thực tế đích danh по lô (FEFO POS)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Chênh lệch (FEFO - BQGQ)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>Giá vốn hàng bán (COGS)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                    {formatVnd(cogsComparison.weightedAverageCogs)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                    {formatVnd(cogsComparison.fefoSpecificCogs)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: cogsComparison.cogsVariance === 0 ? '#64748B' : '#D97706' }}>
                    {formatVnd(cogsComparison.cogsVariance)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>Lợi nhuận gộp (Gross Profit)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {formatVnd(cogsComparison.weightedAverageGrossProfit)} ({cogsComparison.weightedAverageGrossMarginPct}%)
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {formatVnd(cogsComparison.fefoSpecificGrossProfit)} ({cogsComparison.fefoSpecificGrossMarginPct}%)
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {formatVnd(cogsComparison.fefoSpecificGrossProfit - cogsComparison.weightedAverageGrossProfit)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F766E' }}>Lợi nhuận thuần trước thuế (Net Profit)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                    {formatVnd(cogsComparison.weightedAverageNetProfit)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                    {formatVnd(cogsComparison.fefoSpecificNetProfit)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                    {formatVnd(cogsComparison.fefoSpecificNetProfit - cogsComparison.weightedAverageNetProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FE-19 Tax Reconciliation Linkage Callout */}
      <div
        style={{
          margin: '16px 20px',
          padding: '14px 18px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          border: '1px solid #FDE68A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#D97706',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400E' }}>
              Liên thông Đối soát Kê khai & Nộp thuế HKD (Sổ S2c-HKD)
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#B45309', lineHeight: 1.45 }}>
              Nghĩa vụ thuế 1.5% (<strong>{formatVnd(estimatedTaxAmount)}</strong>) được trích lập tự động từ Doanh thu thuần bán lẻ. Sau khi xác nhận nộp thuế tại FE-19, hệ thống sẽ tự động hạch toán Phiếu Chi sang Sổ quỹ FE-17, bảo đảm đối soát ba bên tuyệt đối.
            </p>
          </div>
        </div>

        <a
          href="/store-owner/tax-snapshots"
          style={{
            whiteSpace: 'nowrap',
            padding: '8px 16px',
            borderRadius: '9999px',
            backgroundColor: '#D97706',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.8rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
          }}
        >
          <span>Xem tờ khai FE-19</span>
          <span>➔</span>
        </a>
      </div>

      {/* Table Footer Notes */}
      <div style={{ padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid var(--border-subtle, #e5edf8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted, #4b5563)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} style={{ color: 'var(--blue-primary, #0F766E)' }} />
          <span>
            * Số liệu tính toán từ Doanh số bán POS, Giá vốn đối soát S2c-HKD, và Chứng từ chi phí hợp lý FE-07.
          </span>
        </div>
        <span style={{ fontWeight: 600 }}>Đơn vị tính: VNĐ</span>
      </div>
    </div>
  );
};
