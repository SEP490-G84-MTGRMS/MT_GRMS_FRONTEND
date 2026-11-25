import { useEffect, useRef, useState } from "react";
import { mapStoreProblemMessage, storeApi, type StaffAddonQuote } from "../api/storeApi";

const money = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

interface StaffAddonModalProps {
  onClose: () => void;
  onPurchased: (walletBalance: number) => void;
}

export function StaffAddonModal({ onClose, onPurchased }: StaffAddonModalProps) {
  const [quote, setQuote] = useState<StaffAddonQuote | null>(null);
  const [error, setError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const requestId = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let active = true;
    storeApi.getStaffAddonQuote()
      .then((result) => {
        if (!result.success) throw result;
        if (active) setQuote(result.data);
      })
      .catch((err: unknown) => {
        if (active) setError(mapStoreProblemMessage(err, "Không thể tải báo giá."));
      })
      .finally(() => {
        if (active) setLoadingQuote(false);
      });
    return () => { active = false; };
  }, [quoteAttempt]);

  const refreshQuote = () => {
    setError("");
    setQuote(null);
    setLoadingQuote(true);
    setQuoteAttempt((attempt) => attempt + 1);
  };

  const purchase = async () => {
    if (!quote || purchasing) return;
    setError("");
    setPurchasing(true);
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await storeApi.purchaseStaffAddon(quote, requestId.current);
      if (!result.success) throw result;
      onPurchased(result.data.walletBalance);
    } catch (err) {
      setError(mapStoreProblemMessage(err, "Thanh toán chưa hoàn tất. Vui lòng thử lại."));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="store-modal-dialog staff-addon-dialog"
      aria-labelledby="staff-addon-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!purchasing) onClose();
      }}
    >
      <header className="store-modal-header">
        <h2 id="staff-addon-title" className="store-modal-title">Mua thêm Quản lý nhân viên</h2>
      </header>
      <div className="store-modal-body">
        <p>30.000 đ/tháng, tính theo số ngày còn lại của Gói Thường.</p>
        {loadingQuote && <p role="status">Đang tải báo giá…</p>}
        {quote && (
          <dl className="staff-addon-quote">
            <dt>Ngày hết hạn</dt>
            <dd>{new Date(quote.expiresAt).toLocaleDateString("vi-VN")}</dd>
            <dt>Tiền tiện ích</dt>
            <dd>{money(quote.subtotal)}</dd>
            <dt>VAT</dt>
            <dd>{money(quote.vat)}</dd>
            <dt><strong>Tổng thanh toán</strong></dt>
            <dd><strong>{money(quote.total)}</strong></dd>
          </dl>
        )}
        {error && <p role="alert" style={{ color: "#B91C1C" }}>{error}</p>}
      </div>
      <footer className="store-modal-footer">
        <button type="button" className="store-btn-secondary" disabled={purchasing} onClick={onClose}>Đóng</button>
        {error && <button type="button" className="store-btn-secondary" onClick={refreshQuote}>Xem lại báo giá</button>}
        {quote && (
          <button type="button" className="store-btn-primary" disabled={purchasing} onClick={purchase}>
            {purchasing ? "Đang thanh toán…" : "Thanh toán bằng Ví gian hàng"}
          </button>
        )}
      </footer>
    </dialog>
  );
}
