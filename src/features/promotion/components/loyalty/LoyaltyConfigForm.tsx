import type { FC } from 'react';
import { Award, Coins, ArrowDownLeft, Sparkles, AlertCircle } from 'lucide-react';
import type { LoyaltySystemConfig } from '../../types/promotion.types';

interface LoyaltyConfigFormProps {
  config: LoyaltySystemConfig;
  onChange: (newConfig: LoyaltySystemConfig) => void;
  onSave: () => void;
}

export const LoyaltyConfigForm: FC<LoyaltyConfigFormProps> = ({
  config,
  onChange,
}) => {
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
    <div className="loyalty-config-container">
      {/* Alert Notice if loyalty is disabled */}
      {!config.isEnabled && (
        <div className="loyalty-disabled-notice">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>
            Tính năng tích điểm đang <strong>tạm tắt</strong>. Mọi đơn thanh toán tại POS sẽ không cộng hoặc trừ điểm. Bấm nút <strong>&quot;Tích điểm: Tắt&quot;</strong> ở góc trên bên phải để kích hoạt lại.
          </span>
        </div>
      )}

      {/* 2-Column Grid: Cộng điểm (Trái) & Tiêu điểm (Phải) */}
      <div className="loyalty-rules-grid">
        {/* Card 1: Quy tắc cộng điểm từ đơn hàng */}
        <div className="promotion-card loyalty-card">
          <div className="promotion-card-header loyalty-card-header-compact">
            <div className="flex items-center gap-2">
              <Coins size={18} color="#0F766E" />
              <h3 className="loyalty-card-title">1. Quy tắc cộng điểm từ đơn hàng</h3>
            </div>
          </div>

          <div className="loyalty-card-body">
            <div className="loyalty-fields-2col">
              {/* Field 1 */}
              <div className="loyalty-rule-field">
                <label className="loyalty-rule-label">Số tiền chi tiêu nhận 1 điểm</label>
                <div className="loyalty-input-wrapper">
                  <input
                    type="number"
                    value={config.earningRateAmount}
                    onChange={(e) => handleUpdateField('earningRateAmount', Number(e.target.value))}
                    className="loyalty-input-field font-bold"
                    disabled={!config.isEnabled}
                    min={1000}
                    step={1000}
                  />
                  <span className="loyalty-input-addon">đ = 1 điểm</span>
                </div>
                <span className="loyalty-rule-hint">Mặc định: 10.000 đ = 1 điểm tích lũy</span>
              </div>

              {/* Field 2 */}
              <div className="loyalty-rule-field">
                <label className="loyalty-rule-label">Thời hạn sử dụng điểm</label>
                <div className="loyalty-input-wrapper">
                  <input
                    type="number"
                    value={config.pointsExpiryMonths}
                    onChange={(e) => handleUpdateField('pointsExpiryMonths', Number(e.target.value))}
                    className="loyalty-input-field font-bold"
                    disabled={!config.isEnabled}
                    min={0}
                    step={1}
                  />
                  <span className="loyalty-input-addon">tháng</span>
                </div>
                <span className="loyalty-rule-hint">Nhập 0 nếu điểm có hiệu lực vĩnh viễn</span>
              </div>
            </div>

            {/* Example Box */}
            <div className="loyalty-example-box">
              <Sparkles size={15} className="example-box-icon" />
              <div className="example-box-text">
                <strong>Minh họa tích điểm:</strong> Đơn <strong>200.000 đ</strong> của khách sẽ được tích lũy{' '}
                <strong className="text-teal-700 font-bold">
                  +{Math.floor(200000 / (config.earningRateAmount || 10000))} điểm
                </strong> (hệ số chuẩn 1.0x).
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Quy tắc tiêu điểm / Đổi thưởng tại POS */}
        <div className="promotion-card loyalty-card">
          <div className="promotion-card-header loyalty-card-header-compact">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={18} color="#0F766E" />
              <h3 className="loyalty-card-title">2. Quy tắc tiêu điểm / Đổi thưởng tại POS</h3>
            </div>
          </div>

          <div className="loyalty-card-body">
            <div className="loyalty-fields-2col">
              {/* Field 1 */}
              <div className="loyalty-rule-field">
                <label className="loyalty-rule-label">Giá trị quy đổi tiền mặt</label>
                <div className="loyalty-input-wrapper">
                  <input
                    type="number"
                    value={config.redemptionRateAmount}
                    onChange={(e) => handleUpdateField('redemptionRateAmount', Number(e.target.value))}
                    className="loyalty-input-field font-bold text-teal-700"
                    disabled={!config.isEnabled}
                    min={100}
                    step={100}
                  />
                  <span className="loyalty-input-addon">VNĐ / 1 điểm</span>
                </div>
                <span className="loyalty-rule-hint">1 điểm trừ trực tiếp vào bill thanh toán</span>
              </div>

              {/* Field 2 */}
              <div className="loyalty-rule-field">
                <label className="loyalty-rule-label">Mức điểm tối thiểu để đổi</label>
                <div className="loyalty-input-wrapper">
                  <input
                    type="number"
                    value={config.minRedemptionPoints}
                    onChange={(e) => handleUpdateField('minRedemptionPoints', Number(e.target.value))}
                    className="loyalty-input-field font-bold"
                    disabled={!config.isEnabled}
                    min={1}
                    step={1}
                  />
                  <span className="loyalty-input-addon">điểm</span>
                </div>
                <span className="loyalty-rule-hint">Tối thiểu {config.minRedemptionPoints} điểm mới được cấn trừ</span>
              </div>
            </div>

            {/* Checkbox Box */}
            <div className="loyalty-checkbox-box">
              <label className="loyalty-checkbox-label">
                <input
                  type="checkbox"
                  checked={config.allowPointsWithPromotions}
                  onChange={(e) => handleUpdateField('allowPointsWithPromotions', e.target.checked)}
                  disabled={!config.isEnabled}
                  className="loyalty-custom-checkbox"
                />
                <span>Cho phép tiêu điểm song song với các Voucher &amp; CTKM khác</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Khối 4 Hạng thẻ thành viên */}
      <div className="promotion-card loyalty-card" id="membership-tiers-section">
        <div className="promotion-card-header loyalty-card-header-compact">
          <div className="flex items-center gap-2">
            <Award size={18} color="#0F766E" />
            <div>
              <h3 className="loyalty-card-title">
                3. Chính sách 4 Hạng thẻ thành viên &amp; Hệ số nhân điểm
              </h3>
              <p className="loyalty-card-subtitle">
                Khách hàng tự động thăng hạng khi đạt mốc chi tiêu tích lũy. Hạng thẻ cao hơn được nhân hệ số tích điểm nhanh hơn.
              </p>
            </div>
          </div>
        </div>

        <div className="loyalty-card-body p-0">
          <div className="table-responsive">
            <table className="promotion-table loyalty-tiers-table">
              <thead>
                <tr>
                  <th style={{ width: 190 }}>Hạng thành viên</th>
                  <th style={{ width: 250 }}>Mốc chi tiêu tích lũy</th>
                  <th style={{ width: 160 }}>Hệ số nhân điểm</th>
                  <th>Quyền lợi &amp; Ưu đãi áp dụng</th>
                </tr>
              </thead>
              <tbody>
                {config.tiers.map((tier, idx) => (
                  <tr key={tier.id}>
                    <td>
                      <div
                        className="loyalty-tier-badge"
                        style={{ backgroundColor: `${tier.colorHex}18`, color: tier.colorHex }}
                      >
                        <div className="loyalty-tier-dot" style={{ backgroundColor: tier.colorHex }} />
                        <span>{tier.tierName}</span>
                      </div>
                    </td>

                    <td>
                      {idx === 0 ? (
                        <div className="tier-default-spending">
                          <span className="font-bold text-slate-800 text-sm">0 đ</span>
                          <span className="text-xs text-teal-600 font-medium">(Mặc định khi đăng ký)</span>
                        </div>
                      ) : (
                        <div className="loyalty-input-wrapper" style={{ maxWidth: 190 }}>
                          <input
                            type="number"
                            value={tier.minSpending}
                            onChange={(e) => handleUpdateTierMinSpending(idx, Number(e.target.value))}
                            className="loyalty-input-field text-right font-bold text-slate-800"
                            disabled={!config.isEnabled}
                            step={500000}
                            min={0}
                          />
                          <span className="loyalty-input-addon">đ</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="loyalty-input-wrapper" style={{ maxWidth: 130 }}>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          value={tier.pointMultiplier}
                          onChange={(e) => handleUpdateTierMultiplier(idx, Number(e.target.value))}
                          className="loyalty-input-field text-center font-bold text-sm"
                          style={{ color: tier.colorHex }}
                          disabled={!config.isEnabled}
                        />
                        <span className="loyalty-input-addon">lần</span>
                      </div>
                    </td>

                    <td>
                      <span className="tier-benefits-desc">
                        {tier.benefitsDescription}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
