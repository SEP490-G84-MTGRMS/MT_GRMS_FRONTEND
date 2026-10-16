// src/pages/store/components/SubscriptionPricingCards.tsx
import { useState, type FC } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanItem } from '../storeData';

interface SubscriptionPricingCardsProps {
  onSelectPlan: (plan: SubscriptionPlanItem) => void;
}

export const SubscriptionPricingCards: FC<SubscriptionPricingCardsProps> = ({
  onSelectPlan,
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (planId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  return (
    <div className="pricing-cards-grid">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isExpanded = !!expandedCards[plan.id];
        // Display top 6 features by default, or all if expanded
        const displayedFeatures = isExpanded
          ? plan.features
          : plan.features.slice(0, 6);

        return (
          <div
            key={plan.id}
            className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}
          >
            <div>
              {/* Card Title */}
              <div className="pricing-card-title">{plan.name}</div>

              {/* Price Row */}
              <div className="pricing-card-price-row">
                <span className="pricing-card-price">
                  {new Intl.NumberFormat('vi-VN').format(plan.monthlyPrice)}
                </span>
                <span className="pricing-card-currency">đ</span>
              </div>

              {/* Tagline */}
              <div className="pricing-card-tagline">{plan.tagline}</div>

              {/* Branch / Warehouse Notes */}
              <div style={{ minHeight: 48, marginBottom: 12 }}>
                <div className="pricing-addon-note">{plan.branchNote}</div>
                {plan.warehouseNote && (
                  <div className="pricing-addon-note" style={{ color: '#475569' }}>
                    {plan.warehouseNote}
                  </div>
                )}
              </div>

              {/* Features List */}
              <ul className="pricing-feature-list">
                {displayedFeatures.map((feat, idx) => (
                  <li key={idx} className="pricing-feature-item">
                    <Check
                      size={17}
                      strokeWidth={2.2}
                      color="#0066FF"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Expand / Collapse Button */}
              {plan.features.length > 6 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(plan.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    margin: '0 auto 20px auto',
                    padding: '4px 8px',
                  }}
                >
                  <span>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                  {isExpanded ? (
                    <ChevronUp size={15} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={15} strokeWidth={2} />
                  )}
                </button>
              )}
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="pricing-cta-button"
              style={{
                backgroundColor: plan.buttonBg,
                color: plan.buttonText,
              }}
              onClick={() => onSelectPlan(plan)}
            >
              Mua ngay
            </button>
          </div>
        );
      })}
    </div>
  );
};
