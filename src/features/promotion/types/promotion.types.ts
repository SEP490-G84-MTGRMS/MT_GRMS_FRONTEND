/**
 * Data Transfer Objects (DTOs) for Promotion, Voucher/Coupon, and Loyalty Management
 * Designed for seamless mapping to backend models (C# / .NET / Java / NestJS)
 */

export type PromotionType = 'ORDER_DISCOUNT' | 'BUY_X_GET_Y' | 'PRODUCT_DISCOUNT';
export type PromotionStatus = 'ACTIVE' | 'UPCOMING' | 'PAUSED' | 'EXPIRED';
export type VoucherDiscountType = 'FIXED_AMOUNT' | 'PERCENT';
export type VoucherBatchStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'DEPLETED';
export type VoucherCodeStatus = 'UNUSED' | 'USED' | 'EXPIRED' | 'LOCKED';
export type PointLedgerType = 'EARN_PURCHASE' | 'REDEEM_PURCHASE' | 'MANUAL_ADJUST_ADD' | 'MANUAL_ADJUST_SUB' | 'EXPIRED';

/**
 * Promotion Tier DTO
 * C# Equivalent: PromotionTierDto
 */
export class PromotionTierDTO {
  id: string = '';
  tierLevel: number = 1;
  minOrderValue?: number; // C#: decimal? MinOrderValue (Cho chiết khấu đơn: Đơn từ X đ)
  discountType: 'PERCENT' | 'FIXED_AMOUNT' = 'PERCENT'; // C#: string DiscountType
  discountValue: number = 0; // C#: decimal DiscountValue (% hoặc số tiền)
  maxDiscount?: number; // C#: decimal? MaxDiscount (Giảm tối đa nếu là %)
  requiredQty?: number; // C#: int? RequiredQty (Mua X)
  giftProductName?: string; // C#: string? GiftProductName (Tặng Y)
  giftProductSku?: string; // C#: string? GiftProductSku
  giftQty?: number; // C#: int? GiftQty

  constructor(init?: Partial<PromotionTierDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Promotion Campaign Item DTO
 * C# Equivalent: PromotionItemDto / PromotionCampaignDto
 */
export class PromotionItemDTO {
  id: string = '';
  code: string = '';
  name: string = '';
  type: PromotionType = 'ORDER_DISCOUNT';
  startDate: string = '';
  endDate: string = '';
  status: PromotionStatus = 'ACTIVE';
  branches: string[] = ['ALL'];
  tiers: PromotionTierDTO[] = [];
  usageCount: number = 0;
  budgetLimit?: number;
  totalDiscountGiven: number = 0;
  description?: string;
  createdAt: string = '';

  constructor(init?: Partial<PromotionItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Voucher Code Item DTO
 * C# Equivalent: VoucherCodeItemDto / CouponCodeDto
 */
export class VoucherCodeItemDTO {
  id: string = '';
  code: string = '';
  status: VoucherCodeStatus = 'UNUSED';
  customerName?: string;
  customerPhone?: string;
  usedAt?: string;
  orderCode?: string;
  createdAt: string = '';

  constructor(init?: Partial<VoucherCodeItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Voucher Batch Release Item DTO
 * C# Equivalent: VoucherBatchDto / VoucherCampaignDto
 */
export class VoucherBatchItemDTO {
  id: string = '';
  batchCode: string = '';
  name: string = '';
  discountType: VoucherDiscountType = 'FIXED_AMOUNT';
  discountValue: number = 0;
  minOrderValue: number = 0;
  maxDiscount?: number;
  totalQuantity: number = 0;
  usedQuantity: number = 0;
  startDate: string = '';
  endDate: string = '';
  status: VoucherBatchStatus = 'ACTIVE';
  prefix: string = '';
  codes: VoucherCodeItemDTO[] = [];
  description?: string;

  constructor(init?: Partial<VoucherBatchItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Customer Membership Tier Rule DTO
 * C# Equivalent: MembershipTierRuleDto / CustomerTierPolicyDto
 */
export class MembershipTierRuleDTO {
  id: string = '';
  tierCode: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' = 'BRONZE';
  tierName: string = '';
  minSpending: number = 0; // C#: decimal MinSpending (Chi tiêu tích lũy tối thiểu VNĐ)
  pointMultiplier: number = 1.0; // C#: decimal PointMultiplier (Hệ số nhân điểm 1.0, 1.2, 1.5, 2.0)
  benefitsDescription: string = '';
  colorHex: string = '';

  constructor(init?: Partial<MembershipTierRuleDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Loyalty System Configuration DTO
 * C# Equivalent: LoyaltySystemConfigDto / LoyaltySettingDto
 */
export class LoyaltySystemConfigDTO {
  isEnabled: boolean = true;
  earningRateAmount: number = 10000; // Số tiền để được điểm (10,000 đ = 1 điểm)
  earningPoints: number = 1;
  redemptionRatePoints: number = 1;
  redemptionRateAmount: number = 1000; // 1 điểm = 1,000 đ
  minRedemptionPoints: number = 20; // Điểm tối thiểu để đổi
  pointsExpiryMonths: number = 12; // 0 = không hết hạn
  allowPointsWithPromotions: boolean = false;
  tiers: MembershipTierRuleDTO[] = [];

  constructor(init?: Partial<LoyaltySystemConfigDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Loyalty Point Ledger Item DTO (Sổ cái tích/tiêu điểm)
 * C# Equivalent: PointLedgerItemDto / LoyaltyTransactionDto
 */
export class PointLedgerItemDTO {
  id: string = '';
  transactionCode: string = '';
  customerId: string = '';
  customerName: string = '';
  customerPhone: string = '';
  type: PointLedgerType = 'EARN_PURCHASE';
  pointsChanged: number = 0; // Dương = cộng, Âm = trừ
  balanceAfter: number = 0;
  orderCode?: string;
  reason: string = '';
  createdAt: string = '';
  createdBy: string = '';

  constructor(init?: Partial<PointLedgerItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Promotion Query Filter DTO
 * C# Equivalent: PromotionFilterQueryDto
 */
export class PromotionFilterStateDTO {
  searchTerm: string = '';
  type: string = 'ALL';
  status: string = 'ALL';
  branch: string = 'ALL';

  constructor(init?: Partial<PromotionFilterStateDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Voucher Query Filter DTO
 * C# Equivalent: VoucherFilterQueryDto
 */
export class VoucherFilterStateDTO {
  searchTerm: string = '';
  discountType: string = 'ALL';
  status: string = 'ALL';

  constructor(init?: Partial<VoucherFilterStateDTO>) {
    Object.assign(this, init);
  }
}

// ============================================================================
// Backwards Compatibility Type Aliases
// (Ensures all existing components compile seamlessly without breaking)
// ============================================================================
export type PromotionTier = PromotionTierDTO;
export type PromotionItem = PromotionItemDTO;
export type VoucherCodeItem = VoucherCodeItemDTO;
export type VoucherBatchItem = VoucherBatchItemDTO;
export type MembershipTierRule = MembershipTierRuleDTO;
export type LoyaltySystemConfig = LoyaltySystemConfigDTO;
export type PointLedgerItem = PointLedgerItemDTO;
export type PromotionFilterState = PromotionFilterStateDTO;
export type VoucherFilterState = VoucherFilterStateDTO;
