import { useState, type FC, Fragment } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  PlusCircle,
  Calendar,
  Ticket,
  Percent,
  Check,
  Edit2,
  Trash2,
  RotateCw,
} from 'lucide-react';
import type {
  VoucherBatchItem,
  VoucherBatchStatus,
  VoucherDiscountType,
  VoucherCodeStatus,
  VoucherCodeItem,
} from '../../types/promotion.types';
import { TablePagination } from '../../../../components/common';
import { promotionApi } from '../../api/promotionApi';

interface VoucherBatchTableProps {
  batches: VoucherBatchItem[];
  onOpenGenerateCodes: (batch: VoucherBatchItem) => void;
  onToggleBatchStatus: (batchId: string) => void;
  onEdit: (batch: VoucherBatchItem) => void;
  onDelete: (batchId: string) => void;
}

export const VoucherBatchTable: FC<VoucherBatchTableProps> = ({
  batches,
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
          usedAt: dto.usedAt?.slice(0, 16).replace('T', ' '),
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

  const paginatedBatches = batches.slice(
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderBatchStatus = (status: VoucherBatchStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-status badge-active">● Đang lưu hành</span>;
      case 'EXPIRED':
        return <span className="badge-status badge-expired">✕ Đã hết hạn</span>;
      case 'PAUSED':
        return <span className="badge-status badge-paused">⏸ Tạm dừng</span>;
      case 'DEPLETED':
        return <span className="badge-status badge-pill-neutral">Đã phát hết</span>;
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
    <div className="so-list-table-card so-list-table-card--wrap promotion-card">
      <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
        <table className="so-list-table promotion-table" style={{ minWidth: 1350, width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 44, padding: '8px 8px', textAlign: 'center' }}></th>
              <th style={{ ...thStyle, width: 120 }}>Mã đợt</th>
              <th style={{ ...thStyle, width: 210 }}>Tên đợt Voucher / Coupon</th>
              <th style={{ ...thStyle, width: 140 }}>Loại ưu đãi</th>
              <th style={{ ...thStyle, width: 165 }}>Điều kiện áp dụng</th>
              <th style={{ ...thStyle, width: 150 }}>Đã dùng / Phát hành</th>
              <th style={{ ...thStyle, width: 160 }}>Thời gian hiệu lực</th>
              <th style={{ ...thStyle, width: 150 }}>Trạng thái</th>
              <th style={{ ...thStyle, width: 210, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  Không tìm thấy đợt voucher nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedBatches.map((batch) => {
                const isExpanded = expandedId === batch.id;
                const usagePercent = Math.round((batch.usedQuantity / batch.totalQuantity) * 100);
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
                            Đơn tối thiểu: <strong>{batch.minOrderValue.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          {batch.maxDiscount && (
                            <div style={{ color: '#64748b' }}>
                              Giảm tối đa: {batch.maxDiscount.toLocaleString('vi-VN')} đ
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="so-list-td">
                        <div className="voucher-usage-container">
                          <div className="voucher-usage-text">
                            <span>{batch.usedQuantity} / {batch.totalQuantity}</span>
                            <span style={{ color: '#0F766E' }}>{usagePercent}%</span>
                          </div>
                          <div className="voucher-progress-track">
                            <div
                              className="voucher-progress-fill"
                              style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="so-list-td">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#334155' }}>
                            <Calendar size={12} style={{ color: '#0f766e', flexShrink: 0 }} />
                            <span style={{ color: '#64748b', fontSize: 11, minWidth: 24 }}>Từ:</span>
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{batch.startDate}</span>
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#334155' }}>
                            <span style={{ width: 12, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: '#64748b', fontSize: 11, minWidth: 24 }}>Đến:</span>
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{batch.endDate}</span>
                          </div>
                        </div>
                      </td>
                      <td className="so-list-td">
                        <div className="promo-status-cell">
                          <div
                            className="switch-container"
                            onClick={() => onToggleBatchStatus(batch.id)}
                            title={batch.status === 'ACTIVE' ? 'Tạm dừng đợt phát hành' : 'Kích hoạt đợt'}
                          >
                            <div className={`switch-track ${batch.status === 'ACTIVE' ? 'switch-active' : ''}`}>
                              <div className="switch-thumb" />
                            </div>
                          </div>
                          {renderBatchStatus(batch.status)}
                        </div>
                      </td>
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', width: '100%' }}>
                          <button
                            onClick={() => onOpenGenerateCodes(batch)}
                            className="btn-secondary-pill"
                            style={{ padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Phát hành thêm mã cho đợt này"
                          >
                            <PlusCircle size={14} color="#0F766E" />
                            <span>Tạo thêm mã</span>
                          </button>
                          <button
                            onClick={() => onEdit(batch)}
                            className="btn-table-icon"
                            title="Chỉnh sửa đợt voucher"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(batch.id)}
                            className="btn-table-icon btn-danger-icon"
                            disabled={batch.status === 'ACTIVE'}
                            title={batch.status === 'ACTIVE' ? 'Hãy tạm dừng đợt voucher trước khi xóa' : 'Xóa đợt voucher'}
                          >
                            <Trash2 size={14} />
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
                          <td colSpan={9} style={{ padding: 0 }}>
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
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  Tiền tố mã (Prefix): <strong style={{ fontFamily: 'monospace', color: '#0F766E' }}>{batch.prefix}</strong>
                                </span>
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
                                        <th style={{ textAlign: 'right' }}>Sao chép</th>
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
                                            <button
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
    </div>
  );
};
