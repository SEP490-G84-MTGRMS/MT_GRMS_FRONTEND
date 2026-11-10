import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, APLedgerEntry } from '../../types/supplier.types';
import { CreditCard, FileSpreadsheet, Store } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  apLedgers: APLedgerEntry[];
}

export interface ActiveBranchInfo {
  id: string; // 'ALL' or Guid
  code?: string;
  name?: string;
  address?: string;
  isHeadquarter?: boolean;
}

const STORAGE_KEY = 'mtgrms_active_branch';

const getStoredActiveBranch = (): ActiveBranchInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
  } catch {
    // fallback
  }
  return { id: 'ALL', name: 'Toàn hệ thống', code: 'ALL' };
};

const DOC_TYPE_LABEL: Record<APLedgerEntry['docType'], string> = {
  PurchaseInvoice: 'Nhập kho',
  ServiceInvoice: 'Dịch vụ',
  PaymentVoucher: 'Thanh toán',
  ReturnAdjustment: 'Hoàn trả',
};

export const SupplierPayablesTab: FC<Props> = ({ supplier, apLedgers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState<ActiveBranchInfo>(getStoredActiveBranch);
  const isBranchFiltered = Boolean(activeBranch.id && activeBranch.id !== 'ALL');

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(Number.isFinite(val) ? val : 0) + ' đ';

  // 1. Subscribe to Header Dropdown (BranchSelectorDropdown) changes
  useEffect(() => {
    const handleBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveBranchInfo>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
      } else {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleBranchChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleBranchChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSwitchToAllBranches = () => {
    const allOption: ActiveBranchInfo = {
      id: 'ALL',
      code: 'ALL',
      name: 'Toàn hệ thống',
      address: 'Dữ liệu gộp toàn chuỗi',
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allOption));
      window.dispatchEvent(
        new CustomEvent('mtgrms:branch-changed', { detail: allOption }),
      );
    } catch {
      // ignore
    }
    setActiveBranch(allOption);
  };

  // 2. Filter AP Ledgers by active branch
  const filteredLedgers = useMemo(() => {
    if (!isBranchFiltered) return apLedgers;
    return apLedgers.filter((entry) => {
      if (entry.branchId && entry.branchId === activeBranch.id) return true;
      if (entry.branchName) {
        const entryBranch = entry.branchName.toLowerCase();
        const targetName = (activeBranch.name || '').toLowerCase();
        const targetCode = (activeBranch.code || '').toLowerCase();
        if (entryBranch.includes(targetName) || targetName.includes(entryBranch)) return true;
        if (targetCode && entryBranch.includes(targetCode)) return true;
        if (
          (targetName.includes('quận 1') || targetCode.includes('hcm')) &&
          (entryBranch.includes('cn1') || entryBranch.includes('quận 1'))
        ) {
          return true;
        }
        if (
          (targetName.includes('cầu giấy') || targetCode.includes('hn')) &&
          (entryBranch.includes('cn2') || entryBranch.includes('cầu giấy'))
        ) {
          return true;
        }
      }
      if (activeBranch.code && entry.description?.toLowerCase().includes(activeBranch.code.toLowerCase())) {
        return true;
      }
      return false;
    });
  }, [apLedgers, isBranchFiltered, activeBranch.id, activeBranch.name, activeBranch.code]);

  // 3. Compute Debt for Active Branch Scope
  const { currentDebt, overdueDebt } = useMemo(() => {
    if (!isBranchFiltered) {
      return {
        currentDebt: supplier.currentDebt,
        overdueDebt: supplier.overdueDebt,
      };
    }
    if (filteredLedgers.length === 0) {
      return { currentDebt: 0, overdueDebt: 0 };
    }
    // Latest ledger balance for this branch or net amount
    const latestBalance = filteredLedgers[0]?.balanceAfter ?? 0;
    const netAmount = filteredLedgers.reduce((acc, it) => acc + it.direction * it.amount, 0);
    const branchDebt = latestBalance > 0 ? latestBalance : Math.max(0, netAmount);
    return {
      currentDebt: branchDebt,
      overdueDebt: 0,
    };
  }, [isBranchFiltered, filteredLedgers, supplier.currentDebt, supplier.overdueDebt]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLedgers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLedgers.map((e) => e.id));
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
              borderRadius: 'var(--radius-sm, 8px)',
              background: 'var(--blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary)',
            }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                  Phân Tích Tuổi Nợ (AP Aging Buckets)
                </h2>

                {/* Active Branch Pill from Header Dropdown */}
                {isBranchFiltered ? (
                  <span
                    data-testid="payables-active-branch-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 9999,
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #a7f3d0',
                    }}
                    title="Đang lọc tuổi nợ theo chi nhánh được chọn từ dropdown trên thanh Header"
                  >
                    <Store size={13} color="#059669" />
                    <span>Chi nhánh: {activeBranch.name}</span>
                    <button
                      type="button"
                      onClick={handleSwitchToAllBranches}
                      title="Bấm để xem gộp toàn hệ thống"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        marginLeft: 4,
                        color: '#047857',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      (Xem toàn hệ thống)
                    </button>
                  </span>
                ) : (
                  <span
                    data-testid="payables-active-branch-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 9999,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                    }}
                    title="Dữ liệu công nợ gộp toàn chuỗi từ dropdown trên thanh Header"
                  >
                    <Store size={13} color="#64748b" />
                    <span>Toàn hệ thống</span>
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {isBranchFiltered ? (
                  <span>
                    Số dư công nợ và tuổi nợ của <b>{supplier.name}</b> phát sinh tại chi nhánh <b>{activeBranch.name}</b>.
                  </span>
                ) : (
                  <span>
                    Tự động phân nhóm công nợ theo số ngày quá hạn thanh toán trên toàn chuỗi cửa hàng.
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() =>
              alert(
                `Đang xuất bảng đối soát công nợ NCC ${supplier.name} (${
                  isBranchFiltered ? activeBranch.name : 'Toàn hệ thống'
                }) ra Excel!`,
              )
            }
            style={{ height: 34, padding: '0 14px', gap: 6, borderRadius: 9999 }}
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
                  {fmt(Math.max(0, currentDebt - overdueDebt))}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: overdueDebt > 0 ? 'var(--red-accent)' : 'inherit' }}>
                  {fmt(overdueDebt)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>0 đ</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--blue-primary)', background: 'var(--blue-light)' }}>
                  {fmt(currentDebt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: AP Ledger Transactions */}
      <div className="supplier-detail-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Biến Động Sổ Cái Công Nợ (AP Ledger Transactions) ({filteredLedgers.length})
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {isBranchFiltered ? (
                <span>
                  Nhật ký chứng từ phát sinh công nợ tại chi nhánh <b>{activeBranch.name}</b>.
                </span>
              ) : (
                <span>
                  Nhật ký chứng từ phát sinh công nợ gộp trên toàn bộ các chi nhánh cửa hàng.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 30, textAlign: 'center', padding: '10px 4px' }}>
                  <input
                    type="checkbox"
                    checked={filteredLedgers.length > 0 && selectedIds.length === filteredLedgers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: 130 }}>Mã chứng từ</th>
                <th style={{ width: 100 }}>Loại</th>
                <th style={{ width: 110 }}>Ngày GD</th>
                <th style={{ width: 170 }}>Chi nhánh</th>
                <th>Nội dung diễn giải</th>
                <th style={{ width: 130, textAlign: 'right' }}>Biến động nợ</th>
                <th style={{ width: 130, textAlign: 'right' }}>Dư nợ sau GD</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedgers.length > 0 ? (
                filteredLedgers.map((entry) => (
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
                    <td>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                        {entry.branchName || 'Chi nhánh chung'}
                      </span>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div>
                      {isBranchFiltered ? (
                        <>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Chưa có giao dịch phát sinh công nợ nào tại chi nhánh <b>{activeBranch.name}</b>.
                          </p>
                          <button
                            type="button"
                            onClick={handleSwitchToAllBranches}
                            className="admin-btn admin-btn-secondary"
                            style={{ height: 32, padding: '0 14px', fontSize: 12, borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Store size={13} />
                            <span>Xem công nợ toàn hệ thống</span>
                          </button>
                        </>
                      ) : (
                        'Chưa có giao dịch phát sinh công nợ nào.'
                      )}
                    </div>
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
