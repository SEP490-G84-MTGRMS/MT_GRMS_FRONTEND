import type { FC } from 'react';
import { CheckCircle2, Clock, FileCheck, Send } from 'lucide-react';
import type { TaxSnapshotStatus } from '../types/taxSnapshot';

interface Props {
  status: TaxSnapshotStatus;
}

export const TaxSnapshotStatusBadge: FC<Props> = ({ status }) => {
  switch (status) {
    case 'Draft':
      return (
        <span className="tax-badge tax-badge-draft">
          <Clock size={13} />
          <span>Nháp (Draft)</span>
        </span>
      );
    case 'Finalized':
      return (
        <span className="tax-badge tax-badge-finalized">
          <FileCheck size={13} />
          <span>Đã chốt số liệu</span>
        </span>
      );
    case 'Submitted':
      return (
        <span className="tax-badge tax-badge-submitted">
          <Send size={13} />
          <span>Đã nộp tờ khai</span>
        </span>
      );
    case 'Paid':
      return (
        <span className="tax-badge tax-badge-paid">
          <CheckCircle2 size={13} />
          <span>Đã nộp thuế</span>
        </span>
      );
    default:
      return null;
  }
};
