import { useEffect, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { AuditLogTable, AuditLogDetailModal } from '../../features/admin/components';
import { auditApi, type AuditLogPageData } from '../../features/admin/api/auditApi';
import type { AuditLogItem, AuditFilterParams } from '../../features/admin/types/audit.types';
import { TablePagination } from '../../components/common';
import './adminPlans.css';
import './auditLog.css';

const emptyPage: AuditLogPageData = { items: [], total: 0, page: 1, pageSize: 20, actionTypes: [] };

export const AuditLogPage = () => {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('ALL');
  const [dateRange, setDateRange] = useState<AuditFilterParams['dateRange']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(emptyPage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(keyword.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    auditApi.getAuditLogs({ keyword: search, actionType, dateRange, page, pageSize }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(emptyPage);
          setError('Không tải được nhật ký kiểm toán. Vui lòng thử lại.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [search, actionType, dateRange, page, pageSize, refresh]);

  const exportPage = () => {
    // Quote all values and prevent user-controlled values from becoming spreadsheet formulas.
    const cell = (value: string) => {
      const safe = /^[=+@\-\t\r\n]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const rows = data.items.map(log => [
      log.id, new Date(log.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      log.actorName, log.actorRole, log.actionType, log.targetType, log.targetId, log.tenantId || '', log.ipAddress,
    ]);
    const content = [['Mã nhật ký', 'Thời gian Việt Nam', 'Người thực hiện', 'Vai trò', 'Hành động',
      'Đối tượng', 'Mã đối tượng', 'Mã cửa hàng', 'IP'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'THViet_Audit_Logs.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="admin-plans admin-audit-logs">
      <header className="plans-hero">
        <div>
          <p className="plans-eyebrow">GIÁM SÁT NỀN TẢNG</p>
          <h1>Nhật ký kiểm toán</h1>
          <p>Tra cứu lịch sử thao tác, người thực hiện và dữ liệu thay đổi trên hệ thống.</p>
        </div>
        <div className="plans-toolbar-actions">
          <button className="admin-btn admin-btn-secondary" onClick={() => setRefresh(value => value + 1)} disabled={isLoading}>
            <RefreshCw size={16} /> Làm mới
          </button>
          <button className="admin-btn admin-btn-primary" onClick={exportPage} disabled={isLoading || !!error || !data.items.length}>
            <Download size={16} /> Xuất CSV trang này
          </button>
        </div>
      </header>
      <div className="plans-toolbar audit-toolbar">
        <label className="plans-search">
          <Search size={17} />
          <input aria-label="Tìm nhật ký" value={keyword} maxLength={200}
            onChange={event => setKeyword(event.target.value)}
            placeholder="Tìm người thực hiện, hành động, mã đối tượng, IP..." />
        </label>
        <select aria-label="Loại hành động" value={actionType}
          onChange={event => { setActionType(event.target.value); setPage(1); }}>
          <option value="ALL">Tất cả hành động</option>
          {Array.from(new Set([...data.actionTypes, ...(actionType === 'ALL' ? [] : [actionType])])).map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select aria-label="Thời gian" value={dateRange}
          onChange={event => { setDateRange(event.target.value as AuditFilterParams['dateRange']); setPage(1); }}>
          <option value="all">Toàn bộ thời gian</option>
          <option value="today">Hôm nay</option>
          <option value="7d">7 ngày gần nhất</option>
          <option value="30d">30 ngày gần nhất</option>
        </select>
      </div>
      <div className="audit-meta"><span>Thời gian hiển thị theo Việt Nam (UTC+7)</span><span>Nhật ký chỉ đọc</span></div>
      {error ? (
        <div className="audit-state" role="alert">
          <p>{error}</p>
          <button className="admin-btn admin-btn-secondary" onClick={() => setRefresh(value => value + 1)}>Thử lại</button>
        </div>
      ) : (
        <section className="plans-table-card" aria-busy={isLoading}>
          <div className="plans-table-summary">
            {isLoading ? 'Đang tải nhật ký...' : <><strong>{data.total.toLocaleString('vi-VN')}</strong> bản ghi phù hợp</>}
          </div>
          {isLoading ? <div className="audit-state" role="status">Đang tải nhật ký kiểm toán...</div> : (
            <AuditLogTable logs={data.items} onSelectLog={setSelectedLog} />
          )}
          {!isLoading && <TablePagination currentPage={data.page} pageSize={pageSize} totalItems={data.total}
            itemLabel="bản ghi" onPageChange={setPage}
            onPageSizeChange={size => { setPageSize(size); setPage(1); }} />}
        </section>
      )}
      <AuditLogDetailModal log={selectedLog} isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};
