import React, { useRef } from 'react';
import type { FC, KeyboardEvent, ChangeEvent } from 'react';
import type {
  OrderMatrixProduct,
  DayColInfo,
  QtyMatrixMap,
  MatrixCellMap,
  MatrixCellData,
} from '../../types/po.types';
import { RotateCcw } from 'lucide-react';

interface OrderMatrixTableProps {
  products: OrderMatrixProduct[];
  days: DayColInfo[];
  qtyMap?: QtyMatrixMap;
  cellMap?: MatrixCellMap;
  showSoh: boolean;
  onQtyChange?: (productId: string, dateKey: string, val: number) => void;
  onCellChange?: (productId: string, dateKey: string, val: number) => void;
  onResetOverride?: (productId: string, dateKey: string) => void;
  onDayCutoffClick?: (day: DayColInfo) => void;
  readOnly?: boolean;
  isStoreOwner?: boolean;
}

export const OrderMatrixTable: FC<OrderMatrixTableProps> = ({
  products,
  days,
  qtyMap,
  cellMap,
  showSoh,
  onQtyChange,
  onCellChange,
  onResetOverride,
  onDayCutoffClick,
  readOnly = false,
  isStoreOwner = true,
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  // Helper to extract cell data consistently
  const getCell = (productId: string, dateKey: string): MatrixCellData => {
    if (cellMap && cellMap[productId]?.[dateKey]) {
      return cellMap[productId][dateKey];
    }
    const val = qtyMap?.[productId]?.[dateKey] || 0;
    return {
      employeeQty: val,
      storeQty: null,
      finalQty: val,
    };
  };

  // Group products by Supplier
  const supplierOrder = ['TươiSạch', 'SnackVN', 'Vissan', 'CPFoods'];
  const groupedProducts: { supplierId: string; supplierName: string; items: OrderMatrixProduct[] }[] = [];

  const supplierMap = new Map<string, { supplierId: string; supplierName: string; items: OrderMatrixProduct[] }>();
  products.forEach((p) => {
    const sId = p.supplierId;
    const sName = p.supplierName || sId;
    if (!supplierMap.has(sId)) {
      supplierMap.set(sId, { supplierId: sId, supplierName: sName, items: [] });
    }
    supplierMap.get(sId)!.items.push(p);
  });

  supplierOrder.forEach((sId) => {
    const group = supplierMap.get(sId);
    if (group && group.items.length > 0) {
      groupedProducts.push(group);
    }
  });

  // Catch any remaining suppliers
  supplierMap.forEach((group, sId) => {
    if (!supplierOrder.includes(sId) && group.items.length > 0) {
      groupedProducts.push(group);
    }
  });

  // Calculate daily totals across all products based on finalQty
  const dailyTotalQty = days.map((d) => {
    return products.reduce((acc, p) => {
      const cell = getCell(p.id, d.dateKey);
      return acc + (cell.finalQty || 0);
    }, 0);
  });

  const grandTotalQty = dailyTotalQty.reduce((a, b) => a + b, 0);

  const grandTotalAmt = products.reduce((acc, p) => {
    const rowQty = days.reduce((sum, d) => sum + (getCell(p.id, d.dateKey).finalQty || 0), 0);
    return acc + rowQty * p.price;
  }, 0);

  // Number of fixed metadata columns
  const fixedColCount = 4 + (showSoh ? 2 : 0);
  const totalColSpan = fixedColCount + days.length + 2;

  // Handle cell navigation with keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;

    const allInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input.po-qty-input:not([disabled])')
    );
    const currIdx = allInputs.indexOf(e.currentTarget);
    if (currIdx < 0) return;

    let targetIdx = -1;
    if (key === 'ArrowRight' || key === 'Enter') {
      targetIdx = currIdx + 1;
    } else if (key === 'ArrowLeft') {
      targetIdx = currIdx - 1;
    } else if (key === 'ArrowDown') {
      const currCol = Number(e.currentTarget.dataset.col);
      for (let i = currIdx + 1; i < allInputs.length; i++) {
        if (Number(allInputs[i].dataset.col) === currCol) {
          targetIdx = i;
          break;
        }
      }
    } else if (key === 'ArrowUp') {
      const currCol = Number(e.currentTarget.dataset.col);
      for (let i = currIdx - 1; i >= 0; i--) {
        if (Number(allInputs[i].dataset.col) === currCol) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx >= 0 && targetIdx < allInputs.length) {
      e.preventDefault();
      allInputs[targetIdx].focus();
      allInputs[targetIdx].select();
    }
  };

  const handleInputChange = (productId: string, dateKey: string, e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^\d.]/g, '');
    let n = parseFloat(rawVal);
    if (isNaN(n) || n < 0) n = 0;

    if (onCellChange) {
      onCellChange(productId, dateKey, n);
    } else if (onQtyChange) {
      onQtyChange(productId, dateKey, n);
    }
  };

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderColGroup = () => (
    <colgroup>
      <col style={{ width: 190 }} />
      <col style={{ width: 68 }} />
      <col style={{ width: 80 }} />
      <col style={{ width: 45 }} />
      {showSoh && (
        <>
          <col style={{ width: 66 }} />
          <col style={{ width: 66 }} />
        </>
      )}
      {days.map((d) => (
        <col key={d.dateKey} style={{ width: 58 }} />
      ))}
      <col style={{ width: 60 }} />
      <col style={{ width: 125 }} />
    </colgroup>
  );

  return (
    <div className="po-grid-container">
      {/* ── Fixed Full-Width Header ── */}
      <div ref={headerRef} className="po-grid-header-box">
        <table className="po-grid-table">
          {renderColGroup()}
          <thead>
            <tr>
              <th className="po-th-left">Tên Sản Phẩm (Mã SKU)</th>
              <th>ĐVT</th>
              <th>Giá Nhập (đ)</th>
              <th>MOQ</th>
              {showSoh && (
                <>
                  <th style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>Tồn (SOH)</th>
                  <th style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>Bán/Ngày</th>
                </>
              )}

              {days.map((d) => {
                const isOff = d.isOff;
                const isLocked = d.isLocked;
                const isCutoffDue = d.cutoffStatus === 'CUTOFF_DUE';
                const isPoGenerated = d.cutoffStatus === 'PO_GENERATED';

                return (
                  <th
                    key={d.dateKey}
                    className={`po-th-date ${
                      isOff
                        ? 'po-th-off'
                        : isLocked || isPoGenerated
                        ? 'po-th-locked'
                        : isCutoffDue
                        ? 'po-th-cutoff-due'
                        : 'po-th-open'
                    }`}
                    title={
                      isOff
                        ? d.offReason || 'Nhà cung cấp không giao hàng ngày này'
                        : isPoGenerated
                        ? `Đã chốt đơn PO (${d.poCode || 'Đã tạo'})`
                        : isCutoffDue
                        ? `ĐÃ ĐẾN HẠN CHỐT CUTOFF (${d.cutoffHour || 'Hạn chốt'}). Nhấp để chốt ngày này.`
                        : `Lịch giao hợp lệ (Cutoff: ${d.cutoffHour || 'Theo lịch'})`
                    }
                    onClick={() => {
                      if (isCutoffDue && onDayCutoffClick) {
                        onDayCutoffClick(d);
                      }
                    }}
                    style={{ cursor: isCutoffDue ? 'pointer' : 'default' }}
                  >
                    <div className="po-col-date-header">
                      <span className="po-col-dow">{d.dowName}</span>
                      <span className="po-col-short">{d.dateShort}</span>

                      {/* Cutoff Status Tag */}
                      <span
                        className={`po-cutoff-tag ${
                          isOff
                            ? 'po-tag-off'
                            : isPoGenerated || isLocked
                            ? 'po-tag-locked'
                            : isCutoffDue
                            ? 'po-tag-due'
                            : 'po-tag-open'
                        }`}
                      >
                        {isOff ? (
                          'Nghỉ'
                        ) : isPoGenerated ? (
                          'Đã PO'
                        ) : isLocked ? (
                          'Khóa'
                        ) : isCutoffDue ? (
                          'Đến hạn'
                        ) : (
                          'Mở'
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}

              <th style={{ backgroundColor: '#f1f5f9' }}>Tổng SL</th>
              <th style={{ backgroundColor: '#f1f5f9', textAlign: 'right' }}>
                Thành Tiền (đ)
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Body ── */}
      <div ref={bodyRef} className="po-grid-body-box" onScroll={handleBodyScroll}>
        <table className="po-grid-table">
          {renderColGroup()}
          <tbody>
          {groupedProducts.length === 0 ? (
            <tr>
              <td colSpan={totalColSpan} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                Không có sản phẩm nào phù hợp với điều kiện tìm kiếm và lọc.
              </td>
            </tr>
          ) : (
            groupedProducts.map((group) => {
              // Subtotals for this supplier group
              const subDayQty = days.map((d) => {
                return group.items.reduce((sum, item) => {
                  const cell = getCell(item.id, d.dateKey);
                  return sum + (cell.finalQty || 0);
                }, 0);
              });
              const subTotalQty = subDayQty.reduce((a, b) => a + b, 0);
              const subTotalAmt = group.items.reduce((sum, item) => {
                const rowQty = days.reduce((rSum, d) => rSum + (getCell(item.id, d.dateKey).finalQty || 0), 0);
                return sum + rowQty * item.price;
              }, 0);

              return (
                <React.Fragment key={group.supplierId}>
                  {/* Supplier Group Header Row */}
                  <tr>
                    <td colSpan={totalColSpan} className="po-row-cat">
                      Nhà cung cấp: {group.supplierName} ({group.items.length} mặt hàng)
                    </td>
                  </tr>

                  {/* Product Rows */}
                  {group.items.map((p) => {
                    let rowQty = 0;
                    return (
                      <tr key={p.id}>
                        <td>
                          <b>{p.name}</b> <small style={{ color: 'var(--text-muted)' }}>({p.sku})</small>
                        </td>
                        <td style={{ textAlign: 'center' }}>{p.unit}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(p.price)}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.moq}</td>

                        {showSoh && (
                          <>
                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', backgroundColor: '#fffbeb' }}>
                              {p.soh}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', backgroundColor: '#fffbeb' }}>
                              {p.sales}
                            </td>
                          </>
                        )}

                        {/* Quantity Cells */}
                        {days.map((d, colIdx) => {
                          const cell = getCell(p.id, d.dateKey);
                          const q = cell.finalQty || 0;
                          rowQty += q;

                          const isOwnerModified =
                            isStoreOwner &&
                            cell.storeQty !== null &&
                            cell.storeQty !== cell.employeeQty;

                          if (d.isOff) {
                            return (
                              <td
                                key={d.dateKey}
                                className="po-cell-off"
                                title={d.offReason || 'Nhà cung cấp không giao hàng ngày này'}
                              >
                                —
                              </td>
                            );
                          }

                          if (d.isLocked || d.cutoffStatus === 'PO_GENERATED') {
                            return (
                              <td
                                key={d.dateKey}
                                className="po-cell-locked"
                                title={
                                  d.cutoffStatus === 'PO_GENERATED'
                                    ? `Đã chốt PO (${d.poCode || 'Đã tạo'})`
                                    : 'Đã quá giờ khóa sửa đơn của ngày này'
                                }
                              >
                                <input
                                  type="text"
                                  className="po-qty-input"
                                  value={q > 0 ? q : ''}
                                  disabled
                                />
                              </td>
                            );
                          }

                          if (readOnly) {
                            return (
                              <td key={d.dateKey} style={{ textAlign: 'center', backgroundColor: '#fcfcfd' }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: q > 0 ? 700 : 400,
                                    color: isOwnerModified ? '#d97706' : q > 0 ? 'var(--blue-primary)' : '#cbd5e1',
                                    fontSize: 12.5,
                                  }}
                                >
                                  {q > 0 ? q : '—'}
                                </span>
                              </td>
                            );
                          }

                          const isBad = q > 0 && q < p.moq;
                          const tooltipParts: string[] = [];
                          if (isBad) {
                            tooltipParts.push(`⚠️ Dưới MOQ! Đặt tối thiểu ${p.moq} ${p.unit}`);
                          }
                          if (isOwnerModified) {
                            tooltipParts.push(
                              `👑 Chủ cửa hàng đã điều chỉnh (NV: ${cell.employeeQty} ➔ Chủ: ${cell.storeQty}). Bấm nút khôi phục bên cạnh để trả về đề xuất của NV.`
                            );
                          }
                          const tooltip = tooltipParts.length > 0 ? tooltipParts.join('\n') : undefined;

                          return (
                            <td
                              key={d.dateKey}
                              style={{ textAlign: 'center' }}
                              className={isOwnerModified ? 'po-td-owner-modified' : ''}
                            >
                              <div className="po-cell-wrapper">
                                <input
                                  type="text"
                                  className={`po-qty-input ${isBad ? 'qty-bad' : ''} ${
                                    isOwnerModified ? 'qty-owner-override' : ''
                                  }`}
                                  value={q > 0 ? q : ''}
                                  placeholder={cell.employeeQty > 0 ? String(cell.employeeQty) : ''}
                                  data-pid={p.id}
                                  data-day={d.dateKey}
                                  data-col={colIdx}
                                  title={tooltip}
                                  onChange={(e) => handleInputChange(p.id, d.dateKey, e)}
                                  onKeyDown={handleKeyDown}
                                />

                                {/* Revert to Employee Qty Action when overridden */}
                                {isOwnerModified && onResetOverride && (
                                  <button
                                    type="button"
                                    className="po-cell-revert-btn"
                                    title={`Khôi phục số lượng đề xuất của Nhân viên (${cell.employeeQty})`}
                                    onClick={() => onResetOverride(p.id, d.dateKey)}
                                  >
                                    <RotateCcw size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Totals */}
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {rowQty > 0 ? rowQty : 0}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-primary)' }}>
                          {fmt(rowQty * p.price)} đ
                        </td>
                      </tr>
                    );
                  })}

                  {/* Supplier Subtotal Row */}
                  <tr className="po-row-subtotal">
                    <td colSpan={fixedColCount}>
                      Tổng nhóm NCC — {group.supplierName}
                    </td>
                    {subDayQty.map((val, idx) => (
                      <td key={idx} style={{ textAlign: 'center' }}>
                        {val > 0 ? val : 0}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center' }}>{subTotalQty}</td>
                    <td style={{ textAlign: 'right', color: 'var(--blue-dark)' }}>{fmt(subTotalAmt)} đ</td>
                  </tr>
                </React.Fragment>
              );
            })
          )}

          {/* Daily Total & Grand Total Footer Row */}
          <tr className="po-row-grandtotal">
            <th colSpan={fixedColCount} style={{ textAlign: 'left', padding: '10px 12px', color: '#1e293b' }}>
              TỔNG CỘNG THEO NGÀY (DAILY TOTAL QTY)
            </th>
            {dailyTotalQty.map((val, idx) => {
              const isLockedOrOff = days[idx]?.isOff || days[idx]?.isLocked;
              return (
                <th
                  key={idx}
                  style={{
                    textAlign: 'center',
                    color: isLockedOrOff ? '#94a3b8' : '#0284c7',
                  }}
                >
                  {val > 0 ? val : 0}
                </th>
              );
            })}
            <th style={{ textAlign: 'center', color: '#0066ff', fontWeight: 800 }}>{grandTotalQty}</th>
            <th style={{ textAlign: 'right', color: '#059669', fontWeight: 800 }}>{fmt(grandTotalAmt)} đ</th>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default OrderMatrixTable;
