import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';
import { posShiftApi } from '../../api/posShiftApi';
import type { ShiftCashMovementDto } from '../../types/posShift.types';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  branchId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

export const OwnerCashApprovalDrawer: FC<Props> = ({
  isOpen,
  branchId,
  onClose,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'drops' | 'settings'>('pending');
  const [pendingMovements, setPendingMovements] = useState<ShiftCashMovementDto[]>([]);
  const [unconfirmedDrops, setUnconfirmedDrops] = useState<ShiftCashMovementDto[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Quick settings
  const [threshold, setThreshold] = useState<number>(200000);
  const [shiftTotalLimit, setShiftTotalLimit] = useState<number>(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!branchId) return;
    try {
      const res = await posShiftApi.getPendingMovements(branchId);
      const pendings = res.movements.filter((m) => m.status === 'PendingApproval' || m.status === 2);
      const drops = res.movements.filter((m) => (m.category === 'CASH_DRAW' || m.category === 2) && !m.isConfirmedByOwner);
      setPendingMovements(pendings);
      setUnconfirmedDrops(drops);

      const cfg = await posShiftApi.getCashMovementSettings();
      if (cfg) {
        setThreshold(cfg.cashOutApprovalThreshold ?? 200000);
        setShiftTotalLimit(cfg.cashOutShiftTotalLimit ?? 0);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phê duyệt của Chủ:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const handleApprove = async (id: string) => {
    try {
      await posShiftApi.approveCashMovement(id);
      await loadData();
      onActionComplete();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phê duyệt phiếu chi');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }
    try {
      await posShiftApi.rejectCashMovement(id, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      await loadData();
      onActionComplete();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối phiếu chi');
    }
  };

  const handleConfirmDrop = async (id: string) => {
    try {
      await posShiftApi.confirmCashDrop(id);
      await loadData();
      onActionComplete();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xác nhận nhận tiền rút két');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg(null);
    try {
      await posShiftApi.updateCashMovementSettings({
        cashOutApprovalThreshold: threshold,
        cashOutShiftTotalLimit: shiftTotalLimit,
      });
      setSettingsMsg('Đã cập nhật hạn mức duyệt chi thành công!');
      setTimeout(() => setSettingsMsg(null), 3000);
      onActionComplete();
    } catch (err: any) {
      setSettingsMsg('Lỗi khi lưu cài đặt: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0f766e',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Quản Trị Duyệt Chi Két POS</h2>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>Quyền Chủ cửa hàng (Store Owner)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              color: activeTab === 'pending' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'pending' ? '2px solid #0f766e' : 'none',
              position: 'relative',
            }}
          >
            Duyệt Chi ({pendingMovements.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drops')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              color: activeTab === 'drops' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'drops' ? '2px solid #0f766e' : 'none',
            }}
          >
            Rút Két ({unconfirmedDrops.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              color: activeTab === 'settings' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'settings' ? '2px solid #0f766e' : 'none',
            }}
          >
            Cài Đặt Hạn Mức
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'pending' && (
            <div>
              {pendingMovements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                  <Check size={36} style={{ margin: '0 auto 10px', color: '#10b981' }} />
                  <div style={{ fontWeight: 600, color: '#334155' }}>Không có yêu cầu chi nào chờ duyệt</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Mọi khoản chi vặt trên quầy đều hợp lệ hoặc trong hạn mức.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingMovements.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '14px',
                        borderRadius: 8,
                        border: '1px solid #fed7aa',
                        backgroundColor: '#fffaf5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                            }}
                          >
                            VƯỢT HẠN MỨC
                          </span>
                          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: '#1e293b' }}>
                            {m.reason}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Người lập: <b>{m.createdByName || 'Thu ngân'}</b> • {new Date(m.occurredAtUtc).toLocaleTimeString('vi-VN')}
                          </div>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 16, color: '#ea580c', fontFamily: 'monospace' }}>
                          -{m.amount.toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      {/* Nút hành động */}
                      {rejectingId === m.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px dashed #fdba74' }}>
                          <input
                            type="text"
                            placeholder="Nhập lý do từ chối (*)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              fontSize: 12.5,
                            }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionReason('');
                              }}
                              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff' }}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(m.id)}
                              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600 }}
                            >
                              Xác nhận từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 6, borderTop: '1px dashed #fdba74' }}>
                          <button
                            type="button"
                            onClick={() => setRejectingId(m.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 4,
                              border: '1px solid #fca5a5',
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(m.id)}
                            style={{
                              padding: '6px 16px',
                              borderRadius: 4,
                              border: 'none',
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Duyệt chi
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'drops' && (
            <div>
              {unconfirmedDrops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                  <Check size={36} style={{ margin: '0 auto 10px', color: '#10b981' }} />
                  <div style={{ fontWeight: 600, color: '#334155' }}>Không có khoản rút két nào chờ xác nhận</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Tất cả các phiếu bàn giao tiền mặt về két chủ đã được xác nhận.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {unconfirmedDrops.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: '14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                            }}
                          >
                            RÚT KÉT NỘP CHỦ
                          </span>
                          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: '#1e293b' }}>
                            {d.reason}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Người nộp: <b>{d.createdByName || 'Thu ngân'}</b> • {new Date(d.occurredAtUtc).toLocaleTimeString('vi-VN')}
                          </div>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f766e', fontFamily: 'monospace' }}>
                          {d.amount.toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                        <button
                          type="button"
                          onClick={() => handleConfirmDrop(d.id)}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 4,
                            border: 'none',
                            backgroundColor: '#0f766e',
                            color: '#ffffff',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Xác nhận đã nhận tiền mặt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {settingsMsg && (
                <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: 13 }}>
                  {settingsMsg}
                </div>
              )}

              <div className="modal-form-group">
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                  Hạn mức phê duyệt chi két tự động (VNĐ):
                </label>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Khoản chi $\le$ hạn mức sẽ được ghi nhận ngay. Khoản chi lớn hơn hạn mức cần Chủ duyệt. Cài <b>0 đ</b> nếu muốn mọi khoản chi đều cần duyệt.
                </div>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                  className="modal-input font-mono font-bold"
                  style={{ fontSize: 14 }}
                  required
                />
              </div>

              {/* Quick chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0, 100000, 200000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThreshold(val)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: threshold === val ? '1px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: threshold === val ? '#ccfbf1' : '#ffffff',
                      color: threshold === val ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {val === 0 ? '0 đ (Bắt buộc duyệt hết)' : `${val.toLocaleString('vi-VN')} đ`}
                  </button>
                ))}
              </div>

              <div className="modal-form-group">
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                  Hạn mức tổng chi trong 1 ca (VNĐ):
                </label>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Giới hạn tổng tiền chi vặt tối đa trong 1 ca làm việc (0 = Không giới hạn).
                </div>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  value={shiftTotalLimit}
                  onChange={(e) => setShiftTotalLimit(Number(e.target.value) || 0)}
                  className="modal-input font-mono"
                  style={{ fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/store-owner/payment-config');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f766e',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Mở trang cài đặt chi tiết &rarr;
                </button>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingSettings ? 'Đang lưu...' : 'Lưu Cài Đặt Hạn Mức'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
