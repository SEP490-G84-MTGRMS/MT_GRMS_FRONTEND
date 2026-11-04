import type { FC } from 'react';
import {
  BarChart3,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  Award,
  Ticket,
  Receipt,
} from 'lucide-react';
import type { PaymentMethodRevenue } from '../types/pos.types';

interface Props {
  revenues: PaymentMethodRevenue[];
}

export const ShiftRevenueTable: FC<Props> = ({ revenues }) => {
  const totalOrders = revenues.reduce((sum, item) => sum + item.orderCount, 0);
  const totalAmount = revenues.reduce((sum, item) => sum + item.amount, 0);

  const renderMethodIcon = (id: string) => {
    switch (id) {
      case 'cash':
        return <Banknote size={18} className="text-emerald-600" />;
      case 'vietqr':
        return <QrCode size={18} className="text-teal-600" />;
      case 'pos_card':
        return <CreditCard size={18} className="text-blue-600" />;
      case 'e_wallet':
        return <Wallet size={18} className="text-purple-600" />;
      case 'loyalty':
        return <Award size={18} className="text-amber-600" />;
      case 'voucher':
        return <Ticket size={18} className="text-rose-600" />;
      default:
        return <Receipt size={18} className="text-slate-600" />;
    }
  };

  return (
    <div className="pos-shift-card">
      <div className="pos-shift-card-header">
        <h3 className="pos-shift-card-title">
          <BarChart3 size={17} className="text-teal-700" />
          <span>Doanh Thu Theo Phương Thức Thanh Toán</span>
        </h3>
      </div>
      <div className="pos-shift-table-responsive">
        <table className="pos-shift-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Phương thức</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Số đơn</th>
              <th style={{ textAlign: 'right', width: '140px' }}>Số tiền (VNĐ)</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {revenues.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="revenue-method-cell">
                    <span className="method-icon-wrapper">{renderMethodIcon(item.id)}</span>
                    <div>
                      <div className="method-name">{item.methodName}</div>
                      <div className="method-desc">{item.methodDescription}</div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="order-count-badge font-mono">{item.orderCount}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums font-semibold text-teal-700">
                    {item.amount.toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="font-mono tabular-nums text-slate-600">{item.percentage}%</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-summary-row">
              <td>
                <b>TỔNG DOANH THU BÁN TRONG CA:</b>
              </td>
              <td style={{ textAlign: 'center' }}>
                <b className="font-mono">{totalOrders} lượt</b>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="total-revenue-value font-mono tabular-nums">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <b className="font-mono">100%</b>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
