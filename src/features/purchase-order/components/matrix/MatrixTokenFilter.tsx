import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

export type MatrixTokenOption = {
  id: string;
  /** Giá trị token khi chọn (mã hoặc tên). */
  value: string;
  primary: string;
  secondary?: string;
};

interface MatrixTokenFilterProps {
  label: string;
  placeholder: string;
  /** Chiều rộng cố định của ô (px). */
  width: number;
  tokens: string[];
  options: MatrixTokenOption[];
  onChange: (tokens: string[]) => void;
  /** Chỉ match primary khi gõ tìm. */
  matchPrimaryOnly?: boolean;
}

const CTRL_H = 32;

function highlightMatch(text: string, query: string) {
  if (!text || !query.trim()) return <span>{text}</span>;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const qLower = q.toLowerCase();
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === qLower ? (
          <mark
            key={`${part}-${i}`}
            style={{
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              fontWeight: 700,
              padding: '0 2px',
              borderRadius: 2,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        )
      )}
    </span>
  );
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/**
 * Multi-token filter — width cố định.
 * Ô đóng: hiện tóm tắt "N đã chọn" (không cắt chữ bằng …).
 * Dropdown: liệt kê đủ nội dung đã chọn + gợi ý.
 */
export const MatrixTokenFilter: FC<MatrixTokenFilterProps> = ({
  label,
  placeholder,
  width,
  tokens,
  options,
  onChange,
  matchPrimaryOnly = true,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tokenSet = useMemo(
    () => new Set(tokens.map((t) => t.toLowerCase())),
    [tokens]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (tokenSet.has(o.value.toLowerCase())) return false;
      if (!q) return true;
      if (o.primary.toLowerCase().includes(q)) return true;
      if (matchPrimaryOnly) return false;
      return (
        (o.secondary && o.secondary.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [options, query, tokenSet, matchPrimaryOnly]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query, open]);

  const addToken = (value: string) => {
    const next = uniqueCaseInsensitive([...tokens, value]);
    onChange(next);
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeToken = (value: string) => {
    onChange(tokens.filter((t) => t.toLowerCase() !== value.toLowerCase()));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open && filtered.length) {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === 'ArrowUp' && open && filtered.length) {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[focusedIndex]) {
        addToken(filtered[focusedIndex].value);
        return;
      }
      if (query.trim()) {
        addToken(query.trim());
      }
      return;
    }
    if (e.key === 'Backspace' && !query && tokens.length) {
      removeToken(tokens[tokens.length - 1]);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const hasTokens = tokens.length > 0;
  const summaryTitle = hasTokens ? tokens.join(', ') : undefined;
  const panelWidth = Math.max(width, 320);

  return (
    <div ref={rootRef} className="po-filter-field" style={{ position: 'relative', flexShrink: 0 }}>
      <label className="po-filter-label">{label}</label>
      <div style={{ position: 'relative', width, flexShrink: 0 }}>
        <div
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 4,
            width,
            height: CTRL_H,
            padding: '0 26px 0 6px',
            borderRadius: 6,
            border: open || hasTokens ? '1px solid #0d9488' : '1px solid #cbd5e1',
            backgroundColor: hasTokens ? '#f0fdfa' : '#ffffff',
            boxShadow: open ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
            boxSizing: 'border-box',
            cursor: 'text',
            overflow: 'hidden',
          }}
        >
          {hasTokens && !open && !query && (
            <span
              title={summaryTitle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 22,
                padding: '0 8px',
                borderRadius: 4,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid #99f6e4',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {tokens.length} đã chọn
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={hasTokens ? (open ? placeholder : '') : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              flex: '1 1 48px',
              minWidth: 40,
              width: 0,
              height: 24,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 12.5,
              color: '#0f172a',
            }}
          />
        </div>
        <ChevronsUpDown
          size={13}
          style={{ position: 'absolute', right: 8, top: 9, color: '#94a3b8', pointerEvents: 'none' }}
        />

        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: panelWidth,
              marginTop: 4,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
              zIndex: 90,
              maxHeight: 320,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {hasTokens && (
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 4 }}>
                <div
                  style={{
                    padding: '6px 12px 4px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  Đã chọn ({tokens.length})
                </div>
                {tokens.map((t) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '6px 10px 6px 12px',
                      backgroundColor: '#f0fdfa',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {t}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => removeToken(t)}
                      title="Gỡ"
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        border: '1px solid #99f6e4',
                        borderRadius: 4,
                        background: '#ccfbf1',
                        color: '#0f766e',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: '#64748b' }}>
                {query.trim()
                  ? 'Không có gợi ý — Enter để thêm giá trị đang gõ'
                  : hasTokens
                    ? 'Không còn mục nào để thêm'
                    : 'Không có mục nào'}
              </div>
            ) : (
              filtered.slice(0, 80).map((item, index) => {
                const active = index === focusedIndex;
                return (
                  <button
                    key={`${item.id}-${item.value}`}
                    type="button"
                    onMouseEnter={() => setFocusedIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addToken(item.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      backgroundColor: active ? '#f0fdfa' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {highlightMatch(item.primary, query)}
                    </div>
                    {item.secondary && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: '#64748b',
                          marginTop: 2,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.35,
                        }}
                      >
                        {highlightMatch(item.secondary, query)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrixTokenFilter;
