import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  BarChart3,
  Plus,
  Printer,
  Wallet,
  TrendingUp,
  Banknote,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { ShiftKpiCard } from '../components/ShiftKpiCard';
import { ShiftRevenueTable } from '../components/ShiftRevenueTable';
import { ShiftCashInOutTable } from '../components/ShiftCashInOutTable';
import { CashCountingTable } from '../components/CashCountingTable';
import { CashReconciliation } from '../components/CashReconciliation';
import { ShiftHandoverForm } from '../components/ShiftHandoverForm';
import { ShiftHistoryFilter } from '../components/ShiftHistoryFilter';
import { ShiftHistoryTable } from '../components/ShiftHistoryTable';
import { CashInOutModal } from '../components/modals/CashInOutModal';
import { ZReportModal } from '../components/modals/ZReportModal';
import { EditFloatModal } from '../components/modals/EditFloatModal';
import {
  mockCurrentShiftInfo,
  mockPaymentMethodRevenues,
  mockCashInOutTransactions,
  initialDenominations,
  mockShiftHistory,
  mockHistoryKpis,
} from '../mock/posMockData';
import type {
  CashInOutTransaction,
  DenominationItem,
  ShiftHandoverData,
  ShiftHistoryFilterState,
  ShiftKpiItem,
} from '../types/pos.types';
import '../pos.css';

