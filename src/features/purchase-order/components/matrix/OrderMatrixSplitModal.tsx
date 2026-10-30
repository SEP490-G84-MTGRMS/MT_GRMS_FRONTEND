import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { SplitPoPreview } from '../../types/po.types';
import {
  X,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Boxes,
} from 'lucide-react';

interface OrderMatrixSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  splitPos: SplitPoPreview[];
  branchName: string;
  onConfirmGenerate: (selectedPoIds: string[]) => void;
}

export const OrderMatrixSplitModal: FC<OrderMatrixSplitModalProps> = ({
  isOpen,
  onClose,
  splitPos,
  branchName,
  onConfirmGenerate,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'cutoff_due' | 'future'>('all');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  // Selected PO IDs
  const [selectedPoIds, setSelectedPoIds] = useState<string[]>(() => {
    // Default select all POs that are ready for cutoff
    const dueIds = splitPos.filter((p) => p.isCutoffDue).map((p) => p.id);
    return dueIds.length > 0 ? dueIds : splitPos.map((p) => p.id);
  });

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const cutoffDueCount = useMemo(() => splitPos.filter((p) => p.isCutoffDue).length, [splitPos]);
  const futureCount = useMemo(() => splitPos.filter((p) => !p.isCutoffDue).length, [splitPos]);

  const filteredList = useMemo(() => {
    if (filterTab === 'cutoff_due') return splitPos.filter((p) => p.isCutoffDue);
    if (filterTab === 'future') return splitPos.filter((p) => !p.isCutoffDue);
    return splitPos;
  }, [splitPos, filterTab]);

  const selectedPOs = useMemo(
    () => splitPos.filter((p) => selectedPoIds.includes(p.id)),
    [splitPos, selectedPoIds]
  );

  const totalSelectedQty = useMemo(
    () => selectedPOs.reduce((acc, p) => acc + p.totalQuantity, 0),
    [selectedPOs]
  );

  const totalSelectedAmount = useMemo(
    () => selectedPOs.reduce((acc, p) => acc + p.totalAmount, 0),
    [selectedPOs]
  );

  if (!isOpen) return null;

  const toggleSelectPo = (id: string) => {
    setSelectedPoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectDueOnly = () => {
    setSelectedPoIds(splitPos.filter((p) => p.isCutoffDue).map((p) => p.id));
  };

  const handleSelectAll = () => {
    setSelectedPoIds(splitPos.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPoIds([]);
  };

  const handleSubmit = () => {
    if (selectedPoIds.length === 0) return;
    onConfirmGenerate(selectedPoIds);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Boxes size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Chốt Đơn &amp; Bóc Tách Purchase Order
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                  }}
                >
                  Quy chuẩn FE-05
                </span>
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
                Hệ thống tách độc lập theo <b>[Chi nhánh + Nhà cung cấp + Ngày giao hàng]</b>. Mỗi ngày giao có Cutoff riêng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Business Rule Banner */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: '#166534',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={15} style={{ color: '#15803d' }} />
            <span>
              Chi nhánh nhận hàng: <b>{branchName}</b>
            </span>
            <span style={{ color: '#86efac' }}>•</span>
            <span>
              Đã phát hiện <b>{splitPos.length} đơn PO độc lập</b> có phát sinh số lượng đặt.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handleSelectDueOnly}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                border: '1px solid #86efac',
                color: '#15803d',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Chỉ chốt các đơn thuộc ngày giao đã đến hạn Cutoff"
            >
              <span>Chỉ chốt ngày đến hạn Cutoff ({cutoffDueCount})</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            padding: '8px 20px 0',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: filterTab === 'all' ? 700 : 500,
              color: filterTab === 'all' ? '#2563eb' : '#64748b',
              borderBottom: `2px solid ${filterTab === 'all' ? '#2563eb' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Tất cả PO ({splitPos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('cutoff_due')}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: filterTab === 'cutoff_due' ? 700 : 500,
              color: filterTab === 'cutoff_due' ? '#d97706' : '#64748b',
              borderBottom: `2px solid ${filterTab === 'cutoff_due' ? '#d97706' : 'transparent'}`,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span>Đã đến hạn Cutoff ({cutoffDueCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('future')}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: filterTab === 'future' ? 700 : 500,
              color: filterTab === 'future' ? '#2563eb' : '#64748b',
              borderBottom: `2px solid ${filterTab === 'future' ? '#2563eb' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Dự kiến tương lai ({futureCount})
          </button>
        </div>

        {/* PO List Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#f8fafc',
          }}
        >
          {filteredList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: '#64748b',
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px dashed #cbd5e1',
              }}
            >
              Không có đơn PO nào trong mục này.
            </div>
          ) : (
            filteredList.map((po) => {
              const isSelected = selectedPoIds.includes(po.id);
              const isExpanded = expandedPoId === po.id;

              return (
                <div
                  key={po.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? (po.isCutoffDue ? '#f59e0b' : '#3b82f6') : '#e2e8f0'}`,
                    boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Card Header Row */}
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? (po.isCutoffDue ? '#fffbeb' : '#f8fafc') : '#ffffff',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSelectPo(po.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPo(po.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#2563eb' }}
                      />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                            {po.supplierName}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: po.isCutoffDue ? '#fef3c7' : '#e0f2fe',
                              color: po.isCutoffDue ? '#b45309' : '#0369a1',
                              border: `1px solid ${po.isCutoffDue ? '#fde68a' : '#bae6fd'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <span>{po.isCutoffDue ? 'Đã đến hạn Cutoff' : 'Kế hoạch dự kiến'}</span>
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginTop: 4,
                            fontSize: 12,
                            color: '#64748b',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} style={{ color: '#0284c7' }} />
                            Giao hàng: <b>{po.dowName} {po.dateShort} ({po.deliveryDate})</b>
                          </span>
                          <span>•</span>
                          <span><b>{po.items.length}</b> mặt hàng</span>
                          <span>•</span>
                          <span>Tổng SL: <b style={{ color: '#0284c7' }}>{po.totalQuantity}</b></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>
                          {fmt(po.totalAmount)} đ
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Mã dự kiến: <span style={{ fontFamily: 'monospace' }}>{po.id}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPoId(isExpanded ? null : po.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: 4,
                        }}
                        title={isExpanded ? 'Thu gọn' : 'Xem chi tiết sản phẩm'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div style={{ padding: '8px 16px 12px', backgroundColor: '#ffffff' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 12,
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                            <th style={{ padding: '6px 8px' }}>Sản phẩm</th>
                            <th style={{ padding: '6px 8px' }}>ĐVT</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Đơn giá (đ)</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>MOQ</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>NV đề xuất</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Chủ chốt</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>SL cuối</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Thành tiền (đ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items.map((item) => (
                            <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px' }}>
                                <b>{item.productName}</b> <small style={{ color: '#94a3b8' }}>({item.sku})</small>
                              </td>
                              <td style={{ padding: '6px 8px' }}>{item.unit}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                                {fmt(item.price)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                                {item.moq}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>
                                {item.employeeQty}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                {item.storeQty !== null ? (
                                  <span style={{ color: '#d97706', fontWeight: 700 }}>
                                    {item.storeQty}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>
                                {item.finalQty}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                                {fmt(item.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            <span>
              Đã chọn: <b style={{ color: '#2563eb' }}>{selectedPoIds.length} / {splitPos.length} đơn PO</b>
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>
              Tổng số lượng: <b style={{ color: '#0284c7' }}>{totalSelectedQty}</b>
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>
              Tổng tiền: <b style={{ color: '#059669' }}>{fmt(totalSelectedAmount)} đ</b>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedPoIds.length === 0}
              style={{
                height: 36,
                padding: '0 20px',
                borderRadius: 8,
                backgroundColor: selectedPoIds.length > 0 ? '#2563eb' : '#94a3b8',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: selectedPoIds.length > 0 ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: selectedPoIds.length > 0 ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <span>Xác nhận Chốt {selectedPoIds.length} PO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderMatrixSplitModal;
