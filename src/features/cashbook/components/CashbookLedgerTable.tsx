import { useRef, useState, useEffect } from 'react';
import type { FC } from 'react';
import { Ban, ExternalLink, Printer, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LedgerTransaction, SourceModuleName } from '../types/cashbook.types';
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

interface CashbookLedgerTableProps {
  transactions: LedgerTransaction[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onVoidTransaction?: (transaction: LedgerTransaction) => void;
  onPrintTransaction?: (transaction: LedgerTransaction) => void;
}

const isDeepLinkable = (tx: LedgerTransaction): boolean => {
  return (
    tx.sourceModuleName === 'SERVICE_OPEX' ||
    tx.referenceDocType === 'SERVICE_EXPENSE' ||
    Boolean(tx.referenceDocId?.startsWith('EXP-')) ||
    Boolean(tx.description?.startsWith('Chi phí:')) ||
    tx.sourceModuleName === 'POS_RETAIL' ||
    tx.referenceDocType === 'POS_ORDER' ||
    Boolean(tx.referenceDocId?.startsWith('ORD-')) ||
    tx.sourceModuleName === 'CRM_DEBT' ||
    tx.referenceDocType === 'DEBT_PAYMENT' ||
    tx.counterpartyType === 'CUSTOMER' ||
    Boolean(tx.category?.includes('Thu nợ')) ||
    Boolean(tx.description?.includes('Thu nợ')) ||
    tx.sourceModuleName === 'TAX_SNAPSHOT' ||
    Boolean(tx.category?.includes('Nộp thuế')) ||
    Boolean(tx.description?.includes('Nộp thuế'))
  );
};

const getDeepLinkLabel = (tx: LedgerTransaction): string => {
  if (
    tx.sourceModuleName === 'SERVICE_OPEX' ||
    tx.referenceDocType === 'SERVICE_EXPENSE' ||
    tx.referenceDocId?.startsWith('EXP-') ||
    tx.description?.startsWith('Chi phí:') ||
    tx.category?.includes('Chi phí')
  ) {
    return 'Xem phiếu chi FE-07';
  }
  if (
    tx.sourceModuleName === 'POS_RETAIL' ||
    tx.referenceDocType === 'POS_ORDER' ||
    tx.referenceDocId?.startsWith('ORD-')
  ) {
    return 'Xem hóa đơn bán lẻ POS';
  }
  if (
    tx.sourceModuleName === 'CRM_DEBT' ||
    tx.counterpartyType === 'CUSTOMER' ||
    tx.category?.includes('Thu nợ') ||
    tx.description?.includes('Thu nợ')
  ) {
    return 'Xem sổ nợ FE-08';
  }
  if (
    tx.sourceModuleName === 'TAX_SNAPSHOT' ||
    tx.category?.includes('Nộp thuế') ||
    tx.description?.includes('Nộp thuế')
  ) {
    return 'Xem sổ thuế TT 152';
  }
  return 'Chứng từ đối soát';
};

const renderSourceBadge = (source?: SourceModuleName, isAutomated?: boolean) => {
  switch (source) {
    case 'SERVICE_OPEX':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#E11D48',
            backgroundColor: '#FFE4E6',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Phân hệ Quản lý Chi phí"
        >
          Chi phí
        </span>
      );
    case 'CRM_DEBT':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0D9488',
            backgroundColor: '#CCFBF1',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Thu nợ Khách hàng CRM & AR"
        >
          Thu nợ
        </span>
      );
    case 'TAX_SNAPSHOT':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#D97706',
            backgroundColor: '#FEF3C7',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Báo cáo Kê khai & Nộp thuế HKD"
        >
          Nộp thuế
        </span>
      );
    case 'INTERNAL_TRANSFER':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#6366F1',
            backgroundColor: '#EEF2FF',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Bút toán điều chuyển thanh khoản giữa các quỹ nội bộ"
        >
          Chuyển quỹ
        </span>
      );
    case 'POS_RETAIL':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0284C7',
            backgroundColor: '#E0F2FE',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Đồng bộ tự động từ Quầy thu ngân POS"
        >
          Bán lẻ POS
        </span>
      );
    default:
      return isAutomated ? (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#0F766E',
            backgroundColor: '#F0FDFA',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
          title="Giao dịch sinh tự động từ hệ thống"
        >
          Hệ thống
        </span>
      ) : (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            backgroundColor: '#F1F5F9',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
        >
          Thủ công
        </span>
      );
  }
};

const TAX_TREATMENT_LABELS: Record<string, string> = {
  TaxableRevenue: 'Chịu thuế',
  NonTaxableReceipt: 'Không tính thuế',
  DeductibleExpense: 'Chi phí được trừ',
  NonDeductibleExpense: 'Không được trừ',
  TaxPayment: 'Nộp thuế',
  InternalTransfer: 'Nội bộ',
  ReviewRequired: 'Cần phân loại',
};