export const PosShiftPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const salesPath = location.pathname.startsWith('/employee/pos') ? '/employee/pos' : '/pos';

  // Active Main Tab: 'current_shift' vs 'shift_reports'
  const [activeTab, setActiveTab] = useState<'current_shift' | 'shift_reports'>('current_shift');

  // Shift & Cash Data
  const shiftInfo = mockCurrentShiftInfo;
  const revenues = mockPaymentMethodRevenues;
  const [transactions, setTransactions] = useState<CashInOutTransaction[]>(mockCashInOutTransactions);
  const [denominations, setDenominations] = useState<DenominationItem[]>(initialDenominations);

  // Số tiền mặt mở ca (Opening Float) - Có thể khai báo / chỉnh sửa
  const [initialFloat, setInitialFloat] = useState<number>(1500000);

  // Modals state
  const [isCashInOutOpen, setIsCashInOutOpen] = useState(false);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [isEditFloatOpen, setIsEditFloatOpen] = useState(false);

  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<ShiftHistoryFilterState>({
    timePreset: 'today',
    customDate: '2026-09-25',
    cashierName: 'all',
    branchName: 'all',
  });

  // 1. Tính tổng tiền mặt thực tế kiểm đếm từ 9 mệnh giá
  const totalSheets = useMemo(() => {
    return denominations.reduce((sum, d) => sum + d.count, 0);
  }, [denominations]);

  const actualCash = useMemo(() => {
    return denominations.reduce((sum, d) => sum + d.value * d.count, 0);
  }, [denominations]);

  // 2. Tính tiền mặt lý thuyết trong két (= Đầu ca + Doanh thu tiền mặt + Thu két - Chi két)
  const theoreticalCash = useMemo(() => {
    const cashRevenue = revenues.find((r) => r.id === 'cash')?.amount || 0;
    const netTransactions = transactions.reduce((acc, tx) => {
      if (tx.code === 'PTC001') return acc; // initial float declaration
      return tx.type === 'in' ? acc + tx.amount : acc - tx.amount;
    }, 0);
    return initialFloat + cashRevenue + netTransactions;
  }, [initialFloat, transactions, revenues]);

  // Handler đổi số tờ của từng mệnh giá
  const handleCountChange = (denomValue: number, newCount: number) => {
    setDenominations((prev) =>
      prev.map((d) => (d.value === denomValue ? { ...d, count: newCount } : d))
    );
  };

  // Thêm giao dịch Thu / Chi két mới
  const handleSaveCashInOut = (newTx: CashInOutTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    alert(`Đã lập thành công phiếu ${newTx.typeLabel}: ${newTx.amount.toLocaleString('vi-VN')} đ`);
  };

  // Cập nhật số tiền đầu ca
  const handleSaveInitialFloat = (newFloat: number) => {
    setInitialFloat(newFloat);
    // Cập nhật phiếu PTC001 nếu có
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.code === 'PTC001' ? { ...tx, amount: newFloat } : tx
      )
    );
    alert(`Đã cập nhật tiền mặt đầu ca (Float) thành: ${newFloat.toLocaleString('vi-VN')} đ`);
  };

  // Đóng ca & Bàn giao quầy
  const handleCloseShift = (data: ShiftHandoverData) => {
    alert(
      `ĐÃ ĐÓNG CA THÀNH CÔNG!\n- Mã ca: ${shiftInfo.shiftCode}\n- Người nhận: ${data.receiverName}\n- Tiền bàn giao: ${data.cashHandedOver.toLocaleString(
        'vi-VN'
      )} đ\nHệ thống sẽ chuyển bạn về màn hình bán hàng.`
    );
    navigate(salesPath);
  };

  // Lọc danh sách lịch sử ca
  const filteredShifts = useMemo(() => {
    return mockShiftHistory.filter((s) => {
      if (historyFilter.cashierName !== 'all' && s.cashierName !== historyFilter.cashierName) {
        return false;
      }
      if (historyFilter.branchName !== 'all' && s.branchName !== historyFilter.branchName) {
        return false;
      }
      return true;
    });
  }, [historyFilter]);

  // 4 KPI Cards ca hiện tại
  const currentShiftKpis: ShiftKpiItem[] = useMemo(() => {
    const cashRev = revenues.find((r) => r.id === 'cash')?.amount || 0;
    const nonCashRev = revenues
      .filter((r) => r.id !== 'cash')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalRev = cashRev + nonCashRev;

    return [
      {
        id: 'float',
        title: 'Tiền mặt đầu ca (Float)',
        value: initialFloat,
        formattedValue: `${initialFloat.toLocaleString('vi-VN')} đ`,
        subtitle: 'Khai báo lúc mở ca (Bấm để sửa)',
        colorType: 'primary',
      },
      {
        id: 'revenue',
        title: 'Tổng doanh thu bán hàng',
        value: totalRev,
        formattedValue: `${totalRev.toLocaleString('vi-VN')} đ`,
        subtitle: '48 đơn hoàn tất • 0 đơn hoàn trả',
        colorType: 'success',
      },
      {
        id: 'cash_actual',
        title: 'Tiền mặt thu thực tế quầy',
        value: cashRev,
        formattedValue: `${cashRev.toLocaleString('vi-VN')} đ`,
        subtitle: '26 lượt giao dịch tiền mặt',
        colorType: 'warning',
      },
      {
        id: 'non_cash',
        title: 'Tiền chuyển khoản / Thẻ / Ví',
        value: nonCashRev,
        formattedValue: `${nonCashRev.toLocaleString('vi-VN')} đ`,
        subtitle: 'Dynamic VietQR, Thẻ POS, MoMo',
        colorType: 'info',
      },
    ];
  }, [initialFloat, revenues]);

  const getKpiIcon = (id: string) => {
    switch (id) {
      case 'float':
        return <Wallet size={16} className="text-teal-700" />;
      case 'revenue':
        return <TrendingUp size={16} className="text-emerald-600" />;
      case 'cash_actual':
        return <Banknote size={16} className="text-amber-600" />;
      case 'non_cash':
        return <CreditCard size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const getHistoryKpiIcon = (id: string) => {
    switch (id) {
      case 'hist_in':
        return <Banknote size={16} className="text-emerald-600" />;
      case 'hist_out':
        return <Wallet size={16} className="text-amber-600" />;
      case 'hist_balance':
        return <TrendingUp size={16} className="text-teal-700" />;
      case 'hist_rate':
        return <Calendar size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* 1. THANH TIÊU ĐỀ DUY NHẤT (UNIFIED SINGLE HEADER) - GỌN GÀNG, CHỐNG TRÀN VÀ ĐÈ NHAU */}
      <header className="pos-shift-unified-header">
        {/* Khối trái: Nút quay lại bán hàng + Tên màn hình */}
        <div className="unified-header-left">
          <button
            type="button"
            className="pos-back-to-sales-btn"
            onClick={() => navigate(salesPath)}
            title="Quay lại quầy bán hàng POS"
          >
            <ArrowLeft size={15} />
            <span>Bán Hàng</span>
          </button>

          <div className="unified-header-divider" />

          <div className="unified-header-title-box">
            <h1 className="unified-header-title">Sổ Quỹ &amp; Ca Thu Ngân</h1>
            <div className="unified-header-subtitle">
              Chi nhánh trung tâm &bull; POS-01 &bull; #{shiftInfo.shiftCode}
            </div>
          </div>
        </div>

        {/* Khối giữa: 2 Tab chính */}
        <div className="unified-header-center">
          <div className="unified-tabs-group">
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'current_shift' ? 'active' : ''}`}
              onClick={() => setActiveTab('current_shift')}
            >
              <Clock size={14} />
              <span>Ca Bán Hàng &amp; Kết Ca</span>
            </button>
            <button
              type="button"
              className={`unified-tab-btn ${activeTab === 'shift_reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('shift_reports')}
            >
              <BarChart3 size={14} />
              <span>Lịch Sử Sổ Quỹ</span>
            </button>
          </div>
        </div>

        {/* Khối phải: Tiền đầu ca, Thu/Chi, Z-Report, Badge Thu ngân */}
        <div className="unified-header-right">
          <button
            type="button"
            className="pos-btn-secondary-pill"
            onClick={() => setIsEditFloatOpen(true)}
            title="Khai báo hoặc chỉnh sửa tiền mặt đầu ca (Float)"
          >
            <Wallet size={14} />
            <span>Tiền Đầu Ca</span>
          </button>
          <button
            type="button"
            className="pos-btn-secondary-pill"
            onClick={() => setIsCashInOutOpen(true)}
            title="Lập phiếu thu/chi nội bộ két"
          >
            <Plus size={14} />
            <span>Thu / Chi Két</span>
          </button>
          <button
            type="button"
            className="pos-btn-primary-pill"
            onClick={() => setIsZReportOpen(true)}
            title="Xem & in báo cáo Z-Report K80"
          >
            <Printer size={14} />
            <span>Z-Report</span>
          </button>
          <div className="pos-cashier-badge">
            NV: <b>{shiftInfo.cashierName}</b>
          </div>
        </div>
      </header>

      {/* 2. KHUNG CUỘN CHÍNH (BODY CONTAINER CÓ MIN-H-0 & OVERFLOW-Y: AUTO) */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'current_shift' ? (
          <div className="shift-content-layout">
            {/* Thanh thông tin phiên ca on-duty */}
            <div className="shift-info-bar-card">
              <div className="info-bar-item">
                <span className="info-label">Ca làm việc:</span>
                <span className="info-value"><b>{shiftInfo.shiftName}</b></span>
              </div>
              <div className="info-bar-item">
                <span className="info-label">Bắt đầu ca:</span>
                <span className="info-value font-mono">{shiftInfo.startTime}</span>
              </div>
              <div className="info-bar-item">
                <span className="info-label">Thời gian trực:</span>
                <span className="info-value"><b>{shiftInfo.durationText}</b></span>
              </div>
              <div className="info-bar-item">
                <span className="info-label">Quản lý giám sát:</span>
                <span className="info-value"><b>{shiftInfo.supervisorName}</b></span>
              </div>
              <div className="info-bar-item">
                <span className="info-label">Trạng thái:</span>
                <span className="shift-status-badge on-duty font-semibold">
                  ● Đang Hoạt Động (On-Duty)
                </span>
              </div>
            </div>

            {/* 4 Thẻ KPI ca hiện tại (Bấm vào thẻ Đầu ca để mở modal sửa tiền đầu ca) */}
            <div className="shift-kpi-grid">
              {currentShiftKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  onClick={kpi.id === 'float' ? () => setIsEditFloatOpen(true) : undefined}
                  style={kpi.id === 'float' ? { cursor: 'pointer' } : undefined}
                  title={kpi.id === 'float' ? 'Bấm để sửa tiền mặt đầu ca' : undefined}
                >
                  <ShiftKpiCard
                    title={kpi.title}
                    value={kpi.formattedValue}
                    subtitle={kpi.subtitle}
                    colorType={kpi.colorType}
                    icon={getKpiIcon(kpi.id)}
                  />
                </div>
              ))}
            </div>

            {/* Layout 2 cột: Cột trái (Doanh thu & Thu chi) - Cột phải (Đếm tiền & Bàn giao) */}
            <div className="shift-columns-grid">
              {/* Cột trái */}
              <div className="shift-column-left">
                <ShiftRevenueTable revenues={revenues} />
                <ShiftCashInOutTable
                  transactions={transactions}
                  theoreticalCash={theoreticalCash}
                  onOpenAddModal={() => setIsCashInOutOpen(true)}
                />
              </div>

              {/* Cột phải */}
              <div className="shift-column-right">
                <div className="pos-shift-card">
                  <CashCountingTable
                    denominations={denominations}
                    onCountChange={handleCountChange}
                    totalSheets={totalSheets}
                    totalCash={actualCash}
                  />

                  <CashReconciliation
                    theoreticalCash={theoreticalCash}
                    actualCash={actualCash}
                  />

                  <ShiftHandoverForm
                    actualCash={actualCash}
                    onOpenZReportModal={() => setIsZReportOpen(true)}
                    onCloseShift={handleCloseShift}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: BÁO CÁO SỔ QUỸ & LỊCH SỬ ĐÓNG CA */
          <div className="shift-content-layout">
            {/* Bộ lọc lịch sử */}
            <ShiftHistoryFilter
              filter={historyFilter}
              onFilterChange={(updater) => setHistoryFilter((prev) => ({ ...prev, ...updater }))}
            />

            {/* 4 Thẻ KPI tổng hợp lịch sử */}
            <div className="shift-kpi-grid">
              {mockHistoryKpis.map((kpi) => (
                <ShiftKpiCard
                  key={kpi.id}
                  title={kpi.title}
                  value={kpi.formattedValue}
                  subtitle={kpi.subtitle}
                  colorType={kpi.colorType}
                  icon={getHistoryKpiIcon(kpi.id)}
                />
              ))}
            </div>

            {/* Bảng lịch sử các ca */}
            <ShiftHistoryTable
              shifts={filteredShifts}
              onOpenZReport={() => setIsZReportOpen(true)}
            />
          </div>
        )}
      </main>

      {/* 3. Modals */}
      <EditFloatModal
        isOpen={isEditFloatOpen}
        currentFloat={initialFloat}
        onClose={() => setIsEditFloatOpen(false)}
        onSave={handleSaveInitialFloat}
      />

      <CashInOutModal
        isOpen={isCashInOutOpen}
        onClose={() => setIsCashInOutOpen(false)}
        onSave={handleSaveCashInOut}
      />

      <ZReportModal
        isOpen={isZReportOpen}
        onClose={() => setIsZReportOpen(false)}
        shiftInfo={shiftInfo}
        revenues={revenues}
        actualCash={actualCash}
        theoreticalCash={theoreticalCash}
        initialFloat={initialFloat}
      />
    </div>
  );
};
