import type { FC } from 'react';
import type { SupplierDeliveryConfig } from '../../types/po.types';
import { Info, Clock, Lock, Calendar } from 'lucide-react';

interface OrderMatrixSupplierInfoProps {
  supplierName: string;
  config: SupplierDeliveryConfig;
}

export const OrderMatrixSupplierInfo: FC<OrderMatrixSupplierInfoProps> = ({
  supplierName,
  config,
}) => {
  return (
    <div className="po-supplier-info-line">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Info size={15} style={{ flexShrink: 0, color: 'var(--blue-primary)' }} />
        <b>Quy tắc giao hàng &amp; Chốt đơn ({supplierName}):</b>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={13} />
          Lead time: <b>{config.leadDays} ngày</b>
        </span>
        <span>•</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Clock size={13} />
          Cutoff chốt đơn: <b>{config.cutoffHour}</b> (ngày trước ngày giao)
        </span>
        <span>•</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Lock size={13} />
          Khóa chốt sửa đơn: <b>{config.lockHour}</b> (ngày trước ngày giao)
        </span>
      </div>
      {config.deliveryNote && (
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          <i>* {config.deliveryNote}</i>
        </div>
      )}
    </div>
  );
};
