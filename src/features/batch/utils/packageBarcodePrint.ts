/** Xuất PDF tem khay (lưới nhiều tem / trang) — format nhãn cân + QR. */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface PackageBarcodeLabel {
  code: string;
  productName: string;
  batchCode?: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  netWeightKg: number;
  sellingPrice: number;
  /** Giá đóng khay đ/kg đã cấu hình */
  pricePerKg?: number | null;
  branchName?: string;
  storeAddress?: string;
}

const fmtMoneyPlain = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

const fmtKgComma = (n: number) =>
  (Number(n) || 0).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

/** ISO / Date → DD.MM.YYYY như tem mẫu */
const fmtDateDot = (iso?: string | null) => {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolvePricePerKg(label: PackageBarcodeLabel): number {
  if (label.pricePerKg != null && Number(label.pricePerKg) > 0) {
    return Number(label.pricePerKg);
  }
  const w = Number(label.netWeightKg) || 0;
  if (w > 0 && Number(label.sellingPrice) > 0) {
    return Math.round(Number(label.sellingPrice) / w);
  }
  return 0;
}

function buildQrPayload(label: PackageBarcodeLabel): string {
  return [
    label.code,
    label.productName,
    `${label.netWeightKg}kg`,
    `${Math.round(label.sellingPrice)}d`,
    label.manufactureDate ? `NDG:${String(label.manufactureDate).slice(0, 10)}` : '',
    label.expiryDate ? `HSD:${String(label.expiryDate).slice(0, 10)}` : '',
  ]
    .filter(Boolean)
    .join('|');
}

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text || 'EMPTY', {
    width: 180,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function buildLabelCardHtml(label: PackageBarcodeLabel, qrUrl: string): string {
  const pricePerKg = resolvePricePerKg(label);
  const total = Math.round(Number(label.sellingPrice) || 0);
  const ndg = fmtDateDot(label.manufactureDate);
  const hsd = fmtDateDot(label.expiryDate);
  const name = escapeHtml((label.productName || '').toUpperCase());
  const branch = escapeHtml(label.branchName || '');
  const address = escapeHtml(label.storeAddress || '');
  const code = escapeHtml(label.code || '');

  return `
    <div class="label-card">
      <div class="name">${name}</div>
      ${label.batchCode ? `<div class="sub">Lô: ${escapeHtml(label.batchCode)}</div>` : ''}
      <div class="price-row">
        <div class="total">${fmtMoneyPlain(total)}</div>
        <div class="meta">
          <div>Đơn giá/kg: <b>${fmtMoneyPlain(pricePerKg)}</b></div>
          <div>T.KL: <b>${fmtKgComma(label.netWeightKg)} Kg</b></div>
        </div>
      </div>
      <div class="bottom">
        <img class="qr" src="${qrUrl}" alt="QR" width="72" height="72" />
        <div class="dates">
          <div><b>NDG:</b> ${ndg}</div>
          <div><b>HSD:</b> ${hsd}</div>
          <div class="warn">KHÔNG SỬ DỤNG HÀNG HẾT HSD</div>
          <div class="code">${code}</div>
        </div>
      </div>
      ${
        branch || address
          ? `<div class="footer">${branch}${address ? `<br/>${address}` : ''}</div>`
          : ''
      }
    </div>
  `;
}

function buildSheetElement(cardsHtml: string[]): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;background:#fff;padding:18px 16px;font-family:Arial,"Segoe UI",sans-serif;color:#111;z-index:-1;';
  wrap.innerHTML = `
    <style>
      .sheet-title {
        font-size: 14px;
        font-weight: 800;
        color: #0f766e;
        margin: 0 0 10px;
      }
      .label-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 12px;
      }
      .label-card {
        border: 1.5px solid #111;
        border-radius: 4px;
        padding: 8px 10px;
        min-height: 148px;
        background: #fff;
        break-inside: avoid;
      }
      .name {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.2;
        text-transform: uppercase;
      }
      .sub { font-size: 9px; color: #333; margin-top: 1px; }
      .price-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 6px;
        margin-top: 4px;
        border-top: 1px solid #111;
        border-bottom: 1px solid #111;
        padding: 3px 0;
      }
      .total {
        font-size: 26px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.02em;
      }
      .meta {
        font-size: 10px;
        line-height: 1.35;
        text-align: right;
        padding-top: 2px;
      }
      .bottom {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 5px;
      }
      .qr {
        width: 72px;
        height: 72px;
        flex: 0 0 72px;
        image-rendering: pixelated;
      }
      .dates {
        font-size: 11px;
        line-height: 1.35;
        font-weight: 600;
      }
      .warn {
        margin-top: 2px;
        font-size: 8px;
        font-weight: 800;
      }
      .code {
        margin-top: 2px;
        font-size: 9px;
        font-family: ui-monospace, Consolas, monospace;
        font-weight: 700;
      }
      .footer {
        margin-top: 4px;
        font-size: 8px;
        line-height: 1.25;
        border-top: 1px dashed #999;
        padding-top: 3px;
      }
    </style>
    <div class="sheet-title">Tem khay / barcode (${cardsHtml.length})</div>
    <div class="label-grid">
      ${cardsHtml.join('\n')}
    </div>
  `;
  return wrap;
}

/**
 * Tải PDF lưới tem (2 cột) chứa máy — toàn bộ barcode/QR.
 */
export async function downloadPackageBarcodesPdf(
  labels: PackageBarcodeLabel[],
  fileName?: string
): Promise<string> {
  if (!labels.length) {
    throw new Error('Không có khay để xuất PDF.');
  }

  const qrUrls = await Promise.all(
    labels.map((l) => qrDataUrl(buildQrPayload(l)))
  );
  const cards = labels.map((l, i) => buildLabelCardHtml(l, qrUrls[i]));
  const el = buildSheetElement(cards);
  document.body.appendChild(el);

  // Đợi ảnh QR render
  await Promise.all(
    Array.from(el.querySelectorAll('img.qr')).map(
      (img) =>
        new Promise<void>((resolve) => {
          const node = img as HTMLImageElement;
          if (node.complete) {
            resolve();
            return;
          }
          node.onload = () => resolve();
          node.onerror = () => resolve();
        })
    )
  );

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const name =
      fileName ||
      `tem-khay-${new Date().toISOString().slice(0, 10)}-${labels.length}.pdf`;
    pdf.save(name);
    return name;
  } finally {
    el.remove();
  }
}

/** Alias: in tất cả → xuất PDF */
export async function printPackageBarcodes(
  labels: PackageBarcodeLabel[]
): Promise<string> {
  return downloadPackageBarcodesPdf(labels);
}

export async function printOnePackageBarcode(
  label: PackageBarcodeLabel
): Promise<string> {
  return downloadPackageBarcodesPdf([label], `tem-khay-${label.code || '1'}.pdf`);
}
