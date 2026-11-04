import type { FC } from 'react';
import {
  CheckCircle2,
  Boxes,
  CreditCard,
  Barcode,
  Layers,
  ArrowRight,
  List,
  Printer,
  X,
} from 'lucide-react';
import type { PoStatusPreview } from '../../types/grn.types';

interface GrnDetailSuccessModalProps {
  isOpen: boolean;
  grnNo: string;
  poReference: string;
  supplierName: string;
  grandTotal: number;
  totalLabels: number;
  poStatusPreview: PoStatusPreview;
  onClose: () => void;
  onGoToList: () => void;
  onPrintGrn: () => void;
  onPrintLabels: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};

export const GrnDetailSuccessModal: FC<GrnDetailSuccessModalProps> = ({
  isOpen,
  grnNo,
  poReference,
  supplierName,
  grandTotal,
  totalLabels,
  poStatusPreview,
  onClose,
  onGoToList,
  onPrintGrn,
  onPrintLabels,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          maxWidth: 580,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #99f6e4',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#f0fdfa',
            borderBottom: '1px solid #ccfbf1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f766e' }}>
                ĐÃ DUYỆT PHIẾU NHẬP KHO THÀNH CÔNG!
              </h3>
              <span style={{ fontSize: 12, color: '#475569' }}>
                Mã phiếu: <strong>{grnNo}</strong> · PO: <strong>{poReference}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content with check points */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13,
              color: '#1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Boxes size={18} color="#16a34a" />
              <span>
                <strong>Tồn kho đã được cộng</strong> &amp; các lô hàng FEFO đã được ghi nhận vào thẻ kho chi nhánh.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CreditCard size={18} color="#0f766e" />
              <span>
                <strong>Sổ nợ AP {formatCurrency(grandTotal)}</strong> đã được cập nhật ghi nợ cho nhà cung cấp{' '}
                <strong>{supplierName}</strong>.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Barcode size={18} color="#0284c7" />
              <span>
                Đã gửi lệnh in <strong>{totalLabels} tem giá / mã vạch</strong> dán kệ đến máy in.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={18} color="#7c3aed" />
              <span>
                Trạng thái đơn PO ({poReference}):{' '}
                <strong style={{ color: poStatusPreview === 'COMPLETED' ? '#15803d' : '#b45309' }}>
                  {poStatusPreview === 'COMPLETED'
                    ? 'COMPLETED (Đã đóng tất cả dòng)'
                    : 'PARTIALLY_RECEIVED (Còn thiếu hàng - PO tiếp tục mở)'}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick print row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onPrintGrn}
              className="po-btn po-btn-outline"
              style={{ flex: 1, height: 38, fontSize: 13, gap: 6 }}
            >
              <Printer size={15} color="#0f766e" />
              <span>In phiếu nhập kho A4</span>
            </button>

            <button
              type="button"
              onClick={onPrintLabels}
              className="po-btn po-btn-outline"
              style={{ flex: 1, height: 38, fontSize: 13, gap: 6 }}
            >
              <Barcode size={15} color="#0f766e" />
              <span>Xem trước {totalLabels} tem in</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="po-btn po-btn-outline"
            style={{ height: 36, padding: '0 14px', fontSize: 13 }}
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={onGoToList}
            className="po-btn po-btn-primary"
            style={{
              height: 36,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 700,
              gap: 6,
              backgroundColor: '#0f766e',
              borderColor: '#0f766e',
            }}
          >
            <List size={15} />
            <span>Về danh sách phiếu nhập</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
