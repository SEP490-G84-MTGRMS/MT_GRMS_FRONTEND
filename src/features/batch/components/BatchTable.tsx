import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Eye,
  Tag,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { BatchItem, BatchStatus } from '../types/batch.types';

interface BatchTableProps {
  batches: BatchItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSelectBatch: (batch: BatchItem) => void;
  onDiscountClick: (batch: BatchItem) => void;
  onWriteOffClick: (batch: BatchItem) => void;
  onResetFilters: () => void;
}

type SortField = 'productName' | 'sku' | 'expiryDate' | 'daysLeft' | 'qtyCurrent' | 'costPrice' | 'status';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

export const BatchTable: FC<BatchTableProps> = ({
  batches,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectBatch,
  onDiscountClick,
  onWriteOffClick,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>('expiryDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // Mặc định FEFO: date gần nhất lên đầu

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedBatches = useMemo(() => {
    if (!sortField) return batches;

    return [...batches].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'productName':
          valA = a.productName.toLowerCase();
          valB = b.productName.toLowerCase();
          break;
        case 'sku':
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
          break;
        case 'expiryDate':
          valA = a.rawExpiryDate;
          valB = b.rawExpiryDate;
          break;
        case 'daysLeft':
          valA = a.daysLeft;
          valB = b.daysLeft;
          break;
        case 'qtyCurrent':
          valA = a.qtyCurrent;
          valB = b.qtyCurrent;
          break;
        case 'costPrice':
          valA = a.costPrice;
          valB = b.costPrice;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortField, sortOrder]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const renderStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case 'Expired':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#ffe4e6',
              color: '#be123c',
              border: '1px solid #fecdd3',
              whiteSpace: 'nowrap',
            }}
          >
            Expired
          </span>
        );
      case 'Critical':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            Critical
          </span>
        );
      case 'Warning':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap',
            }}
          >
            Warning
          </span>
        );
      case 'Normal':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              whiteSpace: 'nowrap',
            }}
          >
            Normal
          </span>
        );
    }
  };

  const renderDaysLeft = (days: number) => {
    if (days < 0) {
      return (
        <span
          style={{
            color: '#e11d48',
            fontWeight: 800,
            fontFamily: 'monospace',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
          title="Đã hết hạn sử dụng!"
        >
          <AlertTriangle size={12} color="#e11d48" />
          <span>{days} ngày</span>
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span style={{ color: '#d97706', fontWeight: 800, fontFamily: 'monospace' }} title="Cực kỳ cận date!">
          {days} ngày
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span style={{ color: '#2563eb', fontWeight: 700, fontFamily: 'monospace' }} title="Cận hạn sử dụng (FEFO)">
          {days} ngày
        </span>
      );
    }
    return (
      <span style={{ color: '#334155', fontWeight: 600, fontFamily: 'monospace' }}>
        {days} ngày
      </span>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Bảng dữ liệu có Sticky Header và cuộn ngang ── */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          maxHeight: 'calc(100vh - 320px)',
          minHeight: 340,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1200,
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          {/* Định nghĩa độ rộng cột */}
          <colgroup>
            <col style={{ width: '3%' }} />  {/* 1. # */}
            <col style={{ width: '18%' }} /> {/* 2. Tên SP */}
            <col style={{ width: '12%' }} /> {/* 3. Mã Lô & SKU */}
            <col style={{ width: '8%' }} />  {/* 4. Chi nhánh */}
            <col style={{ width: '14%' }} /> {/* 5. Nhà cung cấp */}
            <col style={{ width: '9%' }} />  {/* 6. HSD */}
            <col style={{ width: '9%' }} />  {/* 7. Days Left */}
            <col style={{ width: '7%' }} />  {/* 8. Qty */}
            <col style={{ width: '8%' }} />  {/* 9. Giá vốn */}
            <col style={{ width: '6%' }} />  {/* 10. Trạng thái */}
            <col style={{ width: '11%' }} /> {/* 11. Thao tác */}
          </colgroup>

          {/* Sticky Header */}
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              <th style={{ padding: '9px 8px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>#</th>

              {/* Tên SP */}
              <th
                onClick={() => handleSort('productName')}
                style={{ padding: '9px 10px', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>SẢN PHẨM</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Mã Lô & SKU */}
              <th
                onClick={() => handleSort('sku')}
                style={{ padding: '9px 10px', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>MÃ LÔ & SKU</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Chi nhánh */}
              <th style={{ padding: '9px 10px', borderBottom: '1px solid #cbd5e1' }}>CHI NHÁNH</th>

              {/* NCC */}
              <th style={{ padding: '9px 10px', borderBottom: '1px solid #cbd5e1' }}>NHÀ CUNG CẤP</th>

              {/* HSD */}
              <th
                onClick={() => handleSort('expiryDate')}
                style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Calendar size={12} color="#94a3b8" />
                  <span>HẠN DÙNG (FEFO)</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Days Left */}
              <th
                onClick={() => handleSort('daysLeft')}
                style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                  <span>SỐ NGÀY CÒN</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Tồn kho Qty */}
              <th
                onClick={() => handleSort('qtyCurrent')}
                style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                  <span>TỒN LÔ</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Giá vốn */}
              <th
                onClick={() => handleSort('costPrice')}
                style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                  <span>GIÁ VỐN</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Trạng thái */}
              <th
                onClick={() => handleSort('status')}
                style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <span>TRẠNG THÁI</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* Thao tác */}
              <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>THAO TÁC</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedBatches.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <PackageOpen size={44} color="#94a3b8" strokeWidth={1.5} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      Không tìm thấy lô hàng nào phù hợp với bộ lọc
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', maxWidth: 440 }}>
                      Vui lòng thử lại với từ khóa khác hoặc bấm nút bên dưới để khôi phục danh sách đầy đủ.
                    </div>
                    <button
                      type="button"
                      onClick={onResetFilters}
                      style={{
                        marginTop: 4,
                        height: 32,
                        padding: '0 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Đặt lại bộ lọc tìm kiếm
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedBatches.map((row, idx) => {
                const isExpired = row.status === 'Expired';
                const isCritical = row.status === 'Critical';

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isExpired
                        ? '#fffbfb'
                        : isCritical
                        ? '#fffdfa'
                        : '#ffffff',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isExpired
                        ? '#fff1f0'
                        : isCritical
                        ? '#fffbeb'
                        : '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isExpired
                        ? '#fffbfb'
                        : isCritical
                        ? '#fffdfa'
                        : '#ffffff';
                    }}
                  >
                    {/* 1. STT */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                      {startItem + idx}
                    </td>

                    {/* 2. Tên sản phẩm */}
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => onSelectBatch(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#0d9488',
                          fontWeight: 700,
                          fontSize: 13,
                          textAlign: 'left',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                        title="Bấm để xem chi tiết lượt hàng và vị trí quầy kệ"
                      >
                        <span>{row.productName}</span>
                      </button>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {row.categoryName} • Kệ: <b>{row.shelfLocation}</b>
                      </div>
                    </td>

                    {/* 3. Mã lô & SKU */}
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>
                        {row.batchCode}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        SKU: {row.sku}
                      </div>
                    </td>

                    {/* 4. Chi nhánh */}
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: row.branchId === 'BR-01' ? '#f0fdf4' : '#eff6ff',
                          color: row.branchId === 'BR-01' ? '#15803d' : '#1d4ed8',
                          border: `1px solid ${row.branchId === 'BR-01' ? '#bbf7d0' : '#bfdbfe'}`,
                        }}
                      >
                        {row.branchId}
                      </span>
                    </td>

                    {/* 5. Nhà cung cấp */}
                    <td style={{ padding: '8px 10px', fontSize: 12.5, color: '#334155', borderBottom: '1px solid #f1f5f9' }}>
                      {row.supplierName}
                    </td>

                    {/* 6. Hạn sử dụng */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                      {row.expiryDate}
                    </td>

                    {/* 7. Số ngày còn lại (Days Left) */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
                      {renderDaysLeft(row.daysLeft)}
                    </td>

                    {/* 8. Số lượng tồn */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                        {row.qtyCurrent}
                      </span>{' '}
                      <span style={{ fontSize: 11, color: '#64748b' }}>{row.unit}</span>
                    </td>

                    {/* 9. Đơn giá vốn */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12.5, fontFamily: 'monospace', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {formatCurrency(row.costPrice)}
                    </td>

                    {/* 10. Trạng thái */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* 11. Thao tác */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {/* Chi tiết */}
                        <button
                          type="button"
                          onClick={() => onSelectBatch(row)}
                          style={{
                            height: 26,
                            padding: '0 8px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#0d9488',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            cursor: 'pointer',
                          }}
                          title="Xem chi tiết lượt hàng"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {/* Giảm giá FEFO (Chỉ cho phép nếu chưa hết hạn, disabled nếu Expired) */}
                        {row.status === 'Warning' || row.status === 'Critical' ? (
                          <button
                            type="button"
                            onClick={() => onDiscountClick(row)}
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              borderRadius: 4,
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              cursor: 'pointer',
                            }}
                            title="Áp dụng chiết khấu giảm giá kích cầu FEFO"
                          >
                            <Tag size={12} />
                            <span>Giảm giá</span>
                          </button>
                        ) : null}

                        {/* Xuất hủy (Write-off) */}
                        {row.status === 'Expired' || row.status === 'Critical' ? (
                          <button
                            type="button"
                            onClick={() => onWriteOffClick(row)}
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              borderRadius: 4,
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              cursor: 'pointer',
                            }}
                            title="Lập phiếu xuất hủy hàng quá hạn / hư hỏng"
                          >
                            <Trash2 size={12} />
                            <span>Xuất hủy</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Phân trang Footer chuẩn GrnTable ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          fontSize: 12.5,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trong tổng số <b>{totalCount}</b> lô hàng
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 5,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span>dòng / trang</span>
          </div>
        </div>

        {/* Nút lùi/tiến trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 28,
              minWidth: 28,
              padding: '0 8px',
              borderRadius: 5,
              border: '1px solid #cbd5e1',
              backgroundColor: pageIndex <= 1 ? '#f1f5f9' : '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={14} />
            <span>Trước</span>
          </button>

          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', padding: '0 6px' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 28,
              minWidth: 28,
              padding: '0 8px',
              borderRadius: 5,
              border: '1px solid #cbd5e1',
              backgroundColor: pageIndex >= totalPages ? '#f1f5f9' : '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Sau</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
