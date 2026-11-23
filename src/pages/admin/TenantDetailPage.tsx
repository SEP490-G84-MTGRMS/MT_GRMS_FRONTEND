import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarPlus, LockKeyhole, RefreshCw, UnlockKeyhole, X } from 'lucide-react';
import { tenantApi } from '../../features/admin/api';
import type { BackendTenantDetailDto } from '../../features/admin/api';
import './tenantDetail.css';
import { TenantRecords } from '../../features/admin/components/TenantRecords';

type Action = 'lock' | 'unlock' | 'grace';

function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  return data?.message || data?.detail || (error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function quota(value?: number) {
  return value === -1 ? 'Không giới hạn' : value ?? '—';
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  EXPIRING: 'Sắp hết hạn',
  GRACE: 'Ân hạn',
  GRACE_PERIOD: 'Ân hạn',
  LOCKED: 'Bị khóa',
  PENDING: 'Chờ kích hoạt',
};

export const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<BackendTenantDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [lockType, setLockType] = useState<'SOFT' | 'HARD'>('SOFT');
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const requestVersion = useRef(0);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!action) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, [action]);

  const loadTenant = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    setNotFound(false);
    setTenant(null);

    try {
      if (!id) {
        setNotFound(true);
        return;
      }
      const response = await tenantApi.getById(id);
      if (version !== requestVersion.current) return;
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải thông tin khách hàng.');
      }
      const detail = response.data;
      setTenant(detail);
    } catch (error) {
      if (version !== requestVersion.current) return;
      if ((error as { response?: { status?: number } })?.response?.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(errorMessage(error));
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setAction(null);
    setNotice('');
    void loadTenant();
    return () => { requestVersion.current += 1; };
  }, [loadTenant]);

  const openAction = (next: Action) => {
    setReason('');
    setLockType('SOFT');
    setDays(7);
    setActionError('');
    setNotice('');
    setAction(next);
  };

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenant || !action || saving) return;
    if (action !== 'unlock' && reason.trim().length < 10) {
      setActionError('Lý do phải có ít nhất 10 ký tự.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      let response;
      if (action === 'unlock') {
        response = await tenantApi.unlock(tenant.id);
      } else if (action === 'lock') {
        response = await tenantApi.lock(tenant.id, { lockType, reason: reason.trim() });
      } else {
        response = await tenantApi.extendGrace(tenant.id, { additionalDays: days, reason: reason.trim() });
      }
      if (!response.success || response.data !== true) {
        throw new Error(response.message || 'Thao tác chưa thành công. Vui lòng thử lại.');
      }
      setAction(null);
      setNotice(action === 'unlock' ? 'Đã mở khóa dịch vụ.' : action === 'lock' ? 'Đã khóa dịch vụ.' : 'Đã gia hạn thời gian ân hạn.');
      await loadTenant();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const status = (tenant?.status || '').toUpperCase();
  const actionTitle = action === 'lock' ? 'Khóa dịch vụ' : action === 'unlock' ? 'Mở khóa dịch vụ' : 'Gia hạn ân hạn';

  return (
    <div className="tenant-detail">
      <Link className="tenant-detail-back" to="/admin/tenants"><ArrowLeft size={16} />Danh sách khách hàng</Link>
      {notice && <div className="tenant-detail-notice" role="status">{notice}</div>}
      {loading ? (
        <div className="tenant-detail-state" role="status">Đang tải thông tin khách hàng...</div>
      ) : loadError || notFound || !tenant ? (
        <div className="tenant-detail-state" role="alert">
          <h1>{notFound ? 'Không tìm thấy khách hàng' : 'Không tải được thông tin'}</h1>
          <p>{loadError || 'Khách hàng không tồn tại hoặc đã bị xóa.'}</p>
          {!notFound && <button className="tenant-detail-button" onClick={() => void loadTenant()}>Thử lại</button>}
        </div>
      ) : (
        <>
          <header className="tenant-detail-header">
            <div className="tenant-detail-identity">
              <span className="tenant-detail-avatar"><Building2 size={26} /></span>
              <div>
                <div className="tenant-detail-title"><h1>{tenant.name}</h1><span className={`tenant-detail-status status-${status.toLowerCase()}`}>{statusLabels[status] || tenant.status || '—'}</span></div>
                <p>{tenant.subdomain || '—'}<span>·</span>Mã khách hàng {tenant.code || '—'}</p>
              </div>
            </div>
            <div className="tenant-detail-actions">
              <button className="tenant-detail-button" onClick={() => void loadTenant()} aria-label="Làm mới dữ liệu"><RefreshCw size={15} /></button>
              {(status === 'GRACE' || status === 'GRACE_PERIOD' || status === 'EXPIRING') && <button className="tenant-detail-button" onClick={() => openAction('grace')}><CalendarPlus size={15} />Gia hạn ân hạn</button>}
              {status === 'LOCKED' ? (
                <button className="tenant-detail-button is-primary" onClick={() => openAction('unlock')}><UnlockKeyhole size={15} />Mở khóa dịch vụ</button>
              ) : (
                <button className="tenant-detail-button is-danger" onClick={() => openAction('lock')}><LockKeyhole size={15} />Khóa dịch vụ</button>
              )}
            </div>
          </header>

          <div className="tenant-detail-grid">
            <section className="tenant-detail-card">
              <h2>Thông tin khách hàng</h2>
              <dl className="tenant-detail-fields">
                <div><dt>Tên cửa hàng / chuỗi</dt><dd>{tenant.name || '—'}</dd></div>
                <div><dt>Hotline cửa hàng</dt><dd>{tenant.hotline || '—'}</dd></div>
                <div><dt>Mã số thuế</dt><dd>{tenant.taxCode || '—'}</dd></div>
                <div><dt>Địa chỉ</dt><dd>{tenant.address || '—'}</dd></div>
                <div><dt>Tỉnh / thành phố</dt><dd>{tenant.city || '—'}</dd></div>
              </dl>
            </section>
            <section className="tenant-detail-card">
              <h2>Gói dịch vụ & hợp đồng</h2>
              <div className="tenant-detail-plan">{tenant.planName || tenant.currentPlan || '—'}</div>
              <dl className="tenant-detail-fields">
                <div><dt>Hạn hợp đồng</dt><dd>{formatDate(tenant.subscriptionExpiresAt)}</dd></div>
                <div><dt>Hạn ân hạn</dt><dd>{formatDate(tenant.gracePeriodExpiresAt)}</dd></div>
                <div><dt>Chi nhánh / hạn mức</dt><dd>{tenant.branchCount ?? '—'} / {quota(tenant.maxBranches)}</dd></div>
                <div><dt>Nhân sự / hạn mức</dt><dd>{tenant.staffCount ?? '—'} / {quota(tenant.maxStaff)}</dd></div>
                <div><dt>Ngày khởi tạo</dt><dd>{formatDate(tenant.createdAt)}</dd></div>
                <div><dt>Cập nhật gần nhất</dt><dd>{formatDate(tenant.updatedAt)}</dd></div>
              </dl>
              {tenant.lockType && (
                <div className="tenant-detail-lock-info">
                  <strong>{tenant.lockType.toUpperCase() === 'HARD' ? 'Khóa cứng' : 'Khóa mềm'}</strong>
                  <p>{tenant.lockReason || '—'}</p>
                  <small>{tenant.lockedBy || '—'} · {formatDate(tenant.lockedAt)}</small>
                </div>
              )}
            </section>
          </div>

          <TenantRecords key={tenant.id} tenantId={tenant.id} />
        </>
      )}
      {action && tenant && (
        <div className="tenant-detail-backdrop" onKeyDown={(event) => { if (event.key === 'Escape' && !saving) setAction(null); }}>
          <section ref={dialogRef} className="tenant-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-action-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
              if (!controls?.length) return;
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}>
            <header><h2 id="tenant-action-title">{actionTitle}</h2><button type="button" aria-label="Đóng" disabled={saving} onClick={() => setAction(null)}><X size={19} /></button></header>
            <form onSubmit={submitAction}>
              <div className="tenant-detail-dialog-body">
                <p>Xác nhận {actionTitle.toLowerCase()} cho <strong>{tenant.name}</strong>.</p>
                {action === 'lock' && <label>Hình thức khóa<select value={lockType} onChange={(event) => setLockType(event.target.value as 'SOFT' | 'HARD')} disabled={saving}><option value="SOFT">Khóa mềm</option><option value="HARD">Khóa cứng</option></select></label>}
                {action === 'grace' && <label>Số ngày gia hạn<input type="number" value={days} min={1} max={365} required disabled={saving} onChange={(event) => setDays(Number(event.target.value))} /></label>}
                {action !== 'unlock' && <label>Lý do<textarea placeholder="Nhập lý do (ít nhất 10 ký tự)" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={500} required disabled={saving} rows={3} /></label>}
                {actionError && <div className="tenant-detail-action-error" role="alert">{actionError}</div>}
              </div>
              <footer><button type="button" className="tenant-detail-button" disabled={saving} onClick={() => setAction(null)}>Hủy</button><button type="submit" className="tenant-detail-button is-primary" disabled={saving || (action !== 'unlock' && reason.trim().length < 10)}>{saving ? 'Đang xử lý...' : 'Xác nhận'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default TenantDetailPage;
