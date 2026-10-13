import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierSummary, MasterProduct, AssignProductInput } from '../../types/supplier.types';
import { X, Plus, AlertCircle, Package } from 'lucide-react';

interface AssignProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierSummary;
  masterProducts: MasterProduct[];
  assignedProductIds: string[];
  onAssign: (input: AssignProductInput) => void;
}

export const AssignProductModal: FC<AssignProductModalProps> = ({
  isOpen,
  onClose,
  supplier,
  masterProducts,
  assignedProductIds,
  onAssign,
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [deliveryUoM, setDeliveryUoM] = useState('kg');
  const [agreedPrice, setAgreedPrice] = useState<number>(0);
  const [moq, setMoq] = useState<number>(10);
  const [isPrimary, setIsPrimary] = useState<boolean>(true);
  const [supplierProductCode, setSupplierProductCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setAgreedPrice(0);
      setDeliveryUoM('kg');
      setMoq(10);
      return;
    }

    const prod = masterProducts.find((p) => p.id === productId);
    if (prod) {
      setDeliveryUoM(prod.baseUoM);
      setAgreedPrice(prod.defaultWholesalePrice);
      setMoq(prod.defaultMoq);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedProductId) {
      setErrorMsg('Vui lòng chọn sản phẩm cần gán.');
      return;
    }

    if (assignedProductIds.includes(selectedProductId)) {
      setErrorMsg('Sản phẩm này đã được gán cho Nhà cung cấp này rồi (BR-SP01). Vui lòng chọn sản phẩm khác hoặc chỉnh sửa ở bảng danh sách.');
      return;
    }

    if (agreedPrice <= 0) {
      setErrorMsg('Giá nhập sỉ thỏa thuận phải lớn hơn 0 VNĐ.');
      return;
    }

    if (moq < 1) {
      setErrorMsg('Số lượng đặt hàng tối thiểu (MOQ) phải từ 1 trở lên.');
      return;
    }

    onAssign({
      supplierId: supplier.id,
      productId: selectedProductId,
      deliveryUoM: deliveryUoM.trim() || 'cái',
      agreedPrice,
      moq,
      isPrimary,
      supplierProductCode: supplierProductCode.trim() || undefined,
    });

    onClose();
  };

  const selectedProduct = masterProducts.find((p) => p.id === selectedProductId);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          width: '100%',
          maxWidth: 580,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #F7FAFF, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#eff6ff',
                color: '#0066FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Gán Sản Phẩm Vào Nhà Cung Cấp
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Đang gán cho: <b style={{ color: '#0066FF' }}>{supplier.name}</b> ({supplier.code})
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Product */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Chọn sản phẩm từ danh mục Master (*)
            </label>
            <select
              id="selectAssignProduct"
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#f8fafc',
                outline: 'none',
              }}
            >
              <option value="">-- Tìm & chọn sản phẩm (Barcode / SKU / Tên) --</option>
              {masterProducts.map((p) => {
                const isAssigned = assignedProductIds.includes(p.id);
                return (
                  <option key={p.id} value={p.id} disabled={isAssigned}>
                    {p.barcode} — {p.sku} — {p.name} ({p.baseUoM}) {isAssigned ? ' [Đã gán]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Product Preview Card */}
          {selectedProduct && (
            <div
              style={{
                backgroundColor: 'var(--bg-soft-blue)',
                borderRadius: 14,
                padding: '12px 16px',
                border: '1px solid var(--blue-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#0066FF' }}>{selectedProduct.name}</div>
                <div style={{ color: '#64748b', marginTop: 2 }}>
                  Ngành hàng: <b>{selectedProduct.categoryName}</b> | ĐVT gốc: <b>{selectedProduct.baseUoM}</b>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Barcode:</span>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{selectedProduct.barcode}</div>
              </div>
            </div>
          )}

          {/* Delivery UoM & SKU NCC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Đơn vị tính giao hàng (Delivery UoM) (*)
              </label>
              <select
                value={deliveryUoM}
                onChange={(e) => setDeliveryUoM(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                <option value="kg">kg (Kilôgam)</option>
                <option value="bottle">bottle (Chai/Lọ)</option>
                <option value="box">box (Hộp/Thùng)</option>
                <option value="pack">pack (Gói/Túi)</option>
                <option value="can">can (Lon)</option>
                <option value="cái">cái (Chiếc)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Mã sản phẩm riêng phía NCC (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: SUP-PRD-01"
                value={supplierProductCode}
                onChange={(e) => setSupplierProductCode(e.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Agreed Wholesale Price & MOQ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giá nhập sỉ thỏa thuận (VNĐ) (*)
              </label>
              <input
                type="number"
                min={1000}
                step={500}
                value={agreedPrice || ''}
                onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)}
                placeholder="VD: 25000"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1.5px solid #0066FF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0066FF',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Số lượng đặt tối thiểu (MOQ) (*)
              </label>
              <input
                type="number"
                min={1}
                value={moq || ''}
                onChange={(e) => setMoq(parseInt(e.target.value, 10) || 1)}
                placeholder="VD: 10"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Primary Supplier Checkbox */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              backgroundColor: '#fefce8',
              border: '1px solid #fef08a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e' }}>
                Đặt làm Nhà cung cấp chính (Primary Supplier)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a16207' }}>
                Hệ thống sẽ tự động ưu tiên NCC này khi tạo Đơn đặt hàng (PO) tự động.
              </div>
            </div>
            <input
              type="checkbox"
              id="chkPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#eab308' }}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid #edf2f7',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 9999,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 22px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: 'var(--blue-primary)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
              }}
            >
              <Plus size={16} /> Xác nhận gán sản phẩm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
