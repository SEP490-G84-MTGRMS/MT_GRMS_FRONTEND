import { useState, useMemo, type FC } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<K extends string = string> {
  key: K | null;
  direction: SortDirection;
}

export function useTableSort<T, K extends string>(
  items: T[],
  accessors: Record<K, (item: T) => string | number | null | undefined>
) {
  const [sort, setSort] = useState<SortState<K>>({ key: null, direction: null });

  const handleSort = (key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const sortedItems = useMemo(() => {
    if (!sort.key || !sort.direction) return items;
    const getter = accessors[sort.key];
    if (!getter) return items;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb), 'vi', { numeric: true }) * dir;
    });
  }, [items, sort.key, sort.direction]);

  return { sort, handleSort, sortedItems };
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
}

export const SortableHeader: FC<SortableHeaderProps> = ({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}) => {
  const justify =
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: justify,
        gap: 4,
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        width: '100%',
        font: 'inherit',
        color: active ? '#0f766e' : 'inherit',
        textTransform: 'inherit',
        letterSpacing: 'inherit',
        cursor: 'pointer',
      }}
      title={`Sắp xếp theo ${label}`}
    >
      <span>{label}</span>
      {active && direction === 'asc' ? (
        <ArrowUp size={13} />
      ) : active && direction === 'desc' ? (
        <ArrowDown size={13} />
      ) : (
        <ArrowUpDown size={12} style={{ opacity: 0.45 }} />
      )}
    </button>
  );
};
