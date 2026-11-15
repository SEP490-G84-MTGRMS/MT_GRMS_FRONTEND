export interface PlatformSetting {
  id: number;
  trialDays: number;
  gracePeriodDays: number;
  branchAddonPriceMonthly: number;
  storageAddonPricePerGbMonthly: number;
  masterBankCode: string;
  masterBankName: string;
  masterAccountNumber: string;
  masterAccountName: string;
  supportHotline: string;
  supportEmail: string;
  supportZalo: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string | null;
  maintenanceExpectedEndTime?: string | null;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface UpdatePlatformSettingPayload {
  trialDays: number;
  gracePeriodDays: number;
  branchAddonPriceMonthly: number;
  storageAddonPricePerGbMonthly: number;
  masterBankCode: string;
  masterBankName: string;
  masterAccountNumber: string;
  masterAccountName: string;
  supportHotline: string;
  supportEmail: string;
  supportZalo: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string | null;
  maintenanceExpectedEndTime?: string | null;
}

export interface PlatformPublicConfig {
  defaultTrialDays: number;
  masterBankCode: string;
  masterBankName: string;
  masterAccountNumber: string;
  masterAccountName: string;
  supportHotline: string;
  supportEmail: string;
  supportZalo: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string | null;
  maintenanceExpectedEndTime?: string | null;
}
