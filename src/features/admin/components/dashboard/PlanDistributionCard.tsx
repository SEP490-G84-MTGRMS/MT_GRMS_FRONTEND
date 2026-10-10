import type { FC } from 'react';
import type { PlanDistribution } from '../../types/admin.types';

interface PlanDistributionCardProps {
  plans: PlanDistribution[];
  onDetailClick?: () => void;
}

export const PlanDistributionCard: FC<PlanDistributionCardProps> = ({ plans, onDetailClick }) => {
  return (
    <div className="admin-card-box">
      <div className="admin-card-box-header">
        <div>
          <div className="admin-card-box-title">Cơ cấu Doanh số theo Gói Dịch vụ</div>
          <div className="admin-card-box-sub">Tỷ trọng tenant và doanh thu theo 3 gói cước tiêu chuẩn</div>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-secondary"
          onClick={onDetailClick}
        >
          Chi tiết gói &rarr;
        </button>
      </div>

      <div className="admin-plan-list">
        {plans.map((p) => (
          <div key={p.id} className="admin-plan-item">
            <div className="admin-plan-info">
              <b>{p.planName}</b>
              <span>{p.subtitle}</span>
            </div>
            <div className="admin-progress-track">
              <div
                className="admin-progress-fill"
                style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
