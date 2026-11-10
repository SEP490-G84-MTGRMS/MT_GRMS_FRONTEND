import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, PurchaseOrderItem } from '../../types/supplier.types';
import { History, Store } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  purchaseOrders: PurchaseOrderItem[];
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

const PO_STATUS_LABEL: Record<PurchaseOrderItem['status'], { text: string; bg: string; color: string; border: string }> = {
  PENDING: { text: 'Chờ duyệt', bg: '#fff8eb', color: '#b45309', border: '#fcd34d' },
  CONFIRMED: { text: 'Đã xác nhận', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PARTIALLY_RECEIVED: { text: 'Đã nhận một phần', bg: '#fff8eb', color: '#d97706', border: '#fcd34d' },
  COMPLETED: { text: 'Hoàn tất', bg: '#e8f9ee', color: '#047857', border: '#a7f3d0' },
  CANCELLED: { text: 'Đã hủy', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

export const SupplierHistoryTab: FC<Props> = ({ supplier, purchaseOrders }) => {
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

  // 2. Filter Purchase Orders by active branch
  const filteredOrders = useMemo(() => {
    if (!isBranchFiltered) return purchaseOrders;
    return purchaseOrders.filter((po) => {
      if (po.branchId && po.branchId === activeBranch.id) return true;
      if (po.branchName) {
        const poBranch = po.branchName.toLowerCase();
        const targetName = (activeBranch.name || '').toLowerCase();
        const targetCode = (activeBranch.code || '').toLowerCase();
        if (poBranch.includes(targetName) || targetName.includes(poBranch)) return true;
        if (targetCode && poBranch.includes(targetCode)) return true;
        if (
          (targetName.includes('quận 1') || targetCode.includes('hcm')) &&
          (poBranch.includes('cn1') || poBranch.includes('quận 1'))
        ) {
          return true;
        }
        if (
          (targetName.includes('cầu giấy') || targetCode.includes('hn')) &&
          (poBranch.includes('cn2') || poBranch.includes('cầu giấy'))
        ) {
          return true;
        }
      }
      return false;
    });
  }, [purchaseOrders, isBranchFiltered, activeBranch.id, activeBranch.name, activeBranch.code]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((po) => po.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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
            <History size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                Lịch Sử Giao Dịch & Đơn Mua Hàng ({filteredOrders.length})
              </h2>

              {/* Active Branch Pill from Header Dropdown */}
              {isBranchFiltered ? (
                <span
                  data-testid="history-active-branch-pill"
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
                  title="Đang lọc đơn hàng theo chi nhánh được chọn từ dropdown trên thanh Header"
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
                  data-testid="history-active-branch-pill"
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
                  title="Dữ liệu đơn hàng gộp toàn chuỗi từ dropdown trên thanh Header"
                >
                  <Store size={13} color="#64748b" />
                  <span>Toàn hệ thống</span>
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {isBranchFiltered ? (
                <span>
                  Nhật ký các đơn mua hàng (Purchase Orders) phát sinh giữa NCC <b>{supplier.name}</b> và chi nhánh <b>{activeBranch.name}</b>.
                </span>
              ) : (
                <span>
                  Nhật ký toàn bộ các đơn mua hàng (Purchase Orders) phát sinh với NCC <b>{supplier.name}</b> trên toàn chuỗi cửa hàng.
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
                    checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: 150 }}>Mã Đơn PO</th>
                <th style={{ width: 120 }}>Ngày đặt</th>
                <th style={{ width: 120 }}>Ngày giao</th>
                <th>Chi nhánh nhận</th>
                <th style={{ width: 140, textAlign: 'right' }}>Giá trị đơn</th>
                <th style={{ width: 140, textAlign: 'left' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((po) => {
                  const badgeStyle = PO_STATUS_LABEL[po.status] || PO_STATUS_LABEL.COMPLETED;
                  return (
                    <tr key={po.id}>
                      <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(po.id)}
                          onChange={() => toggleSelectOne(po.id)}
                        />
                      </td>
                      <td>
                        <span className="admin-subdomain-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                          {po.code}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{po.orderDate}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{po.deliveryDate || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{po.branchName}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#111827' }}>
                        {fmt(po.totalAmount)}
                      </td>
                      <td style={{ textAlign: 'left' }}>
                        <span
                          style={{
                            color: badgeStyle.color,
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {badgeStyle.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div>
                      {isBranchFiltered ? (
                        <>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Chưa có đơn hàng nào được ghi nhận tại chi nhánh <b>{activeBranch.name}</b>.
                          </p>
                          <button
                            type="button"
                            onClick={handleSwitchToAllBranches}
                            className="admin-btn admin-btn-secondary"
                            style={{ height: 32, padding: '0 14px', fontSize: 12, borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Store size={13} />
                            <span>Xem đơn hàng toàn hệ thống</span>
                          </button>
                        </>
                      ) : (
                        'Chưa có đơn hàng nào được ghi nhận.'
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
