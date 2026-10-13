import type { FC } from 'react';
import { Receipt, Printer, X } from 'lucide-react';
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
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="pos-modal-header">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-teal-700" />
            <h2 className="pos-modal-title">Hóa Đơn Bán Hàng K80</h2>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Thân Modal cuộn êm */}
        <div
          className="pos-modal-body"
          style={{ background: '#f8fafc', padding: '16px', maxHeight: '72vh', overflowY: 'auto' }}
        >
          {/* Khổ giấy in nhiệt K80 380px tương tự Z-Report */}
          <div className="z-report-paper printable-receipt" id="pos-receipt-print-area">
            {/* 1. Header Cửa Hàng */}
            <div className="text-center mb-3">
              <div className="font-bold text-xs tracking-wider text-slate-800 uppercase">
                {receiptData.storeName || 'HỆ THỐNG TẠP HÓA MT-GRMS'}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5">
                Đ/c: {receiptData.storeAddress} &bull; ĐT: {receiptData.storePhone}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hotline CSKH: {receiptData.hotline}
              </div>
              <h3 className="font-bold text-sm tracking-wider uppercase text-teal-800 mt-2">
                HÓA ĐƠN BÁN HÀNG
              </h3>
              <div className="text-[11.5px] font-mono text-slate-500 font-medium mt-0.5">
                Số HĐ: #{receiptData.orderCode}
              </div>
            </div>

            <div className="z-report-divider" />

            {/* 2. Thông tin giao dịch & Khách hàng */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Thời gian:</span>
                <span className="font-mono text-slate-700 whitespace-nowrap shrink-0">
                  {receiptData.createdAt}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Thu ngân:</span>
                <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  {receiptData.cashierName} ({receiptData.posMachine})
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Khách hàng:</span>
                <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  {receiptData.customer?.name || 'Khách vãng lai'}
                </span>
              </div>
              {receiptData.customer?.phone && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex-1 min-w-0">Số điện thoại:</span>
                  <span className="font-mono text-slate-700 whitespace-nowrap shrink-0">
                    {receiptData.customer.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Hình thức mua:</span>
                <span className="text-slate-700 whitespace-nowrap shrink-0">
                  Bán trực tiếp tại quầy
                </span>
              </div>
            </div>

            <div className="z-report-divider" />

            {/* 3. Danh Sách Mặt Hàng */}
            <div className="text-xs">
              <div className="flex justify-between items-center pb-1 text-slate-500 font-semibold border-b border-dashed border-slate-300 mb-1.5">
                <span className="flex-1 min-w-0">Tên &amp; Đơn giá</span>
                <span className="w-10 text-center shrink-0">SL</span>
                <span className="w-24 text-right shrink-0">Thành tiền</span>
              </div>
              <div className="space-y-2">
                {receiptData.items.map((item) => (
                  <div key={item.stt} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 leading-tight">
                        {item.stt}. {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.unitPrice.toLocaleString('vi-VN')} đ
                        {item.batchCode && (
                          <span className="text-slate-400 font-sans"> &bull; Lô: {item.batchCode}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-10 text-center font-mono text-slate-700 shrink-0 pt-0.5">
                      {item.quantity}
                    </div>
                    <div className="w-24 text-right font-mono tabular-nums font-semibold text-slate-800 shrink-0 pt-0.5">
                      {item.totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="z-report-divider" />

            {/* 4. Tổng Kết Tài Chính */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2 text-slate-700">
                <span className="text-slate-500 flex-1 min-w-0">Tổng tiền hàng:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  {receiptData.totalItemAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {receiptData.orderDiscountAmount > 0 && (
                <div className="flex justify-between items-center gap-2 text-rose-600">
                  <span className="flex-1 min-w-0">Chiết khấu khuyến mại:</span>
                  <span className="font-mono tabular-nums font-semibold whitespace-nowrap shrink-0">
                    - {receiptData.orderDiscountAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
              {receiptData.pointsDiscountAmount > 0 && (
                <div className="flex justify-between items-center gap-2 text-emerald-700">
                  <span className="flex-1 min-w-0">Dùng điểm tích lũy:</span>
                  <span className="font-mono tabular-nums font-semibold whitespace-nowrap shrink-0">
                    - {receiptData.pointsDiscountAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
              {receiptData.vatAmount > 0 && (
                <div className="flex justify-between items-center gap-2 text-slate-700">
                  <span className="text-slate-500 flex-1 min-w-0">Thuế GTGT (VAT 8%):</span>
                  <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                    + {receiptData.vatAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              {/* Dòng tổng thanh toán nổi bật */}
              <div className="flex justify-between items-center gap-2 font-bold text-sm text-teal-800 pt-1.5 border-t border-dashed border-slate-300">
                <span className="flex-1 min-w-0">TỔNG THANH TOÁN:</span>
                <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                  {receiptData.finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {receiptData.finalAmountInWords && (
                <div className="text-[11px] text-slate-500 italic text-right">
                  ({receiptData.finalAmountInWords})
                </div>
              )}

              <div className="flex justify-between items-center gap-2 text-slate-700 pt-1">
                <span className="text-slate-500 flex-1 min-w-0">Phương thức thanh toán:</span>
                <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  {receiptData.paymentMethodText}
                </span>
              </div>
              {receiptData.earnedPoints > 0 && (
                <div className="flex justify-between items-center gap-2 text-teal-700">
                  <span className="flex-1 min-w-0">Điểm tích lũy cộng thêm:</span>
                  <span className="font-mono font-semibold whitespace-nowrap shrink-0">
                    +{receiptData.earnedPoints} điểm
                  </span>
                </div>
              )}
            </div>

            <div className="z-report-divider" />

            {/* 5. Chân Hóa Đơn & Mã VietQR */}
            <div className="text-center text-xs mt-2">
              <div className="font-bold text-[11px] tracking-wider text-slate-700 uppercase">
                [VIETQR NAPAS 247]
              </div>
              <div className="text-xl my-1 text-slate-700 tracking-widest font-mono">
                ▦▣▦
              </div>
              <div className="font-mono text-[11px] text-slate-500 font-medium">
                #{receiptData.orderCode}
              </div>
              <div className="font-semibold text-slate-800 mt-2 text-xs">
                Cảm ơn Quý khách &amp; Hẹn gặp lại!
              </div>
              <div className="text-[10.5px] text-slate-400 italic mt-0.5">
                (Hóa đơn GTGT điện tử phát hành tại hoadon.mt-grms.vn)
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary-pill" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="pos-btn-primary-pill" onClick={handlePrint}>
            <Printer size={15} />
            <span>In Hóa Đơn (Print K80)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
