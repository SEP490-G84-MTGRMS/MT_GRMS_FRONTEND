import {
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Boxes,
  Search,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import type { UpsertStocktakeLineInput } from '../../types/stocktake.types';
import {
  formatCountQty,
  toBaseQty,
  toCountQty,
} from '../../utils/stocktakeCountUnit';

export interface StocktakeCountPatch {
  actualQty?: number;
  expiredQty?: number;
  damagedQty?: number;
  evidenceUrl?: string | null;
}

interface StocktakeProductEntryTableProps {
  lines: UpsertStocktakeLineInput[];
  branchId: string;
  isSearching?: boolean;
  uploadingIdx?: number | null;
  searchKeyword: string;
  onSearchKeywordChange: (val: string) => void;
  onQuickSearch: () => void;
  onOpenFindModal: () => void;
  onCountChange: (idx: number, patch: StocktakeCountPatch) => void;
  onCountUnitChange: (idx: number, unitName: string, toStockRate: number) => void;
  onRemoveLine: (idx: number) => void;
  onEvidenceUpload: (idx: number, file: File | null) => void;
  onAlert?: (message: string) => void;
  lineActualQty: (line: UpsertStocktakeLineInput) => number;
}

const thSticky: CSSProperties = {
  padding: '9px 8px',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  backgroundColor: '#f8fafc',
};

const qtyInputStyle = (active?: boolean, color?: string): CSSProperties => ({
  width: '100%',
  maxWidth: 88,
  height: 30,
  textAlign: 'right',
  padding: '0 6px',
  borderRadius: 5,
  border: active && color ? `1.5px solid ${color}` : '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  fontWeight: 700,
  color: active && color ? color : '#0f172a',
  boxSizing: 'border-box',
});

export const StocktakeProductEntryTable: FC<StocktakeProductEntryTableProps> = ({
  lines,
  branchId,
  isSearching = false,
  uploadingIdx = null,
  searchKeyword,
  onSearchKeywordChange,
  onQuickSearch,
  onOpenFindModal,
  onCountChange,
  onCountUnitChange,
  onRemoveLine,
  onEvidenceUpload,
  onAlert,
  lineActualQty,
}) => {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!searchKeyword.trim()) {
        onAlert?.('Nhập SKU hoặc tên sản phẩm rồi Enter để thêm.');
        return;
      }
      onQuickSearch();
    }
  };

  const abnormalCount = lines.filter((l) => {
    const actual = lineActualQty(l);
    return l.expiredQty > 0 || l.damagedQty > 0 || actual !== l.systemQty;
  }).length;

  return (
    <div
      style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Boxes size={16} color="#0d9488" />
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              margin: 0,
            }}
          >
            Danh sách sản phẩm kiểm kê
          </h2>
          <span
            style={{
              padding: '1px 8px',
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            {lines.length} dòng
          </span>
          {abnormalCount > 0 && (
            <span
              style={{
                padding: '1px 8px',
                borderRadius: 12,
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fcd34d',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {abnormalCount} dòng lệch / hết hạn / hư hỏng
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search
              size={16}
              color="#64748b"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              disabled={!branchId || isSearching}
              placeholder="Tìm SKU / tên SP, Enter để thêm nhanh..."
              style={{
                width: '100%',
                height: 32,
                paddingLeft: 34,
                paddingRight: 10,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: branchId ? '#fff' : '#f8fafc',
              }}
            />
          </div>
          <button
            type="button"
            disabled={!branchId || isSearching || !searchKeyword.trim()}
            onClick={onQuickSearch}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: !branchId || isSearching ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Thêm nhanh
          </button>
          <button
            type="button"
            disabled={!branchId}
            onClick={onOpenFindModal}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: !branchId ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Search size={14} />
            Tìm sản phẩm &amp; thêm
          </button>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          flex: 1,
          minHeight: 360,
          maxHeight: 'min(68vh, 640px)',
          overflow: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1180,
            borderCollapse: 'collapse',
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              <th style={{ ...thSticky, textAlign: 'center', width: 40 }}>STT</th>
              <th style={{ ...thSticky, width: 100 }}>Mã SKU</th>
              <th style={{ ...thSticky, width: 200 }}>Tên sản phẩm</th>
              <th style={{ ...thSticky, width: 110 }}>Mã lô</th>
              <th style={{ ...thSticky, textAlign: 'center', width: 120 }}>ĐVT kiểm kê</th>
              <th style={{ ...thSticky, width: 90 }}>Vị trí kệ</th>
              <th style={{ ...thSticky, textAlign: 'right', width: 96 }}>Tồn hệ thống</th>
              <th style={{ ...thSticky, textAlign: 'right', width: 100 }}>Số lượng thực tế</th>
              <th style={{ ...thSticky, textAlign: 'right', width: 100, color: '#be123c' }}>
                Số lượng hết hạn
              </th>
              <th style={{ ...thSticky, textAlign: 'right', width: 100, color: '#b45309' }}>
                Số lượng hư hỏng
              </th>
              <th style={{ ...thSticky, textAlign: 'right', width: 90 }}>Chênh lệch</th>
              <th style={{ ...thSticky, textAlign: 'center', width: 130 }}>Ảnh minh chứng</th>
              <th style={{ ...thSticky, textAlign: 'center', width: 64 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Phiếu đang trống. Tìm sản phẩm — hệ thống sẽ thêm toàn bộ lô đang có tồn.
                </td>
              </tr>
            ) : (
              (() => {
                // Sort-stable group: consecutive same productId (lines already added per product together)
                const rows: ReactNode[] = [];
                let i = 0;
                while (i < lines.length) {
                  const productId = lines[i].productId;
                  const groupStart = i;
                  while (i < lines.length && lines[i].productId === productId) i += 1;
                  const group = lines.slice(groupStart, i);
                  const groupSystem = group.reduce((s, l) => s + l.systemQty, 0);
                  const groupActual = group.reduce((s, l) => s + lineActualQty(l), 0);
                  const groupVar = groupActual - groupSystem;

                  rows.push(
                    <tr key={`grp-${productId}-${groupStart}`} style={{ backgroundColor: '#f0fdfa' }}>
                      <td
                        colSpan={6}
                        style={{
                          padding: '7px 10px',
                          fontWeight: 700,
                          color: '#0f766e',
                          fontSize: 12,
                        }}
                      >
                        {group[0].sku} · {group[0].productName}
                        <span style={{ fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
                          ({group.length} lô)
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                        }}
                      >
                        {groupSystem}
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                        }}
                      >
                        {groupActual}
                      </td>
                      <td colSpan={2} />
                      <td
                        style={{
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: groupVar < 0 ? '#dc2626' : groupVar > 0 ? '#2563eb' : '#15803d',
                        }}
                      >
                        {groupVar > 0 ? `+${groupVar}` : groupVar}
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
                          Tổng SP
                        </div>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  );

                  group.forEach((line, gIdx) => {
                    const idx = groupStart + gIdx;
                    const actualQty = lineActualQty(line);
                    const varianceQty = actualQty - line.systemQty;
                    const needsEvidence = line.expiredQty > 0 || line.damagedQty > 0;
                    const hasIssue = needsEvidence || varianceQty !== 0;
                    const rate = Number(line.countToStockRate) > 0 ? Number(line.countToStockRate) : 1;
                    const unitOpts =
                      line.countUnitOptions && line.countUnitOptions.length > 0
                        ? line.countUnitOptions
                        : [{ name: line.countUnit || line.unit || 'Cái', toStockRate: rate }];
                    const countUnitLabel = line.countUnit || line.unit || 'Cái';
                    const systemCount = toCountQty(line.systemQty, rate);
                    const actualCount = toCountQty(actualQty, rate);
                    const expiredCount = toCountQty(line.expiredQty, rate);
                    const damagedCount = toCountQty(line.damagedQty, rate);
                    const varianceCount = toCountQty(varianceQty, rate);

                    rows.push(
                      <tr
                        key={`${line.branchStockId || line.productId}_${idx}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: hasIssue ? '#fffbeb' : '#ffffff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0d9488',
                          }}
                        >
                          {line.sku}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            fontWeight: 600,
                            color: '#0f172a',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.35,
                          }}
                          title={line.productName}
                        >
                          {line.productName}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0f766e',
                          }}
                        >
                          {line.batchCode || '—'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <select
                            value={countUnitLabel}
                            disabled={unitOpts.length <= 1}
                            onChange={(e) => {
                              const selected = unitOpts.find((o) => o.name === e.target.value);
                              onCountUnitChange(
                                idx,
                                selected?.name || e.target.value,
                                selected?.toStockRate || 1
                              );
                            }}
                            title={
                              rate > 1
                                ? `1 ${countUnitLabel} = ${formatCountQty(rate)} ${line.stockUnit || 'đvt tồn'}`
                                : 'Đơn vị tồn kho'
                            }
                            style={{
                              maxWidth: 110,
                              height: 30,
                              borderRadius: 5,
                              border: '1px solid #cbd5e1',
                              backgroundColor: unitOpts.length > 1 ? '#f0fdfa' : '#ffffff',
                              fontWeight: 700,
                              color: '#0f766e',
                              fontSize: 12,
                              padding: '0 4px',
                            }}
                          >
                            {unitOpts.map((o) => (
                              <option key={o.name} value={o.name}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                          {rate > 1 && (
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                              1={formatCountQty(rate)} {line.stockUnit || 'base'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {line.shelfLocation || '—'}
                        </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                      }}
                    >
                      {formatCountQty(systemCount)}
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>
                        {countUnitLabel}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={formatCountQty(actualCount)}
                        onChange={(e) =>
                          onCountChange(idx, {
                            actualQty: toBaseQty(Math.max(0, Number(e.target.value) || 0), rate),
                          })
                        }
                        style={qtyInputStyle()}
                      />
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={formatCountQty(expiredCount)}
                        onChange={(e) =>
                          onCountChange(idx, {
                            expiredQty: toBaseQty(Math.max(0, Number(e.target.value) || 0), rate),
                          })
                        }
                        style={qtyInputStyle(line.expiredQty > 0, '#be123c')}
                      />
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={formatCountQty(damagedCount)}
                        onChange={(e) =>
                          onCountChange(idx, {
                            damagedQty: toBaseQty(Math.max(0, Number(e.target.value) || 0), rate),
                          })
                        }
                        style={qtyInputStyle(line.damagedQty > 0, '#b45309')}
                      />
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color:
                          varianceQty < 0 ? '#dc2626' : varianceQty > 0 ? '#2563eb' : '#15803d',
                      }}
                    >
                      {varianceCount > 0
                        ? `+${formatCountQty(varianceCount)}`
                        : formatCountQty(varianceCount)}
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>
                        {countUnitLabel}
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[idx] = el;
                        }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0] || null;
                          onEvidenceUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                      {line.evidenceUrl ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <a
                            href={line.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-block',
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <img
                              src={line.evidenceUrl}
                              alt="Minh chứng"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </a>
                          <button
                            type="button"
                            onClick={() => onCountChange(idx, { evidenceUrl: null })}
                            title="Gỡ ảnh"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={uploadingIdx === idx || !needsEvidence}
                          title={
                            needsEvidence
                              ? 'Tải ảnh minh chứng'
                              : 'Chỉ cần ảnh khi có hết hạn hoặc hư hỏng'
                          }
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          style={{
                            height: 28,
                            padding: '0 8px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            background: needsEvidence ? '#fffbeb' : '#f8fafc',
                            color: needsEvidence ? '#b45309' : '#94a3b8',
                            cursor: needsEvidence ? 'pointer' : 'default',
                            opacity: needsEvidence ? 1 : 0.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {uploadingIdx === idx ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ImagePlus size={14} />
                          )}
                          {needsEvidence ? 'Thêm ảnh' : '—'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveLine(idx)}
                        title="Xóa dòng khỏi phiếu"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                    );
                  });
                }
                return rows;
              })()
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
