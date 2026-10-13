import type { FC } from 'react';
import type { ReceiptData } from '../types/pos.types';

interface Props {
  isOpen: boolean;
  receiptData: ReceiptData | null;
  onClose: () => void;
}

export const PosReceiptModal: FC<Props> = ({ isOpen, receiptData, onClose }) => {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pos-modal-overlay pos-receipt-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-receipt-container">
        {/* Thanh công cụ in - không in khi ra giấy */}
        <div className="pos-receipt-toolbar no-print">
          <button
            type="button"
            className="pos-btn-primary"
            onClick={handlePrint}
            style={{ padding: '8px 18px', fontSize: 14 }}
          >
            🖨️ Thực Hiện In Ngay (Print ESC/POS)
          </button>
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            &larr; Quay Lại POS
          </button>
        </div>

        {/* Khung Hóa đơn nhiệt K80 thực tế (Rộng 320px chuẩn 80mm) */}
        <div className="pos-receipt-paper printable-receipt">
          {/* 1. Header Cửa Hàng */}
          <div className="pos-receipt-header">
            <div className="pos-receipt-store-name">{receiptData.storeName}</div>
            <div className="pos-receipt-store-sub">
              Đ/c: {receiptData.storeAddress}
              <br />
              Điện thoại: {receiptData.storePhone}
              <br />
              Hotline CSKH: {receiptData.hotline}
            </div>
            <div className="pos-receipt-main-title">HÓA ĐƠN BÁN HÀNG</div>
            <div className="pos-receipt-meta">
              Số HĐ: <b>{receiptData.orderCode}</b>
              <br />
              Ngày: {receiptData.createdAt}
              <br />
              Thu ngân: {receiptData.cashierName} | Máy: {receiptData.posMachine}
            </div>
            <hr className="pos-receipt-hr" />
          </div>

          {/* 2. Thông Tin Khách Hàng */}
          <div className="pos-receipt-customer-block">
            Khách hàng: <b>{receiptData.customer ? receiptData.customer.name : 'Khách vãng lai'}</b>
            <br />
            Số điện thoại: {receiptData.customer?.phone || '---'}
            <br />
            Địa chỉ: {receiptData.customer?.address || 'Tại quầy'}
            <br />
            Hình thức mua: Bán trực tiếp tại quầy
            <hr className="pos-receipt-hr" />
          </div>

          {/* 3. Danh Sách Mặt Hàng */}
          <table className="pos-receipt-items-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Tên &amp; Đơn giá</th>
                <th style={{ width: 35, textAlign: 'center' }}>SL</th>
                <th style={{ width: 85, textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item: ReceiptData['items'][number]) => (
                <tr key={item.stt}>
                  <td>
                    <b>{item.stt}. {item.name}</b>
                    <br />
                    <span>{item.unitPrice.toLocaleString('vi-VN')}</span>
                    {item.batchCode && <span style={{ fontSize: 11 }}> (Lô: {item.batchCode})</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.totalAmount.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 4. Tổng Kết Tài Chính */}
          <table className="pos-receipt-totals-table">
            <tbody>
              <tr>
                <td>Tổng tiền hàng:</td>
                <td style={{ textAlign: 'right' }}>
                  {receiptData.totalItemAmount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
              {receiptData.orderDiscountAmount > 0 && (
                <tr>
                  <td>Chiết khấu khuyến mại:</td>
                  <td style={{ textAlign: 'right' }}>
                    - {receiptData.orderDiscountAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              )}
              {receiptData.pointsDiscountAmount > 0 && (
                <tr>
                  <td>Dùng điểm tích lũy:</td>
                  <td style={{ textAlign: 'right' }}>
                    - {receiptData.pointsDiscountAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              )}
              {receiptData.vatAmount > 0 && (
                <tr>
                  <td>Thuế GTGT (VAT 8%):</td>
                  <td style={{ textAlign: 'right' }}>
                    + {receiptData.vatAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={2}>
                  <hr className="pos-receipt-hr" />
                </td>
              </tr>
              <tr className="pos-receipt-final-row">
                <td><b>TỔNG THANH TOÁN:</b></td>
                <td style={{ textAlign: 'right' }}>
                  <b>{receiptData.finalAmount.toLocaleString('vi-VN')} đ</b>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ fontStyle: 'italic', fontSize: 11, paddingTop: 4 }}>
                  ({receiptData.finalAmountInWords})
                </td>
              </tr>
              <tr>
                <td>Phương thức thanh toán:</td>
                <td style={{ textAlign: 'right' }}>{receiptData.paymentMethodText}</td>
              </tr>
              <tr>
                <td>Điểm tích lũy cộng thêm:</td>
                <td style={{ textAlign: 'right' }}>+{receiptData.earnedPoints} điểm</td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <hr className="pos-receipt-hr" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. Chân Hóa Đơn & Mã VietQR */}
          <div className="pos-receipt-footer">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <b>[VIETQR NAPAS 247]</b>
              <div style={{ fontSize: 24, margin: '4px 0', letterSpacing: 4 }}>▦▣▦</div>
              <div style={{ fontSize: 11 }}>{receiptData.orderCode}</div>
            </div>
            <div>Cảm ơn Quý khách &amp; Hẹn gặp lại!</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              <i>(Hóa đơn GTGT điện tử phát hành tại hoadon.mt-grms.vn)</i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
