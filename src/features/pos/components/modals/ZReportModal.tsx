import type { FC } from 'react';
import { Printer, X } from 'lucide-react';
import type { ShiftInfo, PaymentMethodRevenue } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shiftInfo: ShiftInfo;
  revenues: PaymentMethodRevenue[];
  actualCash: number;
  theoreticalCash: number;
  initialFloat: number;
}

export const ZReportModal: FC<Props> = ({
  isOpen,
  onClose,
  shiftInfo,
  revenues,
  actualCash,
  theoreticalCash,
  initialFloat,
}) => {
  if (!isOpen) return null;

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const diff = actualCash - theoreticalCash;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal-dialog z-report-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal-header">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-teal-700" />
            <h2 className="pos-modal-title">Báo Cáo Kết Ca Z-Report K80</h2>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pos-modal-body z-report-body" style={{ background: '#f8fafc', padding: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Phiếu in K80 380px */}
          <div className="z-report-paper" id="z-report-print-area">
            <div className="text-center mb-3">
              <div className="font-bold text-xs tracking-wider text-slate-800 uppercase">HỆ THỐNG TẠP HÓA MT-GRMS</div>
              <div className="text-[11.5px] text-slate-500 mt-0.5">
                {shiftInfo.branchName} &bull; {shiftInfo.posMachine}
              </div>
              <h3 className="font-bold text-sm tracking-wider uppercase text-teal-800 mt-2">BÁO CÁO KẾT CA (Z-REPORT)</h3>
              <div className="text-[11.5px] font-mono text-slate-500 font-medium mt-0.5">Mã ca: #{shiftInfo.shiftCode}</div>
            </div>

            <div className="z-report-divider" />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Thu ngân:</span>
                <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>
                  {shiftInfo.cashierName} ({shiftInfo.cashierCode})
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Giám sát:</span>
                <span className="text-slate-700 whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>{shiftInfo.supervisorName}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Giờ mở ca:</span>
                <span className="font-mono text-slate-700 whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>{shiftInfo.startTime}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-1 min-w-0">Thời gian trực:</span>
                <span className="text-slate-700 font-medium whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>{shiftInfo.durationText}</span>
              </div>
            </div>

            <div className="z-report-divider" />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2 font-bold text-slate-800">
                <span className="flex-1 min-w-0">Tiền đầu ca (Float):</span>
                <span className="font-mono tabular-nums whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>
                  {initialFloat.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {revenues.map((r) => (
                <div key={r.id} className="flex justify-between items-center gap-2 text-slate-700">
                  <span className="text-slate-600 truncate flex-1 min-w-0" title={`${r.methodName} (${r.orderCount} HĐ)`}>
                    {r.methodName} <span className="text-slate-400">({r.orderCount} HĐ)</span>:
                  </span>
                  <span className="font-mono tabular-nums whitespace-nowrap font-medium text-slate-800 shrink-0" style={{ flexShrink: 0 }}>
                    {r.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ))}
            </div>

            <div className="z-report-divider" />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2 font-bold text-sm text-teal-800 pb-1.5 border-b border-dashed border-slate-300">
                <span className="flex-1 min-w-0">TỔNG DOANH THU:</span>
                <span className="font-mono tabular-nums whitespace-nowrap shrink-0" style={{ flexShrink: 0 }}>
                  {totalRevenue.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-slate-700 pt-0.5">
                <span className="flex-1 min-w-0">Tiền két lý thuyết:</span>
                <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-slate-800 shrink-0" style={{ flexShrink: 0 }}>
                  {theoreticalCash.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-slate-700">
                <span className="flex-1 min-w-0">Tiền thực kiểm đếm:</span>
                <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-slate-800 shrink-0" style={{ flexShrink: 0 }}>
                  {actualCash.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 font-bold pt-1.5 border-t border-dashed border-slate-300">
                <span className="flex-1 min-w-0">Chênh lệch két:</span>
                <span
                  className={`font-mono tabular-nums whitespace-nowrap shrink-0 ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-amber-600' : 'text-rose-600'}`}
                  style={{ flexShrink: 0 }}
                >
                  {diff === 0 ? '0 đ (Khớp 100%)' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} đ`}
                </span>
              </div>
            </div>

            <div className="z-report-divider" />

            <div className="text-center text-[11px] text-slate-500 mt-2 space-y-0.5">
              <div className="font-mono">Thời gian in: {new Date().toLocaleString('vi-VN')}</div>
              <div className="italic text-slate-400">--- Chúc một ngày làm việc hiệu quả ---</div>
            </div>
          </div>
        </div>

        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary-pill" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="pos-btn-primary-pill" onClick={handlePrint}>
            <Printer size={15} />
            <span>In Bill K80</span>
          </button>
        </div>
      </div>
    </div>
  );
};
