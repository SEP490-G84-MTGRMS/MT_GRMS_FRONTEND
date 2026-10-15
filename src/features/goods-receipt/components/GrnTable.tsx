import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  ArrowRightCircle,
  FileCheck2,
  FileEdit,
  AlertCircle,
  Layers,
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

const renderStatusBadge = (status: GrnStatus) => {
  switch (status) {
    case 'TODAY':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 800,
            borderRadius: 4,
            backgroundColor: '#e6f7ff',
            color: '#0050b3',
            border: '1px solid #91d5ff',
            letterSpacing: 0.3,
          }}
        >
          CHỜ GIAO HÔM NAY
        </span>
      );
    case 'DRAFT':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 4,
            backgroundColor: '#fffbe6',
            color: '#d48806',
            border: '1px solid #ffe58f',
          }}
        >
          Draft (Kiểm đếm)
        </span>
      );
    case 'CONFIRMED':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 4,
            backgroundColor: '#f6ffed',
            color: '#389e0d',
            border: '1px solid #b7eb8f',
          }}
        >
          Confirmed
        </span>
      );
    case 'MISMATCH':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 800,
            borderRadius: 4,
            backgroundColor: '#fff2f0',
            color: '#cf1322',
            border: '1px solid #ffccc7',
          }}
        >
          Mismatch (Lệch SL)
        </span>
      );
    case 'CANCELED':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #cbd5e1',
          }}
        >
          Đã hủy
        </span>
      );
    default:
      return null;
  }
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
  const [sortField, setSortField] = useState<SortField>('receiveDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'code') {
        cmp = a.code.localeCompare(b.code);
      } else if (sortField === 'receiveDate') {
        cmp = a.rawDate.localeCompare(b.rawDate);
      } else if (sortField === 'branchName') {
        cmp = a.branchName.localeCompare(b.branchName);
      } else if (sortField === 'supplierName') {
        cmp = a.supplierName.localeCompare(b.supplierName);
      } else if (sortField === 'totalAmount') {
        cmp = a.totalAmount - b.totalAmount;
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [receipts, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} style={{ color: 'var(--blue-primary, #0066cc)' }} />
    ) : (
      <ArrowDown size={12} style={{ color: 'var(--blue-primary, #0066cc)' }} />
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Table Container ── */}
      <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
        <table
          className="po-table"
          style={{
            width: '100%',
            minWidth: 1220,
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f8fafc',
                borderBottom: '2px solid #cbd5e1',
              }}
            >
              <th
                onClick={() => handleSort('code')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 175,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>MÃ GRN / MÃ PO</span>
                  {renderSortIcon('code')}
                </div>
              </th>

              <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 100 }}>
                LOẠI
              </th>

              <th
                onClick={() => handleSort('receiveDate')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 180,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>NGÀY NHẬN / DỰ KIẾN</span>
                  {renderSortIcon('receiveDate')}
                </div>
              </th>

              <th
                onClick={() => handleSort('branchName')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 165,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>CHI NHÁNH</span>
                  {renderSortIcon('branchName')}
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierName')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 145,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>NHÀ CUNG CẤP</span>
                  {renderSortIcon('supplierName')}
                </div>
              </th>

              <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 135 }}>
                MÃ PO THAM CHIẾU
              </th>

              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 95 }}>
                SỐ DÒNG
              </th>

              <th
                onClick={() => handleSort('totalAmount')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 135,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <span>TỔNG TIỀN (VNĐ)</span>
                  {renderSortIcon('totalAmount')}
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  width: 155,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>TRẠNG THÁI</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 140 }}>
                THỦ KHO NHẬN
              </th>

              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 180 }}>
                THAO TÁC
              </th>
            </tr>
          </thead>

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
                    <PackageOpen size={48} style={{ color: '#94a3b8', strokeWidth: 1.5 }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>
                      Không tìm thấy phiếu nhập kho hoặc lịch nhận hàng nào
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', maxWidth: 420 }}>
                      Không có bản ghi nào khớp với điều kiện lọc hiện tại. Vui lòng kiểm tra lại từ khóa hoặc khoảng ngày.
                    </div>
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="po-btn po-btn-outline"
                      style={{ marginTop: 6 }}
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
                    <td style={{ padding: '9px 12px' }}>
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--blue-primary, #0066cc)',
                          fontWeight: 700,
                          fontSize: 13,
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                        title="Bấm để xem chi tiết đối soát phiếu này"
                      >
                        {isToday ? `[Dự kiến] ${row.code}` : row.code}
                      </button>
                    </td>

                    {/* 2. Loại */}
                    <td style={{ padding: '9px 10px', fontSize: 12, color: '#475569' }}>
                      {row.typeLabel}
                    </td>

                    {/* 3. Ngày nhận / Dự kiến */}
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>
                      <span style={{ fontWeight: isToday ? 700 : 500, color: isToday ? '#0050b3' : '#1e293b' }}>
                        {row.receiveDate}
                      </span>
                    </td>

                    {/* 4. Chi nhánh */}
                    <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                      {row.branchName}
                    </td>

                    {/* 5. Nhà cung cấp */}
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#334155' }}>
                      <div style={{ fontWeight: 600 }}>{row.supplierName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>({row.supplierCode})</div>
                    </td>

                    {/* 6. Mã PO tham chiếu */}
                    <td style={{ padding: '9px 10px', fontSize: 12 }}>
                      {row.poReference !== '—' && row.poReference !== '-' ? (
                        <span style={{ color: '#0066cc', fontWeight: 600 }}>{row.poReference}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 7. Số lượng dòng */}
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, color: '#475569' }}>
                      {row.lineCount} dòng
                    </td>

                    {/* 8. Tổng tiền */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        color: '#0f172a',
                      }}
                    >
                      {formatCurrency(row.totalAmount)}
                    </td>

                    {/* 9. Trạng thái */}
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* 10. Thủ kho nhận */}
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#475569' }}>
                      {row.receiverName}
                    </td>

                    {/* 11. Thao tác theo ngữ cảnh */}
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
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
                            className="po-btn po-btn-primary"
                            style={{
                              height: 28,
                              padding: '0 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
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
                              className="po-btn po-btn-primary"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 4,
                                backgroundColor: '#d48806',
                                borderColor: '#d48806',
                              }}
                              title="Duyệt hoàn tất phiếu nhập kho"
                            >
                              <FileCheck2 size={12} />
                              <span>Duyệt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onActionClick('EDIT_DRAFT', row)}
                              className="po-btn po-btn-outline"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                borderRadius: 4,
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
                              className="po-btn"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 4,
                                backgroundColor: '#fff1f0',
                                color: '#cf1322',
                                border: '1px solid #ffa39e',
                              }}
                              title="Xem biên bản đối soát và xử lý lệch"
                            >
                              <AlertCircle size={12} />
                              <span>Xử lý lệch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectReceipt(row)}
                              className="po-btn po-btn-outline"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                borderRadius: 4,
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
                              className="po-btn po-btn-outline"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                borderRadius: 4,
                                color: '#0066cc',
                              }}
                              title="Xem danh sách lô hàng FEFO đã gán"
                            >
                              <Layers size={12} />
                              <span>Lô Batch</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onActionClick('PRINT_RECEIPT', row)}
                              className="po-btn po-btn-outline"
                              style={{
                                height: 26,
                                padding: '0 8px',
                                fontSize: 11,
                                borderRadius: 4,
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
                            className="po-btn po-btn-outline"
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 11,
                              borderRadius: 4,
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

      {/* ── 2. Pagination Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          fontSize: 12,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trong tổng số <b>{totalCount}</b> phiếu
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="po-ctrl-select"
              style={{ height: 28, padding: '0 6px', fontSize: 12, minWidth: 60 }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            className="po-btn po-btn-outline"
            style={{
              height: 28,
              padding: '0 8px',
              fontSize: 12,
              opacity: pageIndex <= 1 ? 0.5 : 1,
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 700, color: '#1e293b' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            className="po-btn po-btn-outline"
            style={{
              height: 28,
              padding: '0 8px',
              fontSize: 12,
              opacity: pageIndex >= totalPages ? 0.5 : 1,
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
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
