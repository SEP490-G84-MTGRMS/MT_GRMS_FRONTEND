import { useState } from 'react';

type Product = { id: string; name: string; productCode: string; barcode: string; baseUnit: string };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export function ProductPicker({ products, value, selectedName, optional, onChange }: { products: Product[]; value?: string; selectedName?: string; optional?: boolean; onChange: (product?: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = products.filter(p => normalize(`${p.name} ${p.productCode} ${p.barcode}`).includes(normalize(query))).slice(0, 20);
  const selected = products.find(p => p.id === value);
  const choose = (product?: Product) => { onChange(product); setOpen(false); setQuery(''); };
  return <div style={{ position: 'relative', minWidth: 0 }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setQuery(''); } }}>
    <input className="form-input" role="combobox" aria-label="Tìm và chọn sản phẩm" aria-expanded={open} aria-autocomplete="list" value={open ? query : selected?.name || selectedName || (optional ? 'Bất kỳ sản phẩm trong giỏ' : '')} placeholder="Tìm tên, mã hoặc barcode..." onFocus={() => { setOpen(true); setQuery(''); setActive(0); }} onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }} onKeyDown={e => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, matches.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); if (open && matches[active]) choose(matches[active]); }
    }} />
    {open && <div role="listbox" style={{ position: 'relative', width: '100%', marginTop: 6, zIndex: 100, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, boxShadow: '0 8px 24px #0002', maxHeight: 230, overflowY: 'auto', padding: 4 }}>
      {optional && <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => choose()} style={{ display: 'block', width: '100%', padding: 10, textAlign: 'left', background: '#fff', border: 0 }}>Bất kỳ sản phẩm trong giỏ</button>}
      {matches.map((p, index) => <button role="option" aria-selected={p.id === value} type="button" key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => choose(p)} style={{ display: 'block', width: '100%', padding: '8px 10px', textAlign: 'left', border: 0, background: index === active ? '#f0fdfa' : '#fff', cursor: 'pointer' }}><div>{p.name}</div><small style={{ color: '#64748b' }}>{p.productCode}{p.barcode ? ` · ${p.barcode}` : ''}</small></button>)}
      {!matches.length && <div style={{ padding: 12, color: '#64748b' }}>Không tìm thấy sản phẩm</div>}
    </div>}
  </div>;
}
