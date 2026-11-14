import { useState, type FC, Fragment } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  Gift,
  Percent,
  Tag,
} from 'lucide-react';
import type { PromotionItem, PromotionType, PromotionStatus } from '../../types/promotion.types';
import { TablePagination } from '../../../../components/common';

interface PromotionTableProps {
  promotions: PromotionItem[];
  onEdit: (item: PromotionItem) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  branchMap?: Map<string, string>;
}

export const PromotionTable: FC<PromotionTableProps> = ({
  promotions,
  onEdit,
  onToggleStatus,
  onDelete,
  branchMap,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedPromotions = promotions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderStatusBadge = (status: PromotionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-status badge-active">● Đang chạy</span>;
      case 'UPCOMING':
        return <span className="badge-status badge-upcoming">● Sắp diễn ra</span>;
      case 'PAUSED':
        return <span className="badge-status badge-paused">⏸ Tạm dừng</span>;
      case 'EXPIRED':
        return <span className="badge-status badge-expired">✕ Đã kết thúc</span>;
    }
  };

  const renderTypeBadge = (type: PromotionType) => {
    switch (type) {
      case 'ORDER_DISCOUNT':
        return (
          <span className="badge-type badge-type-order">
            <Percent size={13} />
            <span>Chiết khấu đơn</span>
          </span>
        );
      case 'BUY_X_GET_Y':
        return (
          <span className="badge-type badge-type-gift">
            <Gift size={13} />
            <span>Mua X tặng Y</span>
          </span>
        );
      case 'PRODUCT_DISCOUNT':
        return (
          <span className="badge-type badge-type-product">
            <Tag size={13} />
            <span>Giảm giá SP</span>
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
    <div className="so-list-table-card promotion-card">
      <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
        <table className="so-list-table promotion-table" style={{ minWidth: 1340, width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 44, padding: '8px 8px', textAlign: 'center' }}></th>
              <th style={{ ...thStyle, width: 125 }}>Mã CTKM</th>
              <th style={{ ...thStyle, width: 220 }}>Tên chương trình</th>
              <th style={{ ...thStyle, width: 145 }}>Hình thức</th>
              <th style={{ ...thStyle, width: 245 }}>Thời gian hiệu lực</th>
              <th style={{ ...thStyle, width: 180 }}>Chi nhánh áp dụng</th>
              <th style={{ ...thStyle, width: 185 }}>Lượt &amp; Ngân sách</th>
              <th style={{ ...thStyle, width: 135 }}>Trạng thái</th>
              <th style={{ ...thStyle, width: 85, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  Không tìm thấy chương trình khuyến mãi nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              paginatedPromotions.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
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
                          onClick={() => toggleExpand(item.id)}
                          className="btn-table-icon"
                          title="Xem chi tiết thể lệ bậc thang"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} color="#0F766E" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </td>
                      <td className="so-list-td">
                        <span className="so-list-code">{item.code}</span>
                      </td>
                      <td className="so-list-td">
                        <div className="promo-title-box">
                          <span className="promo-title-main so-list-name">{item.name}</span>
                          {item.description && (
                            <span className="promo-title-sub">{item.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="so-list-td">{renderTypeBadge(item.type)}</td>
                      <td className="so-list-td">
                        <div className="promo-date-badge">
                          <Calendar size={13} />
                          <span className="promo-date-text">{item.startDate}</span>
                          <span className="promo-date-arrow">→</span>
                          <span className="promo-date-text">{item.endDate}</span>
                        </div>
                      </td>
                      <td className="so-list-td">
                        {(() => {
                          const displayBranches = item.branches.map((b) => branchMap?.get(b) || b);
                          const isAll = item.branches.includes('ALL') || item.branches.length === 0;
                          return (
                            <div
                              className="promo-branch-cell"
                              title={
                                isAll
                                  ? 'Áp dụng trên toàn bộ chuỗi cửa hàng'
                                  : displayBranches.join(', ')
                              }
                            >
                              <MapPin size={13} className="promo-branch-icon" />
                              {isAll ? (
                                <span className="promo-branch-all">Toàn hệ thống</span>
                              ) : displayBranches.length === 1 ? (
                                <span className="promo-branch-single">{displayBranches[0]}</span>
                              ) : (
                                <div className="promo-branch-multi">
                                  <span className="promo-branch-first">{displayBranches[0]}</span>
                                  <span className="promo-branch-count">+{displayBranches.length - 1}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="so-list-td">
                        <div className="promo-usage-cell" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span className="promo-usage-count" style={{ fontWeight: 700, color: '#0f172a' }}>
                              {item.usageCount} lượt
                            </span>
                            {item.budgetLimit && item.budgetLimit > 0 ? (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor:
                                    (item.totalDiscountGiven / item.budgetLimit) >= 1
                                      ? '#fef2f2'
                                      : (item.totalDiscountGiven / item.budgetLimit) >= 0.8
                                      ? '#fffbeb'
                                      : '#f0fdf4',
                                  color:
                                    (item.totalDiscountGiven / item.budgetLimit) >= 1
                                      ? '#b91c1c'
                                      : (item.totalDiscountGiven / item.budgetLimit) >= 0.8
                                      ? '#b45309'
                                      : '#15803d',
                                }}
                              >
                                {Math.min(100, Math.round((item.totalDiscountGiven / item.budgetLimit) * 100))}%
                              </span>
                            ) : null}
                          </div>

                          {/* Chi tiết ngân sách */}
                          {item.budgetLimit && item.budgetLimit > 0 ? (
                            <div>
                              <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: '#0f766e' }}>
                                  {item.totalDiscountGiven.toLocaleString('vi-VN')} đ
                                </span>
                                <span style={{ color: '#94a3b8' }}>/</span>
                                <span style={{ color: '#64748b' }}>
                                  {item.budgetLimit.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              {/* Thanh tiến độ */}
                              <div
                                style={{
                                  width: '100%',
                                  height: 5,
                                  backgroundColor: '#e2e8f0',
                                  borderRadius: 3,
                                  marginTop: 3,
                                  overflow: 'hidden',
                                }}
                                title={`Đã dùng ${item.totalDiscountGiven.toLocaleString('vi-VN')} đ trên tổng ${item.budgetLimit.toLocaleString('vi-VN')} đ`}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, Math.max(0, (item.totalDiscountGiven / item.budgetLimit) * 100))}%`,
                                    backgroundColor:
                                      (item.totalDiscountGiven / item.budgetLimit) >= 1
                                        ? '#ef4444'
                                        : (item.totalDiscountGiven / item.budgetLimit) >= 0.8
                                        ? '#f59e0b'
                                        : '#10b981',
                                    borderRadius: 3,
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              <span>Đã giảm: </span>
                              <b style={{ color: '#0f766e' }}>{item.totalDiscountGiven.toLocaleString('vi-VN')} đ</b>
                              <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>(Không giới hạn)</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="so-list-td">
                        <div className="promo-status-cell">
                          <div
                            className="switch-container"
                            onClick={() => onToggleStatus(item.id)}
                            title={item.status === 'ACTIVE' ? 'Tạm ngưng CTKM' : 'Kích hoạt CTKM'}
                          >
                            <div className={`switch-track ${item.status === 'ACTIVE' ? 'switch-active' : ''}`}>
                              <div className="switch-thumb" />
                            </div>
                          </div>
                          {renderStatusBadge(item.status)}
                        </div>
                      </td>
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button
                            onClick={() => onEdit(item)}
                            className="btn-table-icon"
                            title="Chỉnh sửa chương trình"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="btn-table-icon btn-danger-icon"
                            disabled={item.status === 'ACTIVE'}
                            title={item.status === 'ACTIVE' ? 'Hãy tạm ngưng chương trình trước khi xóa' : 'Xóa chương trình'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Detail Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div className="accordion-wrapper">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div className="accordion-title" style={{ margin: 0 }}>
                                <Layers size={16} />
                                <span>Quy tắc bậc thang & Thể lệ áp dụng ({item.tiers.length} mức cấu hình)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hình thức áp dụng:</span>
                                {renderTypeBadge(item.type)}
                              </div>
                            </div>

                            {item.tiers.length === 0 ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                Chưa có mức bậc thang nào được thiết lập cho chương trình này.
                              </div>
                            ) : (
                              <div className="voucher-codes-table-container">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                  <thead className="voucher-codes-sticky-header">
                                    <tr>
                                      <th style={{ textAlign: 'left', width: 90 }}>Mức bậc</th>
                                      <th style={{ textAlign: 'left' }}>Điều kiện áp dụng</th>
                                      <th style={{ textAlign: 'left' }}>Mức ưu đãi / Chiết khấu</th>
                                      <th style={{ textAlign: 'left' }}>Giảm tối đa</th>
                                      <th style={{ textAlign: 'left' }}>Thể lệ chi tiết</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.tiers.map((tier) => (
                                      <tr key={tier.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 14px' }}>
                                          <span className="tier-badge-number">Bậc {tier.tierLevel}</span>
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                          {item.type === 'BUY_X_GET_Y' ? (
                                            <div>
                                              <span style={{ color: '#64748b' }}>Mua từ </span>
                                              <strong style={{ color: '#0f172a' }}>
                                                {tier.requiredQty || 1} {tier.buyUnit ? `${tier.buyUnit} ` : ''}× {tier.buyProductName || 'sản phẩm bất kỳ'}
                                              </strong>
                                            </div>
                                          ) : tier.minOrderValue !== undefined ? (
                                            <div>
                                              <span style={{ color: '#64748b' }}>Đơn hàng từ </span>
                                              <strong style={{ color: '#0f172a' }}>{tier.minOrderValue.toLocaleString('vi-VN')} đ</strong>
                                            </div>
                                          ) : tier.requiredQty !== undefined ? (
                                            <div>
                                              <span style={{ color: '#64748b' }}>Mua số lượng từ </span>
                                              <strong style={{ color: '#0f172a' }}>{tier.requiredQty} sản phẩm</strong>
                                            </div>
                                          ) : (
                                            <span style={{ color: '#64748b' }}>Áp dụng trực tiếp từng sản phẩm</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {item.type !== 'BUY_X_GET_Y' && (
                                              tier.discountType === 'PERCENT' ? (
                                                <div className="voucher-discount-tag tag-percent">
                                                  <Percent size={13} />
                                                  <span>Giảm {tier.discountValue}%</span>
                                                </div>
                                              ) : (
                                                <div className="voucher-discount-tag tag-fixed">
                                                  <Tag size={13} />
                                                  <span>Giảm {tier.discountValue.toLocaleString('vi-VN')} đ</span>
                                                </div>
                                              )
                                            )}
                                            {(tier.giftProductName || item.type === 'BUY_X_GET_Y') && (
                                              <div className="tier-gift-box" style={{ margin: 0, padding: '2px 6px', fontSize: '0.74rem' }}>
                                                <Gift size={12} />
                                                <span>
                                                  Tặng {tier.giftQty || 1} {tier.giftUnit || 'Cái'} {tier.giftProductName || 'Quà tặng KM'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                          {tier.maxDiscount !== undefined && item.type !== 'BUY_X_GET_Y' ? (
                                            <strong style={{ color: '#0f172a' }}>{tier.maxDiscount.toLocaleString('vi-VN')} đ</strong>
                                          ) : (
                                            <span style={{ color: '#94a3b8' }}>Không giới hạn</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                                          {item.type === 'BUY_X_GET_Y'
                                            ? `Mua đủ ${tier.requiredQty || 1} ${tier.buyUnit ? `${tier.buyUnit} ` : ''}${tier.buyProductName || 'sản phẩm bất kỳ'} tặng ngay ${tier.giftQty || 1} ${tier.giftUnit || ''} ${tier.giftProductName || 'quà tặng'} (0 đ)`
                                            : tier.discountType === 'PERCENT'
                                            ? `Giảm ${tier.discountValue}% trên tổng tiền hàng${tier.maxDiscount ? ` (tối đa ${tier.maxDiscount.toLocaleString('vi-VN')} đ)` : ''}`
                                            : `Trừ trực tiếp ${tier.discountValue.toLocaleString('vi-VN')} đ vào hóa đơn`}
                                          {item.type !== 'BUY_X_GET_Y' && tier.giftProductName && ` kèm quà tặng ${tier.giftProductName}`}
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

      {/* ── Footer Phân trang chuẩn theo StoreProductTable ── */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={promotions.length}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="chương trình"
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};
