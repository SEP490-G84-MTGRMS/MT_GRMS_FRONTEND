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
}

export const PromotionTable: FC<PromotionTableProps> = ({
  promotions,
  onEdit,
  onToggleStatus,
  onDelete,
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

  return (
    <div className="promotion-card">
      <div className="table-responsive">
        <table className="promotion-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th style={{ minWidth: 120 }}>Mã CTKM</th>
              <th style={{ minWidth: 220 }}>Tên chương trình</th>
              <th style={{ minWidth: 140 }}>Hình thức</th>
              <th style={{ minWidth: 200 }}>Thời gian hiệu lực</th>
              <th style={{ minWidth: 180 }}>Chi nhánh áp dụng</th>
              <th style={{ minWidth: 120 }}>Lượt áp dụng</th>
              <th style={{ minWidth: 160 }}>Trạng thái</th>
              <th style={{ minWidth: 90, textAlign: 'right' }}>Thao tác</th>
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
                    <tr className={isExpanded ? 'row-expanded' : ''}>
                      <td>
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
                      <td>
                        <span className="promo-code-text">{item.code}</span>
                      </td>
                      <td>
                        <div className="promo-title-box">
                          <span className="promo-title-main">{item.name}</span>
                          {item.description && (
                            <span className="promo-title-sub">{item.description}</span>
                          )}
                        </div>
                      </td>
                      <td>{renderTypeBadge(item.type)}</td>
                      <td>
                        <div className="promo-date-badge">
                          <Calendar size={13} />
                          <span className="promo-date-text">{item.startDate}</span>
                          <span className="promo-date-arrow">→</span>
                          <span className="promo-date-text">{item.endDate}</span>
                        </div>
                      </td>
                      <td>
                        <div className="promo-branch-cell">
                          <MapPin size={13} color="#94a3b8" />
                          {item.branches.includes('ALL') ? (
                            <span className="promo-branch-all">Toàn hệ thống</span>
                          ) : (
                            <span>{item.branches.join(', ')}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="promo-usage-cell">
                          <span className="promo-usage-count">{item.usageCount} lượt</span>
                          {item.totalDiscountGiven > 0 && (
                            <span className="promo-usage-discount">
                              (-{item.totalDiscountGiven.toLocaleString('vi-VN')} đ)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
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
                      <td style={{ textAlign: 'right' }}>
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
                            title="Xóa chương trình"
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
                                          {tier.minOrderValue !== undefined ? (
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
                                            {tier.discountType === 'PERCENT' ? (
                                              <div className="voucher-discount-tag tag-percent">
                                                <Percent size={13} />
                                                <span>Giảm {tier.discountValue}%</span>
                                              </div>
                                            ) : (
                                              <div className="voucher-discount-tag tag-fixed">
                                                <Tag size={13} />
                                                <span>Giảm {tier.discountValue.toLocaleString('vi-VN')} đ</span>
                                              </div>
                                            )}
                                            {tier.giftProductName && (
                                              <div className="tier-gift-box" style={{ margin: 0, padding: '2px 6px', fontSize: '0.74rem' }}>
                                                <Gift size={12} />
                                                <span>Tặng {tier.giftQty || 1} x {tier.giftProductName}</span>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                          {tier.maxDiscount !== undefined ? (
                                            <strong style={{ color: '#0f172a' }}>{tier.maxDiscount.toLocaleString('vi-VN')} đ</strong>
                                          ) : (
                                            <span style={{ color: '#94a3b8' }}>Không giới hạn</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                                          {tier.discountType === 'PERCENT'
                                            ? `Giảm ${tier.discountValue}% trên tổng tiền hàng${tier.maxDiscount ? ` (tối đa ${tier.maxDiscount.toLocaleString('vi-VN')} đ)` : ''}`
                                            : `Trừ trực tiếp ${tier.discountValue.toLocaleString('vi-VN')} đ vào hóa đơn`}
                                          {tier.giftProductName && ` kèm quà tặng ${tier.giftProductName}`}
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
        totalItems={promotions.length}
        pageSizeOptions={[5, 10, 20]}
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
