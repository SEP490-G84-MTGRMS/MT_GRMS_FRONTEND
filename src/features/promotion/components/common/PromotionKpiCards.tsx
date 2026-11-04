import type { FC, ReactNode } from 'react';

export interface KpiCardItem {
  id: string;
  title: string;
  value: string | number;
  subText?: string;
  icon: ReactNode;
  colorClass?: 'kpi-icon-teal' | 'kpi-icon-blue' | 'kpi-icon-amber' | 'kpi-icon-purple';
}

interface PromotionKpiCardsProps {
  cards: KpiCardItem[];
}

export const PromotionKpiCards: FC<PromotionKpiCardsProps> = ({ cards }) => {
  return (
    <div className="promotion-kpi-grid">
      {cards.map((card) => (
        <div key={card.id} className="promotion-kpi-card">
          <div className="promotion-kpi-info">
            <h4>{card.title}</h4>
            <div className="promotion-kpi-val">{card.value}</div>
            {card.subText && <div className="promotion-kpi-sub">{card.subText}</div>}
          </div>
          <div className={`promotion-kpi-icon ${card.colorClass || 'kpi-icon-teal'}`}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
