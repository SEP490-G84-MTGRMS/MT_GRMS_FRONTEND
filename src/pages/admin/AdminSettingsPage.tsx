import { fitsDecimal, validHotline } from '../../features/admin/utils/adminInputValidation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, RotateCcw, Clock } from 'lucide-react';
import { settingsApi } from '../../features/admin/api';
import type { PlatformSetting, UpdatePlatformSettingPayload } from '../../features/admin/types/settings.types';
import {
  PlatformSettingsHeader, SubscriptionPolicyCard, MasterBeneficiaryCard,
  SupportContactCard, MaintenanceModeCard, SettingsSummarySidebar,
} from '../../features/admin/components/settings';
import { AdminToast, type ToastState } from '../../features/admin/components';
import './adminPlans.css';
import './adminSettings.css';

const emptyForm: UpdatePlatformSettingPayload = {
  trialDays: 3, gracePeriodDays: 7, branchAddonPriceMonthly: 0, storageAddonPricePerGbMonthly: 0,
  masterBankCode: '', masterBankName: '', masterAccountNumber: '', masterAccountName: '',
  supportHotline: '', supportEmail: '', supportZalo: '', isMaintenanceMode: false,
  maintenanceMessage: '', maintenanceExpectedEndTime: null,
};

const toPayload = (setting: PlatformSetting): UpdatePlatformSettingPayload => ({
  trialDays: setting.trialDays, gracePeriodDays: setting.gracePeriodDays,
  branchAddonPriceMonthly: setting.branchAddonPriceMonthly,
  storageAddonPricePerGbMonthly: setting.storageAddonPricePerGbMonthly,
  masterBankCode: setting.masterBankCode, masterBankName: setting.masterBankName,
  masterAccountNumber: setting.masterAccountNumber, masterAccountName: setting.masterAccountName,
  supportHotline: setting.supportHotline, supportEmail: setting.supportEmail, supportZalo: setting.supportZalo,
  isMaintenanceMode: setting.isMaintenanceMode,
  maintenanceMessage: setting.maintenanceMessage ?? '',
  maintenanceExpectedEndTime: setting.maintenanceExpectedEndTime ?? null,
});

export const AdminSettingsPage = () => {
  const [settings, setSettings] = useState<PlatformSetting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestRef = useRef(0);
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(originalForm), [form, originalForm]);

  const fetchSettings = useCallback(async () => {
    const request = ++requestRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await settingsApi.getSettings();
      if (request !== requestRef.current) return;
      if (!response.success || !response.data) throw new Error(response.message || 'Không tải được cấu hình nền tảng.');
      setSettings(response.data);
      const payload = toPayload(response.data);
      setForm(payload);
      setOriginalForm(payload);
    } catch {
      if (request === requestRef.current) setLoadError('Không tải được cấu hình nền tảng. Vui lòng thử lại.');
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
    return () => { requestRef.current++; };
  }, [fetchSettings]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleChange = (field: keyof UpdatePlatformSettingPayload, value: unknown) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setSaveError('');
  };
  const handleReset = () => { setForm(originalForm); setSaveError(''); };
  const requestSave = () => formRef.current?.requestSubmit();

  const handleSave = async () => {
    if (isSaving || !isDirty || !settings) return;
    const payload = { ...form,
      masterBankCode: form.masterBankCode.trim(), masterBankName: form.masterBankName.trim(),
      masterAccountNumber: form.masterAccountNumber.trim(), masterAccountName: form.masterAccountName.trim(),
      supportHotline: form.supportHotline.trim(), supportEmail: form.supportEmail.trim(), supportZalo: form.supportZalo.trim(),
      maintenanceMessage: form.maintenanceMessage?.trim() || null,
    };
    if ([payload.masterBankCode, payload.masterBankName, payload.masterAccountNumber, payload.masterAccountName,
      payload.supportHotline, payload.supportEmail, payload.supportZalo].some(value => !value)) {
      setSaveError('Vui lòng nhập đầy đủ thông tin ngân hàng và liên hệ hỗ trợ.');
      return;
    }
    if (payload.masterBankName.length < 2 || payload.masterAccountName.length < 2) {
      setSaveError('Tên ngân hàng và tên chủ tài khoản phải có ít nhất 2 ký tự.');
      return;
    }
    if (!validHotline(payload.supportHotline)) {
      setSaveError('Hotline phải có từ 8 đến 15 chữ số.');
      return;
    }
    if (!fitsDecimal(payload.branchAddonPriceMonthly, 2) || !fitsDecimal(payload.storageAddonPricePerGbMonthly, 2)) {
      setSaveError('Đơn giá tối đa 16 chữ số nguyên và 2 chữ số thập phân.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await settingsApi.updateSettings(payload);
      if (!response.success || !response.data) throw new Error(response.message || 'Không thể lưu cấu hình.');
      const saved = toPayload(response.data);
      setSettings(response.data);
      setForm(saved);
      setOriginalForm(saved);
      setToast({ id: String(Date.now()), type: 'success', message: 'Đã lưu cấu hình nền tảng.' });
    } catch (error: unknown) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(responseMessage || (error instanceof Error ? error.message : 'Không thể lưu cấu hình. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-plans admin-settings-page">
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <PlatformSettingsHeader isSaving={isSaving} isDirty={!!settings && !isLoading && !loadError && isDirty}
        onSave={requestSave} onReset={handleReset} />
      {isLoading ? <div className="settings-state" role="status">Đang tải cấu hình nền tảng...</div> : loadError ? (
        <div className="settings-state" role="alert"><p>{loadError}</p>
          <button className="admin-btn admin-btn-secondary" onClick={() => void fetchSettings()}>Thử lại</button></div>
      ) : settings && (
        <>
          <div className="settings-update-meta"><Clock size={14} />
            <span>Cập nhật {new Date(settings.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              {settings.updatedBy ? ' · ' + settings.updatedBy : ''}</span>
            {isDirty && <span className="plans-status">Có thay đổi chưa lưu</span>}
          </div>
          <form ref={formRef} id="platform-settings-form" onSubmit={event => { event.preventDefault(); void handleSave(); }}>
            <div className="settings-layout">
              <div className="settings-card-stack">
                <SubscriptionPolicyCard form={form} onChange={handleChange} disabled={isSaving} />
                <MasterBeneficiaryCard form={form} onChange={handleChange} disabled={isSaving} />
                <SupportContactCard form={form} onChange={handleChange} disabled={isSaving} />
                <MaintenanceModeCard form={form} onChange={handleChange} disabled={isSaving} />
              </div>
              <SettingsSummarySidebar form={form} isDirty={isDirty} isSaving={isSaving} onSave={requestSave} onReset={handleReset} />
            </div>
            {saveError && <div className="settings-save-error" role="alert">{saveError}</div>}
            <footer className="settings-save-bar">
              <span>{isDirty ? 'Có thay đổi chưa được lưu' : 'Cấu hình đã được lưu'}</span>
              <div>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={!isDirty || isSaving}>
                  <RotateCcw size={15} /> Hoàn tác
                </button>
                <button className="admin-btn admin-btn-primary" disabled={!isDirty || isSaving}>
                  <Save size={15} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </footer>
          </form>
        </>
      )}
    </div>
  );
};

export default AdminSettingsPage;
