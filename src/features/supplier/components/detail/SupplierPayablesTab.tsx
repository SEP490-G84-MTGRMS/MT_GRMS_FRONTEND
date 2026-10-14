import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, APLedgerEntry } from '../../types/supplier.types';
import { CreditCard, FileSpreadsheet } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  apLedgers: APLedgerEntry[];
}

const DOC_TYPE_LABEL: Record<APLedgerEntry['docType'], string> = {
  PurchaseInvoice: 'Nhập kho',
  ServiceInvoice: 'Dịch vụ',
  PaymentVoucher: 'Thanh toán',
  ReturnAdjustment: 'Hoàn trả',
};

export const SupplierPayablesTab: FC<Props> = ({ supplier, apLedgers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  const toggleSelectAll = () => {
    if (selectedIds.length === apLedgers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(apLedgers.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SECTION 1: Aging Buckets */}
      <div className="supplier-detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary)',
            }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                Phân Tích Tuổi Nợ (AP Aging Buckets)
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tự động phân nhóm công nợ theo số ngày quá hạn thanh toán.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => alert(`Đang xuất bảng đối soát công nợ NCC ${supplier.name} ra Excel!`)}
            style={{ height: 34, padding: '0 14px', gap: 6, borderRadius: 6 }}
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Sao Kê Excel</span>
          </button>
        </div>

        {/* Aging table */}
        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>Trong hạn (Current)</th>
                <th style={{ textAlign: 'right' }}>Quá hạn 1–30 ngày</th>
                <th style={{ textAlign: 'right' }}>31–60 ngày</th>
                <th style={{ textAlign: 'right' }}>61–90 ngày</th>
                <th style={{ textAlign: 'right' }}>&gt; 90 ngày</th>
                <th style={{ textAlign: 'right', background: 'var(--blue-subtle)' }}>TỔNG DƯ NỢ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {fmt(Math.max(0, supplier.currentDebt - supplier.overdueDebt))}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: supplier.overdueDebt > 0 ? 'var(--red-accent)' : 'inherit' }}>
                  {fmt(supplier.overdueDebt)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--blue-primary)', background: 'var(--blue-light)' }}>
                  {fmt(supplier.currentDebt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: AP Ledger Transactions */}
      <div className="supplier-detail-card">
        <h2 className="supplier-detail-card-title">
          Biến Động Sổ Cái Công Nợ (AP Ledger Transactions)
        </h2>

        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 30, textAlign: 'center', padding: '10px 4px' }}>
                  <input
                    type="checkbox"
                    checked={apLedgers.length > 0 && selectedIds.length === apLedgers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: 140 }}>Mã chứng từ</th>
                <th style={{ width: 110 }}>Loại</th>
                <th style={{ width: 120 }}>Ngày GD</th>
                <th>Nội dung diễn giải</th>
                <th style={{ width: 140, textAlign: 'right' }}>Biến động nợ</th>
                <th style={{ width: 140, textAlign: 'right' }}>Dư nợ sau GD</th>
              </tr>
            </thead>
            <tbody>
              {apLedgers.length > 0 ? (
                apLedgers.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelectOne(entry.id)}
                      />
                    </td>
                    <td>
                      <span className="admin-subdomain-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                        {entry.docNo}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: entry.direction === 1 ? 'var(--blue-primary, #0f766e)' : '#16a34a',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {DOC_TYPE_LABEL[entry.docType] || entry.docType}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(entry.transactionDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-main)' }}>
                      {entry.description}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: entry.direction === 1 ? '#111827' : '#008800',
                    }}>
                      {entry.direction === 1 ? '+' : '-'}{fmt(entry.amount)}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--blue-primary)',
                    }}>
                      {fmt(entry.balanceAfter)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa có giao dịch phát sinh công nợ nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
