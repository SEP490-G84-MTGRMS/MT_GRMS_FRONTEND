import type { FC } from 'react';
import type { TaxSnapshotStatus } from '../types/taxSnapshot';

interface Props {
  status: TaxSnapshotStatus;
}

export const TaxSnapshotStatusBadge: FC<Props> = ({ status }) => {
  switch (status) {
    case 'Draft':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          Nháp (Draft)
        </span>
      );
    case 'Finalized':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Đã chốt số liệu
        </span>
      );
    case 'Submitted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          Đã nộp tờ khai
        </span>
      );
    case 'Paid':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Đã nộp thuế
        </span>
      );
    default:
      return null;
  }
};
