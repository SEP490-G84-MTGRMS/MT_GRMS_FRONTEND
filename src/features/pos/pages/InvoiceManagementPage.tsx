import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  Search,
  ShoppingCart,
  QrCode,
  Banknote,
  PackageCheck,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  CheckCircle2,
  User,
  Phone,
  FileText,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { TablePagination } from '../../../components/common';
import { ShiftKpiCard } from '../components/ShiftKpiCard';
import { mockInvoicesList, mockPreOrdersList } from '../mock/inventoryMockData';
import type { InvoiceDTO, PreOrderDTO, DebtPaymentRecordDTO } from '../types/inventory.types';
import { CollectDebtModal } from '../components/modals/CollectDebtModal';
import '../pos.css';

export const InvoiceManagementPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route gốc quay lại POS
  const salesPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/employee')
    ? '/employee/pos'
    : '/pos';

  // Chế độ xem: 'invoices' (Hóa đơn bán lẻ) vs 'preorders' (Đơn đặt trước)
  const [activeTab, setActiveTab] = useState<'invoices' | 'preorders'>('invoices');

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [timePreset, setTimePreset] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'VIETQR' | 'CASH' | 'DEBT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'DEBT'>('ALL');

  // Danh sách hóa đơn có thể hủy / cập nhật trạng thái
  const [invoices, setInvoices] = useState<InvoiceDTO[]>(mockInvoicesList);

  // Modal Xác nhận hủy hóa đơn
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceDTO | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý trả lại hàng');
  const [cancelNote, setCancelNote] = useState('');

  // Modal Thu nợ hóa đơn
  const [collectDebtModalInvoice, setCollectDebtModalInvoice] = useState<InvoiceDTO | null>(null);

  // Danh sách dòng mở rộng (Accordion detail)
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Modal In bill nhiệt K80
  const [printingInvoice, setPrintingInvoice] = useState<InvoiceDTO | null>(null);

  // Phân trang Hóa đơn (TablePagination)
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  // Phân trang Đơn đặt trước
  const [preOrderPage, setPreOrderPage] = useState(1);
  const [preOrderPageSize, setPreOrderPageSize] = useState(10);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Xác nhận hủy hóa đơn
  const handleConfirmCancelInvoice = () => {
    if (!cancelModalInvoice) return;
    setInvoices((prev) =>
      prev.map((i) =>
        i.invoiceId === cancelModalInvoice.invoiceId
          ? { ...i, status: 'CANCELLED', statusLabel: 'Đã hủy / Đổi trả' }
          : i
      )
    );
    showToast(`Đã hủy thành công hóa đơn ${cancelModalInvoice.invoiceId} (${cancelReason})!`);
    setCancelModalInvoice(null);
    setCancelNote('');
  };

  // Thu tiền nợ hóa đơn
  const handleCollectDebt = (
    invoiceId: string,
    payment: { amount: number; method: 'CASH' | 'VIETQR'; note: string; cashierName: string }
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.invoiceId !== invoiceId) return inv;

        const currentDebt = inv.debtAmount || 0;
        const currentPaidDebt = inv.paidDebtAmount || 0;
        const newDebt = Math.max(0, currentDebt - payment.amount);
        const newPaidDebt = currentPaidDebt + payment.amount;
        const isFullyPaid = newDebt === 0;

        const newRecord: DebtPaymentRecordDTO = {
          paymentId: `DPR-${Date.now()}`,
          paidAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          amount: payment.amount,
          paymentMethod: payment.method,
          paymentMethodLabel: payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VietQR',
          note: payment.note,
          cashierName: payment.cashierName,
        };

        return {
          ...inv,
          debtAmount: newDebt,
          paidDebtAmount: newPaidDebt,
          finalPaidAmount: inv.finalPaidAmount + payment.amount,
          status: isFullyPaid ? 'COMPLETED' : 'DEBT',
          statusLabel: isFullyPaid ? 'Hoàn thành' : `Còn nợ ${newDebt.toLocaleString('vi-VN')} đ`,
          debtPaymentRecords: [...(inv.debtPaymentRecords || []), newRecord],
        };
      })
    );

    showToast(`Đã thu ${payment.amount.toLocaleString('vi-VN')} đ cho hóa đơn ${invoiceId} thành công!`);
  };

  // Lọc Hóa đơn
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        !searchQuery.trim() ||
        inv.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customerPhone && inv.customerPhone.includes(searchQuery.trim()));

      const matchMethod =
        paymentMethodFilter === 'ALL' || inv.paymentMethod === paymentMethodFilter;

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchSearch && matchMethod && matchStatus;
    });
  }, [invoices, searchQuery, paymentMethodFilter, statusFilter]);

  // Phân trang dữ liệu Hóa đơn
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * invoicePageSize;
    return filteredInvoices.slice(start, start + invoicePageSize);
  }, [filteredInvoices, invoicePage, invoicePageSize]);

  // Lọc Đơn đặt trước
  const filteredPreOrders = useMemo(() => {
    return mockPreOrdersList.filter((p) => {
      return (
        !searchQuery.trim() ||
        p.preOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerPhone.includes(searchQuery.trim())
      );
    });
  }, [searchQuery]);

  // Phân trang Đơn đặt trước
  const paginatedPreOrders = useMemo(() => {
    const start = (preOrderPage - 1) * preOrderPageSize;
    return filteredPreOrders.slice(start, start + preOrderPageSize);
  }, [filteredPreOrders, preOrderPage, preOrderPageSize]);

  // Đổi mở rộng Accordion
  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  };

  // Mở modal in bill K80
  const handleOpenPrintModal = (invoice: InvoiceDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPrintingInvoice(invoice);
  };

  // Hoàn tất đơn đặt trước
  const handleFulfillPreOrder = (preOrder: PreOrderDTO) => {
    showToast(`Đã xuất đơn ${preOrder.preOrderId} cho khách ${preOrder.customerName} thành công!`);
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* 1. UNIFIED SINGLE HEADER - ĐỒNG BỘ 100% VỚI SỔ QUỸ & CA THU NGÂN */}
      <header className="pos-shift-unified-header">
        {/* Khối trái: Nút quay lại bán hàng + Tên màn hình */}
        <div className="unified-header-left">
          <button
            type="button"
            className="pos-back-to-sales-btn"
            onClick={() => navigate(salesPath)}
            title="Quay lại quầy bán hàng POS"
          >
            <ArrowLeft size={15} />
            <span>Bán Hàng</span>
          </button>

          <div className="unified-header-divider" />

          <div className="unified-header-title-box">
            <h1 className="unified-header-title">Quản Lý Hóa Đơn &amp; Đơn Đặt Hàng</h1>
            <div className="unified-header-subtitle">
              Chi nhánh trung tâm &bull; Bán lẻ &bull; Đơn đặt trước giữ kho
            </div>
          </div>
        </div>

        {/* Khối giữa: Tabs chuyển đổi chế độ xem */}
        <div className="unified-header-center">
          <div className="unified-tabs-group">
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText size={14} />
              <span>Hóa Đơn Bán Lẻ</span>
            </button>
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'preorders' ? 'active' : ''}`}
              onClick={() => setActiveTab('preorders')}
            >
              <PackageCheck size={14} />
              <span>Đơn Đặt Trước &amp; Giữ Kho (2)</span>
            </button>
          </div>
        </div>

        {/* Khối phải: Bán hàng [F1] + Badge Thu ngân */}
        <div className="unified-header-right">
          <button
            type="button"
            className="pos-btn-primary-pill"
            onClick={() => navigate(salesPath)}
            title="Trở về màn hình bán hàng POS"
          >
            <ShoppingCart size={14} />
            <span>Bán Hàng [F1]</span>
          </button>

          <div className="pos-cashier-badge">
            NV: <b>Nguyễn Bá Sơn (NV004)</b>
          </div>
        </div>
      </header>

      {/* TOAST THÔNG BÁO TẠI QUẦY */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 20,
            zIndex: 99999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 9999,
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. BODY CONTAINER CUỘN CHÍNH - ĐỒNG BỘ LAYOUT SHIFT CONTENT */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto">
        <div className="shift-content-layout">
          {/* THANH TRẠNG THÁI (INFO BAR CARD) CHUẨN POS */}
          <div className="shift-info-bar-card">
            <div className="info-bar-item">
              <span className="info-label">Điểm bán quầy:</span>
              <span className="info-value font-semibold">Chi nhánh trung tâm (Quầy #01)</span>
            </div>
            <div className="info-bar-item">
              <span className="info-label">Quy định thanh toán:</span>
              <span className="info-value text-emerald-700 font-semibold">100% tại quầy (Không có công nợ lẻ)</span>
            </div>
            <div className="info-bar-item">
              <span className="info-label">Phương thức nhận:</span>
              <span className="info-value text-teal-700 font-semibold">Trực tiếp tại quầy siêu thị</span>
            </div>
          </div>

          {/* 4 KPI CARDS - TÁI SỬ DỤNG HOÀN TOÀN TỪ SHIFTKPICARD CỦA SỔ QUỸ */}
          <div className="shift-kpi-grid">
            <ShiftKpiCard
              title="Tổng Hóa Đơn Ca Này"
              value="1.428"
              subtitle="100% thanh toán đủ tại quầy"
              colorType="primary"
              icon={<Receipt size={16} />}
            />
            <ShiftKpiCard
              title="Doanh Thu Bán Lẻ"
              value="1.090.000 đ"
              subtitle="Không phát sinh nợ lẻ"
              colorType="success"
              icon={<Banknote size={16} />}
            />
            <ShiftKpiCard
              title="Tỷ Lệ VietQR vs Tiền Mặt"
              value="65% / 35%"
              subtitle="Chuyển khoản chiếm ưu thế"
              colorType="info"
              icon={<QrCode size={16} />}
            />
            <ShiftKpiCard
              title="Đơn Đặt Trước Giữ Kho"
              value="2 đơn"
              subtitle="Hẹn nhận tại quầy hôm nay"
              colorType="warning"
              icon={<PackageCheck size={16} />}
            />
          </div>

          {/* BỘ LỌC TÌM KIẾM - CHUẨN CARD VÀ PRESET BUTTONS CỦA POS */}
          <div className="pos-shift-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="filter-select w-full"
                  style={{ paddingLeft: 34, height: 36 }}
                  placeholder={
                    activeTab === 'invoices'
                      ? 'Tìm theo mã hóa đơn, tên hoặc SĐT khách...'
                      : 'Tìm theo mã đơn đặt trước, khách hàng...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* PRESETS THỜI GIAN CHUẨN PILL CỦA POS */}
              <div className="time-preset-buttons">
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'today' ? 'active' : ''}`}
                  onClick={() => setTimePreset('today')}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'yesterday' ? 'active' : ''}`}
                  onClick={() => setTimePreset('yesterday')}
                >
                  Hôm qua
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'week' ? 'active' : ''}`}
                  onClick={() => setTimePreset('week')}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  className={`preset-btn ${timePreset === 'month' ? 'active' : ''}`}
                  onClick={() => setTimePreset('month')}
                >
                  Tháng này
                </button>
              </div>

              {/* LỌC PHƯƠNG THỨC & TRẠNG THÁI */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="filter-select"
                    style={{ height: 34 }}
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                  >
                    <option value="ALL">Tất cả phương thức</option>
                    <option value="VIETQR">Chuyển khoản VietQR</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="DEBT">Ghi nợ (Còn nợ)</option>
                  </select>

                  <select
                    className="filter-select"
                    style={{ height: 34 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="COMPLETED">Đã thanh toán 100%</option>
                    <option value="DEBT">Đang ghi nợ (Chưa tất toán)</option>
                    <option value="CANCELLED">Đã hủy / Đổi trả</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* BẢNG DỮ LIỆU - CHUẨN POS-SHIFT-CARD & POS-SHIFT-TABLE */}
          {activeTab === 'invoices' ? (
            /* TAB 1: HÓA ĐƠN BÁN LẺ */
            <div className="pos-shift-card">
              <div className="pos-shift-card-header">
                <div>
                  <h3 className="pos-shift-card-title">
                    <FileText size={16} className="text-teal-700" />
                    <span>Danh Sách Hóa Đơn Bán Hàng</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Hiển thị <b>{paginatedInvoices.length}</b> trên <b>{filteredInvoices.length}</b> hóa đơn &bull; Tổng tiền: <b style={{ color: '#15803d' }}>{filteredInvoices.reduce((s, i) => s + (i.status === 'COMPLETED' ? i.finalPaidAmount : 0), 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                </div>

                <div className="shift-status-badge on-duty">
                  <CheckCircle2 size={12} /> Đồng bộ bán hàng POS
                </div>
              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ width: 120 }}>Mã hóa đơn</th>
                      <th style={{ width: 140 }}>Thời gian lập</th>
                      <th>Khách hàng</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền hàng</th>
                      <th style={{ textAlign: 'right' }}>Giảm giá</th>
                      <th style={{ textAlign: 'right' }}>Khách đã trả</th>
                      <th>Phương thức TT</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: 170 }}>Thao tác</th>
                    </tr>
                  </thead>
                  {paginatedInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.invoiceId;
                    const isCompleted = inv.status === 'COMPLETED';
                    const isDebt = inv.status === 'DEBT' || (inv.debtAmount !== undefined && inv.debtAmount > 0);

                    return (
                      <tbody key={inv.invoiceId}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? '#f0fdfa' : undefined,
                          }}
                          onClick={() => toggleExpand(inv.invoiceId)}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" />
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {inv.invoiceId}
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                          </td>
                          <td style={{ color: '#64748b' }}>{inv.createdAt}</td>
                          <td>
                            <b style={{ color: '#0f172a' }}>{inv.customerName}</b>
                            {inv.customerPhone && (
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                {inv.customerPhone}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {inv.totalMerchandiseAmount.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'right', color: inv.totalDiscount > 0 ? '#dc2626' : '#94a3b8' }}>
                            {inv.totalDiscount.toLocaleString('vi-VN')}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCompleted ? '#15803d' : isDebt ? '#d97706' : '#dc2626',
                            }}
                          >
                            {inv.finalPaidAmount.toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <span
                              className={`pos-method-pill ${
                                inv.paymentMethod === 'VIETQR' ? 'vietqr' : inv.paymentMethod === 'DEBT' ? 'debt' : 'cash'
                              }`}
                              style={
                                inv.paymentMethod === 'DEBT'
                                  ? { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
                                  : undefined
                              }
                            >
                              {inv.paymentMethod === 'VIETQR' ? (
                                <QrCode size={12} />
                              ) : inv.paymentMethod === 'DEBT' ? (
                                <CreditCard size={12} />
                              ) : (
                                <Banknote size={12} />
                              )}
                              <span>{inv.paymentMethodLabel}</span>
                            </span>
                          </td>
                          <td>
                            <span
                              className={`pos-status-pill ${
                                isCompleted ? 'completed' : isDebt ? 'debt' : 'cancelled'
                              }`}
                              style={
                                isDebt
                                  ? { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
                                  : undefined
                              }
                            >
                              {isCompleted ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={12} /> Hoàn thành
                                </span>
                              ) : isDebt ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <DollarSign size={12} /> Còn nợ {(inv.debtAmount || 0).toLocaleString('vi-VN')} đ
                                </span>
                              ) : (
                                'Đã hủy / Đổi trả'
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {isDebt && (
                                <button
                                  type="button"
                                  className="pos-btn-primary-pill"
                                  style={{
                                    height: 26,
                                    padding: '0 9px',
                                    fontSize: 11,
                                    backgroundColor: '#16a34a',
                                    borderColor: '#15803d',
                                  }}
                                  title="Thu tiền nợ của hóa đơn này"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollectDebtModalInvoice(inv);
                                  }}
                                >
                                  <DollarSign size={12} />
                                  <span>Thu nợ</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="pos-btn-secondary-pill"
                                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                                onClick={() => toggleExpand(inv.invoiceId)}
                              >
                                {isExpanded ? 'Đóng' : 'Chi tiết'}
                              </button>
                              <button
                                type="button"
                                className="pos-btn-secondary-pill"
                                style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#0f766e', color: '#0f766e' }}
                                title="In lại hóa đơn K80"
                                onClick={(e) => handleOpenPrintModal(inv, e)}
                              >
                                <Printer size={12} />
                                <span>In bill</span>
                              </button>
                              {isCompleted ? (
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{ height: 26, padding: '0 8px', fontSize: 11, borderColor: '#fca5a5', color: '#dc2626' }}
                                  title="Hủy hóa đơn này"
                                  onClick={() => setCancelModalInvoice(inv)}
                                >
                                  <XCircle size={12} />
                                  <span>Hủy đơn</span>
                                </button>
                              ) : isDebt ? null : (
                                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>
                                  Đã hủy
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ACCORDION CHI TIẾT */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} style={{ padding: 12, backgroundColor: '#f8fafc' }}>
                              <div
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 8,
                                  padding: 12,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f766e' }}>
                                    Chi tiết mặt hàng trong hóa đơn {inv.invoiceId} &bull; Thu ngân: <b>{inv.cashierName} ({inv.cashierId})</b>
                                    {inv.referenceCode && (
                                      <span style={{ color: '#0284c7', marginLeft: 8 }}>
                                        | Mã GD: {inv.referenceCode}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {isDebt && (
                                      <button
                                        type="button"
                                        className="pos-btn-primary-pill"
                                        style={{ height: 26, padding: '0 12px', fontSize: 11, backgroundColor: '#16a34a' }}
                                        onClick={() => setCollectDebtModalInvoice(inv)}
                                      >
                                        <DollarSign size={12} />
                                        <span>Thu Nợ Hóa Đơn ({(inv.debtAmount || 0).toLocaleString('vi-VN')} đ)</span>
                                      </button>
                                    )}
                                    {isCompleted && (
                                      <button
                                        type="button"
                                        className="pos-btn-secondary-pill"
                                        style={{ height: 26, padding: '0 10px', fontSize: 11, borderColor: '#fca5a5', color: '#dc2626' }}
                                        onClick={() => setCancelModalInvoice(inv)}
                                      >
                                        <XCircle size={12} />
                                        <span>Hủy Hóa Đơn Này</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="pos-btn-primary-pill"
                                      style={{ height: 26, padding: '0 12px', fontSize: 11 }}
                                      onClick={(e) => handleOpenPrintModal(inv, e)}
                                    >
                                      <Printer size={12} />
                                      <span>In Hóa Đơn Nhiệt K80</span>
                                    </button>
                                  </div>
                                </div>

                                <table className="pos-shift-table">
                                  <thead>
                                    <tr>
                                      <th>Mã SKU</th>
                                      <th>Tên mặt hàng</th>
                                      <th>Mã Lô (FEFO)</th>
                                      <th>ĐVT</th>
                                      <th style={{ textAlign: 'right' }}>Số lượng</th>
                                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                      <th style={{ textAlign: 'right' }}>Giảm giá</th>
                                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((item) => (
                                      <tr key={item.itemId}>
                                        <td style={{ color: '#0f766e', fontWeight: 600 }}>{item.sku}</td>
                                        <td><b>{item.productName}</b></td>
                                        <td>
                                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                            {item.batchId || 'LOT-AUTO'}
                                          </span>
                                        </td>
                                        <td>{item.unitName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                                        <td style={{ textAlign: 'right', color: item.discountAmount > 0 ? '#dc2626' : '#94a3b8' }}>
                                          {item.discountAmount.toLocaleString('vi-VN')} đ
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                          {item.totalAmount.toLocaleString('vi-VN')} đ
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* THEO DÕI CÔNG NỢ & LỊCH SỬ THU NỢ CỦA HÓA ĐƠN */}
                                {(inv.debtAmount !== undefined || (inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0)) && (
                                  <div style={{ marginTop: 12, padding: 10, borderRadius: 6, backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0 ? 8 : 0 }}>
                                      <div>
                                        <span style={{ fontWeight: 700, color: '#854d0e', fontSize: 12 }}>Theo dõi thanh toán công nợ: </span>
                                        <span style={{ fontSize: 12, color: '#475569' }}>
                                          Đã thanh toán: <strong style={{ color: '#16a34a' }}>{(inv.paidDebtAmount || 0).toLocaleString('vi-VN')} đ</strong> &bull;{' '}
                                          Còn nợ lại: <strong style={{ color: (inv.debtAmount || 0) > 0 ? '#dc2626' : '#16a34a' }}>{(inv.debtAmount || 0).toLocaleString('vi-VN')} đ</strong>
                                        </span>
                                      </div>
                                      {(inv.debtAmount || 0) > 0 && (
                                        <button
                                          type="button"
                                          className="pos-btn-primary-pill"
                                          style={{ height: 24, padding: '0 10px', fontSize: 11, backgroundColor: '#16a34a' }}
                                          onClick={() => setCollectDebtModalInvoice(inv)}
                                        >
                                          <DollarSign size={12} />
                                          <span>Thu Nợ Ngay</span>
                                        </button>
                                      )}
                                    </div>

                                    {inv.debtPaymentRecords && inv.debtPaymentRecords.length > 0 && (
                                      <div style={{ marginTop: 6, borderTop: '1px dashed #fde047', paddingTop: 6 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#713f12', marginBottom: 4 }}>
                                          Lịch sử các đợt trả tiền ({inv.debtPaymentRecords.length} lần):
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                          <thead>
                                            <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #fef08a' }}>
                                              <th style={{ padding: '3px 6px' }}>Thời gian</th>
                                              <th style={{ padding: '3px 6px', textAlign: 'right' }}>Số tiền</th>
                                              <th style={{ padding: '3px 6px', textAlign: 'center' }}>Hình thức</th>
                                              <th style={{ padding: '3px 6px' }}>Thu ngân</th>
                                              <th style={{ padding: '3px 6px' }}>Ghi chú</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {inv.debtPaymentRecords.map((r) => (
                                              <tr key={r.paymentId}>
                                                <td style={{ padding: '3px 6px' }}>{r.paidAt}</td>
                                                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                                                  {r.amount.toLocaleString('vi-VN')} đ
                                                </td>
                                                <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                                  {r.paymentMethod === 'CASH' ? 'Tiền mặt' : 'VietQR'}
                                                </td>
                                                <td style={{ padding: '3px 6px' }}>{r.cashierName}</td>
                                                <td style={{ padding: '3px 6px', color: '#64748b' }}>{r.note}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })}
                </table>
              </div>

              {/* TÁI SỬ DỤNG TABLEPAGINATION DÙNG CHUNG */}
              <TablePagination
                currentPage={invoicePage}
                pageSize={invoicePageSize}
                totalItems={filteredInvoices.length}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={(p) => setInvoicePage(p)}
                onPageSizeChange={(s) => {
                  setInvoicePageSize(s);
                  setInvoicePage(1);
                }}
                itemLabel="hóa đơn"
              />
            </div>
          ) : (
            /* TAB 2: ĐƠN ĐẶT TRƯỚC (PRE-ORDER) */
            <div className="pos-shift-card">
              <div className="pos-shift-card-header">
                <div>
                  <h3 className="pos-shift-card-title">
                    <PackageCheck size={16} className="text-teal-700" />
                    <span>Đơn Đặt Trước &amp; Giữ Kho</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Khách đặt hàng &amp; cọc tại quầy &bull; Không áp dụng giao hàng hay phí vận chuyển
                  </div>
                </div>

                <div className="shift-status-badge on-duty">
                  <CheckCircle2 size={12} /> Đã trích giữ kho lô FEFO
                </div>
              </div>

              <div className="pos-shift-table-responsive">
                <table className="pos-shift-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Mã đơn đặt trước</th>
                      <th>Khách hàng</th>
                      <th>Thời gian hẹn nhận hàng</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền đơn</th>
                      <th style={{ textAlign: 'right' }}>Tiền cọc</th>
                      <th style={{ textAlign: 'right' }}>Còn phải thu</th>
                      <th>Phân bổ giữ kho</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: 160 }}>Thao tác quầy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreOrders.map((pre) => (
                      <tr key={pre.preOrderId}>
                        <td>
                          <b style={{ color: '#0f766e' }}>{pre.preOrderId}</b>
                          <div style={{ color: '#64748b', fontSize: 11 }}>Tạo: {pre.createdAt}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={13} className="text-slate-500" />
                            <b>{pre.customerName}</b>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11 }}>
                            <Phone size={11} />
                            <span>{pre.customerPhone}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#b45309' }}>
                            {pre.pickupAppointment}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {pre.totalOrderAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                          {pre.depositAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                          {pre.remainingAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Đã giữ kho Lô FEFO
                          </span>
                        </td>
                        <td>
                          <span className="pos-status-pill reserved">
                            {pre.statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="pos-btn-primary-pill"
                            style={{ height: 28, padding: '0 12px', fontSize: 11.5 }}
                            onClick={() => handleFulfillPreOrder(pre)}
                          >
                            <PackageCheck size={13} />
                            <span>Giao &amp; Thu Tiền</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TÁI SỬ DỤNG TABLEPAGINATION */}
              <TablePagination
                currentPage={preOrderPage}
                pageSize={preOrderPageSize}
                totalItems={filteredPreOrders.length}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={(p) => setPreOrderPage(p)}
                onPageSizeChange={(s) => {
                  setPreOrderPageSize(s);
                  setPreOrderPage(1);
                }}
                itemLabel="đơn đặt trước"
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL IN HÓA ĐƠN NHIỆT KHỔ K80 - CHUẨN POS MODAL */}
      {printingInvoice && (
        <div className="pos-modal-overlay" onClick={() => setPrintingInvoice(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-teal-700" />
                <h2 className="pos-modal-title">Xem Trước Hóa Đơn Khổ K80</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setPrintingInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body">
              {/* KHỔ GIẤY IN NHIỆT K80 ĐỒNG BỘ Z-REPORT-PAPER */}
              <div className="pos-k80-paper">
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
                  SIÊU THỊ TIỆN LỢI MT-GRMS
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  18 Tràng Tiền, Hoàn Kiếm, Hà Nội<br />
                  Hotline: 1900 8888 &bull; MST: 0109988776
                </div>

                <div className="z-report-divider" />

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, margin: '4px 0' }}>
                  HÓA ĐƠN THANH TOÁN BÁN LẺ
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span>Số HD: <b>{printingInvoice.invoiceId}</b></span>
                  <span>{printingInvoice.createdAt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span>Thu ngân: {printingInvoice.cashierName}</span>
                  <span>Quầy #01</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Khách: {printingInvoice.customerName}</span>
                  <span>{printingInvoice.customerPhone || 'Khách lẻ'}</span>
                </div>

                <div className="z-report-divider" />

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '3px 0' }}>Mặt hàng</th>
                      <th style={{ textAlign: 'center', padding: '3px 0' }}>SL</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>Đ.Giá</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingInvoice.items.map((it) => (
                      <tr key={it.itemId}>
                        <td style={{ padding: '3px 0' }}>{it.productName}</td>
                        <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.unitPrice.toLocaleString('vi-VN')}</td>
                        <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>{it.totalAmount.toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="z-report-divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{printingInvoice.totalMerchandiseAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Giảm giá / Voucher:</span>
                  <span>-{printingInvoice.totalDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>
                  <span>KHÁCH ĐÃ TRẢ:</span>
                  <span style={{ color: '#15803d' }}>{printingInvoice.finalPaidAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {printingInvoice.debtAmount !== undefined && (
                  <div style={{ padding: '6px 8px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 4, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>Tiền nợ còn lại:</span>
                      <strong style={{ color: printingInvoice.debtAmount > 0 ? '#dc2626' : '#16a34a' }}>
                        {printingInvoice.debtAmount.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                      <span style={{ color: '#64748b' }}>Đã trả trước đó:</span>
                      <strong style={{ color: '#16a34a' }}>
                        {(printingInvoice.paidDebtAmount || 0).toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span>Phương thức:</span>
                  <span>{printingInvoice.paymentMethodLabel}</span>
                </div>
                {printingInvoice.referenceCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span>Mã GD:</span>
                    <span>{printingInvoice.referenceCode}</span>
                  </div>
                )}

                <div className="z-report-divider" />

                <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 10 }}>
                  Cảm ơn Quý khách &amp; Hẹn gặp lại!<br />
                  (Hóa đơn điện tử khởi tạo từ máy tính tiền)
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setPrintingInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                onClick={() => {
                  window.print();
                  showToast('Đang gửi lệnh in hóa đơn K80 ra máy in nhiệt quầy...');
                }}
              >
                <Printer size={14} />
                <span>In Hóa Đơn K80</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN HỦY HÓA ĐƠN & HOÀN TIỀN QUẦY */}
      {cancelModalInvoice && (
        <div className="pos-modal-overlay" onClick={() => setCancelModalInvoice(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '490px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-600" />
                <h2 className="pos-modal-title">Hủy Hóa Đơn &amp; Hoàn Tiền Khách</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setCancelModalInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Mã hóa đơn: <b style={{ color: '#0f172a' }}>{cancelModalInvoice.invoiceId}</b></span>
                  <span style={{ color: '#64748b' }}>{cancelModalInvoice.createdAt}</span>
                </div>
                <div>
                  Khách hàng: <b>{cancelModalInvoice.customerName}</b>{' '}
                  {cancelModalInvoice.customerPhone && (
                    <span style={{ color: '#64748b' }}>({cancelModalInvoice.customerPhone})</span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed #fca5a5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#991b1b' }}>Số tiền hoàn lại cho khách:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                    {cancelModalInvoice.finalPaidAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 4 }}>
                  Hình thức thanh toán gốc: <b>{cancelModalInvoice.paymentMethodLabel}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lý do hủy hóa đơn: <span className="text-red-500">*</span>
                </label>
                <select
                  className="filter-select w-full"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="Khách đổi ý trả lại hàng">Khách đổi ý trả lại hàng</option>
                  <option value="Thu ngân tính nhầm số lượng / mặt hàng">Thu ngân tính nhầm số lượng / mặt hàng</option>
                  <option value="Áp dụng sai chương trình chiết khấu / voucher">Áp dụng sai chương trình chiết khấu / voucher</option>
                  <option value="Trùng lặp hóa đơn">Trùng lặp hóa đơn</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú giải trình (nếu có):
                </label>
                <input
                  type="text"
                  className="filter-select w-full"
                  placeholder="Nhập lý do chi tiết..."
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                />
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setCancelModalInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-danger-pill"
                style={{ height: 34, fontSize: 12.5 }}
                onClick={handleConfirmCancelInvoice}
              >
                <XCircle size={14} />
                <span>Xác Nhận Hủy &amp; Hoàn Tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THU NỢ HÓA ĐƠN BÁN LẺ */}
      <CollectDebtModal
        isOpen={Boolean(collectDebtModalInvoice)}
        invoice={collectDebtModalInvoice}
        onClose={() => setCollectDebtModalInvoice(null)}
        onCollectDebt={handleCollectDebt}
      />
    </div>
  );
};
