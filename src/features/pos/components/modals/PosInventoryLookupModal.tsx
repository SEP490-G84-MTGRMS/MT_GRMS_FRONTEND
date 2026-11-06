import React, { useState, useMemo } from 'react';
import type { Product } from '../../types/pos.types';
import { Search, Layers, CheckCircle2, AlertTriangle, Building2, Package, Clock } from 'lucide-react';
import { AN_NHIEN_BRANCHES } from '../../mock/posMockData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentBranchName: string;
  products: Product[];
  onSelectBatchToCart?: (product: Product, batchCode: string, expiryDate?: string) => void;
}

interface BatchDisplayInfo {
  batchCode: string;
  expiryDate: string;
  quantityOnHand: number;
  daysRemaining: number;
  isNearExpiry: boolean;
  isUrgent: boolean;
}

export const PosInventoryLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentBranchName,
  products = [],
  onSelectBatchToCart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(() => products[0]?.id || '');

  // Lọc sản phẩm theo từ khóa
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Sản phẩm hiện tại đang được chọn tra cứu
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Danh sách các lô hàng sinh ra hoặc lấy từ sản phẩm (sắp xếp FEFO: hạn sớm nhất lên đầu)
  const batches = useMemo<BatchDisplayInfo[]>(() => {
    if (!selectedProduct) return [];

    const now = new Date();
    const primaryCode = selectedProduct.batchCode || 'BATCH-AN-01';
    const primaryExpStr = selectedProduct.expiryDate || '2026-11-20';
    const primaryExpDate = new Date(primaryExpStr);
    const diffDays1 = Math.max(1, Math.ceil((primaryExpDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));

    // Tạo 2-3 lô mẫu FEFO mô phỏng kho thực tế cho sản phẩm
    const list: BatchDisplayInfo[] = [
      {
        batchCode: primaryCode,
        expiryDate: primaryExpDate.toLocaleDateString('vi-VN'),
        quantityOnHand: Math.max(15, Math.floor(selectedProduct.quantityOnHand * 0.45)),
        daysRemaining: diffDays1,
        isNearExpiry: diffDays1 <= 30,
        isUrgent: diffDays1 <= 7,
      },
      {
        batchCode: `${primaryCode}-L2`,
        expiryDate: new Date(now.getTime() + 45 * 24 * 3600 * 1000).toLocaleDateString('vi-VN'),
        quantityOnHand: Math.max(25, Math.floor(selectedProduct.quantityOnHand * 0.35)),
        daysRemaining: 45,
        isNearExpiry: false,
        isUrgent: false,
      },
      {
        batchCode: `${primaryCode}-L3`,
        expiryDate: new Date(now.getTime() + 180 * 24 * 3600 * 1000).toLocaleDateString('vi-VN'),
        quantityOnHand: Math.max(20, Math.floor(selectedProduct.quantityOnHand * 0.20)),
        daysRemaining: 180,
        isNearExpiry: false,
        isUrgent: false,
      },
    ];

    // Sắp xếp tăng dần theo số ngày còn lại (chuẩn FEFO)
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [selectedProduct]);

  if (!isOpen) return null;

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 840, width: '92%' }}>
        {/* Modal Header */}
        <div className="pos-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#0f766e" />
            <b style={{ fontSize: 16 }}>Tra Cứu Tồn Kho &amp; Lô Hạn Dùng FEFO</b>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                fontWeight: 600,
              }}
            >
              ● Tự động trừ FEFO đang bật
            </span>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="pos-modal-body" style={{ maxHeight: '74vh', overflowY: 'auto', padding: '16px' }}>
          {/* Hướng dẫn ngắn gọn */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 12,
              color: '#475569',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock size={15} color="#0f766e" style={{ flexShrink: 0 }} />
            <span>
              <b>Mặc định:</b> Khi quét mã hoặc chọn món tại quầy, hệ thống <b>tự động trừ lô cận date nhất</b>.
              Bạn chỉ cần bấm nút <b>&quot;✓ Chọn bán lô này&quot;</b> khi khách yêu cầu lô cụ thể hoặc bán lô xả hàng.
            </span>
          </div>

          {/* Ô tìm kiếm & Gợi ý */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gõ tên sản phẩm hoặc quét mã barcode để tra cứu..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 6,
                  border: '1.5px solid #0f766e',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Chip danh sách nhanh */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {filteredProducts.slice(0, 6).map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProductId(p.id)}
                    style={{
                      border: isSelected ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                      color: isSelected ? '#0f766e' : '#334155',
                      fontWeight: isSelected ? 700 : 500,
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    {p.name.length > 28 ? p.name.slice(0, 28) + '...' : p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProduct ? (
            <div>
              {/* Thẻ tóm tắt sản phẩm đang tra cứu */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{selectedProduct.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 10 }}>
                    <span>Mã Barcode: <b>{selectedProduct.barcode || 'Chưa gán'}</b></span>
                    <span>Đơn vị: <b>{selectedProduct.baseUnit || 'Cái'}</b></span>
                    <span>Giá niêm yết: <b style={{ color: '#0f766e' }}>{selectedProduct.basePrice.toLocaleString('vi-VN')} đ</b></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Tổng tồn chi nhánh này:</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f766e' }}>
                    {selectedProduct.quantityOnHand} {selectedProduct.baseUnit || 'cái'}
                  </div>
                </div>
              </div>

              {/* KHỐI 1: TỒN KHO ĐA CHI NHÁNH */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} color="#0f766e" />
                  <span>1. Tồn Kho Chéo Đa Chi Nhánh Trong Chuỗi</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '7px 10px' }}>Chi nhánh</th>
                        <th style={{ padding: '7px 10px' }}>Địa chỉ</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>Tồn khả dụng</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 120 }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {AN_NHIEN_BRANCHES.map((b, idx) => {
                        const isCurrent = currentBranchName.includes(b.name.replace('An Nhiên Mart - ', '')) || idx === 0;
                        // Phân bổ tồn kho mô phỏng
                        const branchQty = isCurrent
                          ? selectedProduct.quantityOnHand
                          : idx === 1
                          ? Math.round(selectedProduct.quantityOnHand * 0.7)
                          : Math.round(selectedProduct.quantityOnHand * 0.5);

                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isCurrent ? '#f0fdfa' : '#ffffff' }}>
                            <td style={{ padding: '7px 10px' }}>
                              <b style={{ color: isCurrent ? '#0f766e' : '#1e293b' }}>{b.name}</b>
                              {isCurrent && (
                                <span style={{ marginLeft: 6, fontSize: 10.5, color: '#0f766e', backgroundColor: '#ccfbf1', padding: '1px 5px', borderRadius: 3 }}>
                                  (Điểm bán hiện tại)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#64748b' }}>{b.address}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: branchQty > 0 ? '#15803d' : '#dc2626' }}>
                              {branchQty} {selectedProduct.baseUnit || 'cái'}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  backgroundColor: branchQty > 10 ? '#dcfce7' : branchQty > 0 ? '#fef3c7' : '#fee2e2',
                                  color: branchQty > 10 ? '#15803d' : branchQty > 0 ? '#b45309' : '#b91c1c',
                                }}
                              >
                                {branchQty > 10 ? 'Sẵn hàng' : branchQty > 0 ? 'Sắp hết' : 'Hết hàng'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KHỐI 2: DANH SÁCH LÔ HÀNG FEFO CÓ NÚT CHỌN BÁN */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={15} color="#0f766e" />
                    <span>2. Danh Sách Lô Hàng Hạn Dùng (FEFO: Lô cận date xếp trước)</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Ưu tiên xuất bán từ trên xuống</span>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '7px 10px', width: 40, textAlign: 'center' }}>#</th>
                        <th style={{ padding: '7px 10px' }}>Mã Lô hàng</th>
                        <th style={{ padding: '7px 10px' }}>Hạn sử dụng</th>
                        <th style={{ padding: '7px 10px' }}>Tình trạng hạn</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>Tồn lô</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 140 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b, idx) => (
                        <tr
                          key={b.batchCode}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: b.isUrgent ? '#fff7ed' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <b style={{ color: '#0f172a' }}>{b.batchCode}</b>
                            {idx === 0 && (
                              <span style={{ marginLeft: 6, fontSize: 10, color: '#0f766e', backgroundColor: '#e6fffa', padding: '1px 5px', borderRadius: 3 }}>
                                FEFO 1st
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ fontWeight: 600 }}>{b.expiryDate}</span>
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            {b.isUrgent ? (
                              <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={12} />
                                Cận date (Còn {b.daysRemaining} ngày)
                              </span>
                            ) : b.isNearExpiry ? (
                              <span style={{ color: '#d97706', fontWeight: 600 }}>Còn {b.daysRemaining} ngày</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle2 size={12} />
                                An toàn ({b.daysRemaining} ngày)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>
                            {b.quantityOnHand} {selectedProduct.baseUnit || 'cái'}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectBatchToCart?.(selectedProduct, b.batchCode, b.expiryDate);
                                onClose();
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 4,
                                border: 'none',
                                backgroundColor: '#0f766e',
                                color: '#ffffff',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title={`Chọn bán sản phẩm này từ lô ${b.batchCode}`}
                            >
                              <span>✓ Chọn bán lô này</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 12px', color: '#94a3b8' }}>
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pos-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
