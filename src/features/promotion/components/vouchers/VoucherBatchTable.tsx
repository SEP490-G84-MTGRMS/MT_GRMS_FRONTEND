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
} from 'lucide-react';
import type {
  VoucherBatchItem,
  VoucherBatchStatus,
  VoucherDiscountType,
  VoucherCodeStatus,
} from '../../types/promotion.types';
import { TablePagination } from '../../../../components/common';

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
  const [pageSize, setPageSize] = useState(10);

  const paginatedBatches = batches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
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

  return (
    <div className="promotion-card">
      <div className="table-responsive">
        <table className="promotion-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th style={{ minWidth: 120 }}>Mã đợt</th>
              <th style={{ minWidth: 220 }}>Tên đợt Voucher / Coupon</th>
              <th style={{ minWidth: 150 }}>Loại ưu đãi</th>
              <th style={{ minWidth: 180 }}>Điều kiện áp dụng</th>
              <th style={{ minWidth: 150 }}>Đã dùng / Phát hành</th>
              <th style={{ minWidth: 200 }}>Thời gian hiệu lực</th>
              <th style={{ minWidth: 160 }}>Trạng thái</th>
              <th style={{ minWidth: 120, textAlign: 'right' }}>Thao tác</th>
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

                return (
                  <Fragment key={batch.id}>
                    <tr className={isExpanded ? 'row-expanded' : ''}>
                      <td>
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
                      <td>
                        <span className="promo-code-text">{batch.batchCode}</span>
                      </td>
                      <td>
                        <div className="promo-title-box">
                          <span className="promo-title-main">{batch.name}</span>
                          {batch.description && (
                            <span className="promo-title-sub">{batch.description}</span>
                          )}
                        </div>
                      </td>
                      <td>{renderDiscountType(batch.discountType, batch.discountValue)}</td>
                      <td>
                        <div className="voucher-conditions">
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
                      <td>
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
                      <td>
                        <div className="promo-date-badge">
                          <Calendar size={13} />
                          <span className="promo-date-text">{batch.startDate}</span>
                          <span className="promo-date-arrow">→</span>
                          <span className="promo-date-text">{batch.endDate}</span>
                        </div>
                      </td>
                      <td>
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
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button
                            onClick={() => onOpenGenerateCodes(batch)}
                            className="btn-secondary-pill"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
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
                            title="Xóa đợt voucher"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Detail Row: Voucher Codes List */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div className="accordion-wrapper">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div className="accordion-title" style={{ margin: 0 }}>
                                <Ticket size={16} />
                                <span>Danh sách mã code trong đợt ({batch.codes.length} mã đã tạo)</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Tiền tố mã (Prefix): <strong style={{ fontFamily: 'monospace', color: '#0F766E' }}>{batch.prefix}</strong>
                              </span>
                            </div>

                            {batch.codes.length === 0 ? (
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
                                  {batch.codes.map((c) => (
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
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Shared Enterprise Pagination */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={batches.length}
        pageSizeOptions={[5, 10, 20]}
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
