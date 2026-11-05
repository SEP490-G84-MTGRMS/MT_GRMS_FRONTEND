import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Copy,
  Ban,
  Package,
  FileText,
  Star,
  ZoomIn,
  Image as ImageIcon,
} from 'lucide-react';
import type { ProductItem, UomConversion } from '../types';
import { productApi } from '../api/productApi';

interface ProductDetailModalProps {
  isOpen: boolean;
  product: ProductItem | null;
  onClose: () => void;
  onEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
  onToggleStatus: (product: ProductItem) => void;
  onDuplicate: (product: ProductItem) => void;
  userRole?: string; // "StoreOwner" | "Cashier"
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  product,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  userRole = 'StoreOwner',
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');

  // Đơn vị tính đang chọn và danh sách đơn vị quy đổi (dựa trên ProductUnit.cs)
  const [selectedUnitName, setSelectedUnitName] = useState<string>(product?.baseUnit || 'Cái');
  const [units, setUnits] = useState<UomConversion[]>(product?.uomConversions || []);

  // Multi-image selection & Lightbox popup
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

  const allImages = useMemo(() => {
    if (!product) return [];
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  useEffect(() => {
    if (product) {
      setSelectedUnitName(product.baseUnit || 'Cái');
      setUnits(product.uomConversions || []);
      setSelectedImageIdx(0);
      setPreviewImageModalUrl(null);
      setActiveTab('info');
    }
  }, [product]);

  // Nạp đơn vị quy đổi từ API nếu product chưa nạp sẵn
  useEffect(() => {
    if (!product?.id) return;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (isGuid && (!product.uomConversions || product.uomConversions.length === 0)) {
      productApi
        .getProductUnits(product.id)
        .then((res) => {
          if (res && res.length > 0) {
            const convs: UomConversion[] = res
              .filter((u) => !u.isBaseUnit)
              .map((u) => ({
                id: u.id,
                unitName: u.unitName,
                productCode: product.productCode,
                conversionRate: u.conversionRate,
                price: u.price,
                barcode: u.barcode ?? undefined,
              }));
            setUnits(convs);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [product?.id, product?.uomConversions, product?.productCode]);

  if (!isOpen || !product) return null;

  const isDiscontinued = product.status === 'Discontinued';

  const formatVND = (num?: number | null) => {
    if (num === undefined || num === null) return '—';
    return `${Number(num).toLocaleString('vi-VN')} đ`;
  };

  // Tính toán các giá trị chuyển đổi theo đơn vị tính đang chọn (ProductUnit.cs)
  const isBaseUnit = selectedUnitName === (product.baseUnit || 'Cái');
  const currentUom = units.find((u) => u.unitName === selectedUnitName);
  const conversionRate = isBaseUnit ? 1 : Math.max(1, currentUom?.conversionRate || 1);

  // Mã hàng & Mã vạch theo đơn vị
  const displayCode = product.productCode;
  const displayBarcode = (!isBaseUnit && currentUom?.barcode) ? currentUom.barcode : (isBaseUnit ? product.barcode : '—');

  // Giá bán theo đơn vị (Price / SellingPrice)
  const displaySellingPrice = isBaseUnit ? product.sellingPrice : (currentUom?.price ?? product.sellingPrice);

  // Giá vốn theo đơn vị (tuân thủ BR-SEC-01)
  const displayCostPrice = product.costPrice != null
    ? (isBaseUnit ? Number(product.costPrice) : Number(product.costPrice) * conversionRate)
    : null;

  return (
    <div className="custom-modal-backdrop" style={{ zIndex: 1100 }}>
      <div
        className="custom-modal-box"
        style={{
          maxWidth: 1160,
          width: '96vw',
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* ============================================================== */}
        {/* THANH TỔNG QUAN PHÍA TRÊN CÙNG                                 */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            flexWrap: 'wrap',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 18, color: product.isFavorite ? '#EAB308' : '#CBD5E1' }}>
              <Star size={18} fill={product.isFavorite ? '#EAB308' : 'none'} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>
                  {displayCode}
                </span>
                <span
                  style={{
                    background: isDiscontinued ? '#FEE2E2' : '#CCFBF1',
                    color: isDiscontinued ? '#DC2626' : '#0F766E',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  {isDiscontinued ? 'Ngừng kinh doanh' : 'Đang bán'}
                </span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                {product.productName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748B' }}>Giá bán</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                {formatVND(displaySellingPrice)}
              </div>
            </div>

            {userRole === 'StoreOwner' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Giá vốn</div>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
                  {formatVND(displayCostPrice)}
                </div>
              </div>
            )}

            <button type="button" className="custom-modal-close" onClick={onClose} title="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DANH SÁCH CÁC TABS ĐIỀU HƯỚNG                                   */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'flex',
            background: '#F8FAFC',
            padding: '0 24px',
            borderBottom: '2px solid #E2E8F0',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: 13.5,
              fontWeight: activeTab === 'info' ? 700 : 500,
              color: activeTab === 'info' ? '#0F766E' : '#475569',
              borderBottom: activeTab === 'info' ? '2px solid #0F766E' : 'none',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Package size={15} /> Thông tin sản phẩm
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: 13.5,
              fontWeight: activeTab === 'notes' ? 700 : 500,
              color: activeTab === 'notes' ? '#0F766E' : '#475569',
              borderBottom: activeTab === 'notes' ? '2px solid #0F766E' : 'none',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileText size={15} /> Mô tả & Ghi chú
          </button>
        </div>

        {/* ============================================================== */}
        {/* NỘI DUNG TỪNG TAB                                               */}
        {/* ============================================================== */}
        <div className="custom-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: 0 }}>
          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: THÔNG TIN CHI TIẾT HÀNG HÓA                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header ảnh & Tên hàng */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 20,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                {/* Khu vực ảnh */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <div
                    onClick={() => {
                      if (allImages.length > 0) {
                        setPreviewImageModalUrl(allImages[selectedImageIdx] || allImages[0]);
                      }
                    }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: allImages.length > 0 ? 'pointer' : 'default',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    title={allImages.length > 0 ? 'Nhấn để phóng to ảnh' : undefined}
                  >
                    {allImages.length > 0 ? (
                      <>
                        <img
                          src={allImages[selectedImageIdx] || allImages[0]}
                          alt={product.productName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(15, 23, 42, 0.65)',
                            color: '#FFFFFF',
                            borderRadius: 4,
                            padding: '2px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          <ZoomIn size={10} />
                          <span>Xem</span>
                        </div>
                        {selectedImageIdx === 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              backgroundColor: '#0D9488',
                              color: '#FFFFFF',
                              borderRadius: 4,
                              padding: '1px 5px',
                              fontSize: 9,
                              fontWeight: 700,
                            }}
                          >
                            Chính
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#94A3B8' }}>
                        <ImageIcon size={28} />
                        <span style={{ fontSize: 10 }}>Không có ảnh</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail strip khi có nhiều ảnh */}
                  {allImages.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, maxWidth: 220, flexWrap: 'wrap' }}>
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIdx(idx)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: idx === selectedImageIdx ? '2px solid #0D9488' : '1px solid #CBD5E1',
                            padding: 0,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: '#FFFFFF',
                            position: 'relative',
                            transition: 'border-color 0.15s ease',
                          }}
                          title={`Xem ảnh ${idx + 1}${idx === 0 ? ' (Ảnh đại diện)' : ''}`}
                        >
                          <img
                            src={img}
                            alt={`thumb-${idx}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#0F172A', fontWeight: 700 }}>
                    {product.productName}
                  </h3>
                  <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                      Nhóm hàng:{' '}
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#0F766E',
                          backgroundColor: '#F0FDFA',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #CCFBF1',
                        }}
                      >
                        {product.categoryName || 'Mặc định'}
                      </span>
                    </span>
                    {allImages.length > 0 && (
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        ({allImages.length} ảnh{allImages.length > 1 ? `, đang xem ảnh ${selectedImageIdx + 1}` : ''})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bố cục 3 cột thông tin thuộc tính Product.cs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 24,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                {/* Cột 1: Định danh */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Mã hàng</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {displayCode}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Mã vạch</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {displayBarcode || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Nhóm hàng</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F766E' }}>
                      {product.categoryName || 'Mặc định'}
                    </div>
                  </div>
                </div>

                {/* Cột 2: Giá & Thuế */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Giá bán</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F766E' }}>
                      {formatVND(displaySellingPrice)}
                    </div>
                  </div>

                  {userRole === 'StoreOwner' && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Giá vốn mặc định</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                        {formatVND(displayCostPrice)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột 3: Đơn vị & Trạng thái */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Đơn vị tính cơ bản</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F766E' }}>
                      {product.baseUnit || 'Cái'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Trạng thái kinh doanh</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDiscontinued ? '#DC2626' : '#059669' }}>
                      {isDiscontinued ? '🔴 Ngừng kinh doanh' : '🟢 Đang bán'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Thời gian tạo / Cập nhật</div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      {product.createdAt || '—'}
                      {product.updatedAt && product.updatedAt !== product.createdAt && (
                        <span style={{ display: 'block', fontSize: 11.5, color: '#94A3B8' }}>
                          Cập nhật: {product.updatedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng tóm tắt Đơn vị tính & Quy đổi giá */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Đơn vị tính & Bảng giá quy đổi
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    (Click vào từng dòng để xem chi tiết theo đơn vị tương ứng)
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: '30%' }}>
                        Tên đơn vị
                      </th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: '25%' }}>
                        Giá trị quy đổi
                      </th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: '25%' }}>
                        Mã vạch
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #E2E8F0',
                          width: '20%',
                          textAlign: 'right',
                        }}
                      >
                        Giá bán
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Hàng 1: Đơn vị cơ bản */}
                    <tr
                      onClick={() => setSelectedUnitName(product.baseUnit || 'Cái')}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        backgroundColor: isBaseUnit ? '#F0FDFA' : undefined,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <b style={{ color: isBaseUnit ? '#0F766E' : '#1E293B' }}>{product.baseUnit}</b>{' '}
                        <span style={{ fontSize: 11, color: '#0F766E', background: '#CCFBF1', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          Cơ bản
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>1 {product.baseUnit}</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{product.barcode || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {formatVND(product.sellingPrice)}
                      </td>
                    </tr>

                    {/* Hàng quy đổi */}
                    {units.map((uom) => {
                      const isThisSelected = uom.unitName === selectedUnitName;
                      return (
                        <tr
                          key={uom.id}
                          onClick={() => setSelectedUnitName(uom.unitName)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            backgroundColor: isThisSelected ? '#F0FDFA' : undefined,
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600, color: isThisSelected ? '#0F766E' : '#1E293B' }}>
                              {uom.unitName}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {uom.conversionRate} {product.baseUnit}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#64748B' }}>
                            {uom.barcode || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                            {formatVND(uom.price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 3: MÔ TẢ & GHI CHÚ                                      */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                  Mô tả chi tiết sản phẩm:
                </div>
                <div
                  style={{
                    padding: 16,
                    background: '#F8FAFC',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: product.description?.trim() ? '#334155' : '#94A3B8',
                    fontStyle: product.description?.trim() ? 'normal' : 'italic',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {product.description?.trim() || 'Chưa có mô tả chi tiết cho hàng hóa này.'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                  Ghi chú nội bộ:
                </div>
                <div
                  style={{
                    padding: 16,
                    background: '#FEFCE8',
                    borderRadius: 10,
                    border: '1px solid #FEF08A',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: product.internalNote?.trim() ? '#854D0E' : '#A16207',
                    fontStyle: product.internalNote?.trim() ? 'normal' : 'italic',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {product.internalNote?.trim() || 'Chưa có ghi chú nội bộ.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* THANH CÔNG CỤ NÚT BẤM DƯỚI CÙNG (FOOTER ACTIONS)               */}
        {/* ============================================================== */}
        <div
          className="custom-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 28px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          {/* Các nút tác vụ bên trái */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-danger-soft"
              onClick={() => onDelete(product)}
              title="Xóa hàng hóa"
            >
              <Trash2 size={15} /> Xóa
            </button>

            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => onDuplicate(product)}
              title="Nhân bản sản phẩm"
            >
              <Copy size={15} /> Sao chép
            </button>

            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => onToggleStatus(product)}
              title={isDiscontinued ? 'Mở bán lại sản phẩm' : 'Ngừng bán sản phẩm này'}
            >
              <Ban size={15} />
              <span>{isDiscontinued ? 'Mở bán lại' : 'Ngừng kinh doanh'}</span>
            </button>
          </div>

          {/* Các nút hành động chính bên phải */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn-primary-teal"
              onClick={() => onEdit(product)}
            >
              <Edit2 size={15} /> Sửa hàng hóa
            </button>

            <button
              type="button"
              className="btn-secondary-white"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LIGHTBOX PHÓNG TO ẢNH SẢN PHẨM                                 */}
        {/* ============================================================== */}
        {previewImageModalUrl && (
          <div
            onClick={() => setPreviewImageModalUrl(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 1300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 12,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewImageModalUrl(null)}
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                title="Đóng xem ảnh"
              >
                <X size={16} />
              </button>
              <img
                src={previewImageModalUrl}
                alt="Product preview"
                style={{
                  maxWidth: '85vw',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
