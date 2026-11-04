import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  Truck,
  Eye,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

interface SupplierDispatchTableProps {
  suppliers: SupplierDispatchGroup[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onOpenDrawer: (supplierId: string) => void;
  onDispatchSingle: (supplier: SupplierDispatchGroup) => void;
}

type SortField = 'name' | 'cutoff' | 'skuCount' | 'amount';
type SortDirection = 'asc' | 'desc';

export const SupplierDispatchTable: FC<SupplierDispatchTableProps> = ({
  suppliers,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpenDrawer,
  onDispatchSingle,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sorted suppliers
  const sortedSuppliers = useMemo(() => {
    if (!sortField) return suppliers;

    return [...suppliers].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'cutoff':
          valA = a.remainingMinutes ?? 9999;
          valB = b.remainingMinutes ?? 9999;
          break;
        case 'skuCount':
          valA = a.items.filter((it) => it.qty > 0).length;
          valB = b.items.filter((it) => it.qty > 0).length;
          break;
        case 'amount':
          valA = a.items.reduce((s, it) => s + it.qty * it.price, 0);
          valB = b.items.reduce((s, it) => s + it.qty * it.price, 0);
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [suppliers, sortField, sortDir]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

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
          maxHeight: 'calc(100vh - 195px)',
          minHeight: 280,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1040,
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          {/* Column widths without checkbox */}
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
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
              {/* Cột 1: Nhà cung cấp & Nhóm hàng */}
              <th
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('name')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Nhà cung cấp & Nhóm hàng</span>
                  <ArrowUpDown
                    size={12}
                    color={sortField === 'name' ? '#0d9488' : '#94a3b8'}
                  />
                </div>
              </th>

              {/* Cột 2: Giờ Cutoff đơn */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('cutoff')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Giờ Cutoff đơn</span>
                  <ArrowUpDown
                    size={12}
                    color={sortField === 'cutoff' ? '#0d9488' : '#94a3b8'}
                  />
                </div>
              </th>

              {/* Cột 3: Dự kiến giao hàng */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                }}
              >
                Dự kiến giao hàng
              </th>

              {/* Cột 4: Quy mô đơn */}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('skuCount')}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 6,
                    width: '100%',
                  }}
                >
                  <span>Quy mô đơn</span>
                  <ArrowUpDown
                    size={12}
                    color={sortField === 'skuCount' ? '#0d9488' : '#94a3b8'}
                  />
                </div>
              </th>

              {/* Cột 5: Tạm tính & MOV */}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('amount')}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 6,
                    width: '100%',
                  }}
                >
                  <span>Tạm tính & MOV</span>
                  <ArrowUpDown
                    size={12}
                    color={sortField === 'amount' ? '#0d9488' : '#94a3b8'}
                  />
                </div>
              </th>

              {/* Cột 6: Thao tác */}
              <th
                style={{
                  padding: '10px 18px 10px 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                }}
              >
                Thao tác
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedSuppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              sortedSuppliers.map((supplier) => {
                const isCritical =
                  supplier.urgency === 'critical' && supplier.status !== 'dispatched';
                const isDispatched = supplier.status === 'dispatched';

                // Real-time calculations for this supplier
                const totalAmount = supplier.items.reduce(
                  (sum, it) => sum + it.qty * it.price,
                  0
                );
                const totalQty = supplier.items.reduce((sum, it) => sum + it.qty, 0);
                const totalSkus = supplier.items.filter((it) => it.qty > 0).length;
                const isMovMet = totalAmount >= supplier.minOrderValue;
                const movShortage = Math.max(0, supplier.minOrderValue - totalAmount);

                return (
                  <tr
                    key={supplier.id}
                    onClick={() => onOpenDrawer(supplier.id)}
                    style={{
                      height: 68,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isCritical
                        ? 'rgba(254, 242, 242, 0.45)'
                        : isDispatched
                        ? '#fcfdfd'
                        : '#ffffff',
                      borderLeft: isCritical
                        ? '4px solid #ef4444'
                        : '4px solid transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isCritical
                        ? '#fee2e255'
                        : '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isCritical
                        ? 'rgba(254, 242, 242, 0.45)'
                        : isDispatched
                        ? '#fcfdfd'
                        : '#ffffff';
                    }}
                  >
                    {/* Cột 1: Nhà cung cấp & Nhóm hàng */}
                    <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {supplier.code}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: isDispatched ? '#64748b' : '#0f172a',
                            }}
                          >
                            {supplier.name}
                          </span>
                        </div>

                        {/* Category Tags */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {supplier.categoryTags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Giờ Cutoff đơn */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                          {supplier.cutoffTimeStr}
                        </span>

                        {isDispatched ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#15803d',
                              background: '#dcfce7',
                              border: '1px solid #86efac',
                              padding: '2px 6px',
                              borderRadius: 4,
                              width: 'fit-content',
                            }}
                          >
                            🟢 Đã gửi PO • {supplier.poCode}
                          </span>
                        ) : supplier.urgency === 'critical' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#b91c1c',
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              padding: '2px 6px',
                              borderRadius: 4,
                              width: 'fit-content',
                            }}
                          >
                            🔴 Khẩn cấp • {supplier.countdownDisplay}
                          </span>
                        ) : supplier.urgency === 'today' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '2px 6px',
                              borderRadius: 4,
                              width: 'fit-content',
                            }}
                          >
                            🟡 Hôm nay • {supplier.countdownDisplay}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#475569',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              padding: '2px 6px',
                              borderRadius: 4,
                              width: 'fit-content',
                            }}
                          >
                            ⚪ Đợt tới
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 3: Dự kiến giao hàng */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#0f172a',
                          fontSize: 12.5,
                          fontWeight: 500,
                        }}
                      >
                        <Truck size={15} color="#0d9488" style={{ flexShrink: 0 }} />
                        <span>{supplier.expectedDelivery}</span>
                      </div>
                    </td>

                    {/* Cột 4: Quy mô đơn */}
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: 'monospace',
                          }}
                        >
                          {totalSkus} SKU
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>
                          {totalQty} món
                        </span>
                      </div>
                    </td>

                    {/* Cột 5: Tạm tính & MOV */}
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: '#059669',
                            fontFamily: 'monospace',
                          }}
                        >
                          {totalAmount.toLocaleString('vi-VN')} đ
                        </span>

                        {isMovMet ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#059669',
                            }}
                            title={`Mức tối thiểu: ${supplier.minOrderValue.toLocaleString(
                              'vi-VN'
                            )} đ`}
                          >
                            ✔ Đạt tối thiểu ({supplier.minOrderValue.toLocaleString('vi-VN')} đ)
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#d97706',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 3,
                            }}
                            title={`Thiếu ${movShortage.toLocaleString(
                              'vi-VN'
                            )} đ để đạt MOV ${supplier.minOrderValue.toLocaleString('vi-VN')} đ`}
                          >
                            <AlertTriangle size={11} color="#d97706" />
                            Thiếu {movShortage.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Thao tác */}
                    <td
                      style={{
                        padding: '10px 18px 10px 12px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          justifyContent: 'flex-end',
                        }}
                      >
                        {/* Nút Xem chi tiết -> mở drawer */}
                        <button
                          type="button"
                          onClick={() => onOpenDrawer(supplier.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            height: 30,
                            padding: '0 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#0d9488';
                            e.currentTarget.style.color = '#0d9488';
                            e.currentTarget.style.backgroundColor = '#f0fdfa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#334155';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                          title="Mở ngăn kéo xem chi tiết các mặt hàng"
                        >
                          <Eye size={13} />
                          <span>Chi tiết ({totalSkus})</span>
                        </button>

                        {/* Nút Chốt & Tạo PO */}
                        {isDispatched ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 30,
                              padding: '0 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <CheckCircle2 size={13} color="#10b981" />
                            Đã tạo PO
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDispatchSingle(supplier)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              height: 30,
                              padding: '0 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              border: 'none',
                              color: '#ffffff',
                              backgroundColor: isCritical ? '#dc2626' : '#0d9488',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: isCritical
                                ? '0 1px 3px rgba(220, 38, 38, 0.25)'
                                : '0 1px 3px rgba(13, 148, 136, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = isCritical
                                ? '#b91c1c'
                                : '#0f766e';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isCritical
                                ? '#dc2626'
                                : '#0d9488';
                            }}
                            title="Xác nhận chốt đơn và gửi PO ngay cho NCC"
                          >
                            <Send size={12} />
                            <span>Chốt & Tạo PO</span>
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

      {/* ── FOOTER CÓ PHÂN TRANG (PAGING) GIỐNG MÀN HÌNH BRANCHES ── */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          backgroundColor: '#ffffff',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> nhà cung cấp
          </div>

          {onPageSizeChange && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
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
            </div>
          )}
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
