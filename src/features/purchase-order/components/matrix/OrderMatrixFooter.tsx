import type { FC } from 'react';
import { Save } from 'lucide-react';

interface OrderMatrixFooterProps {
  grandTotalQty?: number;
  grandTotalAmt?: number;
  creditExceed?: boolean;
  moqFailsCount?: number;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSaveDraft: () => void;
  onSubmitPOs?: () => void;
}

export const OrderMatrixFooter: FC<OrderMatrixFooterProps> = ({ onSaveDraft }) => {
  return (
    <div className="po-footer-bar" style={{ justifyContent: 'flex-end' }}>
      <button
        type="button"
        onClick={onSaveDraft}
        className="po-btn po-btn-primary"
        style={{ minWidth: 100 }}
        title="Lưu ma trận đặt hàng"
      >
        <Save size={15} />
        <span>Lưu</span>
      </button>
    </div>
  );
};

export default OrderMatrixFooter;
