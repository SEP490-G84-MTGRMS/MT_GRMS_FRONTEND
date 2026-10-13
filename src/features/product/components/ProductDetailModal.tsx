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

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 1000 }}>
        {/* Top summary strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 18, color: '#eab308' }}>
              {product.isFavorite ? '★' : '☆'}
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
                      background: '#fee2e2',
                      color: '#dc2626',
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
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {product.productName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Giá bán</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {product.sellingPrice.toLocaleString()} đ
              </div>
            </div>

            {userRole === 'StoreOwner' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Giá vốn</div>
                <div style={{ fontSize: 14, color: '#475569' }}>
                  {product.costPrice != null ? `${product.costPrice.toLocaleString()} đ` : '—'}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Tồn kho</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F766E' }}>
                {product.onHand} {product.baseUnit}
              </div>
            </div>

            <button type="button" className="custom-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab navigation buttons */}
        <div style={{ display: 'flex', background: '#f8fafc', padding: '0 24px', borderBottom: '2px solid #e2e8f0' }}>
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
            <FileText size={15} /> Mô tả & Ghi chú
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
            <History size={15} /> Thẻ kho (Lịch sử)
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
            <Warehouse size={15} /> Tồn kho chi nhánh
          </button>
        </div>

        {/* Tab contents */}
        <div className="custom-modal-body" style={{ minHeight: 340 }}>
          {/* TAB 1: THÔNG TIN */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                {/* Cột 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Mã hàng hóa (SKU)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{product.productCode}</div>
                  </div>
                  {userRole === 'StoreOwner' && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Giá vốn (COGS)</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {product.costPrice != null ? `${product.costPrice.toLocaleString()} đ` : '—'}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Nhóm hàng</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F766E' }}>{product.categoryName}</div>
                  </div>
                </div>

                {/* Cột 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Mã vạch (Barcode)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{product.barcode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Giá bán niêm yết</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F766E' }}>
                      {product.sellingPrice.toLocaleString()} đ
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Thuế suất VAT</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{product.vatRate || 8}%</div>
                  </div>
                </div>

                {/* Cột 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Đơn vị tính cơ bản</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{product.baseUnit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Tồn kho hiện tại</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {product.onHand} {product.baseUnit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Định mức an toàn (Min - Max)</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                      {product.minStock || 0} - {product.maxStock || 9999}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng Đơn vị tính quy đổi */}
              {product.uomConversions && product.uomConversions.length > 0 && (
                <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
                  <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
                    Đơn vị tính & Quy đổi giá
                  </legend>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Tên đơn vị</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Giá trị quy đổi</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Mã vạch riêng</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                          Giá bán
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <b>{product.baseUnit}</b> <span style={{ color: '#64748b' }}>(Cơ bản)</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>1 {product.baseUnit}</td>
                        <td style={{ padding: '8px 12px' }}>{product.barcode}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {product.sellingPrice.toLocaleString()} đ
                        </td>
                      </tr>
                      {product.uomConversions.map((uom) => (
                        <tr key={uom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{uom.unitName}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {uom.conversionRate} {product.baseUnit}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{uom.barcode || '—'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {uom.price.toLocaleString()} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </fieldset>
              )}

              {/* Nếu là Combo, hiển thị thành phần */}
              {product.isCombo && product.comboComponents && (
                <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
                  <legend style={{ fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
                    Danh sách hàng thành phần trong Combo
                  </legend>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Mã hàng</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Tên hàng thành phần</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                          Định lượng
                        </th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                          Giá bán lẻ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.comboComponents.map((comp) => (
                        <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{comp.productCode}</td>
                          <td style={{ padding: '8px 12px' }}>{comp.productName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>
                            {comp.quantity}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {comp.sellingPrice.toLocaleString()} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </fieldset>
              )}
            </div>
          )}

          {/* TAB 2: MÔ TẢ & GHI CHÚ */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#334155' }}>Mô tả chi tiết sản phẩm:</h4>
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    fontSize: 13.5,
                    color: '#1e293b',
                    lineHeight: 1.6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#334155' }}>Ghi chú nội bộ cho nhân viên:</h4>
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#fffbeb',
                    borderRadius: 12,
                    fontSize: 13.5,
                    color: '#92400e',
                    lineHeight: 1.6,
                    border: '1px solid #fef3c7',
                  }}
                >
                  {product.internalNote || 'Chưa có ghi chú nội bộ.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THẺ KHO */}
          {activeTab === 'ledger' && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Mã chứng từ</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Phương thức</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Chi nhánh</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      Số lượng
                    </th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      Tồn cuối
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.stockLedger && product.stockLedger.length > 0 ? (
                    product.stockLedger.map((sl) => (
                      <tr key={sl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{sl.timestamp}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F766E' }}>
                          {sl.documentCode}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{sl.method}</td>
                        <td style={{ padding: '10px 12px' }}>{sl.branchName}</td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: sl.quantityChange > 0 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {sl.quantityChange > 0 ? `+${sl.quantityChange}` : sl.quantityChange}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                          {sl.balance}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        Chưa phát sinh biến động thẻ kho nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: TỒN KHO CHI NHÁNH */}
          {activeTab === 'branch' && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Chi nhánh</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      Tồn kho thực tế
                    </th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      Có thể bán
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.branchStocks && product.branchStocks.length > 0 ? (
                    product.branchStocks.map((b) => (
                      <tr key={b.branchId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.branchName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {b.onHand} {product.baseUnit}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                          {b.available} {product.baseUnit}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Chi nhánh trung tâm</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {product.onHand} {product.baseUnit}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {product.onHand} {product.baseUnit}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="custom-modal-footer" style={{ justifyContent: 'space-between' }}>
          {/* Nút tác vụ bên trái */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-danger-soft"
              onClick={() => onDelete(product)}
              title="Xóa hàng hóa an toàn (BR-DATA-01)"
            >
              <Trash2 size={15} /> Xóa
            </button>
            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => onDuplicate(product)}
              title="Sao chép tạo sản phẩm tương tự"
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

          {/* Nút tác vụ bên phải */}
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
