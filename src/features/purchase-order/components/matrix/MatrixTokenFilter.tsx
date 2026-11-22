import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

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
 * Multi-token filter — chip highlight ngay trong ô input (không dùng "N đã chọn").
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
  const chipBoxRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = chipBoxRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [tokens]);

  const addToken = (value: string) => {
    const next = uniqueCaseInsensitive([...tokens, value]);
    onChange(next);
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeToken = (value: string) => {
    onChange(tokens.filter((t) => t.toLowerCase() !== value.toLowerCase()));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearAll = () => {
    onChange([]);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
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
  const panelWidth = Math.max(width, 320);

  return (
    <div ref={rootRef} className="po-filter-field" style={{ position: 'relative', flexShrink: 0 }}>
      <label className="po-filter-label">{label}</label>
      <div style={{ position: 'relative', width, flexShrink: 0 }}>
        <div
          ref={chipBoxRef}
          className="supplier-chip-input"
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
            padding: hasTokens || query ? '0 28px 0 6px' : '0 10px 0 6px',
            borderRadius: 6,
            border: open || hasTokens ? '1px solid #0d9488' : '1px solid #cbd5e1',
            backgroundColor: hasTokens ? '#f0fdfa' : '#ffffff',
            boxShadow: open ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
            boxSizing: 'border-box',
            cursor: 'text',
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          {tokens.map((token) => (
            <span
              key={token}
              title={token}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
                maxWidth: Math.max(120, width - 80),
                height: 22,
                padding: '0 4px 0 8px',
                borderRadius: 4,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid #99f6e4',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {token}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToken(token);
                }}
                title="Xóa"
                style={{
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                  border: 'none',
                  background: 'transparent',
                  color: '#0f766e',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={hasTokens ? 'Thêm...' : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              flex: '1 1 60px',
              minWidth: 50,
              height: 24,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 12.5,
              color: '#0f172a',
            }}
          />
        </div>

        {hasTokens || query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            title="Xóa toàn bộ"
            style={{
              position: 'absolute',
              right: 4,
              top: 5,
              width: 22,
              height: 22,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>
        ) : null}

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
              maxHeight: 280,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
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
