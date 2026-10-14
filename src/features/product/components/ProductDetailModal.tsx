import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Copy,
  Ban,
  Package,
  FileText,
  Warehouse,
  History,
  Star,
} from 'lucide-react';
import type { ProductItem } from '../types';

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
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'ledger' | 'branch'>('info');

  if (!isOpen || !product) return null;

  const isDiscontinued = product.status === 'Discontinued';

  const formatVND = (num?: number | null) => {
    if (num === undefined || num === null) return '—';
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  return (
    <div className="custom-modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="custom-modal-box" style={{ maxWidth: 1050 }}>
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 18, color: product.isFavorite ? '#EAB308' : '#CBD5E1' }}>
              <Star size={18} fill={product.isFavorite ? '#EAB308' : 'none'} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>
                  {product.productCode}
                </span>
                {product.isCombo && <span className="badge-combo">Combo đóng gói</span>}
                {isDiscontinued && (
                  <span
                    style={{
                      background: '#FEE2E2',
                      color: '#DC2626',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                    }}
                  >
                    Ngừng kinh doanh
                  </span>
                )}
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
                {formatVND(product.sellingPrice)}
              </div>
            </div>

            {userRole === 'StoreOwner' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Giá vốn</div>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
                  {formatVND(product.costPrice)}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748B' }}>Tồn kho</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: product.onHand <= 0 ? '#EF4444' : '#0F766E',
                }}
              >
                {product.onHand} {product.baseUnit}
              </div>
            </div>

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
            <Package size={15} /> Thông tin
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
            <FileText size={15} /> Mô tả, ghi chú
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: 13.5,
              fontWeight: activeTab === 'ledger' ? 700 : 500,
              color: activeTab === 'ledger' ? '#0F766E' : '#475569',
              borderBottom: activeTab === 'ledger' ? '2px solid #0F766E' : 'none',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <History size={15} /> Thẻ kho
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branch')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: 13.5,
              fontWeight: activeTab === 'branch' ? 700 : 500,
              color: activeTab === 'branch' ? '#0F766E' : '#475569',
              borderBottom: activeTab === 'branch' ? '2px solid #0F766E' : 'none',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Warehouse size={15} /> Tồn kho
          </button>

        </div>

        {/* ============================================================== */}
        {/* NỘI DUNG TỪNG TAB                                               */}
        {/* ============================================================== */}
        <div className="custom-modal-body" style={{ minHeight: 360, padding: '24px 28px' }}>
          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: THÔNG TIN CHI TIẾT HÀNG HÓA                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header ảnh & Tên hàng theo design */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 32 }}>🛍️</span>
                  )}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#0F172A', fontWeight: 700 }}>
                    {product.productName}
                  </h3>
                  <div style={{ fontSize: 13, color: '#475569' }}>
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
                  </div>
                </div>
              </div>

              {/* Bố cục 3 cột thông tin theo product_detail.html */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 24,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                {/* Cột 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Mã hàng</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {product.productCode}
                    </div>
                  </div>

                  {userRole === 'StoreOwner' && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Giá vốn</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                        {formatVND(product.costPrice)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Mã vạch</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {product.barcode || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Giá bán</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F766E' }}>
                      {formatVND(product.sellingPrice)}
                    </div>
                  </div>
                </div>

                {/* Cột 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Đơn vị cơ bản</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {product.baseUnit}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Tồn kho hiện tại</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {product.onHand} {product.baseUnit}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>
                      Định mức tồn (Thấp nhất - Cao nhất)
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      {(product.minStock || 0).toLocaleString()} -{' '}
                      {(product.maxStock || 999999999).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng Đơn vị tính & Quy đổi giá */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Đơn vị tính & Quy đổi giá
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: '40%' }}>
                        Tên đơn vị
                      </th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: '30%' }}>
                        Giá trị quy đổi
                      </th>
                      <th
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #E2E8F0',
                          width: '30%',
                          textAlign: 'right',
                        }}
                      >
                        Giá bán
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Hàng 1: Đơn vị cơ bản */}
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <b>{product.baseUnit}</b>{' '}
                        <span style={{ fontSize: 12, color: '#64748B' }}>(Đơn vị cơ bản)</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>1</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {formatVND(product.sellingPrice)}
                      </td>
                    </tr>

                    {/* Hàng quy đổi */}
                    {product.uomConversions &&
                      product.uomConversions.map((uom) => (
                        <tr key={uom.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{uom.unitName}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {uom.conversionRate} {product.baseUnit}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                            {formatVND(uom.price)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Nếu là Combo, hiển thị các thành phần */}
              {product.isCombo && product.comboComponents && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Thành phần đóng gói trong Combo
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', width: 120 }}>
                          Mã hàng
                        </th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0' }}>
                          Tên hàng thành phần
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #E2E8F0',
                            textAlign: 'center',
                            width: 100,
                          }}
                        >
                          Số lượng
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #E2E8F0',
                            textAlign: 'right',
                            width: 120,
                          }}
                        >
                          Giá bán lẻ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.comboComponents.map((comp) => (
                        <tr key={comp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F766E' }}>
                            {comp.productCode}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{comp.productName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>
                            {comp.quantity}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {formatVND(comp.sellingPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: MÔ TẢ & GHI CHÚ                                      */}
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
                    color: '#334155',
                  }}
                >
                  {product.description ||
                    'Sản phẩm được lưu kho và quản lý tại chuỗi bán lẻ. Cam kết chất lượng chính hãng và an toàn thực phẩm.'}
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
                    color: '#854D0E',
                  }}
                >
                  {product.internalNote ||
                    'Bảo quản nơi khô ráo, thoáng mát. Ưu tiên kiểm kê định kỳ mỗi tuần.'}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 3: THẺ KHO HÀNG HÓA                                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'ledger' && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', width: 140 }}>
                      Thời gian
                    </th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', width: 120 }}>
                      Mã chứng từ
                    </th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>Phương thức</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>Chi nhánh</th>
                    <th
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        width: 90,
                        textAlign: 'right',
                      }}
                    >
                      Số lượng
                    </th>
                    <th
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        width: 90,
                        textAlign: 'right',
                      }}
                    >
                      Tồn cuối
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.stockLedger && product.stockLedger.length > 0 ? (
                    product.stockLedger.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 12px', color: '#64748B' }}>{row.timestamp}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284C7' }}>
                          {row.documentCode}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{row.method}</td>
                        <td style={{ padding: '10px 12px' }}>{row.branchName}</td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: row.quantityChange >= 0 ? '#059669' : '#DC2626',
                          }}
                        >
                          {row.quantityChange > 0 ? `+${row.quantityChange}` : row.quantityChange}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                          {row.balance}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>
                        {product.createdAt || '23/07/2026 08:03'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284C7' }}>
                        KK000001
                      </td>
                      <td style={{ padding: '10px 12px' }}>Kiểm kho khởi tạo</td>
                      <td style={{ padding: '10px 12px' }}>Chi nhánh trung tâm</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {product.onHand}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {product.onHand}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 4: TỒN KHO THEO CHI NHÁNH                               */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'branch' && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>
                      Chi nhánh
                    </th>
                    <th
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        textAlign: 'right',
                        width: 160,
                      }}
                    >
                      Tồn kho
                    </th>
                    <th
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        textAlign: 'right',
                        width: 160,
                      }}
                    >
                      Có thể bán
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.branchStocks && product.branchStocks.length > 0 ? (
                    product.branchStocks.map((b) => (
                      <tr key={b.branchId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.branchName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {b.onHand} {product.baseUnit}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#0F766E',
                          }}
                        >
                          {b.available} {product.baseUnit}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Chi nhánh trung tâm</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {product.onHand} {product.baseUnit}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0F766E',
                        }}
                      >
                        {product.onHand} {product.baseUnit}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              title="Sao chép tạo sản phẩm mới"
            >
              <Copy size={15} /> Sao chép
            </button>
            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => onToggleStatus(product)}
              title={isDiscontinued ? 'Mở lại kinh doanh' : 'Ngừng kinh doanh'}
            >
              <Ban size={15} /> {isDiscontinued ? 'Mở lại kinh doanh' : 'Ngừng kinh doanh'}
            </button>
          </div>

          {/* Các nút tác vụ bên phải */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-primary-teal"
              onClick={() => onEdit(product)}
            >
              <Edit2 size={15} /> Chỉnh sửa
            </button>
            <button type="button" className="btn-secondary-white" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
