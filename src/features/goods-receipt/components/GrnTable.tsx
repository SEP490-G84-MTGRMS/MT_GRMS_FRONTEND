import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  ArrowUpDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  ArrowRightCircle,
  FileCheck2,
  FileEdit,
  AlertCircle,
  Layers,
  FileText,
} from 'lucide-react';
import type { GoodsReceiptListItem, GrnStatus } from '../types/grn.types';

interface GrnTableProps {
  receipts: GoodsReceiptListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSelectReceipt: (receipt: GoodsReceiptListItem) => void;
  onActionClick: (action: string, receipt: GoodsReceiptListItem) => void;
  onResetFilters: () => void;
}

type SortField = 'code' | 'receiveDate' | 'branchName' | 'supplierName' | 'totalAmount' | 'status';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const GrnTable: FC<GrnTableProps> = ({
  receipts,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectReceipt,
  onActionClick,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const sortedReceipts = useMemo(() => {
    if (!sortField) return receipts;

    return [...receipts].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'code':
          valA = a.code;
          valB = b.code;
          break;
        case 'receiveDate':
          valA = a.rawDate;
          valB = b.rawDate;
          break;
        case 'branchName':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
          break;
        case 'supplierName':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'totalAmount':
          valA = a.totalAmount;
          valB = b.totalAmount;
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
  }, [receipts, sortField, sortOrder]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const renderStatusBadge = (status: GrnStatus) => {
    switch (status) {
      case 'TODAY':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              whiteSpace: 'nowrap',
            }}
          >
            🚚 Chờ giao hôm nay
          </span>
        );
      case 'DRAFT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            🟡 Draft (Kiểm đếm)
          </span>
        );
      case 'CONFIRMED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              whiteSpace: 'nowrap',
            }}
          >
            🟢 Confirmed
          </span>
        );
      case 'MISMATCH':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              whiteSpace: 'nowrap',
            }}
          >
            🔴 Mismatch (Lệch SL)
          </span>
        );
      case 'CANCELED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              whiteSpace: 'nowrap',
            }}
          >
            ⚪ Đã hủy
          </span>
        );
    }
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
      {/* ── Table Container with Sticky Header ── */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          maxHeight: 'calc(100vh - 280px)',
          minHeight: 320,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1250,
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          {/* Column widths */}
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '14%' }} />
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
              {/* 1. Mã GRN / Mã PO */}
              <th
                onClick={() => handleSort('code')}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>MÃ GRN / PO</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 2. Loại */}
              <th style={{ padding: '10px 10px', borderBottom: '1px solid #cbd5e1' }}>
                LOẠI
              </th>

              {/* 3. Ngày nhận / Dự kiến */}
              <th
                onClick={() => handleSort('receiveDate')}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>NGÀY NHẬN / HẸN</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 4. Chi nhánh */}
              <th
                onClick={() => handleSort('branchName')}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>CHI NHÁNH</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 5. Nhà cung cấp */}
              <th
                onClick={() => handleSort('supplierName')}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>NHÀ CUNG CẤP</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 6. Mã PO tham chiếu */}
              <th style={{ padding: '10px 10px', borderBottom: '1px solid #cbd5e1' }}>
                PO GỐC
              </th>

              {/* 7. Số lượng dòng */}
              <th style={{ padding: '10px 10px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>
                SỐ DÒNG
              </th>

              {/* 8. Tổng tiền */}
              <th
                onClick={() => handleSort('totalAmount')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <span>TỔNG TIỀN (VNĐ)</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 9. Trạng thái */}
              <th
                onClick={() => handleSort('status')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>TRẠNG THÁI</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>

              {/* 10. Thủ kho nhận */}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1' }}>
                THỦ KHO NHẬN
              </th>

              {/* 11. Thao tác */}
              <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>
                THAO TÁC
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedReceipts.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                    }}
                  >
                    <PackageOpen size={44} color="#94a3b8" strokeWidth={1.5} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      Không tìm thấy phiếu nhập kho hoặc lịch nhận hàng nào
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', maxWidth: 440 }}>
                      Không có bản ghi nào khớp với điều kiện lọc hiện tại. Vui lòng kiểm tra lại từ khóa hoặc khoảng ngày.
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
              sortedReceipts.map((row) => {
                const isToday = row.status === 'TODAY';
                const isMismatch = row.status === 'MISMATCH';

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isToday
                        ? '#fcfdff'
                        : isMismatch
                        ? '#fffbfb'
                        : '#ffffff',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isToday
                        ? '#f0f7ff'
                        : isMismatch
                        ? '#fff1f0'
                        : '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isToday
                        ? '#fcfdff'
                        : isMismatch
                        ? '#fffbfb'
                        : '#ffffff';
                    }}
                  >
                    {/* 1. Mã GRN / Mã PO */}
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(row)}
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
                        title="Bấm để xem chi tiết đối soát phiếu này"
                      >
                        <FileText size={13} color="#0d9488" />
                        <span>{isToday ? `[Dự kiến] ${row.code}` : row.code}</span>
                      </button>
                    </td>

                    {/* 2. Loại */}
                    <td style={{ padding: '11px 10px', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {row.typeLabel}
                    </td>

                    {/* 3. Ngày nhận / Dự kiến */}
                    <td style={{ padding: '11px 12px', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: isToday ? 700 : 500, color: isToday ? '#0369a1' : '#1e293b' }}>
                        {row.receiveDate}
                      </span>
                    </td>

                    {/* 4. Chi nhánh */}
                    <td style={{ padding: '11px 12px', fontSize: 12.5, fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                      {row.branchName}
                    </td>

                    {/* 5. Nhà cung cấp */}
                    <td style={{ padding: '11px 12px', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.supplierName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>({row.supplierCode})</div>
                    </td>

                    {/* 6. Mã PO tham chiếu */}
                    <td style={{ padding: '11px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {row.poReference !== '—' && row.poReference !== '-' ? (
                        <span style={{ color: '#0d9488', fontWeight: 600 }}>{row.poReference}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 7. Số lượng dòng */}
                    <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 12.5, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {row.lineCount} dòng
                    </td>

                    {/* 8. Tổng tiền */}
                    <td
                      style={{
                        padding: '11px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {formatCurrency(row.totalAmount)}
                    </td>

                    {/* 9. Trạng thái */}
                    <td style={{ padding: '11px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* 10. Thủ kho nhận */}
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {row.receiverName}
                    </td>

                    {/* 11. Thao tác */}
                    <td style={{ padding: '11px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          flexWrap: 'nowrap',
                        }}
                      >
                        {row.status === 'TODAY' && (
                          <button
                            type="button"
                            onClick={() => onActionClick('RECEIVE_NOW', row)}
                            style={{
                              height: 28,
                              padding: '0 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              borderRadius: 5,
                              border: 'none',
                              backgroundColor: 'var(--blue-primary, #0f766e)',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                            }}
                            title="Bắt đầu kiểm đếm và nhận hàng ngay"
                          >
                            <ArrowRightCircle size={13} />
                            <span>Nhập kho ngay</span>
                          </button>
                        )}

                        {row.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActionClick('APPROVE_DRAFT', row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 4,
                                border: 'none',
                                backgroundColor: '#d97706',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="Duyệt hoàn tất phiếu nhập kho"
                            >
                              <FileCheck2 size={12} />
                              <span>Duyệt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onActionClick('EDIT_DRAFT', row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                              }}
                              title="Sửa chi tiết phiếu kiểm đếm"
                            >
                              <FileEdit size={12} />
                              <span>Sửa</span>
                            </button>
                          </>
                        )}

                        {row.status === 'MISMATCH' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActionClick('RESOLVE_MISMATCH', row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 4,
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="Xem biên bản đối soát và xử lý lệch"
                            >
                              <AlertCircle size={12} />
                              <span>Xử lý lệch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectReceipt(row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                              }}
                              title="Xem chi tiết"
                            >
                              Chi tiết
                            </button>
                          </>
                        )}

                        {row.status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActionClick('VIEW_BATCH', row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#0d9488',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="Xem danh sách lô hàng FEFO đã gán"
                            >
                              <Layers size={12} />
                              <span>Lô Batch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onActionClick('PRINT_RECEIPT', row)}
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                              }}
                              title="In phiếu nhập kho"
                            >
                              <Printer size={12} />
                            </button>
                          </>
                        )}

                        {row.status === 'CANCELED' && (
                          <button
                            type="button"
                            onClick={() => onSelectReceipt(row)}
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#64748b',
                              cursor: 'pointer',
                            }}
                          >
                            Chi tiết
                          </button>
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

      {/* ── Pagination Footer matching PoListTable exact structure ── */}
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
        {/* Bên trái: Thông tin tổng số dòng + Chọn PageSize */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trong tổng số <b>{totalCount}</b> phiếu
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
            <span>dòng/trang</span>
          </div>
        </div>

        {/* Bên phải: Nút Trước / Trang x / y / Sau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageIndex <= 1 ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              opacity: pageIndex >= totalPages ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
