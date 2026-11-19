import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Banknote, BookOpen, Building2, CheckCircle2, Landmark, Loader2, Plus, RotateCcw, ShieldCheck, WalletCards, X } from 'lucide-react';
import { branchManagementApi, type BranchItemResponse } from '../../../pages/store/api/branchManagementApi';
import { financeAccountsApi, type FinanceAccountItem, type FinanceAccountType, type SaveFinanceAccountPayload, type SepayTransactionPage } from '../api/financeAccountsApi';
import { SepayVisualGuide } from '../components/SepayVisualGuide';
import { TablePagination } from '../../../components/common';
import './finance-accounts-settings.css';

type TabKey = 'accounts' | 'drawers' | 'rules' | 'guide' | 'history';
const BANKS = [{ code: 'VCB', name: 'Vietcombank' }, { code: 'MB', name: 'MB Bank' }, { code: 'ACB', name: 'ACB' }, { code: 'TCB', name: 'Techcombank' }, { code: 'TPB', name: 'TPBank' }, { code: 'BIDV', name: 'BIDV' }];
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const emptyForm: SaveFinanceAccountPayload = { accountName: '', accountType: 'Bank', branchId: null, bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '', accountHolderName: '', isDefaultForVietQr: false, isActive: true };

const formatVnDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const raw = String(dateStr).trim();
  // Nếu chuỗi ISO chưa có chỉ định múi giờ (không có 'Z' hay offset '+' / '-'), thêm 'Z' vì backend lưu theo UTC
  const normalized = raw.endsWith('Z') || raw.includes('+') || (raw.includes('-') && raw.lastIndexOf('-') > 10)
    ? raw
    : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export function FinanceAccountsSettingsPage() {
  const [searchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab');
  const [tab, setTab] = useState<TabKey>(subtabParam === 'guide' ? 'guide' : subtabParam === 'history' ? 'history' : 'accounts');
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string }>(() => {
    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { id: parsed.id || 'ALL', name: parsed.name || 'Toàn hệ thống' };
      }
    } catch {
      // ignore
    }
    return { id: 'ALL', name: 'Toàn hệ thống' };
  });

  const [historyAccountId, setHistoryAccountId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(9);
  const [transactionPage, setTransactionPage] = useState<SepayTransactionPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<FinanceAccountItem[]>([]);
  const [branches, setBranches] = useState<BranchItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SaveFinanceAccountPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<FinanceAccountItem | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [webhookKey, setWebhookKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Lắng nghe sự kiện đổi chi nhánh từ thanh điều hướng trên cùng (Topbar)
  useEffect(() => {
    const handleBranchChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; name: string }>).detail;
      if (detail) {
        setActiveBranch({ id: detail.id || 'ALL', name: detail.name || 'Toàn hệ thống' });
        setHistoryAccountId('');
        setHistoryPage(1);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mtgrms_active_branch' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveBranch({ id: parsed.id || 'ALL', name: parsed.name || 'Toàn hệ thống' });
          setHistoryAccountId('');
          setHistoryPage(1);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleBranchChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleBranchChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [items, branchResponse] = await Promise.all([financeAccountsApi.list(), branchManagementApi.getBranches({ status: 'all', pageIndex: 1, pageSize: 100 })]);
      setAccounts(items); setBranches(branchResponse.data?.items ?? []);
    } catch (caught) {
      setError((caught as { vietnameseMessage?: string }).vietnameseMessage || 'Không tải được danh sách tài khoản và két quỹ.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const activeBranchId = activeBranch.id !== 'ALL' ? activeBranch.id : '';
  const banks = useMemo(() => accounts.filter((x) => x.accountType === 'Bank'), [accounts]);
  const filteredBanks = useMemo(() => {
    if (!activeBranchId) return banks;
    return banks.filter((b) => !b.branchId || b.branchId === activeBranchId);
  }, [banks, activeBranchId]);

  const groupedBankAccounts = useMemo(() => {
    const listToGroup = activeBranchId
      ? banks.filter((b) => !b.branchId || b.branchId === activeBranchId)
      : banks;

    const systemBanks = listToGroup.filter((b) => !b.branchId);
    const groups: { groupName: string; items: FinanceAccountItem[] }[] = [];

    if (systemBanks.length > 0) {
      groups.push({ groupName: 'Toàn hệ thống', items: systemBanks });
    }

    branches.forEach((branch) => {
      const branchBanks = listToGroup.filter((b) => b.branchId === branch.id);
      if (branchBanks.length > 0) {
        groups.push({ groupName: branch.name, items: branchBanks });
      }
    });

    return groups;
  }, [banks, branches, activeBranchId]);

  const fetchHistory = useCallback(async () => {
    if (tab !== 'history') return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await financeAccountsApi.getSepayTransactions({
        branchId: activeBranchId || undefined,
        financeAccountId: historyAccountId || undefined,
        page: historyPage,
        pageSize: historyPageSize,
      });
      setTransactionPage(result);
    } catch {
      setTransactionPage(null);
      setHistoryError('Không tải được lịch sử chuyển khoản SePay.');
    } finally {
      setHistoryLoading(false);
    }
  }, [tab, activeBranchId, historyAccountId, historyPage, historyPageSize]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const drawers = accounts.filter((x) => x.accountType !== 'Bank');
  const connected = banks.filter((x) => x.sepayConnectionStatus === 'Connected');
  const pending = banks.length - connected.length;
  const visibleAccounts = tab === 'accounts' ? banks : drawers;
  const groupedDrawers = useMemo(() => branches.map((branch) => ({ branch, items: drawers.filter((x) => x.branchId === branch.id) })).filter((x) => x.items.length), [branches, drawers]);

  const openCreate = (type: FinanceAccountType) => { setForm({ ...emptyForm, accountType: type, branchId: branches[0]?.id ?? null }); setFormOpen(true); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const created = await financeAccountsApi.create(form);
      setFormOpen(false); await load();
      if (created.accountType === 'Bank') { setConnecting(created); notify('Đã lưu tài khoản. Hãy kết nối SePay để kích hoạt VietQR.'); }
      else notify('Đã thêm két quỹ.');
    } catch (caught) { notify((caught as { vietnameseMessage?: string }).vietnameseMessage || 'Không thể lưu tài khoản/két quỹ.'); }
    finally { setSaving(false); }
  };
  const connect = async (event: FormEvent) => {
    event.preventDefault(); if (!connecting) return; setSaving(true);
    try { const result = await financeAccountsApi.connectSepay(connecting.id, apiToken); setWebhookKey(result.webhookAuthenticationKey ?? ''); setWebhookUrl(result.webhookUrl ?? ''); setApiToken(''); await load(); notify('Kết nối SePay thành công.'); }
    catch (caught) { notify((caught as { vietnameseMessage?: string }).vietnameseMessage || 'Không thể xác minh SePay.'); }
    finally { setSaving(false); }
  };
  const toggle = async (item: FinanceAccountItem) => {
    try { await financeAccountsApi.setStatus(item.id, !item.isActive); await load(); notify(!item.isActive ? 'Đã kích hoạt tài khoản.' : 'Đã ngừng hoạt động.'); }
    catch (caught) { notify((caught as { vietnameseMessage?: string }).vietnameseMessage || 'Không thể đổi trạng thái.'); }
  };

  return <div className="fa-settings">
    <header className="fa-heading"><div><span>Cài đặt & thiết lập</span><h1>Tài khoản & Két quỹ</h1><p>Quản lý tài khoản ngân hàng, kết nối SePay và két quầy theo từng chi nhánh.</p></div><button className="fa-primary" onClick={() => openCreate(tab === 'drawers' ? 'Till' : 'Bank')}><Plus size={17} /> Thêm tài khoản / két</button></header>
    <nav className="fa-tabs" aria-label="Cấu hình tài chính">{([['accounts', 'Tài khoản & kết nối'], ['drawers', 'Két theo chi nhánh'], ['history', 'Lịch sử chuyển khoản'], ['guide', 'Hướng dẫn SePay']] as [TabKey, string][]).map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab === 'history' && (
      <section className="fa-card fa-transaction-history">
        <header className="fa-history-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2>Lịch sử chuyển khoản SePay & VietQR</h2>
              <span className="fa-branch-chip">
                <Building2 size={13} /> {activeBranch.name}
              </span>
            </div>
            <p>Giao dịch ghi nhận tự động ngay khi ngân hàng xác nhận tiền vào. Chốt doanh thu ngày chỉ tổng hợp báo cáo, không cộng trùng số dư.</p>
          </div>
          <button type="button" className="fa-refresh-btn" onClick={() => void fetchHistory()} title="Tải lại giao dịch">
            <RotateCcw size={15} /> Làm mới
          </button>
        </header>

        <div className="fa-history-filter-bar">
          <div className="fa-filter-item">
            <label><Landmark size={15} /> Tài khoản ngân hàng</label>
            <select
              value={historyAccountId}
              onChange={(e) => {
                setHistoryAccountId(e.target.value);
                setHistoryPage(1);
              }}
            >
              <option value="">
                {activeBranchId
                  ? `-- Toàn bộ tài khoản của ${activeBranch.name} (${filteredBanks.length} TK) --`
                  : `-- Toàn bộ tài khoản ngân hàng (${banks.length} TK) --`}
              </option>
              {groupedBankAccounts.map(({ groupName, items }) => (
                <optgroup key={groupName} label={`Chi nhánh: ${groupName}`}>
                  {items.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.accountName} · {bank.maskedAccountNumber || bank.bankName} (TK: {bank.branchName || 'Toàn hệ thống'})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {historyAccountId && (
            <button
              type="button"
              className="fa-clear-filters-btn"
              onClick={() => {
                setHistoryAccountId('');
                setHistoryPage(1);
              }}
              title="Xem toàn bộ tài khoản"
            >
              <X size={14} /> Xem toàn bộ tài khoản
            </button>
          )}
        </div>

        <div className="fa-table-container">
          <table className="fa-table">
            <thead>
              <tr>
                <th style={{ width: 145 }}>Thời gian</th>
                <th style={{ width: 155 }}>Mã GD Ngân hàng</th>
                <th style={{ width: 180 }}>Đơn hàng & Điểm bán</th>
                <th style={{ width: 230 }}>Tài khoản nhận & Chi nhánh</th>
                <th>Nội dung chuyển khoản</th>
                <th style={{ width: 125, textAlign: 'right' }}>Số tiền vào</th>
                <th style={{ width: 105, textAlign: 'center' }}>Đối soát</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="fa-table-state">
                    <Loader2 className="spin" size={20} /> Đang tải danh sách giao dịch...
                  </td>
                </tr>
              ) : historyError ? (
                <tr>
                  <td colSpan={7} className="fa-table-state error">
                    <AlertTriangle size={18} /> {historyError}
                  </td>
                </tr>
              ) : transactionPage?.items && transactionPage.items.length > 0 ? (
                transactionPage.items.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className="fa-tx-date">
                        {formatVnDateTime(tx.transactionDate)}
                      </span>
                    </td>
                    <td>
                      <span className="fa-tx-code" title={tx.bankTransactionId}>
                        {tx.bankTransactionId}
                      </span>
                    </td>
                    <td>
                      <div className="fa-order-cell">
                        {tx.orderCode ? (
                          <span className="fa-order-badge" title={`Đơn hàng: ${tx.orderCode}`}>
                            {tx.orderCode}
                          </span>
                        ) : (
                          <span className="fa-muted-dash">-</span>
                        )}
                        <div className="fa-point-sale" title={`Bán tại chi nhánh: ${tx.branchName || 'Toàn hệ thống'}`}>
                          <span>Điểm bán: <b>{tx.branchName || 'Toàn hệ thống'}</b></span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fa-acc-cell">
                        <div className="fa-acc-title">
                          <strong>{tx.bankName || tx.gateway || 'Ngân hàng'}</strong>
                          <span className="fa-acc-number">{tx.accountNumber ? `•••• ${tx.accountNumber.slice(-4)}` : (tx.accountName || '')}</span>
                        </div>
                        {tx.accountHolderName && (
                          <span className="fa-acc-holder">{tx.accountHolderName}</span>
                        )}
                        <div className="fa-acc-branch-badge" title={`Tài khoản ngân hàng của: ${tx.accountBranchName || 'Toàn hệ thống'}`}>
                          <Building2 size={11} />
                          <span>TK của: <b>{tx.accountBranchName || 'Toàn hệ thống'}</b></span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fa-content-cell" title={tx.transactionContent}>
                        {tx.transactionContent}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="fa-amount-cell">+{money.format(tx.amountIn)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="fa-status-pill">
                        <CheckCircle2 size={12} /> SePay
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="fa-table-state">
                    <WalletCards size={24} />
                    <span>Chưa có giao dịch SePay nào cho bộ lọc này.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={historyPage}
          pageSize={historyPageSize}
          totalItems={transactionPage?.totalCount ?? 0}
          pageSizeOptions={[9, 18, 27, 45]}
          onPageChange={(page) => setHistoryPage(page)}
          onPageSizeChange={(size) => {
            setHistoryPageSize(size);
            setHistoryPage(1);
          }}
          itemLabel="giao dịch"
          isLoading={historyLoading}
        />
      </section>
    )}
    {tab === 'accounts' && <><div className="fa-warning"><AlertTriangle size={18} /><div><b>SePay là bắt buộc khi dùng tài khoản ngân hàng để nhận VietQR.</b><span>Tài khoản chưa kiểm tra SePay thành công không thể kích hoạt, tạo QR hoặc nhận thanh toán tự động.</span></div></div><div className="fa-metrics"><Metric label="Tài khoản ngân hàng" value={String(banks.length).padStart(2, '0')} detail={`${banks.filter(x => x.isActive).length} đang hoạt động`} /><Metric good label="Đã kết nối SePay" value={`${connected.length}/${banks.length}`} detail="Sẵn sàng nhận VietQR" /><Metric label="Két quầy & két sắt" value={String(drawers.length).padStart(2, '0')} detail={`Thuộc ${new Set(drawers.map(x => x.branchId)).size} chi nhánh`} /><Metric warn label="Cần hoàn tất" value={String(pending).padStart(2, '0')} detail="Tài khoản chưa kết nối SePay" /></div></>}
    {loading ? <div className="fa-state"><Loader2 className="spin" /> Đang tải cấu hình...</div> : error ? <div className="fa-state error"><AlertTriangle /> <span>{error}</span><button onClick={() => void load()}>Thử lại</button></div> : tab === 'guide' ? <section className="fa-card" style={{ padding: '20px 24px' }}><SepayVisualGuide /></section> : tab === 'history' ? null : <div className="fa-layout"><section className="fa-card"><header><div><h2>{tab === 'accounts' ? 'Ngân hàng & kết nối SePay' : 'Két quỹ theo chi nhánh'}</h2><p>{tab === 'accounts' ? 'Chỉ tài khoản kết nối thành công mới được bật nhận VietQR tại POS.' : 'Mỗi chi nhánh có thể có nhiều két quầy và két sắt.'}</p></div><button onClick={() => openCreate(tab === 'accounts' ? 'Bank' : 'Till')}><Plus size={15} /> Thêm</button></header>{visibleAccounts.length === 0 ? <div className="fa-empty"><WalletCards /><b>Chưa có cấu hình</b><span>Thêm {tab === 'accounts' ? 'tài khoản ngân hàng' : 'két quỹ'} đầu tiên để bắt đầu.</span></div> : tab === 'accounts' ? <div className="fa-list fa-list--scrollable">{banks.map((item) => <AccountRow key={item.id} item={item} onConnect={() => { setConnecting(item); setWebhookKey('') }} onToggle={() => void toggle(item)} />)}</div> : <div>{groupedDrawers.map(({ branch, items }) => <div className="fa-branch" key={branch.id}><h3><Building2 size={14} />{branch.name}<span>{items.length} két</span></h3><div className="fa-list">{items.map((item) => <AccountRow key={item.id} item={item} onConnect={() => { }} onToggle={() => void toggle(item)} />)}</div></div>)}</div>}</section><aside className="fa-card fa-guide"><h2>{tab === 'accounts' ? 'Luồng kích hoạt nhận tiền' : 'Quy tắc vận hành'}</h2>{tab === 'accounts' ? <><ol><li><b>Thêm thông tin tài khoản</b><span>Ngân hàng, số tài khoản, chủ tài khoản và chi nhánh áp dụng.</span></li><li><b>Kết nối SePay</b><span>Nhập API Token và cấu hình webhook.</span></li><li><b>Kiểm tra kết nối</b><span>Đối chiếu token và tài khoản trên SePay.</span></li><li><b>Kích hoạt VietQR</b><span>Kích hoạt nhận thanh toán VietQR tự động cho chi nhánh.</span></li></ol><button type="button" onClick={() => setGuideModalOpen(true)} style={{ marginTop: 14, width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #087e78', backgroundColor: '#f0fdfa', color: '#087e78', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><BookOpen size={14} /><span>Xem cẩm nang hình ảnh SePay</span></button></> : <p>Két đã phát sinh giao dịch chỉ được ngừng hoạt động. Không thể tắt két đang có ca POS mở.</p>}</aside></div>}
    {formOpen && <Modal title={form.accountType === 'Bank' ? 'Thêm tài khoản ngân hàng' : 'Thêm két quỹ'} onClose={() => setFormOpen(false)}><form onSubmit={submit} className="fa-form"><label>Tên nhận diện<input required value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} /></label><label>Loại<select value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value as FinanceAccountType, branchId: form.branchId ?? branches[0]?.id ?? null })}><option value="Bank">Tài khoản ngân hàng</option><option value="Till">Két quầy</option><option value="Safe">Két sắt</option></select></label>{form.accountType === 'Bank' ? <><label>Ngân hàng<select value={form.bankCode} onChange={e => { const b = BANKS.find(x => x.code === e.target.value); setForm({ ...form, bankCode: b?.code, bankName: b?.name }) }}>{BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}</select></label><label>Số tài khoản<input required value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></label><label className="wide">Chủ tài khoản<input required value={form.accountHolderName} onChange={e => setForm({ ...form, accountHolderName: e.target.value.toUpperCase() })} /></label><label className="wide">Chi nhánh áp dụng<select required value={form.branchId ?? ''} onChange={e => setForm({ ...form, branchId: e.target.value || null })}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></> : <label>Chi nhánh<select required value={form.branchId ?? ''} onChange={e => setForm({ ...form, branchId: e.target.value })}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<div className="fa-form-note wide"><ShieldCheck size={17} /> Tài khoản ngân hàng chỉ được kích hoạt sau khi xác minh SePay.</div><footer className="wide"><button type="button" onClick={() => setFormOpen(false)}>Hủy</button><button className="fa-primary" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : null} Lưu {form.accountType === 'Bank' ? '& kết nối SePay →' : ''}</button></footer></form></Modal>}
    {connecting && <Modal title="Kết nối SePay" onClose={() => { setConnecting(null); setWebhookKey(''); setWebhookUrl('') }}>{webhookKey ? <div className="fa-success"><CheckCircle2 /><h3>Kết nối thành công</h3><p>Tạo Webhook kiểu “Có tiền vào”, xác thực API Key bằng thông tin dưới đây. Khóa chỉ hiển thị trong lần kết nối này.</p><small>Webhook URL</small><code>{webhookUrl}</code><small>Authentication API Key</small><code>{webhookKey}</code><button className="fa-primary" onClick={() => { void navigator.clipboard.writeText(`${webhookUrl}\n${webhookKey}`); notify('Đã sao chép cấu hình webhook.') }}>Sao chép cấu hình</button></div> : <form className="fa-connect" onSubmit={connect}><p>Tài khoản: <b>{connecting.accountName}</b> · {connecting.maskedAccountNumber}</p><div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><label style={{ margin: 0 }}>API Token SePay</label><button type="button" onClick={() => setGuideModalOpen(true)} style={{ border: 0, background: 'none', color: '#087e78', fontSize: 10, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Xem ảnh hướng dẫn lấy token →</button></div><input type="password" required autoFocus value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Nhập API Token từ SePay" /></div><div className="fa-form-note"><ShieldCheck size={17} /> Token được gửi tới backend để kiểm tra. Webhook nhận tiền: <b>https://thviet.store/api/payments/sepay-webhook</b></div><footer><button type="button" onClick={() => setConnecting(null)}>Hủy</button><button className="fa-primary" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : null} Kiểm tra & kết nối</button></footer></form>}</Modal>}
    {guideModalOpen && <Modal title="Cẩm nang hướng dẫn kết nối SePay" wide onClose={() => setGuideModalOpen(false)}><div style={{ padding: '16px 20px', maxHeight: '75vh', overflowY: 'auto' }}><SepayVisualGuide compact /></div></Modal>}
    {toast && <div className="fa-toast">{toast}</div>}
  </div>;
}

function Metric({ label, value, detail, good, warn }: { label: string; value: string; detail: string; good?: boolean; warn?: boolean }) { return <div className={`fa-metric ${good ? 'good' : ''} ${warn ? 'warn' : ''}`}><span>{label}</span><b>{value}</b><small>{detail}</small></div>; }
function AccountRow({ item, onConnect, onToggle }: { item: FinanceAccountItem; onConnect: () => void; onToggle: () => void }) { const bank = item.accountType === 'Bank'; return <article className="fa-row"><div className={`fa-icon ${bank ? 'bank' : ''}`}>{bank ? <Landmark /> : <Banknote />}</div><div className="fa-row-main"><b>{item.accountName}</b><span>{bank ? `${item.maskedAccountNumber ?? 'Chưa có STK'} · ${item.accountHolderName ?? ''} · ${item.branchName}` : `${item.branchName} · ${money.format(item.currentBalance)}`}</span></div><div className="fa-row-actions">{bank && <span className={`fa-status ${item.sepayConnectionStatus === 'Connected' ? 'ok' : 'wait'}`}>{item.sepayConnectionStatus === 'Connected' ? '● SePay đã kết nối' : 'Cần kết nối SePay'}</span>}{bank && item.sepayConnectionStatus !== 'Connected' && <button onClick={onConnect}>Thiết lập</button>}<button className="subtle" onClick={onToggle}>{item.isActive ? 'Tạm ngưng' : 'Kích hoạt'}</button></div></article>; }
function Modal({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: ReactNode }) { return <div className="fa-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="fa-modal" role="dialog" aria-modal="true" style={wide ? { width: 'min(880px, 96vw)' } : undefined}><header><h2>{title}</h2><button onClick={onClose} aria-label="Đóng"><X /></button></header>{children}</section></div> }
