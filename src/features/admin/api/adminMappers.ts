import type { SubscriptionPlan, PlanStatus } from '../types/plan.types';
import type { Tenant, TenantStatus, LockType, PlanType } from '../types/admin.types';
import type { BackendPlanDto, BackendTenantSummaryDto, BackendTenantDetailDto } from './adminApi';

export function mapBackendPlanToFrontend(dto: BackendPlanDto): SubscriptionPlan {
  const status: PlanStatus = dto.status === 'ACTIVE' ? 'Active' : 'Inactive';

  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description || '',
    monthlyPrice: dto.monthlyPrice,
    yearlyPrice: dto.yearlyPrice,
    status,
    activeTenantCount: dto.activeTenantCount ?? 0,
    quotas: dto.quotas || {
      maxBranches: 1,
      maxEmployees: 3,
      maxStorageGb: 5,
      backupFrequency: 'Weekly',
    },
    features: dto.features || {
      fefoExpiryAlert: true,
      multiUnitConversion: true,
      vietQrDynamic: true,
      debtZaloBook: false,
      barcodeScanning: true,
      financialReporting: false,
    },
    tenants: dto.tenants || [],
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || dto.createdAt || new Date().toISOString(),
  };
}

export function mapBackendTenantToFrontend(dto: BackendTenantSummaryDto): Tenant {
  let status: TenantStatus = 'active';
  const st = (dto.status || '').toLowerCase();
  if (st === 'locked') status = 'locked';
  else if (st === 'grace' || st === 'grace_period') status = 'grace';
  else if (st === 'expiring') status = 'expiring';
  else if (st === 'pending') status = 'pending';
  else status = 'active';

  let lockType: LockType | undefined = undefined;
  if (dto.lockType) {
    const lt = dto.lockType.toLowerCase();
    if (lt === 'soft' || lt === 'hard') {
      lockType = lt;
    }
  }

  let plan: PlanType = 'basic';
  const p = (dto.plan || '').toLowerCase();
  if (p.includes('pro') || p.includes('growth') || p.includes('advanced')) {
    plan = 'advanced';
  } else if (p.includes('enterprise')) {
    plan = 'enterprise';
  }

  return {
    id: dto.id,
    subdomain: dto.subdomain,
    name: dto.name,
    taxCode: dto.taxCode || '',
    city: dto.city || '',
    ownerName: dto.ownerName || '',
    ownerEmail: dto.ownerEmail || '',
    ownerPhone: dto.ownerPhone || '',
    plan,
    branchCount: dto.branchCount ?? 0,
    maxBranches: dto.maxBranches === -1 ? 'unlimited' : (dto.maxBranches ?? 1),
    staffCount: dto.staffCount ?? 0,
    maxStaff: dto.maxStaff === -1 ? 'unlimited' : (dto.maxStaff ?? 5),
    expiryDate: dto.expiryDate ? dto.expiryDate.split('T')[0] : '',
    status,
    lockType,
    graceDaysRemaining: dto.graceDaysRemaining ?? undefined,
    daysUntilExpiry: dto.daysUntilExpiry ?? undefined,
  };
}

export function mapBackendTenantDetailToFrontend(dto: BackendTenantDetailDto): Tenant {
  let status: TenantStatus = 'active';
  const st = (dto.status || '').toLowerCase();
  if (st === 'locked') status = 'locked';
  else if (st === 'grace' || st === 'grace_period') status = 'grace';
  else if (st === 'expiring') status = 'expiring';
  else if (st === 'pending') status = 'pending';
  else status = 'active';

  let lockType: LockType | undefined = undefined;
  if (dto.lockType) {
    const lt = dto.lockType.toLowerCase();
    if (lt === 'soft' || lt === 'hard') {
      lockType = lt;
    }
  }

  let plan: PlanType = 'basic';
  const p = (dto.planName || dto.currentPlan || '').toLowerCase();
  if (p.includes('pro') || p.includes('growth') || p.includes('advanced')) {
    plan = 'advanced';
  } else if (p.includes('enterprise')) {
    plan = 'enterprise';
  }

  return {
    id: dto.id,
    subdomain: dto.subdomain,
    name: dto.name,
    taxCode: dto.taxCode || '',
    city: dto.city || '',
    ownerName: dto.name,
    ownerEmail: `admin@${dto.subdomain}.mtgrms.vn`,
    ownerPhone: dto.hotline || '',
    plan,
    branchCount: dto.branchCount ?? (dto.branches ? dto.branches.length : 1),
    maxBranches: dto.maxBranches === -1 ? 'unlimited' : (dto.maxBranches ?? 1),
    staffCount: dto.staffCount ?? 5,
    maxStaff: dto.maxStaff === -1 ? 'unlimited' : (dto.maxStaff ?? 10),
    expiryDate: dto.subscriptionExpiresAt ? dto.subscriptionExpiresAt.split('T')[0] : '',
    status,
    lockType,
    graceDaysRemaining: 7,
    daysUntilExpiry: 30,
  };
}
