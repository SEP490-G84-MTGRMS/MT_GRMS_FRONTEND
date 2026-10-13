import type { FC } from 'react';
import type { CronJob } from '../../types/admin.types';

interface CronjobMonitorCardProps {
  jobs: CronJob[];
}

export const CronjobMonitorCard: FC<CronjobMonitorCardProps> = ({ jobs }) => {
  return (
    <div className="admin-card-box">
      <div className="admin-card-box-header">
        <div>
          <div className="admin-card-box-title">Giám sát 4 Tác vụ Tự động (Cronjobs)</div>
          <div className="admin-card-box-sub">Tình trạng thực thi định kỳ của hệ thống máy chủ</div>
        </div>
      </div>

      <div className="admin-cron-grid">
        {jobs.map((j) => (
          <div key={j.id} className="admin-cron-card">
            <span className="admin-cron-code">{j.code}</span>
            <span className="admin-cron-name">{j.name}</span>
            <span className="admin-cron-status">
              <span className="admin-status-dot" /> {j.schedule} ({j.statusText})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
