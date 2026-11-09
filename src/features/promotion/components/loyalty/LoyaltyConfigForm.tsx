import type { FC } from 'react';
import { Coins, ArrowDownLeft, Sparkles, AlertCircle } from 'lucide-react';
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
                </strong>.
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
    </div>
  );
};