export const CashbookLedgerTable: FC<CashbookLedgerTableProps> = ({
  transactions,
  totalItems,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onVoidTransaction,
  onPrintTransaction,
}) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  // Synchronize horizontal scrolling between header and body & detect vertical scroll
  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [transactions, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const handleNavigateToDoc = (tx: LedgerTransaction) => {
    // 1. Phải trả / Chi phí dịch vụ FE07
    if (
      tx.sourceModuleName === 'SERVICE_OPEX' ||
      tx.referenceDocType === 'SERVICE_EXPENSE' ||
      tx.referenceDocId?.startsWith('EXP-') ||
      tx.description?.startsWith('Chi phí:') ||
      tx.category?.includes('Chi phí') ||
      tx.category?.includes('Tiền điện') ||
      tx.category?.includes('Tiền nước') ||
      tx.category?.includes('Mặt bằng')
    ) {
      const searchTarget = tx.referenceDocId || tx.counterpartyName || '';
      navigate('/store-owner/expenses?search=' + encodeURIComponent(searchTarget));
      return;
    }

    // 2. Bán lẻ POS / Hóa đơn đơn hàng FE10
    if (
      tx.sourceModuleName === 'POS_RETAIL' ||
      tx.referenceDocType === 'POS_ORDER' ||
      tx.referenceDocId?.startsWith('ORD-') ||
      tx.category?.includes('bán hàng') ||
      tx.description?.includes('Hóa đơn')
    ) {
      const searchTarget = tx.referenceDocId || '';
      navigate('/store-owner/invoices?search=' + encodeURIComponent(searchTarget));
      return;
    }

    // 3. Khách nợ CRM / AR FE08
    if (
      tx.sourceModuleName === 'CRM_DEBT' ||
      tx.referenceDocType === 'DEBT_PAYMENT' ||
      tx.counterpartyType === 'CUSTOMER' ||
      tx.category?.includes('Thu nợ') ||
      tx.description?.includes('Thu nợ')
    ) {
      let searchTarget = '';
      if (tx.description?.includes('Thu nợ khách hàng')) {
        const cleaned = tx.description.replace(/^.*Thu nợ khách hàng\s*/i, '').trim();
        if (cleaned && cleaned.toLowerCase() !== 'thủ công') {
          searchTarget = cleaned;
        }
      }
      if (!searchTarget) {
        searchTarget = tx.referenceDocId || tx.counterpartyName || '';
      }
      navigate('/store-owner/customers?search=' + encodeURIComponent(searchTarget));
      return;
    }

    // 4. Báo cáo nộp thuế FE19
    if (
      tx.sourceModuleName === 'TAX_SNAPSHOT' ||
      tx.category?.includes('Nộp thuế') ||
      tx.description?.includes('Nộp thuế')
    ) {
      navigate('/store-owner/tax');
      return;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '11%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '9.5%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  return (
    <div className="so-list-table-card">
      {/* ── Fixed Table Head ── */}
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1160, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th style={thStyle}>Chứng từ</th>
              <th style={thStyle}>Thời gian</th>
              <th style={thStyle}>Tài khoản</th>
              <th style={thStyle}>Loại bút toán</th>
              <th style={thStyle}>Đối tượng / Diễn giải</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Phát sinh Thu (+)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Phát sinh Chi (-)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Số dư sau GD</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Nguồn / Trạng thái</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Table Body ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body"
        onScroll={handleBodyScroll}
      >
        {isLoading && transactions.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#0F766E' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'inline-block' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Đang tải danh sách bút toán sổ quỹ...
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#334155' }}>
              Chưa có giao dịch sổ quỹ nào
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              Không tìm thấy bút toán phát sinh trong khoảng thời gian hoặc bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <table className="so-list-table" style={{ minWidth: 1160, tableLayout: 'fixed' }}>
            {tableColGroup}
            <tbody>
              {transactions.map((tx) => {
                const isReceipt = tx.transactionType === 'RECEIPT';
                const isPayment = tx.transactionType === 'PAYMENT';
                const isAdj = tx.transactionType === 'ADJUSTMENT';
                const isVoided = Boolean(tx.isVoided);
                const isComp = Boolean(tx.isCompensating);

                return (
                  <tr
                    key={tx.id}
                    className="so-list-row"
                    style={{
                      backgroundColor: isVoided ? '#F8FAFC' : isComp ? '#FFFBEB' : undefined,
                      opacity: isVoided ? 0.65 : 1,
                    }}
                  >
                    {/* Chỉ hiển thị một mã chính; mã nguồn nằm trong tooltip để tránh lặp dữ liệu. */}
                    <td className="so-list-td">
                      <button
                        type="button"
                        className="cb-voucher-link"
                        onClick={() => isDeepLinkable(tx) && handleNavigateToDoc(tx)}
                        disabled={!isDeepLinkable(tx)}
                        title={tx.referenceDocId && tx.referenceDocId !== tx.transactionCode
                          ? `${getDeepLinkLabel(tx)} · Mã nguồn: ${tx.referenceDocId}`
                          : tx.linkedTransactionId
                            ? `Bút toán đối ứng: ${tx.linkedTransactionId}`
                            : undefined}
                      >
                        <span style={{ textDecoration: isVoided ? 'line-through' : 'none' }}>{tx.transactionCode}</span>
                        {isDeepLinkable(tx) && <ExternalLink size={12} aria-hidden="true" />}
                      </button>
                    </td>

                    {/* 2. Thời gian */}
                    <td className="so-list-td" style={{ fontSize: '12px', color: '#475569', lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 600 }}>{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {new Date(tx.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* 3. Tài khoản */}
                    <td className="so-list-td">
                      <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '12.5px' }}>
                        {tx.accountName}
                      </div>
                    </td>

                    {/* 4. Loại bút toán */}
                    <td className="so-list-td">
                      {isReceipt && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0F766E',
                            backgroundColor: '#F0FDFA',
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid #CCFBF1',
                          }}
                        >
                          Thu tiền
                        </span>
                      )}
                      {isPayment && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid #FECACA',
                          }}
                        >
                          Chi tiền
                        </span>
                      )}
                      {isAdj && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#D97706',
                            backgroundColor: '#FEF3C7',
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid #FDE68A',
                          }}
                        >
                          Điều chỉnh
                        </span>
                      )}
                    </td>

                    {/* 5. Đối tượng / Diễn giải */}
                    <td className="so-list-td so-list-td--wrap">
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '12.5px',
                          color: '#0F172A',
                          textDecoration: isVoided ? 'line-through' : 'none',
                        }}
                      >
                        {tx.counterpartyName && tx.counterpartyName !== tx.referenceDocId
                          ? tx.counterpartyName
                          : tx.sourceModuleName === 'SERVICE_OPEX'
                          ? 'Chi phí vận hành'
                          : tx.sourceModuleName === 'POS_RETAIL'
                          ? 'Khách mua lẻ'
                          : tx.sourceModuleName === 'CRM_DEBT'
                          ? 'Khách nợ'
                          : (tx.counterpartyName || 'Nội bộ')}
                      </div>
                      <div className="cb-ledger-description" title={tx.description || undefined}>
                        {tx.description}
                      </div>
                      {isVoided && tx.voidReason && (
                        <div style={{ fontSize: '11px', color: '#DC2626', marginTop: 2, fontStyle: 'italic' }}>
                          Lý do gạch bỏ: {tx.voidReason}
                        </div>
                      )}
                    </td>

                    {/* 6. Phát sinh Thu (+) */}
                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      {isReceipt || (isAdj && tx.amount > 0) ? (
                        <span
                          style={{
                            color: '#059669',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            textDecoration: isVoided ? 'line-through' : 'none',
                          }}
                        >
                          +{Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>-</span>
                      )}
                    </td>

                    {/* 7. Phát sinh Chi (-) */}
                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      {isPayment || (isAdj && tx.amount < 0) ? (
                        <span
                          style={{
                            color: '#DC2626',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            textDecoration: isVoided ? 'line-through' : 'none',
                          }}
                        >
                          -{Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>-</span>
                      )}
                    </td>

                    {/* 8. Số dư sau GD */}
                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: '#0F172A',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {tx.balanceAfter.toLocaleString('vi-VN')} đ
                      </span>
                    </td>

                    {/* 9. Nguồn / Trạng thái */}
                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        {isVoided ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#94A3B8',
                              backgroundColor: '#E2E8F0',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}
                          >
                            ĐÃ GẠCH BỎ
                          </span>
                        ) : isComp ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#B45309',
                              backgroundColor: '#FEF3C7',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}
                          >
                            PHIẾU BÙ TRỪ
                          </span>
                        ) : (
                          renderSourceBadge(tx.sourceModuleName, tx.isAutomated)
                        )}
                        {!isVoided && tx.taxTreatment && (
                          <span className={`cb-tax-badge cb-tax-badge--${tx.taxTreatment}`} title={tx.taxTreatmentReason}>
                            {TAX_TREATMENT_LABELS[tx.taxTreatment] || 'Cần phân loại'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 10. Thao tác */}
                    <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right' }}>
                      <div className="so-list-actions">
                        {/* Action: Print Receipt / Voucher */}
                        {onPrintTransaction && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--icon"
                            onClick={() => onPrintTransaction(tx)}
                            title="In phiếu thu/chi"
                          >
                            <Printer size={13} />
                          </button>
                        )}

                        {/* Action: Void / Reverse Transaction */}
                        {!isVoided && !isComp && onVoidTransaction && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--danger"
                            onClick={() => onVoidTransaction(tx)}
                            title="Gạch bỏ phiếu này bằng bút toán bù trừ âm"
                          >
                            <Ban size={13} />
                            <span>Hủy</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── TablePagination Cleanly Pinned at the Bottom ── */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={[10, 15, 20, 50]}
        itemLabel="giao dịch"
        isLoading={isLoading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
