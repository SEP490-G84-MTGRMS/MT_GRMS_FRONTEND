import type { FC } from 'react';
import { Link } from 'react-router-dom';
import type { SupplierSummary } from '../../types/supplier.types';
import { Truck, ExternalLink, Calendar, CreditCard, ShieldCheck, ArrowLeft } from 'lucide-react';

interface SupplierContextCardProps {
  supplier: SupplierSummary;
  suppliers: SupplierSummary[];
  onSelectSupplier: (supplierId: string) => void;
  productCount: number;
}

export const SupplierContextCard: FC<SupplierContextCardProps> = ({
  supplier,
  suppliers,
  onSelectSupplier,
  productCount,
}) => {
  const fmtCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 24,
        padding: '20px 24px',
        border: '1px solid rgba(15, 118, 110, 0.12)',
        boxShadow: '0 4px 20px rgba(15, 118, 110, 0.05)',
        marginBottom: 20,
      }}
    >
      {/* Top row: Select NCC + Quick actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #edf2f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
            }}
          >
            <Truck size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Đang quản lý nguồn cung cấp cho:
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 10px',
                  borderRadius: 9999,
                  fontWeight: 600,
                  backgroundColor: supplier.status === 'Active' ? '#e6f4ea' : '#f1f5f9',
                  color: supplier.status === 'Active' ? '#008800' : '#64748b',
                  border: `1px solid ${supplier.status === 'Active' ? '#b7e1cd' : '#cbd5e1'}`,
                }}
              >
                ● {supplier.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'}
              </span>
            </div>

            {/* Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <select
                id="supplierSelectContext"
                value={supplier.id}
                onChange={(e) => onSelectSupplier(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1.5px solid #0066FF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0066FF',
                  backgroundColor: '#F7FAFF',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: 380,
                }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} ({s.supplierType === 'Goods' ? 'Hàng hóa' : s.supplierType})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to={`/store-owner/suppliers/${supplier.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--blue-primary)',
              padding: '8px 14px',
              borderRadius: 9999,
              backgroundColor: 'var(--blue-light)',
              border: '1px solid var(--blue-border)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ExternalLink size={14} /> Hồ sơ chi tiết NCC
          </Link>
          <Link
            to="/store-owner/suppliers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#64748b',
              padding: '8px 14px',
              borderRadius: 9999,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} /> Danh sách NCC
          </Link>
        </div>
      </div>

      {/* Bottom row: Supplier terms & KPI stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              color: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Hạn thanh toán</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              {supplier.paymentTermDays} ngày <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>(gối đầu)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Hạn mức nợ (Credit Limit)</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d97706', fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtCurrency(supplier.creditLimit)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Công nợ hiện tại</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtCurrency(supplier.currentDebt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>SKU</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mặt hàng đang phân phối</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7c3aed' }}>
              {productCount} sản phẩm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
