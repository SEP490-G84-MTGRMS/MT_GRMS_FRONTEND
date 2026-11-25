import { validateMasterProduct } from '../../utils/masterProductValidation';
import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Plus, Trash2, Save, Layers } from 'lucide-react';
import type {
  MasterProductItem,
  CreateMasterProductInput,
  UpdateMasterProductInput,
} from '../../types/masterCatalog.types';

interface MasterProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: MasterProductItem | null;
  onSave: (payload: CreateMasterProductInput | UpdateMasterProductInput, isEdit: boolean) => Promise<void>;
  brands: string[];
  categories: string[];
}

interface UnitRowState {
  unitName: string;
  conversionRate: number;
  barcode: string;
  isPurchaseUnit: boolean;
}

export const MasterProductModal: FC<MasterProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  brands,
  categories,
}) => {
  const isEdit = Boolean(productToEdit);

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [baseUnit, setBaseUnit] = useState('Gói');
  const [suggestedRetailPrice, setSuggestedRetailPrice] = useState<string>('');
  const [vatRate, setVatRate] = useState<number>(8);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [units, setUnits] = useState<UnitRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setBarcode(productToEdit.barcode);
      setName(productToEdit.name);
      setBrand(productToEdit.brand);
      setCategoryName(productToEdit.categoryName);
      setBaseUnit(productToEdit.baseUnit);
      setSuggestedRetailPrice(productToEdit.suggestedRetailPrice != null ? String(productToEdit.suggestedRetailPrice) : '');
      setVatRate(productToEdit.vatRate ?? 8);
      setImageUrl(productToEdit.imageUrl || '');
      setDescription(productToEdit.description ?? '');
      setIsActive(productToEdit.isActive);
      setUnits(
        productToEdit.units?.map((u) => ({
          unitName: u.unitName,
          conversionRate: u.conversionRate,
          barcode: u.barcode || '',
          isPurchaseUnit: u.isPurchaseUnit,
        })) || []
      );
    } else {
      setBarcode('');
      setName('');
      setBrand(brands[0] || 'Acecook');
      setCategoryName(categories[0] || 'Mì ăn liền');
      setBaseUnit('Gói');
      setSuggestedRetailPrice('');
      setVatRate(8);
      setImageUrl('');
      setDescription('');
      setIsActive(true);
      setUnits([
        {
          unitName: 'Thùng',
          conversionRate: 30,
          barcode: '',
          isPurchaseUnit: true,
        },
      ]);
    }
    setError(null);
  }, [productToEdit, isOpen, brands, categories]);

  if (!isOpen) return null;

  const handleAddUnit = () => {
    setUnits((prev) => [
      ...prev,
      {
        unitName: 'Lốc',
        conversionRate: 6,
        barcode: '',
        isPurchaseUnit: false,
      },
    ]);
  };

  const handleRemoveUnit = (index: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUnitChange = (index: number, field: keyof UnitRowState, value: any) => {
    setUnits((prev) =>
      prev.map((u, i) => {
        if (i === index) {
          return { ...u, [field]: value };
        }
        return u;
      })
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = suggestedRetailPrice.trim() ? Number(suggestedRetailPrice) : null;
    const validation = validateMasterProduct({
      barcode, name, brand, categoryName, baseUnit, suggestedRetailPrice: priceNum, vatRate, imageUrl, description, units,
    });
    if (validation) {
      setError(validation);
      return;
    }

    const payloadUnits = units
      .map((u) => ({
        unitName: u.unitName.trim(),
        conversionRate: u.conversionRate,
        barcode: u.barcode.trim() || null,
        isPurchaseUnit: u.isPurchaseUnit,
      }));

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const updatePayload: UpdateMasterProductInput = {
          name: name.trim(),
          brand: brand.trim(),
          categoryName: categoryName.trim(),
          baseUnit: baseUnit.trim(),
          suggestedRetailPrice: priceNum,
          vatRate: vatRate,
          taxCategory: productToEdit?.taxCategory ?? 'STANDARD_1PCT',
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
          isActive,
          units: payloadUnits,
        };
        await onSave(updatePayload, true);
      } else {
        const createPayload: CreateMasterProductInput = {
          barcode: barcode.trim(),
          name: name.trim(),
          brand: brand.trim(),
          categoryName: categoryName.trim(),
          baseUnit: baseUnit.trim(),
          suggestedRetailPrice: priceNum,
          vatRate: vatRate,
          taxCategory: 'STANDARD_1PCT',
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
          units: payloadUnits,
        };
        await onSave(createPayload, false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu sản phẩm mẫu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {isEdit ? 'Chỉnh Sửa Sản Phẩm Mẫu' : 'Thêm Mới Hàng Mẫu Toàn Cầu'}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0' }}>
              Dữ liệu sẽ được cung cấp cho toàn bộ các cửa hàng tạp hóa trong hệ thống
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#DC2626',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Barcode */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Mã vạch (*)
              </label>
              <input
                type="text"
                disabled={isEdit}
                required maxLength={50} value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="VD: 8934563138165"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  fontFamily: 'JetBrains Mono, monospace',
                  background: isEdit ? '#F1F5F9' : '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>

            {/* Base Unit */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Đơn Vị Cơ Bản (*)
              </label>
              <input
                type="text"
                required maxLength={30} value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                placeholder="Gói, Lon, Chai, Hộp..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Product Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Tên Sản Phẩm Chuẩn Hóa (*)
            </label>
            <input
              type="text"
              required minLength={2} maxLength={250} value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Mì Hảo Hảo Tôm Chua Cay Gói 75g"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Brand */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Thương Hiệu / Hãng SX (*)
              </label>
              <input
                type="text"
                required maxLength={100} value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Acecook, Unilever, Masan..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Ngành Hàng (*)
              </label>
              <input
                type="text"
                required maxLength={100} value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Mì ăn liền, Nước giải khát..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Suggested Retail Price */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Giá Bán Lẻ Thị Trường Gợi Ý (VNĐ)
              </label>
              <input
                type="number"
                min={0} step={0.01} value={suggestedRetailPrice}
                onChange={(e) => setSuggestedRetailPrice(e.target.value)}
                placeholder="4500"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                }}
              />
            </div>

            {/* VAT Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Thuế Suất GTGT (%)
              </label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value={8}>8% (Thực phẩm & Đồ uống)</option>
                <option value={10}>10% (Chuẩn FMCG & Hóa phẩm)</option>
                <option value={0}>0% (Nông sản chưa qua chế biến)</option>
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Link Ảnh HD (Cloudinary / CDN)
            </label>
            <input
              type="text"
              maxLength={1000} value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... hoặc link ảnh sản phẩm"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Packaging Multi-Unit Specs */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="#0066FF" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Quy Cách Đóng Gói FMCG (Đơn Vị Quy Đổi)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddUnit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#F0F6FF',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '5px 12px',
                  color: '#0066FF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} strokeWidth={2.2} />
                <span>Thêm đơn vị</span>
              </button>
            </div>

            {units.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: '#94A3B8', fontStyle: 'italic', padding: '8px 0' }}>
                Chưa có quy cách quy đổi (mặt hàng chỉ bán lẻ theo {baseUnit}).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {units.map((u, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1.5fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      background: '#F8FAFC',
                      padding: '8px 12px',
                      borderRadius: '12px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Tên ĐVT (Thùng, Lốc...)"
                      required maxLength={50} value={u.unitName}
                      onChange={(e) => handleUnitChange(idx, 'unitName', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>=</span>
                      <input
                        type="number"
                        placeholder="Hệ số (30, 24, 6...)"
                        required min={1.0001} step={0.0001} value={u.conversionRate}
                        onChange={(e) => handleUnitChange(idx, 'conversionRate', Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12.5px',
                          fontFamily: 'JetBrains Mono',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>{baseUnit}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Mã vạch thùng (tùy chọn)"
                      maxLength={50} value={u.barcode}
                      onChange={(e) => handleUnitChange(idx, 'barcode', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(idx)}
                      style={{
                        background: '#FEE2E2',
                        border: 'none',
                        borderRadius: '9999px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#EF4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isEdit && <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, background: '#edf7f5', borderRadius: 14, fontSize: 13 }}>
            <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} />
            Dùng làm dữ liệu khởi tạo cho cửa hàng mới
          </label>}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '9999px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 22px',
                borderRadius: '9999px',
                border: 'none',
                background: '#0066FF',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Hàng Mẫu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
