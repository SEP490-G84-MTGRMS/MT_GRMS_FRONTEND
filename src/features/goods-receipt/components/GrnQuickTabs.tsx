import type { FC } from 'react';
import { Truck, Clock, AlertTriangle, Layers } from 'lucide-react';
import type { GrnFilterTab } from '../types/grn.types';

interface GrnQuickTabsProps {
  activeTab: GrnFilterTab;
  onTabChange: (tab: GrnFilterTab) => void;
  counts: {
    all: number;
    today: number;
    draft: number;
    mismatch: number;
  };
}

export const GrnQuickTabs: FC<GrnQuickTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-muted, #64748b)',
          marginRight: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Layers size={15} />
        Xem nhanh:
      </span>

      {/* Tab: Tất cả */}
      <button
        type="button"
        onClick={() => onTabChange('ALL')}
        className={`po-btn ${activeTab === 'ALL' ? 'po-btn-primary' : 'po-btn-outline'}`}
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          fontWeight: activeTab === 'ALL' ? 700 : 500,
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>Tất cả phiếu nhập</span>
        <span
          style={{
            padding: '1px 6px',
            fontSize: 11,
            borderRadius: 10,
            background: activeTab === 'ALL' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeTab === 'ALL' ? '#ffffff' : '#475569',
          }}
        >
          {counts.all}
        </span>
      </button>

      {/* Tab: Lịch nhận hàng hôm nay */}
      <button
        type="button"
        onClick={() => onTabChange('TODAY')}
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 6,
          border: activeTab === 'TODAY' ? '2px solid #0066cc' : '1px solid #91d5ff',
          backgroundColor: activeTab === 'TODAY' ? '#0066cc' : '#e6f7ff',
          color: activeTab === 'TODAY' ? '#ffffff' : '#0050b3',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <Truck size={14} />
        <span>Lịch nhận hàng hôm nay</span>
        <span
          style={{
            padding: '1px 6px',
            fontSize: 11,
            borderRadius: 10,
            backgroundColor: activeTab === 'TODAY' ? 'rgba(255,255,255,0.25)' : '#bae7ff',
            color: activeTab === 'TODAY' ? '#ffffff' : '#003a8c',
            fontWeight: 800,
          }}
        >
          {counts.today} đơn
        </span>
      </button>

      {/* Tab: Chờ xác nhận nhập (Draft) */}
      <button
        type="button"
        onClick={() => onTabChange('DRAFT')}
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 6,
          border: activeTab === 'DRAFT' ? '2px solid #d48806' : '1px solid #ffe58f',
          backgroundColor: activeTab === 'DRAFT' ? '#d48806' : '#fffbe6',
          color: activeTab === 'DRAFT' ? '#ffffff' : '#d48806',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <Clock size={14} />
        <span>Chờ xác nhận nhập</span>
        <span
          style={{
            padding: '1px 6px',
            fontSize: 11,
            borderRadius: 10,
            backgroundColor: activeTab === 'DRAFT' ? 'rgba(255,255,255,0.25)' : '#fff1b8',
            color: activeTab === 'DRAFT' ? '#ffffff' : '#ad6800',
            fontWeight: 700,
          }}
        >
          {counts.draft} nháp
        </span>
      </button>

      {/* Tab: Lệch số lượng / Hàng lỗi */}
      <button
        type="button"
        onClick={() => onTabChange('MISMATCH')}
        style={{
          height: 32,
          padding: '0 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 6,
          border: activeTab === 'MISMATCH' ? '2px solid #cf1322' : '1px solid #ffccc7',
          backgroundColor: activeTab === 'MISMATCH' ? '#cf1322' : '#fff2f0',
          color: activeTab === 'MISMATCH' ? '#ffffff' : '#cf1322',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <AlertTriangle size={14} />
        <span>Lệch số lượng / Hàng lỗi</span>
        <span
          style={{
            padding: '1px 6px',
            fontSize: 11,
            borderRadius: 10,
            backgroundColor: activeTab === 'MISMATCH' ? 'rgba(255,255,255,0.25)' : '#ffa39e',
            color: activeTab === 'MISMATCH' ? '#ffffff' : '#a8071a',
            fontWeight: 700,
          }}
        >
          {counts.mismatch} phiếu
        </span>
      </button>
    </div>
  );
};
