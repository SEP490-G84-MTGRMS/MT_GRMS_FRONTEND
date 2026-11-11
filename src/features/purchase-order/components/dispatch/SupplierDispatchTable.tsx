import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  Eye,
  Send,
  CheckCircle2,
  ArrowUpDown,
  Store,
} from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';
import { TablePagination } from '../../../../components/common';

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

type SortField = 'code' | 'name' | 'pending' | 'cutoff' | 'branches' | 'sku' | 'amount';
type SortDirection = 'asc' | 'desc';

function cutoffSingleLine(supplier: SupplierDispatchGroup): {
  text: string;
  color: string;
  background: string;
  border: string;
} {
  if (supplier.status === 'dispatched') {
    return {
      text: `${supplier.cutoffTimeStr || '—'} · Đã gửi PO`,
      color: '#15803d',
      background: '#dcfce7',
      border: '1px solid #86efac',
    };
  }
  if (!(supplier.branchesWithQty || supplier.skuCount)) {
    return {
      text: 'Chưa có số lượng',
      color: '#64748b',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
    };
  }
  if (supplier.urgency === 'critical') {
    return {
      text: `${supplier.cutoffTimeStr} · Khẩn cấp · ${supplier.countdownDisplay}`,
      color: '#b91c1c',
      background: '#fee2e2',
      border: '1px solid #fecaca',
    };
  }
  if (supplier.urgency === 'today') {
    return {
      text: `${supplier.cutoffTimeStr} · ${supplier.countdownDisplay}`,
      color: '#b45309',
      background: '#fef3c7',
      border: '1px solid #fde68a',
    };
  }
  return {
    text: `${supplier.cutoffTimeStr || '—'} · ${supplier.countdownDisplay || 'Đợt tới'}`,
    color: '#334155',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
  };
}

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
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedSuppliers = useMemo(() => {
    if (!sortField) return suppliers;
    return [...suppliers].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;
      switch (sortField) {
        case 'code':
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'pending':
          valA = a.hasPendingChanges && a.status !== 'dispatched' ? 0 : 1;
          valB = b.hasPendingChanges && b.status !== 'dispatched' ? 0 : 1;
          break;
        case 'cutoff':
          valA = a.remainingMinutes ?? 9999;
          valB = b.remainingMinutes ?? 9999;
          break;
        case 'branches':
          valA = a.branchesWithQty ?? 0;
          valB = b.branchesWithQty ?? 0;
          break;
        case 'sku':
          valA = a.skuCount ?? 0;
          valB = b.skuCount ?? 0;
          break;
        case 'amount':
          valA = a.totalAmount ?? 0;
          valB = b.totalAmount ?? 0;
          break;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [suppliers, sortField, sortDir]);

  const th = (label: string, field?: SortField, align: 'left' | 'right' = 'left') => (
    <th
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid #cbd5e1',
        background: '#f8fafc',
        cursor: field ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textAlign: align,
      }}
      onClick={field ? () => handleSort(field) : undefined}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          width: align === 'right' ? '100%' : undefined,
        }}
      >
        <span>{label}</span>
        {field && <ArrowUpDown size={12} color={sortField === field ? '#0d9488' : '#94a3b8'} />}
      </div>
    </th>
  );

  return (
    <div className="so-list-table-card" style={{ position: 'relative', minHeight: 0, flex: 1 }}>
      <div className="so-list-table-body" style={{ width: '100%', overflowX: 'auto', minHeight: 280, flex: 1 }}>
        <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {th('Mã NCC', 'code')}
              {th('Tên nhà cung cấp', 'name')}
              {th('Thay đổi SL', 'pending')}
              {th('Giờ Cutoff đơn', 'cutoff')}
              {th('Cửa hàng', 'branches', 'right')}
              {th('Quy mô', 'sku', 'right')}
              {th('Giá trị', 'amount', 'right')}
              <th style={{ padding: '10px 18px 10px 12px', borderBottom: '1px solid #cbd5e1', background: '#f8fafc', textAlign: 'right' }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                  Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              sortedSuppliers.map((supplier) => {
                const isCritical = supplier.urgency === 'critical' && supplier.status !== 'dispatched';
                const isDispatched = supplier.status === 'dispatched';
                const needsUpdate = Boolean(supplier.hasPendingChanges) && !isDispatched;
                const cutoffTone = cutoffSingleLine(supplier);
                const skuCount = supplier.skuCount ?? 0;
                const branchWithQty = supplier.branchesWithQty ?? 0;
                const linked = supplier.linkedBranchCount ?? 0;
                const totalAmount = supplier.totalAmount ?? 0;
                const canDispatch = !isDispatched && branchWithQty > 0;

                return (
                  <tr
                    key={supplier.id}
                    onClick={() => onOpenDrawer(supplier.id)}
                    style={{
                      height: 52,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: needsUpdate
                        ? 'rgba(255, 247, 237, 0.7)'
                        : isCritical
                          ? 'rgba(254, 242, 242, 0.45)'
                          : '#ffffff',
                      borderLeft: needsUpdate
                        ? '4px solid #ea580c'
                        : isCritical
                          ? '4px solid #ef4444'
                          : '4px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                      {supplier.code}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isDispatched ? '#64748b' : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          maxWidth: 240,
                        }}
                        title={supplier.name}
                      >
                        {supplier.name}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {needsUpdate ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: '#c2410c',
                            background: '#ffedd5',
                            border: '1px solid #fdba74',
                            padding: '3px 8px',
                            borderRadius: 4,
                          }}
                          title="Số lượng trên ma trận khác PO đã chốt — nhấn Cập nhật & gửi mail để amend PO và gửi lại email NCC (trước giờ cutoff)."
                        >
                          Cần cập nhật
                          {supplier.pendingChangeLineCount
                            ? ` · ${supplier.pendingChangeLineCount} dòng`
                            : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          fontWeight: 700,
                          color: cutoffTone.color,
                          background: cutoffTone.background,
                          border: cutoffTone.border,
                          padding: '4px 8px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cutoffTone.text}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontWeight: 600 }}>
                        <Store size={13} color="#0d9488" />
                        {branchWithQty}/{linked} CH có SL
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {skuCount} SKU
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
                        color: '#059669',
                        fontFamily: 'monospace',
                      }}
                    >
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '8px 18px 8px 12px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="po-btn po-btn-secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                          onClick={() => onOpenDrawer(supplier.id)}
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
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
                            }}
                          >
                            <CheckCircle2 size={13} color="#10b981" />
                            Đã khóa (qua cutoff)
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canDispatch}
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
                              color: '#fff',
                              backgroundColor: !canDispatch
                                ? '#94a3b8'
                                : needsUpdate
                                  ? '#ea580c'
                                  : supplier.canAmend || supplier.poCode
                                    ? '#0369a1'
                                    : isCritical
                                      ? '#dc2626'
                                      : '#0d9488',
                              cursor: canDispatch ? 'pointer' : 'not-allowed',
                            }}
                            title={
                              needsUpdate
                                ? `SL đã đổi so với PO${supplier.poCode ? ` ${supplier.poCode}` : ''} — cập nhật và gửi lại email NCC`
                                : supplier.canAmend || supplier.poCode
                                  ? `Cập nhật PO đã tạo${supplier.poCode ? ` (${supplier.poCode})` : ''} trước giờ cutoff`
                                  : 'Chốt đơn và phát hành Purchase Order'
                            }
                          >
                            <Send size={13} />
                            <span>
                              {needsUpdate
                                ? 'Cập nhật & gửi mail'
                                : supplier.canAmend || supplier.poCode
                                  ? 'Cập nhật PO'
                                  : 'Chốt đơn'}
                            </span>
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

      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[10, 15, 20, 30]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange || (() => {})}
        itemLabel="nhà cung cấp"
      />
    </div>
  );
};
