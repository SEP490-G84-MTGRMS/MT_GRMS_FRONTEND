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
  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    return localStorage.getItem('mtgrms_pos_auto_print') === 'true';
  });

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
          {/* Khổ giấy in nhiệt chuẩn siêu thị bán lẻ */}
          <div className="z-report-paper printable-receipt" id="pos-receipt-print-area">
            {/* 1. Header Cửa Hàng / Siêu Thị Chuẩn Bán Lẻ */}
            <div className="text-center mb-2.5">
              <div className="font-bold text-sm tracking-wide text-slate-900 uppercase">
                {receiptData.storeName || 'SIÊU THỊ THỰC PHẨM'}
              </div>
              <div className="text-[11.5px] text-slate-600 mt-1 leading-snug">
                Địa chỉ: {receiptData.storeAddress}
              </div>
              <div className="text-[11.5px] text-slate-600 mt-0.5">
                Hotline: {receiptData.hotline || receiptData.storePhone || '024 3822 9988'}
              </div>

              <h3 className="font-bold text-base tracking-wider uppercase text-slate-900 mt-2.5 mb-1">
                HÓA ĐƠN BÁN LẺ
              </h3>
              <div className="text-[11.5px] font-mono text-slate-600">
                HĐ: {receiptData.orderCode}
              </div>
            </div>

            {/* 2. Thông tin ngày bán & Thu ngân */}
            <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between items-center text-slate-700">
                <span>Ngày bán:</span>
                <span className="font-mono text-slate-800">{receiptData.createdAt}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Thu ngân:</span>
                <span className="font-semibold text-slate-800">{receiptData.cashierName}</span>
              </div>
            </div>

            {/* 3. Danh Sách Mặt Hàng Dạng Bảng Chuẩn Siêu Thị */}
            <div className="text-xs mb-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-dashed border-slate-400 text-slate-700 font-semibold text-[11.5px]">
                    <th className="text-left py-1 w-6 font-semibold">STT</th>
                    <th className="text-left py-1 font-semibold">Hàng hóa</th>
                    <th className="text-center py-1 w-10 font-semibold">S.Lg</th>
                    <th className="text-right py-1 w-16 font-semibold">Đơn giá</th>
                    <th className="text-right py-1 w-18 font-semibold">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-200">
                  {receiptData.items.map((item, idx) => (
                    <tr key={idx} className="align-top text-[11.5px]">
                      <td className="py-1.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-1.5 pr-1 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-1.5 text-center text-slate-700 font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right text-slate-700 font-mono tabular-nums">
                        {item.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-slate-900 font-mono tabular-nums">
                        {item.totalAmount.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-b border-dashed border-slate-400 font-semibold text-xs">
                    <td colSpan={2} className="py-1 text-slate-800">Tổng cộng:</td>
                    <td className="py-1 text-center font-mono text-slate-900">
                      {receiptData.items.reduce((sum, it) => sum + (it.quantity || 0), 0)}
                    </td>
                    <td className="py-1"></td>
                    <td className="py-1 text-right font-semibold font-mono text-slate-900 tabular-nums">
                      {receiptData.totalItemAmount.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Tổng Kết Tiền Hàng & Thanh Toán (Hoàn Toàn Không Có VAT) */}
            <div className="space-y-1.5 text-xs py-2 border-b border-dashed border-slate-300">
              {receiptData.orderDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span>Tiền chiết khấu:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    - {receiptData.orderDiscountAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
              {receiptData.pointsDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Dùng điểm tích lũy:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    - {receiptData.pointsDiscountAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              {/* Dòng tổng phải trả nổi bật */}
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-dashed border-slate-300">
                <span>TỔNG PHẢI TRẢ:</span>
                <span className="font-mono tabular-nums text-base text-teal-800">
                  {receiptData.finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Khối Tiền khách trả chi tiết */}
              <div className="pt-1 text-slate-700 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Tiền khách trả:</span>
                  <span className="text-[11px] text-slate-500 font-medium">({receiptData.paymentMethodText})</span>
                </div>
                {receiptData.paymentMethodText.includes('Tiền mặt') ? (
                  <>
                    <div className="flex justify-between items-center pl-4 text-slate-600">
                      <span>Tiền mặt:</span>
                      <span className="font-mono tabular-nums">
                        {(receiptData.cashTendered || receiptData.finalAmount).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 font-medium">
                      <span>Tiền còn dư:</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {Math.max(0, (receiptData.cashTendered || receiptData.finalAmount) - receiptData.finalAmount).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </>
                ) : receiptData.debtAmount ? (
                  <>
                    <div className="flex justify-between items-center pl-4 text-amber-700 font-medium">
                      <span>Ghi nợ đơn:</span>
                      <span className="font-mono tabular-nums">
                        {receiptData.debtAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-amber-800 font-bold">
                      <span>Còn nợ:</span>
                      <span className="font-mono tabular-nums">
                        {receiptData.debtAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center pl-4 text-slate-600">
                      <span>Chuyển khoản:</span>
                      <span className="font-mono tabular-nums">
                        {receiptData.finalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Tiền còn dư:</span>
                      <span className="font-mono tabular-nums">0 đ</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 5. Khối Thông Tin Khách Hàng (Chuẩn Hóa Ở Chân Bill) */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-xs">
              <div className="font-bold text-center text-slate-800 uppercase tracking-wide mb-1.5">
                THÔNG TIN KHÁCH HÀNG
              </div>
              <div className="space-y-1 text-slate-700">
                <div className="flex items-start">
                  <span className="w-28 shrink-0 text-slate-500">Tên khách hàng:</span>
                  <span className="font-medium text-slate-900">{receiptData.customer?.name || 'Khách hàng lẻ'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 shrink-0 text-slate-500">Địa chỉ:</span>
                  <span className="text-slate-800">{receiptData.customer?.address || '---'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 shrink-0 text-slate-500">Số điện thoại:</span>
                  <span className="font-mono text-slate-800">{receiptData.customer?.phone || '---'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 shrink-0 text-slate-500">Tổng điểm tích lũy:</span>
                  <span className="font-mono font-semibold text-teal-700">
                    {receiptData.customer?.loyaltyPoints ?? (receiptData.earnedPoints || 0)} điểm
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Chân Hóa Đơn Chuẩn Siêu Thị */}
            <div className="text-center text-xs mt-3">
              <div className="font-bold text-slate-800 text-xs uppercase">
                CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal: In trực tiếp 1-Click không popup */}
        <div className="pos-modal-footer flex items-center justify-between gap-2">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => {
                setAutoPrint(e.target.checked);
                localStorage.setItem('mtgrms_pos_auto_print', String(e.target.checked));
              }}
            />
            <span>Tự động in bill sau khi thanh toán</span>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" className="pos-btn-secondary-pill" onClick={onClose}>
              Đóng
            </button>
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
