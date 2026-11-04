import { useState } from 'react';
import type { FC } from 'react';
import { Receipt, Printer, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ReceiptData } from '../types/pos.types';
import { posOrderApi } from '../api/posOrderApi';

interface Props {
  isOpen: boolean;
  receiptData: ReceiptData | null;
  onClose: () => void;
}

export const PosReceiptModal: FC<Props> = ({ isOpen, receiptData, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !receiptData) return null;

  const handleThermalPrintRaw = async () => {
    try {
      setIsPrinting(true);
      setPrintStatus(null);
      const res = await posOrderApi.printDirect(receiptData);
      if (res.success) {
        setPrintStatus({
          type: 'success',
          message: res.message || 'Đã gửi lệnh in thành công tới máy in POS-58!',
        });
      } else {
        setPrintStatus({
          type: 'error',
          message: res.message || 'Máy in POS-58 chưa sẵn sàng. Vui lòng kiểm tra cáp USB và nguồn điện.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy in';
      setPrintStatus({
        type: 'error',
        message: `Lỗi kết nối máy in POS-58: ${msg}. Hãy kiểm tra file start.bat (port 3300) hoặc cáp USB máy in.`,
      });
    } finally {
      setIsPrinting(false);
    }
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
            <h2 className="pos-modal-title">Hóa Đơn Bán Lẻ Siêu Thị Mini (POS-58 / 43mm)</h2>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Thông báo trạng thái in nhiệt nếu có */}
        {printStatus && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b ${
              printStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {printStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
            )}
            <span>{printStatus.message}</span>
          </div>
        )}

        {/* Thân Modal cuộn êm */}
        <div
          className="pos-modal-body"
          style={{ background: '#f8fafc', padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* Khổ giấy in nhiệt chuẩn 43mm siêu thị mini */}
          <div className="z-report-paper printable-receipt" id="pos-receipt-print-area">
            {/* 1. Header Cửa Hàng Tạp Hóa / Siêu Thị Mini */}
            <div className="text-center mb-3">
              <div className="font-bold text-xs tracking-wider text-slate-800 uppercase">
                {receiptData.storeName || 'SIÊU THỊ MINI MT-GROCERY'}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5">
                Đ/c: {receiptData.storeAddress} &bull; ĐT: {receiptData.storePhone}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hotline CSKH: {receiptData.hotline} | Wifi: MT-GROCERY
              </div>
              <h3 className="font-bold text-sm tracking-wider uppercase text-teal-800 mt-2">
                HÓA ĐƠN BÁN LẺ (POS)
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
            </div>

            <div className="z-report-divider" />

            {/* 3. Danh Sách Mặt Hàng Chuẩn Tạp Hóa / Siêu Thị Mini */}
            <div className="text-xs">
              <div className="flex justify-between items-center pb-1 text-slate-500 font-semibold border-b border-dashed border-slate-300 mb-1.5">
                <span className="flex-1 min-w-0">Tên hàng hóa</span>
                <span className="w-12 text-center shrink-0">SL</span>
                <span className="w-16 text-right shrink-0">Đơn giá</span>
                <span className="w-18 text-right shrink-0">Thành tiền</span>
              </div>

              <div className="space-y-1.5">
                {receiptData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-medium text-slate-800 leading-snug truncate">
                        {item.name}
                      </div>
                      {item.batchCode && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Lô: {item.batchCode}
                        </div>
                      )}
                    </div>
                    <span className="w-12 text-center text-slate-600 shrink-0 font-mono">
                      {item.quantity}
                    </span>
                    <span className="w-16 text-right text-slate-600 shrink-0 font-mono tabular-nums">
                      {item.unitPrice.toLocaleString('vi-VN')}
                    </span>
                    <span className="w-18 text-right font-medium text-slate-800 shrink-0 font-mono tabular-nums">
                      {item.totalAmount.toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="z-report-divider" />

            {/* 4. Tổng Kết Tiền Hàng */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2 text-slate-700">
                <span className="flex-1 min-w-0">Tổng tiền hàng:</span>
                <span className="font-mono tabular-nums font-semibold whitespace-nowrap shrink-0">
                  {receiptData.totalItemAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {receiptData.orderDiscountAmount > 0 && (
                <div className="flex justify-between items-center gap-2 text-rose-700">
                  <span className="flex-1 min-w-0">Chiết khấu / Giảm giá:</span>
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
                  <span className="text-slate-500 flex-1 min-w-0">Thuế GTGT (VAT 1%):</span>
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

              <div className="flex justify-between items-center gap-2 text-slate-700 pt-1">
                <span className="text-slate-500 flex-1 min-w-0">Phương thức:</span>
                <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                  {receiptData.paymentMethodText}
                </span>
              </div>
              {receiptData.debtAmount !== undefined && receiptData.debtAmount > 0 && (
                <div className="flex justify-between items-center gap-2 text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                  <span className="flex-1 min-w-0 font-medium">Số tiền ghi nợ đơn:</span>
                  <span className="font-mono tabular-nums font-bold text-amber-900 whitespace-nowrap shrink-0">
                    {receiptData.debtAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
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

            {/* 5. Chân Hóa Đơn Tạp Hóa / Siêu Thị Mini */}
            <div className="text-center text-xs mt-2">
              <div className="text-[11px] text-slate-600">
                Quý khách vui lòng kiểm tra kỹ hóa đơn & hàng hóa trước khi rời quầy!
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Đổi trả trong 24h kèm hóa đơn (sản phẩm còn nguyên tem mác).
              </div>
              <div className="font-semibold text-slate-800 mt-1 text-xs">
                CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!
              </div>
              <div className="text-[10px] text-slate-400 italic mt-0.5 font-mono">
                [Hóa đơn điện tử khởi tạo từ máy tính tiền MT-GRMS]
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal: In trực tiếp 1-Click không popup */}
        <div className="pos-modal-footer flex items-center justify-between gap-2">
          <button type="button" className="pos-btn-secondary-pill" onClick={onClose}>
            Đóng / Bán đơn tiếp theo
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="pos-btn-primary-pill flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium"
              onClick={handleThermalPrintRaw}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang gửi lệnh in tới POS-58...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>In lại hóa đơn (POS-58 1-Click)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
