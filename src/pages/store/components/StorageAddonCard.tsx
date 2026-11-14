import { useCallback, useEffect, useState, type FC } from "react";
import { AlertCircle, HardDrive, Minus, Plus } from "lucide-react";
import { storeApi, type StorageQuote, type StorageUsage } from "../api/storeApi";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const gb = 1024 * 1024 * 1024;

export const StorageAddonCard: FC<{ onPurchased?: (amount: number) => void }> = ({ onPurchased }) => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [extraGb, setExtraGb] = useState(1);
  const [quote, setQuote] = useState<StorageQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadUsage = useCallback(async () => {
    try {
      const response = await storeApi.getStorageUsage();
      if (response.success) setUsage(response.data);
    } catch {
      setError("Không thể tải thông tin dung lượng.");
    }
  }, []);

  useEffect(() => { void loadUsage(); }, [loadUsage]);

  const getQuote = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await storeApi.getStorageQuote(extraGb);
      if (response.success) setQuote(response.data);
      else setError(response.message || "Không thể tạo báo giá.");
    } catch {
      setError("Chỉ có thể mua thêm dung lượng khi gói trả phí còn hiệu lực.");
    } finally {
      setBusy(false);
    }
  };

  const purchase = async () => {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      const response = await storeApi.purchaseStorage(extraGb, crypto.randomUUID());
      if (!response.success) {
        setError(response.message || "Mua thêm dung lượng không thành công.");
        return;
      }
      onPurchased?.(response.data.total);
      setQuote(null);
      await loadUsage();
    } catch {
      setError("Số dư ví không đủ hoặc giao dịch không thể hoàn tất.");
    } finally {
      setBusy(false);
    }
  };

  const percent = usage ? Math.min(100, Math.round((usage.usedBytes / Math.max(1, usage.limitBytes)) * 100)) : 0;

  return (
    <section style={{ marginBottom: 18, padding: 20, border: "1px solid #DDE7F3", borderRadius: 24, background: "#FFFFFF" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: "#0066FF", background: "#EEF5FF" }}><HardDrive size={20} /></span>
            <div><strong style={{ color: "#0F172A" }}>Dung lượng lưu trữ</strong><div style={{ color: "#64748B", fontSize: 12 }}>Ảnh và tệp tải lên của gian hàng</div></div>
          </div>
          <div style={{ marginTop: 16, height: 8, borderRadius: 9999, background: "#E8EEF7", overflow: "hidden" }}>
            <div style={{ width: `${percent}%`, height: "100%", background: percent >= 90 ? "#DC2626" : "#0066FF" }} />
          </div>
          <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
            {usage ? `${(usage.usedBytes / gb).toFixed(2)} GB / ${(usage.limitBytes / gb).toFixed(0)} GB đã sử dụng` : "Đang tải..."}
            {usage && usage.extraGb > 0 && ` · gồm ${usage.extraGb} GB mua thêm`}
            {usage?.addonExpiresAt && ` · hết hạn ${new Date(usage.addonExpiresAt).toLocaleDateString("vi-VN")}`}
          </div>
        </div>

        <div style={{ flex: "0 1 410px", minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div><strong style={{ fontSize: 13 }}>Mua thêm dung lượng</strong><div style={{ color: "#64748B", fontSize: 12 }}>15.000 đ/GB/tháng, tính theo thời gian còn lại</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => { setExtraGb(Math.max(1, extraGb - 1)); setQuote(null); }} disabled={extraGb <= 1} style={{ width: 32, height: 32, borderRadius: 9999, border: "1px solid #CBD5E1", background: "#FFF" }}><Minus size={15} /></button>
              <strong style={{ minWidth: 48, textAlign: "center" }}>{extraGb} GB</strong>
              <button type="button" onClick={() => { setExtraGb(Math.min(100, extraGb + 1)); setQuote(null); }} style={{ width: 32, height: 32, borderRadius: 9999, border: "1px solid #0066FF", color: "#0066FF", background: "#EEF5FF" }}><Plus size={15} /></button>
            </div>
          </div>
          {quote && <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#F7FAFF", color: "#334155", fontSize: 13 }}>Tạm tính {money(quote.subtotal)} đ + VAT {money(quote.vat)} đ · <strong>Tổng {money(quote.total)} đ</strong></div>}
          {error && <div style={{ marginTop: 10, display: "flex", gap: 6, color: "#DC2626", fontSize: 12 }}><AlertCircle size={15} />{error}</div>}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {quote && <button type="button" onClick={() => setQuote(null)} style={{ padding: "9px 16px", borderRadius: 9999, border: "1px solid #CBD5E1", background: "#FFF", fontWeight: 700 }}>Hủy</button>}
            <button type="button" disabled={busy} onClick={quote ? purchase : getQuote} style={{ padding: "9px 18px", borderRadius: 9999, border: 0, background: "#0066FF", color: "#FFF", fontWeight: 700, opacity: busy ? .65 : 1 }}>{busy ? "Đang xử lý..." : quote ? "Xác nhận mua" : "Xem báo giá"}</button>
          </div>
        </div>
      </div>
    </section>
  );
};
