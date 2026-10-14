import type { FC } from 'react';
import { Save, Settings, Award } from 'lucide-react';
import type { LoyaltySystemConfig } from '../../types/promotion.types';

interface LoyaltyConfigFormProps {
  config: LoyaltySystemConfig;
  onChange: (newConfig: LoyaltySystemConfig) => void;
  onSave: () => void;
}

export const LoyaltyConfigForm: FC<LoyaltyConfigFormProps> = ({
  config,
  onChange,
  onSave,
}) => {
  const handleToggleEnable = () => {
    onChange({ ...config, isEnabled: !config.isEnabled });
  };

  const handleUpdateField = (field: keyof LoyaltySystemConfig, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const handleUpdateTierMultiplier = (index: number, multiplier: number) => {
    const nextTiers = [...config.tiers];
    nextTiers[index] = { ...nextTiers[index], pointMultiplier: multiplier };
    onChange({ ...config, tiers: nextTiers });
  };

  const handleUpdateTierMinSpending = (index: number, spending: number) => {
    const nextTiers = [...config.tiers];
    nextTiers[index] = { ...nextTiers[index], minSpending: spending };
    onChange({ ...config, tiers: nextTiers });
  };

  return (
    <div className="promotion-card" style={{ height: 'fit-content' }}>
      <div className="promotion-card-header">
        <h3 className="promotion-card-title">
          <Settings size={18} color="#0F766E" />
          <span>Cấu hình tích điểm & Hạng thành viên</span>
        </h3>

        <div
          className="switch-container"
          onClick={handleToggleEnable}
          title={config.isEnabled ? 'Tắt tính năng tích điểm' : 'Bật tính năng tích điểm'}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            {config.isEnabled ? 'Đang kích hoạt' : 'Đang tạm tắt'}
          </span>
          <div className={`switch-track ${config.isEnabled ? 'switch-active' : ''}`}>
            <div className="switch-thumb" />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* 1. Quy tắc tích lũy */}
        <div style={{ marginBottom: 20 }}>
          <h4 className="loyalty-section-title">
            1. Quy tắc cộng điểm từ đơn hàng
          </h4>
          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Chi tiêu để nhận 1 điểm (VNĐ)
              </label>
              <input
                type="number"
                value={config.earningRateAmount}
                onChange={(e) => handleUpdateField('earningRateAmount', Number(e.target.value))}
                className="form-input"
                style={{ fontWeight: 600, fontSize: '0.88rem' }}
                disabled={!config.isEnabled}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Mặc định: 10,000 đ = 1 điểm tích lũy
              </span>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Thời hạn sử dụng điểm (Tháng)
              </label>
              <input
                type="number"
                value={config.pointsExpiryMonths}
                onChange={(e) => handleUpdateField('pointsExpiryMonths', Number(e.target.value))}
                className="form-input"
                style={{ fontWeight: 600, fontSize: '0.88rem' }}
                disabled={!config.isEnabled}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Nhập 0 nếu điểm không bao giờ hết hạn
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quy tắc tiêu điểm */}
        <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <h4 className="loyalty-section-title">
            2. Quy tắc tiêu điểm / Đổi thưởng tại quầy
          </h4>
          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Giá trị quy đổi (1 điểm = VNĐ)
              </label>
              <input
                type="number"
                value={config.redemptionRateAmount}
                onChange={(e) => handleUpdateField('redemptionRateAmount', Number(e.target.value))}
                className="form-input"
                style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F766E' }}
                disabled={!config.isEnabled}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Mặc định: 1 điểm trừ 1,000 đ vào hóa đơn
              </span>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Điểm tối thiểu để tiêu điểm
              </label>
              <input
                type="number"
                value={config.minRedemptionPoints}
                onChange={(e) => handleUpdateField('minRedemptionPoints', Number(e.target.value))}
                className="form-input"
                style={{ fontWeight: 600, fontSize: '0.88rem' }}
                disabled={!config.isEnabled}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Khách cần đạt từ {config.minRedemptionPoints} điểm để thanh toán
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
              <input
                type="checkbox"
                checked={config.allowPointsWithPromotions}
                onChange={(e) => handleUpdateField('allowPointsWithPromotions', e.target.checked)}
                disabled={!config.isEnabled}
                style={{ width: 16, height: 16, accentColor: '#0F766E' }}
              />
              <span>Cho phép tiêu điểm song song với các chương trình khuyến mãi khác</span>
            </label>
          </div>
        </div>

        {/* 3. Thiết lập 4 hạng thẻ */}
        <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0', marginBottom: 20 }}>
          <h4 className="loyalty-section-title">
            <Award size={15} color="#0F766E" />
            <span>3. Thiết lập hệ số nhân điểm theo hạng thẻ</span>
          </h4>

          <div>
            {config.tiers.map((tier, idx) => (
              <div key={tier.id} className="loyalty-tier-row">
                <div className="loyalty-tier-tag">
                  <div
                    className="loyalty-tier-dot"
                    style={{ backgroundColor: tier.colorHex }}
                  />
                  <span>{tier.tierName}</span>
                </div>

                <div className="loyalty-tier-inputs">
                  <div className="loyalty-input-group">
                    <span>Chi tiêu từ:</span>
                    <input
                      type="number"
                      value={tier.minSpending}
                      onChange={(e) => handleUpdateTierMinSpending(idx, Number(e.target.value))}
                      className="loyalty-input-spending"
                      disabled={!config.isEnabled || idx === 0}
                    />
                    <span>đ</span>
                  </div>

                  <div className="loyalty-input-group">
                    <span>Nhân:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={tier.pointMultiplier}
                      onChange={(e) => handleUpdateTierMultiplier(idx, Number(e.target.value))}
                      className="loyalty-input-multiplier"
                      disabled={!config.isEnabled}
                    />
                    <span>lần</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={onSave}
            className="btn-primary-pill"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!config.isEnabled}
          >
            <Save size={16} />
            <span>Lưu thiết lập chính sách tích điểm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
