import type { FC } from 'react';
import { Coins } from 'lucide-react';
import type { DenominationItem } from '../types/pos.types';

interface Props {
  denominations: DenominationItem[];
  onCountChange: (denomValue: number, newCount: number) => void;
  totalSheets: number;
  totalCash: number;
}

export const CashCountingTable: FC<Props> = ({
  denominations,
  onCountChange,
  totalSheets,
  totalCash,
}) => {
  // Tách 9 mệnh giá thành 2 cột cân xứng (Cột 1: 500k-20k, Cột 2: 10k-1k)
  const col1 = denominations.slice(0, 5);
  const col2 = denominations.slice(5);

  const renderRow = (d: DenominationItem) => {
    const subtotal = d.value * d.count;
    return (
      <tr key={d.value}>
        <td style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>
          <span className="font-mono font-semibold text-slate-800 text-[11px] whitespace-nowrap">{d.label}</span>
        </td>
        <td style={{ textAlign: 'center', padding: '5px 2px', whiteSpace: 'nowrap' }}>
          <div className="denomination-input-wrapper">
            <input
              type="number"
              min={0}
              value={d.count === 0 ? '' : d.count}
              placeholder="0"
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                onCountChange(d.value, val);
              }}
              className="denomination-count-input font-mono tabular-nums"
              style={{ width: '42px', height: '24px', fontSize: '11px', padding: '0 2px' }}
            />
            <span className="denomination-unit text-[10.5px]">tờ</span>
          </div>
        </td>
        <td style={{ textAlign: 'right', padding: '5px 6px', whiteSpace: 'nowrap' }}>
          <span className="font-mono tabular-nums font-semibold text-slate-700 text-[11px] whitespace-nowrap">
            {subtotal.toLocaleString('vi-VN')} đ
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="pos-cash-counting-wrapper">
      <div className="pos-shift-card-header">
        <h3 className="pos-shift-card-title">
          <Coins size={16} className="text-teal-700" />
          <span>Kiểm Đếm Tiền Mặt Thực Tế (9 Mệnh Giá)</span>
        </h3>
        <span className="text-[11.5px] text-slate-500 font-medium">
          Nhập số tờ để tự động tính
        </span>
      </div>

      {/* Lưới 2 cột mệnh giá song song giúp thu gọn 50% chiều cao */}
      <div className="counting-two-columns-grid">
        <div className="counting-col-table">
          <table className="pos-shift-table compact-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 11, padding: '5px 6px', whiteSpace: 'nowrap' }}>Mệnh giá</th>
                <th style={{ textAlign: 'center', width: '65px', fontSize: 11, padding: '5px 2px', whiteSpace: 'nowrap' }}>Số tờ</th>
                <th style={{ textAlign: 'right', width: '85px', fontSize: 11, padding: '5px 6px', whiteSpace: 'nowrap' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>{col1.map(renderRow)}</tbody>
          </table>
        </div>

        <div className="counting-col-table">
          <table className="pos-shift-table compact-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 11, padding: '5px 6px', whiteSpace: 'nowrap' }}>Mệnh giá</th>
                <th style={{ textAlign: 'center', width: '65px', fontSize: 11, padding: '5px 2px', whiteSpace: 'nowrap' }}>Số tờ</th>
                <th style={{ textAlign: 'right', width: '85px', fontSize: 11, padding: '5px 6px', whiteSpace: 'nowrap' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {col2.map(renderRow)}
              {/* Dòng cân bằng số hàng 5x5 giữa 2 cột */}
              <tr style={{ backgroundColor: '#fafafa' }}>
                <td style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>
                  <span className="text-[10.5px] text-slate-400 font-medium">Tiền xu/lẻ:</span>
                </td>
                <td style={{ textAlign: 'center', padding: '5px 2px', whiteSpace: 'nowrap' }}>
                  <span className="text-[10.5px] text-slate-400 font-mono">0 tờ</span>
                </td>
                <td style={{ textAlign: 'right', padding: '5px 6px', whiteSpace: 'nowrap' }}>
                  <span className="font-mono text-[10.5px] text-slate-400">0 đ</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dải tổng hợp tiền mặt kiểm đếm gọn gàng */}
      <div className="counting-summary-strip">
        <div className="counting-summary-item">
          <span className="text-slate-600 text-xs">Tổng số tờ:</span>
          <b className="font-mono text-teal-800 text-xs">{totalSheets} tờ</b>
        </div>
        <div className="counting-summary-item highlight">
          <span className="text-slate-700 text-xs font-bold">TỔNG THỰC ĐẾM:</span>
          <span className="counted-total-value font-mono tabular-nums text-sm font-bold text-emerald-700">
            {totalCash.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>
    </div>
  );
};
