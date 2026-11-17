import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Banknote, Building2, CheckCircle2, Landmark, Loader2, Plus, ShieldCheck, WalletCards, X } from 'lucide-react';
import { branchManagementApi, type BranchItemResponse } from '../../../pages/store/api/branchManagementApi';
import { financeAccountsApi, type FinanceAccountItem, type FinanceAccountType, type SaveFinanceAccountPayload } from '../api/financeAccountsApi';
import './finance-accounts-settings.css';

type TabKey = 'accounts' | 'drawers' | 'rules';
const BANKS = [{ code: 'VCB', name: 'Vietcombank' }, { code: 'MB', name: 'MB Bank' }, { code: 'ACB', name: 'ACB' }, { code: 'TCB', name: 'Techcombank' }, { code: 'TPB', name: 'TPBank' }, { code: 'BIDV', name: 'BIDV' }];
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const emptyForm: SaveFinanceAccountPayload = { accountName: '', accountType: 'Bank', branchId: null, bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '', accountHolderName: '', isDefaultForVietQr: false, isActive: true };

export function FinanceAccountsSettingsPage() {
  const [tab, setTab] = useState<TabKey>('accounts');
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

  const banks = accounts.filter((x) => x.accountType === 'Bank');
  const drawers = accounts.filter((x) => x.accountType !== 'Bank');
  const connected = banks.filter((x) => x.sepayConnectionStatus === 'Connected');
  const pending = banks.length - connected.length;
  const visibleAccounts = tab === 'accounts' ? banks : drawers;
  const groupedDrawers = useMemo(() => branches.map((branch) => ({ branch, items: drawers.filter((x) => x.branchId === branch.id) })).filter((x) => x.items.length), [branches, drawers]);

  const openCreate = (type: FinanceAccountType) => { setForm({ ...emptyForm, accountType: type, branchId: type === 'Bank' ? null : branches[0]?.id ?? null }); setFormOpen(true); };
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
    <header className="fa-heading"><div><span>Cài đặt & thiết lập</span><h1>Tài khoản & Két quỹ</h1><p>Quản lý tài khoản ngân hàng, kết nối SePay và két quầy theo từng chi nhánh.</p></div><button className="fa-primary" onClick={() => openCreate(tab === 'drawers' ? 'Till' : 'Bank')}><Plus size={17}/> Thêm tài khoản / két</button></header>
    <nav className="fa-tabs" aria-label="Cấu hình tài chính">{([['accounts','Tài khoản & kết nối'],['drawers','Két theo chi nhánh'],['rules','Quy tắc thu chi']] as [TabKey,string][]).map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab === 'accounts' && <><div className="fa-warning"><AlertTriangle size={18}/><div><b>SePay là bắt buộc khi dùng tài khoản ngân hàng để nhận VietQR.</b><span>Tài khoản chưa kiểm tra SePay thành công không thể kích hoạt, tạo QR hoặc nhận thanh toán tự động.</span></div></div><div className="fa-metrics"><Metric label="Tài khoản ngân hàng" value={String(banks.length).padStart(2,'0')} detail={`${banks.filter(x=>x.isActive).length} đang hoạt động`}/><Metric good label="Đã kết nối SePay" value={`${connected.length}/${banks.length}`} detail="Sẵn sàng nhận VietQR"/><Metric label="Két quầy & két sắt" value={String(drawers.length).padStart(2,'0')} detail={`Thuộc ${new Set(drawers.map(x=>x.branchId)).size} chi nhánh`}/><Metric warn label="Cần hoàn tất" value={String(pending).padStart(2,'0')} detail="Tài khoản chưa kết nối SePay"/></div></>}
    {loading ? <div className="fa-state"><Loader2 className="spin"/> Đang tải cấu hình...</div> : error ? <div className="fa-state error"><AlertTriangle/> <span>{error}</span><button onClick={() => void load()}>Thử lại</button></div> : tab === 'rules' ? <Rules/> : <div className="fa-layout"><section className="fa-card"><header><div><h2>{tab === 'accounts' ? 'Ngân hàng & kết nối SePay' : 'Két quỹ theo chi nhánh'}</h2><p>{tab === 'accounts' ? 'Chỉ tài khoản kết nối thành công mới được bật nhận VietQR tại POS.' : 'Mỗi chi nhánh có thể có nhiều két quầy và két sắt.'}</p></div><button onClick={() => openCreate(tab === 'accounts' ? 'Bank' : 'Till')}><Plus size={15}/> Thêm</button></header>{visibleAccounts.length === 0 ? <div className="fa-empty"><WalletCards/><b>Chưa có cấu hình</b><span>Thêm {tab === 'accounts' ? 'tài khoản ngân hàng' : 'két quỹ'} đầu tiên để bắt đầu.</span></div> : tab === 'accounts' ? <div className="fa-list">{banks.map((item) => <AccountRow key={item.id} item={item} onConnect={() => {setConnecting(item);setWebhookKey('')}} onToggle={() => void toggle(item)}/>)}</div> : <div>{groupedDrawers.map(({branch,items}) => <div className="fa-branch" key={branch.id}><h3><Building2 size={14}/>{branch.name}<span>{items.length} két</span></h3><div className="fa-list">{items.map((item)=><AccountRow key={item.id} item={item} onConnect={()=>{}} onToggle={() => void toggle(item)}/>)}</div></div>)}</div>}</section><aside className="fa-card fa-guide"><h2>{tab === 'accounts' ? 'Luồng kích hoạt nhận tiền' : 'Quy tắc vận hành'}</h2>{tab === 'accounts' ? <ol><li><b>Thêm thông tin tài khoản</b><span>Ngân hàng, số tài khoản, chủ tài khoản và phạm vi.</span></li><li><b>Kết nối SePay</b><span>Nhập API Token và cấu hình webhook.</span></li><li><b>Kiểm tra kết nối</b><span>Đối chiếu token và tài khoản trên SePay.</span></li><li><b>Kích hoạt VietQR</b><span>Gán làm mặc định toàn hệ thống hoặc chi nhánh.</span></li></ol> : <p>Két đã phát sinh giao dịch chỉ được ngừng hoạt động. Không thể tắt két đang có ca POS mở.</p>}</aside></div>}
    {formOpen && <Modal title={form.accountType === 'Bank' ? 'Thêm tài khoản ngân hàng' : 'Thêm két quỹ'} onClose={() => setFormOpen(false)}><form onSubmit={submit} className="fa-form"><label>Tên nhận diện<input required value={form.accountName} onChange={e=>setForm({...form,accountName:e.target.value})}/></label><label>Loại<select value={form.accountType} onChange={e=>setForm({...form,accountType:e.target.value as FinanceAccountType,branchId:e.target.value==='Bank'?null:branches[0]?.id})}><option value="Bank">Tài khoản ngân hàng</option><option value="Till">Két quầy</option><option value="Safe">Két sắt</option></select></label>{form.accountType === 'Bank' ? <><label>Ngân hàng<select value={form.bankCode} onChange={e=>{const b=BANKS.find(x=>x.code===e.target.value);setForm({...form,bankCode:b?.code,bankName:b?.name})}}>{BANKS.map(b=><option key={b.code} value={b.code}>{b.name}</option>)}</select></label><label>Số tài khoản<input required value={form.accountNumber} onChange={e=>setForm({...form,accountNumber:e.target.value})}/></label><label className="wide">Chủ tài khoản<input required value={form.accountHolderName} onChange={e=>setForm({...form,accountHolderName:e.target.value.toUpperCase()})}/></label><label className="wide">Phạm vi<select value={form.branchId??''} onChange={e=>setForm({...form,branchId:e.target.value||null})}><option value="">Toàn hệ thống</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></> : <label>Chi nhánh<select required value={form.branchId??''} onChange={e=>setForm({...form,branchId:e.target.value})}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<div className="fa-form-note wide"><ShieldCheck size={17}/> Tài khoản ngân hàng chỉ được kích hoạt sau khi xác minh SePay.</div><footer className="wide"><button type="button" onClick={()=>setFormOpen(false)}>Hủy</button><button className="fa-primary" disabled={saving}>{saving?<Loader2 className="spin" size={16}/>:null} Lưu {form.accountType==='Bank'?'& kết nối SePay →':''}</button></footer></form></Modal>}
    {connecting && <Modal title="Kết nối SePay" onClose={()=>{setConnecting(null);setWebhookKey('');setWebhookUrl('')}}>{webhookKey ? <div className="fa-success"><CheckCircle2/><h3>Kết nối thành công</h3><p>Tạo Webhook kiểu “Có tiền vào”, xác thực API Key bằng thông tin dưới đây. Khóa chỉ hiển thị trong lần kết nối này.</p><small>Webhook URL</small><code>{webhookUrl}</code><small>Authentication API Key</small><code>{webhookKey}</code><button className="fa-primary" onClick={()=>{void navigator.clipboard.writeText(`${webhookUrl}\n${webhookKey}`);notify('Đã sao chép cấu hình webhook.')}}>Sao chép cấu hình</button></div> : <form className="fa-connect" onSubmit={connect}><p>Tài khoản: <b>{connecting.accountName}</b> · {connecting.maskedAccountNumber}</p><label>API Token SePay<input type="password" required autoFocus value={apiToken} onChange={e=>setApiToken(e.target.value)} placeholder="Nhập API Token từ SePay"/></label><div className="fa-form-note"><ShieldCheck size={17}/> Token được gửi thẳng tới backend để kiểm tra và mã hóa trước khi lưu.</div><footer><button type="button" onClick={()=>setConnecting(null)}>Hủy</button><button className="fa-primary" disabled={saving}>{saving?<Loader2 className="spin" size={16}/>:null} Kiểm tra & kết nối</button></footer></form>}</Modal>}
    {toast && <div className="fa-toast">{toast}</div>}
  </div>;
}

function Metric({label,value,detail,good,warn}:{label:string;value:string;detail:string;good?:boolean;warn?:boolean}) { return <div className={`fa-metric ${good?'good':''} ${warn?'warn':''}`}><span>{label}</span><b>{value}</b><small>{detail}</small></div>; }
function AccountRow({item,onConnect,onToggle}:{item:FinanceAccountItem;onConnect:()=>void;onToggle:()=>void}) { const bank=item.accountType==='Bank'; return <article className="fa-row"><div className={`fa-icon ${bank?'bank':''}`}>{bank?<Landmark/>:<Banknote/>}</div><div className="fa-row-main"><b>{item.accountName}</b><span>{bank?`${item.maskedAccountNumber??'Chưa có STK'} · ${item.accountHolderName??''} · ${item.branchName}`:`${item.branchName} · ${money.format(item.currentBalance)}`}</span></div><div className="fa-row-actions">{bank && <span className={`fa-status ${item.sepayConnectionStatus==='Connected'?'ok':'wait'}`}>{item.sepayConnectionStatus==='Connected'?'● SePay đã kết nối':'Cần kết nối SePay'}</span>}{bank && item.sepayConnectionStatus!=='Connected' && <button onClick={onConnect}>Thiết lập</button>}<button className="subtle" onClick={onToggle}>{item.isActive?'Tạm ngưng':'Kích hoạt'}</button></div></article>; }
function Rules(){return <section className="fa-card fa-rules"><h2>Quy tắc thu chi & duyệt két</h2><p>Hạn mức hiện tiếp tục sử dụng cấu hình Cash Control hiện có.</p><div><span><b>Khoản chi tại quầy cần duyệt</b><small>Từ 200.000đ trở lên</small></span><a href="/store-owner/cash-control?tab=limits">Chỉnh sửa</a></div><div><span><b>Giới hạn tổng chi mỗi ca</b><small>Không giới hạn</small></span><a href="/store-owner/cash-control?tab=limits">Chỉnh sửa</a></div></section>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="fa-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="fa-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button onClick={onClose} aria-label="Đóng"><X/></button></header>{children}</section></div>}
