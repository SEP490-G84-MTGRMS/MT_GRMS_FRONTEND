import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { PurchaseOrderListItem } from '../types/po-list.types';
import { purchaseOrderApi } from '../api/purchaseOrderApi';

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Number.isFinite(n) ? n : 0);

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Chờ nhập',
  APPROVED: 'Đã duyệt',
  DISPATCHED: 'Đã gửi NCC',
  SENT: 'Đã gửi NCC',
  CONFIRMED: 'NCC đã chốt',
  PARTIALLY_RECEIVED: 'Nhận một phần',
  RECEIVED: 'Đã nhập kho',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

async function resolveOrder(order: PurchaseOrderListItem): Promise<PurchaseOrderListItem> {
  try {
    const full = await purchaseOrderApi.getPurchaseOrderById(order.id);
    if (full && (full.items?.length || 0) > 0) return full;
  } catch {
    // fallback list data
  }
  return order;
}

function buildInvoiceElement(data: PurchaseOrderListItem): HTMLDivElement {
  const items = data.items || [];
  const totalQty = items.reduce((s, it) => s + (Number(it.orderedQty) || 0), 0);
  const totalAmount =
    data.totalAmount || items.reduce((s, it) => s + (Number(it.total) || it.orderedQty * it.price || 0), 0);

  const rows =
    items.length === 0
      ? `<tr><td colspan="7" style="border:1px solid #cbd5e1;padding:14px;text-align:center;color:#94a3b8">Không có dòng hàng trong đơn.</td></tr>`
      : items
          .map(
            (it, idx) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;font-family:monospace">${escapeHtml(it.sku)}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px">${escapeHtml(it.name)}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center">${escapeHtml(it.unit || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right">${fmtMoney(it.orderedQty)}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right">${fmtMoney(it.price)}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;font-weight:700">${fmtMoney(it.total || it.orderedQty * it.price)}</td>
      </tr>`
          )
          .join('');

  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:28px 32px;font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;font-size:13px;z-index:-1;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#0f766e;margin:0">HÓA ĐƠN ĐẶT HÀNG (PO)</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Phiếu đặt hàng gửi nhà cung cấp</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:monospace;font-weight:800;font-size:16px;color:#0284c7">${escapeHtml(data.poCode)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">Trạng thái: <b>${escapeHtml(STATUS_LABEL[data.status] || data.status)}</b></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin:18px 0 8px">
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Chi nhánh nhận</div>
        <div style="font-weight:700">${escapeHtml(`${data.branchCode} — ${data.branchName}`)}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Nhà cung cấp</div>
        <div style="font-weight:700">${escapeHtml(`${data.supplierCode} — ${data.supplierName}`)}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Ngày giao dự kiến</div>
        <div style="font-weight:700">${escapeHtml(data.expectedDelivery || '—')}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Cập nhật gần nhất</div>
        <div style="font-weight:700">${escapeHtml(data.lastUpdated || '—')}</div>
      </div>
    </div>

    ${
      data.note
        ? `<div style="margin-top:8px;font-size:12.5px;color:#334155"><b>Ghi chú:</b> ${escapeHtml(data.note)}</div>`
        : ''
    }

    <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12.5px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:40px;text-align:center">#</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:100px;text-align:left">SKU</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left">Tên sản phẩm</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:70px;text-align:center">DVN</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:80px;text-align:right">SL đặt</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:110px;text-align:right">Đơn giá</th>
          <th style="border:1px solid #cbd5e1;padding:8px 10px;width:120px;text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="4" style="border:1px solid #cbd5e1;padding:8px 10px;font-weight:800;background:#f0fdfa">Tổng cộng</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;font-weight:800;background:#f0fdfa">${fmtMoney(totalQty)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;background:#f0fdfa"></td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${fmtMoney(totalAmount)} đ</td>
        </tr>
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px;text-align:center;font-size:12px;color:#475569">
      <div>
        <div style="font-weight:700;margin-bottom:48px">Người lập phiếu</div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px">(Ký, họ tên)</div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:48px">Quản lý chi nhánh</div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px">(Ký, họ tên)</div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:48px">Nhà cung cấp</div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px">(Ký, họ tên)</div>
      </div>
    </div>
  `;
  return wrap;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tải file PDF hóa đơn PO về máy (không mở popup).
 */
export async function downloadPoInvoicePdf(order: PurchaseOrderListItem): Promise<string> {
  const data = await resolveOrder(order);
  const el = buildInvoiceElement(data);
  document.body.appendChild(el);

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
    const margin = 10;
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

    const fileName = `HoaDon_PO_${(data.poCode || data.id).replace(/[^\w\-]+/g, '_')}.pdf`;
    pdf.save(fileName);
    return fileName;
  } finally {
    el.remove();
  }
}
