import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, CreateSupplierInput, SupplierType, SupplierCategory } from '../types/supplier.types';
import { X, Save, Building, FileText, CreditCard } from 'lucide-react';
import '../supplier.css';

interface Props {
  isOpen: boolean;
  editingSupplier: SupplierSummary | null;
  onClose: () => void;
  onSubmit: (input: CreateSupplierInput & { id?: string }) => void;
}

export const SupplierFormModal: FC<Props> = ({ isOpen, editingSupplier, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'terms' | 'bank'>('basic');

  const getInitialFormData = (supp: SupplierSummary | null): CreateSupplierInput => {
    if (!supp) {
      return {
        code: '', name: '', tradeName: '', supplierType: 'Goods', category: 'FRESH',
        contactPerson: '', phone: '', email: '', address: '',
        paymentTermDays: 7, creditLimit: 50000000,
        taxCode: '', companyName: '', invoiceAddress: '',
        bankName: 'Vietcombank', bankAccount: '', accountHolder: '', note: '',
      };
    }
    return {
      code: supp.code, name: supp.name, tradeName: supp.tradeName || '',
      supplierType: supp.supplierType, category: supp.category,
      contactPerson: supp.contactPerson, phone: supp.phone,
      email: supp.email || '', address: supp.address || '',
      paymentTermDays: supp.paymentTermDays, creditLimit: supp.creditLimit,
      taxCode: supp.taxCode || '', companyName: supp.companyName || '',
      invoiceAddress: supp.invoiceAddress || '', bankName: supp.bankName || 'Vietcombank',
      bankAccount: supp.bankAccount || '', accountHolder: supp.accountHolder || '',
      note: supp.note || '',
    };
  };

  const [formData, setFormData] = useState<CreateSupplierInput>(() => getInitialFormData(editingSupplier));
  const [prevEditing, setPrevEditing] = useState<SupplierSummary | null>(editingSupplier);

  if (editingSupplier !== prevEditing) {
    setPrevEditing(editingSupplier);
    setFormData(getInitialFormData(editingSupplier));
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Vui lòng nhập Tên Nhà Cung Cấp và Số điện thoại!');
      return;
    }
    onSubmit({ ...formData, id: editingSupplier?.id });
  };

  const set = (patch: Partial<CreateSupplierInput>) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header" style={{ background: '#f7faff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-card-icon stat-card-icon--blue"><Building size={20} /></div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '0.95rem' }}>
                {editingSupplier ? `Hiệu chỉnh NCC (${editingSupplier.code})` : 'Thêm Mới Nhà Cung Cấp'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b7280' }}>
                Hệ thống MT-GRMS • Chuỗi Tạp Hóa & Siêu Thị Mini
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {([
            { key: 'basic', icon: <Building size={14} />, label: '1. Cơ Bản & Liên Hệ' },
            { key: 'terms', icon: <FileText size={14} />, label: '2. Hạn Nợ & Hóa Đơn' },
            { key: 'bank',  icon: <CreditCard size={14} />, label: '3. Ngân Hàng & Ghi Chú' },
          ] as const).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`modal-tab${activeTab === t.key ? ' modal-tab--active' : ''}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {/* TAB 1 */}
            {activeTab === 'basic' && (
              <div className="form-grid">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Mã Nhà Cung Cấp <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Tự sinh nếu bỏ trống)</span>
                    </label>
                    <input type="text" placeholder="VD: SUP-001" disabled={!!editingSupplier}
                      value={formData.code} onChange={e => set({ code: e.target.value })}
                      className="form-input" style={editingSupplier ? { background: '#f3f4f6' } : {}} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên Nhà Cung Cấp <span className="required">*</span></label>
                    <input type="text" required placeholder="VD: Nông Sản Tươi Sạch Khải Anh"
                      value={formData.name} onChange={e => set({ name: e.target.value })}
                      className="form-input" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Thương Mại (Trade Name)</label>
                  <input type="text" placeholder="VD: Khải Anh Farm"
                    value={formData.tradeName} onChange={e => set({ tradeName: e.target.value })}
                    className="form-input" />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Loại Nhà Cung Cấp</label>
                    <select value={formData.supplierType}
                      onChange={e => set({ supplierType: e.target.value as SupplierType })}
                      className="form-select">
                      <option value="Goods">Goods (Hàng hóa)</option>
                      <option value="Service">Service (Dịch vụ)</option>
                      <option value="Both">Both (Cả hai)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phân Loại Ngành Hàng</label>
                    <select value={formData.category}
                      onChange={e => set({ category: e.target.value as SupplierCategory })}
                      className="form-select">
                      <option value="FRESH">FRESH (Nông sản tươi)</option>
                      <option value="AMBIENT">AMBIENT (Đồ khô / Tạp hóa)</option>
                      <option value="FROZEN">FROZEN (Hàng đông lạnh)</option>
                      <option value="UTILITIES">UTILITIES (Điện nước)</option>
                      <option value="RENT">RENT (Thuê mặt bằng)</option>
                      <option value="LOGISTICS">LOGISTICS (Vận chuyển)</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Người Liên Hệ (Sale)</label>
                    <input type="text" placeholder="VD: Anh Nam (Kinh doanh)"
                      value={formData.contactPerson} onChange={e => set({ contactPerson: e.target.value })}
                      className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại <span className="required">*</span></label>
                    <input type="text" required placeholder="VD: 0901111222"
                      value={formData.phone} onChange={e => set({ phone: e.target.value })}
                      className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa Chỉ Chi Tiết</label>
                  <input type="text" placeholder="VD: 124 Đường 3/2, Phường 12, Quận 10, TP.HCM"
                    value={formData.address} onChange={e => set({ address: e.target.value })}
                    className="form-input" />
                </div>
              </div>
            )}

            {/* TAB 2 */}
            {activeTab === 'terms' && (
              <div className="form-grid">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Thời Hạn Nợ (Số ngày)</label>
                    <select value={formData.paymentTermDays}
                      onChange={e => set({ paymentTermDays: Number(e.target.value) })}
                      className="form-select" style={{ fontFamily: 'var(--font-mono)' }}>
                      <option value={0}>0 ngày (Thanh toán ngay)</option>
                      <option value={3}>3 ngày (Gối đầu ngắn)</option>
                      <option value={7}>7 ngày (Theo tuần)</option>
                      <option value={15}>15 ngày (Nửa tháng)</option>
                      <option value={30}>30 ngày (1 tháng)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mã Số Thuế (Tax Code)</label>
                    <input type="text" placeholder="VD: 0312345678"
                      value={formData.taxCode} onChange={e => set({ taxCode: e.target.value })}
                      className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Công Ty Xuất Hóa Đơn VAT</label>
                  <input type="text" placeholder="VD: Công ty TNHH Nông Sản Tươi Sạch Khải Anh"
                    value={formData.companyName} onChange={e => set({ companyName: e.target.value })}
                    className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa Chỉ Xuất Hóa Đơn GTGT</label>
                  <input type="text" placeholder="VD: 124 Đường 3/2, Phường 12, Quận 10, TP.HCM"
                    value={formData.invoiceAddress} onChange={e => set({ invoiceAddress: e.target.value })}
                    className="form-input" />
                </div>
              </div>
            )}

            {/* TAB 3 */}
            {activeTab === 'bank' && (
              <div className="form-grid">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Ngân Hàng Thụ Hưởng</label>
                    <select value={formData.bankName}
                      onChange={e => set({ bankName: e.target.value })}
                      className="form-select">
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="MB Bank">MB Bank</option>
                      <option value="Techcombank">Techcombank</option>
                      <option value="VietinBank">VietinBank</option>
                      <option value="BIDV">BIDV</option>
                      <option value="ACB">ACB</option>
                      <option value="VPBank">VPBank</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Tài Khoản</label>
                    <input type="text" placeholder="VD: 990111122288"
                      value={formData.bankAccount} onChange={e => set({ bankAccount: e.target.value })}
                      className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Chủ Tài Khoản</label>
                  <input type="text" placeholder="VD: CTY TNHH NONG SAN TUOI SACH KHAI ANH"
                    value={formData.accountHolder} onChange={e => set({ accountHolder: e.target.value })}
                    className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi Chú Nghiệp Vụ</label>
                  <textarea rows={3}
                    placeholder="Ghi chú về thời gian giao hàng, điều khoản chiết khấu..."
                    value={formData.note} onChange={e => set({ note: e.target.value })}
                    className="form-textarea" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-ghost">Hủy bỏ</button>
            <button type="submit" className="btn-primary">
              <Save size={15} />
              {editingSupplier ? 'Lưu Thay Đổi' : 'Tạo Nhà Cung Cấp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
