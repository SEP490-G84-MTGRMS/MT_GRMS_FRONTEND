import { useState, useEffect, type FC, Fragment } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  PlusCircle,
  Ticket,
  Percent,
  Check,
  Edit2,
  Trash2,
  RotateCw,
  Printer,
} from 'lucide-react';
import type {
  VoucherBatchItem,
  VoucherBatchStatus,
  VoucherDiscountType,
  VoucherCodeStatus,
  VoucherCodeItem,
} from '../../types/promotion.types';
import { TablePagination, SortableHeader, useTableSort } from '../../../../components/common';
import { promotionApi } from '../../api/promotionApi';
import { VoucherPrintModal } from './VoucherPrintModal';

interface VoucherBatchTableProps {
  batches: VoucherBatchItem[];
  codesRefreshSignal?: { batchId: string; version: number } | null;
  onOpenGenerateCodes: (batch: VoucherBatchItem) => void;
  onToggleBatchStatus: (batchId: string) => void;
  onEdit: (batch: VoucherBatchItem) => void;
  onDelete: (batchId: string) => void;
}

export const VoucherBatchTable: FC<VoucherBatchTableProps> = ({
  batches,
  codesRefreshSignal,
  onOpenGenerateCodes,
  onToggleBatchStatus,
  onEdit,
  onDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [batchCodesMap, setBatchCodesMap] = useState<Record<string, VoucherCodeItem[]>>({});
  const [loadingCodesMap, setLoadingCodesMap] = useState<Record<string, boolean>>({});
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    batch: VoucherBatchItem | null;
    selectedCode: VoucherCodeItem | null;
  }>({
    isOpen: false,
    batch: null,
    selectedCode: null,
  });

  const handleOpenPrintSingle = (batch: VoucherBatchItem, code: VoucherCodeItem) => {
    setPrintModalState({
      isOpen: true,
      batch,
      selectedCode: code,
    });
  };

  const handleOpenPrintBatch = (batch: VoucherBatchItem) => {
    setPrintModalState({
      isOpen: true,
      batch,
      selectedCode: null,
    });
  };

  const handleClosePrintModal = () => {
    setPrintModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const formatUsedAtLocal = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 16).replace('T', ' ');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const fetchCodesForBatch = async (batchId: string) => {
    setLoadingCodesMap((prev) => ({ ...prev, [batchId]: true }));
    try {
      const res = await promotionApi.getVoucherCodes(batchId, { pageSize: 500 });
      if (res?.items) {
        const mapped: VoucherCodeItem[] = res.items.map((dto) => ({
          id: dto.id,
          code: dto.code,
          status: dto.status,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          orderCode: dto.orderCode,
          usedAt: formatUsedAtLocal(dto.usedAt),
          createdAt: dto.createdAt?.slice(0, 10),
        }));
        setBatchCodesMap((prev) => ({ ...prev, [batchId]: mapped }));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách mã voucher từ CSDL:', err);
    } finally {
      setLoadingCodesMap((prev) => ({ ...prev, [batchId]: false }));
    }
  };

  const { sort, handleSort, sortedItems } = useTableSort(batches, {
    batchCode: (b) => b.batchCode,
    name: (b) => b.name,
    discountValue: (b) => b.discountValue,
    usedQuantity: (b) => b.usedQuantity,
    totalQuantity: (b) => b.totalQuantity,
    startDate: (b) => b.startDate,
    endDate: (b) => b.endDate,
    status: (b) => b.status,
  });

  const paginatedBatches = sortedItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        fetchCodesForBatch(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (codesRefreshSignal?.batchId) {
      fetchCodesForBatch(codesRefreshSignal.batchId);
    }
  }, [codesRefreshSignal]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderBatchStatus = (status: VoucherBatchStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-status badge-active" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>Đang lưu hành</span>;
      case 'EXPIRED':
        return <span className="badge-status badge-expired" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>Đã hết hạn</span>;
      case 'PAUSED':
        return <span className="badge-status badge-paused" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>Tạm dừng</span>;
      case 'DEPLETED':
        return <span className="badge-status badge-pill-neutral" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>Đã phát hết</span>;
    }
  };

  const renderDiscountType = (type: VoucherDiscountType, val: number) => {
    switch (type) {
      case 'PERCENT':
        return (
          <div className="voucher-discount-tag tag-percent">
            <Percent size={14} />
            <span>Giảm {val}%</span>
          </div>
        );
      case 'FIXED_AMOUNT':
        return (
          <div className="voucher-discount-tag tag-fixed">
            <Ticket size={14} />
            <span>Giảm {val.toLocaleString('vi-VN')} đ</span>
          </div>
        );
    }
  };

  const renderCodeStatus = (status: VoucherCodeStatus) => {
    switch (status) {
      case 'UNUSED':
        return (
          <span className="badge-status" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
            Chưa dùng
          </span>
        );
      case 'USED':
        return (
          <span className="badge-status badge-pill-neutral">
            Đã sử dụng
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="badge-status badge-expired">
            Hết hạn
          </span>
        );
      case 'LOCKED':
        return (
          <span className="badge-status badge-paused">
            Đang khóa
          </span>
        );
    }
  };

  const thStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#f8fafc',
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div className="so-list-table-card so-list-table-card--wrap promotion-card" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
      <div className="table-responsive" style={{ width: '100%', flex: '1 1 auto', minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
        <table className="so-list-table promotion-table" style={{ minWidth: 1410, width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 116 }} />
            <col />
            <col style={{ width: 145 }} />
            <col style={{ width: 168 }} />
            <col style={{ width: 82 }} />
            <col style={{ width: 94 }} />
            <col style={{ width: 108 }} />
            <col style={{ width: 108 }} />
            <col style={{ width: 166 }} />
            <col style={{ width: 208 }} />
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ ...thStyle, width: 36, padding: '8px 6px', textAlign: 'center' }}></th>
              <th style={{ ...thStyle, width: 116 }}><SortableHeader label="Mã đợt" active={sort.key === 'batchCode'} direction={sort.direction} onClick={() => handleSort('batchCode')} /></th>
              <th style={{ ...thStyle }}><SortableHeader label="Tên đợt Voucher" active={sort.key === 'name'} direction={sort.direction} onClick={() => handleSort('name')} /></th>
              <th style={{ ...thStyle, width: 145 }}><SortableHeader label="Loại ưu đãi" active={sort.key === 'discountValue'} direction={sort.direction} onClick={() => handleSort('discountValue')} /></th>
              <th style={{ ...thStyle, width: 168 }}>Điều kiện áp dụng</th>
              <th style={{ ...thStyle, width: 82, textAlign: 'right' }}><SortableHeader label="Đã dùng" align="right" active={sort.key === 'usedQuantity'} direction={sort.direction} onClick={() => handleSort('usedQuantity')} /></th>
              <th style={{ ...thStyle, width: 94, textAlign: 'right' }}><SortableHeader label="Phát hành" align="right" active={sort.key === 'totalQuantity'} direction={sort.direction} onClick={() => handleSort('totalQuantity')} /></th>
              <th style={{ ...thStyle, width: 108, whiteSpace: 'nowrap' }}><SortableHeader label="Bắt đầu" active={sort.key === 'startDate'} direction={sort.direction} onClick={() => handleSort('startDate')} /></th>
              <th style={{ ...thStyle, width: 108, whiteSpace: 'nowrap' }}><SortableHeader label="Hết hạn" active={sort.key === 'endDate'} direction={sort.direction} onClick={() => handleSort('endDate')} /></th>
              <th style={{ ...thStyle, width: 166 }}><SortableHeader label="Trạng thái" active={sort.key === 'status'} direction={sort.direction} onClick={() => handleSort('status')} /></th>
              <th style={{ ...thStyle, width: 208, textAlign: 'right', paddingRight: 14 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  Không tìm thấy đợt voucher nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedBatches.map((batch) => {
                const isExpanded = expandedId === batch.id;
                const usagePercent =
                  batch.totalQuantity > 0
                    ? Math.min(100, Math.round((batch.usedQuantity / batch.totalQuantity) * 100))
                    : 0;
                const cleanDescription = batch.description
                  ? batch.description.replace(/\[CONFIG_JSON\][\s\S]*?\[\/CONFIG_JSON\]/g, '').trim()
                  : '';

                return (
                  <Fragment key={batch.id}>
                    <tr
                      className={`so-list-row ${isExpanded ? 'row-expanded' : ''}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isExpanded ? '#f0fdfa' : '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      <td className="so-list-td" style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => toggleExpand(batch.id)}
                          className="btn-table-icon"
                          title="Xem danh sách mã voucher chi tiết"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} color="#0F766E" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </td>
                      <td className="so-list-td">
                        <span className="so-list-code">{batch.batchCode}</span>
                      </td>
                      <td className="so-list-td">
                        <div className="promo-title-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="promo-title-main so-list-name">{batch.name}</span>
                            {batch.allowWithPromotions !== false ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                }}
                                title="Cho phép kết hợp với chương trình khuyến mãi khác"
                              >
                                Gộp KM
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f8fafc',
                                  color: '#64748b',
                                  border: '1px solid #e2e8f0',
                                }}
                                title="Không áp dụng đồng thời với khuyến mãi khác"
                              >
                                Độc lập
                              </span>
                            )}
                          </div>
                          {cleanDescription && (
                            <span className="promo-title-sub">{cleanDescription}</span>
                          )}
                        </div>
                      </td>
                      <td className="so-list-td">{renderDiscountType(batch.discountType, batch.discountValue)}</td>
                      <td className="so-list-td">
                        <div className="voucher-conditions" style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35 }}>
                          <div>
                            Đơn tối thiểu: <strong style={{ whiteSpace: 'nowrap' }}>{batch.minOrderValue.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          {batch.maxDiscount && (
                            <div style={{ color: '#64748b' }}>
                              Giảm tối đa: <span style={{ whiteSpace: 'nowrap' }}>{batch.maxDiscount.toLocaleString('vi-VN')} đ</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{batch.usedQuantity}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#0F766E' }}>{usagePercent}%</span>
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#334155' }}>
                        {batch.totalQuantity}
                      </td>
                      <td className="so-list-td" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {batch.startDate ? batch.startDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1') : '—'}
                      </td>
                      <td className="so-list-td" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {batch.endDate ? batch.endDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1') : '—'}
                      </td>
                      <td className="so-list-td" style={{ overflow: 'hidden', padding: '8px 12px 8px 10px', boxSizing: 'border-box' }}>
                        <div className="promo-status-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={batch.status === 'ACTIVE'}
                            aria-label={batch.status === 'ACTIVE' ? `Tạm dừng đợt ${batch.batchCode}` : `Kích hoạt đợt ${batch.batchCode}`}
                            className="switch-container"
                            onClick={() => onToggleBatchStatus(batch.id)}
                            title={batch.status === 'ACTIVE' ? 'Tạm dừng đợt phát hành' : 'Kích hoạt đợt'}
                            style={{ flexShrink: 0, border: 'none', background: 'transparent', padding: 0 }}
                          >
                            <span className={`switch-track ${batch.status === 'ACTIVE' ? 'switch-active' : ''}`}>
                              <span className="switch-thumb" />
                            </span>
                          </button>
                          {renderBatchStatus(batch.status)}
                        </div>
                      </td>
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right', overflow: 'hidden', padding: '8px 14px 8px 12px', boxSizing: 'border-box' }}>
                        <div className="table-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', flexWrap: 'nowrap', maxWidth: '100%' }}>
                          <button
                            onClick={() => onOpenGenerateCodes(batch)}
                            className="btn-secondary-pill"
                            style={{ padding: '3px 7px', fontSize: '11.5px', height: 28, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                            title="Phát hành thêm mã cho đợt này"
                          >
                            <PlusCircle size={13} color="#0F766E" />
                            <span>Tạo thêm mã</span>
                          </button>
                          <button
                            onClick={() => onEdit(batch)}
                            className="btn-table-icon"
                            style={{ width: 28, height: 28, flexShrink: 0 }}
                            title="Chỉnh sửa đợt voucher"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => onDelete(batch.id)}
                            className="btn-table-icon btn-danger-icon"
                            style={{ width: 28, height: 28, flexShrink: 0 }}
                            disabled={batch.status === 'ACTIVE'}
                            title={batch.status === 'ACTIVE' ? 'Hãy tạm dừng đợt voucher trước khi xóa' : 'Xóa đợt voucher'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Detail Row: Voucher Codes List */}
                    {isExpanded && (() => {
                      const codes = batchCodesMap[batch.id] ?? batch.codes ?? [];
                      const isLoadingCodes = loadingCodesMap[batch.id] ?? false;

                      return (
                        <tr>
                          <td colSpan={11} style={{ padding: 0 }}>
                            <div className="accordion-wrapper">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div className="accordion-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Ticket size={16} />
                                  <span>Danh sách mã code trong đợt ({codes.length} mã đã tạo)</span>
                                  <button
                                    type="button"
                                    onClick={() => fetchCodesForBatch(batch.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#0F766E',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: 4,
                                    }}
                                    title="Tải lại danh sách mã từ CSDL"
                                  >
                                    <RotateCw size={13} className={isLoadingCodes ? 'animate-spin' : ''} />
                                  </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    Tiền tố mã: <strong style={{ fontFamily: 'monospace', color: '#0F766E' }}>{batch.prefix}</strong>
                                  </span>
                                  {codes.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPrintBatch(batch)}
                                      className="btn-secondary-pill"
                                      style={{
                                        padding: '3px 10px',
                                        fontSize: '11.5px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        backgroundColor: '#f0fdfa',
                                        borderColor: '#0F766E',
                                        color: '#0F766E',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      title="In nhanh phiếu voucher ra máy in nhiệt POS-58"
                                    >
                                      <Printer size={13} />
                                      <span>In phiếu (POS-58)</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isLoadingCodes ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#0F766E', fontSize: '0.85rem', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                  <RotateCw className="w-5 h-5 animate-spin" style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                                  Đang tải danh sách mã voucher từ CSDL...
                                </div>
                              ) : codes.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                  Chưa có mã voucher nào được tạo. Bấm nút <strong>"Tạo thêm mã"</strong> phía trên để phát hành mã cho đợt này.
                                </div>
                              ) : (
                                <div className="voucher-codes-table-container">
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead className="voucher-codes-sticky-header">
                                      <tr>
                                        <th style={{ textAlign: 'left' }}>Mã voucher (Code)</th>
                                        <th style={{ textAlign: 'left' }}>Trạng thái</th>
                                        <th style={{ textAlign: 'left' }}>Khách hàng sử dụng</th>
                                        <th style={{ textAlign: 'left' }}>Hóa đơn áp dụng</th>
                                        <th style={{ textAlign: 'left' }}>Thời điểm sử dụng</th>
                                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {codes.map((c) => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 14px' }}>
                                            <div className="code-badge-box">
                                              <span>{c.code}</span>
                                            </div>
                                          </td>
                                          <td style={{ padding: '10px 14px' }}>{renderCodeStatus(c.status)}</td>
                                          <td style={{ padding: '10px 14px' }}>
                                            {c.customerName ? (
                                              <div>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.customerName}</div>
                                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{c.customerPhone}</div>
                                              </div>
                                            ) : (
                                              <span style={{ color: '#94a3b8' }}>—</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '10px 14px' }}>
                                            {c.orderCode ? (
                                              <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 600 }}>
                                                {c.orderCode}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#94a3b8' }}>—</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '10px 14px', color: '#475569' }}>{c.usedAt || '—'}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenPrintSingle(batch, c)}
                                                className="btn-copy-mini"
                                                style={{
                                                  color: '#0F766E',
                                                  borderColor: '#ccfbf1',
                                                  backgroundColor: '#f0fdfa',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                }}
                                                title="In phiếu voucher này ra máy in nhiệt POS-58"
                                              >
                                                <Printer size={13} />
                                                <span>In</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(c.code)}
                                                className="btn-copy-mini"
                                                title="Sao chép mã"
                                              >
                                                {copiedCode === c.code ? (
                                                  <>
                                                    <Check size={13} color="#059669" />
                                                    <span style={{ color: '#059669' }}>Đã chép</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy size={13} />
                                                    <span>Chép</span>
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn theo StoreProductTable ── */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={batches.length}
        pageSizeOptions={[15, 24, 36, 48]}
        itemLabel="đợt voucher"
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* ── Modal In Phiếu Voucher POS-58 ── */}
      {printModalState.isOpen && printModalState.batch && (
        <VoucherPrintModal
          isOpen={printModalState.isOpen}
          onClose={handleClosePrintModal}
          batch={printModalState.batch}
          initialCode={printModalState.selectedCode}
          availableCodes={batchCodesMap[printModalState.batch.id] ?? printModalState.batch.codes ?? []}
        />
      )}
    </div>
  );
};
