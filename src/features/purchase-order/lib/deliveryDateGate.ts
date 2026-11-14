/** YYYY-MM-DD từ ISO / Date string (ưu tiên phần ngày, không lệch timezone). */
export function toDeliveryDateKey(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Đến ngày giao (hoặc đã qua) mới được nhập hàng. Thiếu ngày giao → cho phép (legacy). */
export function isDeliveryDateReached(deliveryDate?: string | null): boolean {
  const key = toDeliveryDateKey(deliveryDate);
  if (!key) return true;
  return key <= todayLocalDateKey();
}

export function formatDeliveryDateGateMessage(deliveryDate?: string | null): string {
  const key = toDeliveryDateKey(deliveryDate);
  if (!key) return 'Chưa đến ngày giao hàng — chưa được nhập kho.';
  const [y, m, d] = key.split('-');
  return `Chỉ được nhập hàng từ ngày giao ${d}/${m}/${y}. Hôm nay chưa đến ngày giao.`;
}
