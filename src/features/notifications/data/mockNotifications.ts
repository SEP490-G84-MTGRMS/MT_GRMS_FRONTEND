import type { AppNotification } from '../types/notification';

/**
 * Initial mock notifications reflecting the 5 core modules of MT-GRMS
 */
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    title: 'Lô sữa tươi Ba Vì cận date',
    message: 'Lô L0492 (12 hộp) sẽ hết hạn vào 23/10/2026 (còn 3 ngày). Cần ưu tiên xuất bán theo FEFO!',
    severity: 'critical',
    category: 'inventory_fefo',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    action: {
      label: 'Xem lô hàng',
      url: '/store-owner/suppliers/products?view=inventory&batch=L0492',
      variant: 'danger',
    },
    metadata: {
      batchId: 'L0492',
      productName: 'Sữa tươi Ba Vì 1L',
      daysRemaining: 3,
    },
  },
  {
    id: 'notif-002',
    title: 'Lệch tiền bàn giao ca chiều',
    message: 'Thu ngân An Nguyễn báo lệch thiếu -50.000đ so với doanh số máy tính tiền két POS-01.',
    severity: 'critical',
    category: 'cashbook_shift',
    isRead: false,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
    action: {
      label: 'Đối soát két',
      url: '/store-owner/cashbook',
      variant: 'danger',
    },
    metadata: {
      shiftId: 'SH-20261020-02',
      cashier: 'An Nguyễn',
      discrepancy: -50000,
    },
  },
  {
    id: 'notif-003',
    title: 'Hóa đơn tiền điện EVN đến hạn',
    message: 'Hóa đơn tiền điện kỳ tháng 10/2026 (3.450.000đ) sẽ đến hạn thanh toán vào ngày mai.',
    severity: 'warning',
    category: 'service_expense',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    action: {
      label: 'Chi trả ngay',
      url: '/store-owner/expenses?tab=unpaid',
      variant: 'primary',
    },
    metadata: {
      expenseId: 'EXP-EVN-1026',
      amount: 3450000,
      dueDate: '2026-10-21',
    },
  },
  {
    id: 'notif-004',
    title: 'Khách hàng vượt hạn mức nợ',
    message: 'Khách hàng Tuấn Cửa Sắt (0912xxx) vừa nợ thêm 350.000đ, tổng nợ đạt 5.350.000đ (vượt trần 5.000.000đ).',
    severity: 'warning',
    category: 'customer_credit',
    isRead: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    action: {
      label: 'Kiểm tra sổ nợ',
      url: '/store-owner/customers',
      variant: 'secondary',
    },
    metadata: {
      customerId: 'CUST-084',
      currentDebt: 5350000,
      creditLimit: 5000000,
    },
  },
  {
    id: 'notif-005',
    title: 'Nhắc hạn nộp tờ khai thuế Quý 3',
    message: 'Còn 5 ngày nữa là đến hạn nộp tờ khai thuế hộ kinh doanh mẫu 01/CNKD theo Thông tư 40.',
    severity: 'warning',
    category: 'tax_compliance',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    action: {
      label: 'Lập tờ khai thuế',
      url: '/store-owner/tax-snapshot',
      variant: 'primary',
    },
  },
  {
    id: 'notif-006',
    title: 'Nhập kho hoàn tất đơn #PO-882',
    message: 'Nhà cung cấp Vinamilk đã giao đủ 50 thùng sữa đặc, thủ kho đã hoàn tất nghiệm thu.',
    severity: 'info',
    category: 'inventory_fefo',
    isRead: true,
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // 28 hours ago
    action: {
      label: 'Xem đơn nhập',
      url: '/store-owner/suppliers?view=invoices',
      variant: 'secondary',
    },
  },
  {
    id: 'notif-007',
    title: 'Thu nợ VietQR thành công',
    message: 'Chị Lan (0903xxx) vừa quét mã VietQR thanh toán 1.200.000đ tất toán công nợ đơn hàng #HD-9021.',
    severity: 'success',
    category: 'customer_credit',
    isRead: true,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    action: {
      label: 'Xem chi tiết',
      url: '/store-owner/customers',
      variant: 'secondary',
    },
  },
];
