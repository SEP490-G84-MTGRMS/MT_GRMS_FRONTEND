import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { SupplierReturnDetail } from '../types/supplierReturn.types';
import { returnStatusBadge } from '../components/SupplierReturnTable';

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Number.isFinite(n) ? n : 0);

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReturnReportElement(detail: SupplierReturnDetail): HTMLDivElement {
  const status = returnStatusBadge(detail.status);
  const lines = detail.lines || [];
  const payable = Number(detail.storePayableAmount ?? 0);

  const rows =
    lines.length === 0
      ? `<tr><td colspan="8" style="border:1px solid #cbd5e1;padding:14px;text-align:center;color:#94a3b8">Không có dòng hàng.</td></tr>`
      : lines
          .map(
            (line, idx) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px">
          <div style="font-weight:700">${escapeHtml(line.productName)}</div>
          <div style="font-family:monospace;font-size:11px;color:#0f766e">${escapeHtml(line.sku)}</div>
        </td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;font-family:monospace">${escapeHtml(line.batchCode || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:center">${escapeHtml(line.unit || '—')}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:right;font-weight:700">${fmt(line.requestedQty)}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:right">${fmt(line.handedOverQty || 0)}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:right">${fmt(line.unitCost)}</td>
        <td style="border:1px solid #cbd5e1;padding:7px 8px;text-align:right;font-weight:700">${fmt(line.lineTotal)}</td>
      </tr>`
          )
          .join('');

  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:28px 32px;font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;font-size:13px;z-index:-1;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
      <div>
        <div style="font-size:20px;font-weight:800;color:#0f766e;margin:0">BIÊN BẢN TRẢ HÀNG NHÀ CUNG CẤP</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Chứng từ đối soát / bàn giao hàng trả NCC (khổ A4)</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:monospace;font-weight:800;font-size:15px;color:#0284c7">${escapeHtml(detail.code)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">
          Trạng thái: <b style="color:${escapeHtml(status.color)}">${escapeHtml(status.label)}</b>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin:16px 0 8px">
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Nhà cung cấp</div>
        <div style="font-weight:700">${escapeHtml(detail.supplierName)}</div>
        <div style="font-size:12px;color:#64748b;font-family:monospace">${escapeHtml(detail.supplierCode || '')}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Chi nhánh xuất trả</div>
        <div style="font-weight:700">${escapeHtml(detail.branchName)}</div>
        <div style="font-size:12px;color:#64748b;font-family:monospace">${escapeHtml(detail.branchCode || '')}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Phiếu nhập gốc (GRN)</div>
        <div style="font-weight:700;font-family:monospace">${escapeHtml(detail.goodsReceiptCode || '—')}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Ngày lập</div>
        <div style="font-weight:700">${fmtDateTime(detail.createdAt)}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Lý do trả</div>
        <div style="font-weight:700">${escapeHtml(detail.reason || '—')}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px">Hình thức bồi hoàn</div>
        <div style="font-weight:700">${escapeHtml(detail.resolutionType || '—')}</div>
      </div>
    </div>

    ${
      detail.reasonNotes
        ? `<div style="margin-top:6px;font-size:12.5px;color:#334155"><b>Ghi chú:</b> ${escapeHtml(detail.reasonNotes)}</div>`
        : ''
    }

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      <div>
        <div style="font-size:11px;color:#64748b">Tổng SL yêu cầu</div>
        <div style="font-weight:800;font-size:15px;color:#0f766e">${fmt(detail.totalRequestedQty)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b">Tổng SL đã giao</div>
        <div style="font-weight:800;font-size:15px;color:#0284c7">${fmt(detail.totalHandedOverQty)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b">Số tiền cần bù cho NCC</div>
        <div style="font-weight:800;font-size:15px;color:#7c3aed">${fmt(payable)}đ</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:36px;text-align:center">STT</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:left">Sản phẩm</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:90px;text-align:left">Lô</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:56px;text-align:center">ĐVT</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:72px;text-align:right">SL Y/C</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:72px;text-align:right">SL giao</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:90px;text-align:right">Đơn giá</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;width:100px;text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="4" style="border:1px solid #cbd5e1;padding:8px;font-weight:800;background:#f0fdfa">Tổng cộng</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:800;background:#f0fdfa">${fmt(detail.totalRequestedQty)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:800;background:#f0fdfa">${fmt(detail.totalHandedOverQty)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;background:#f0fdfa"></td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${fmt(detail.totalEstimatedAmount)} đ</td>
        </tr>
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:36px;text-align:center;font-size:12px;color:#475569">
      <div>
        <div style="font-weight:700;color:#0f172a">ĐẠI DIỆN CỬA HÀNG / THỦ KHO</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">(Ký, ghi rõ họ tên)</div>
        <div style="height:52px"></div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px;font-weight:600;color:#0f766e">
          ${escapeHtml(detail.handedOverBy || '................................')}
        </div>
      </div>
      <div>
        <div style="font-weight:700;color:#0f172a">TÀI XẾ NHẬN HÀNG TRẢ</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">(Ký, ghi rõ họ tên)</div>
        <div style="height:52px"></div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px">................................</div>
      </div>
      <div>
        <div style="font-weight:700;color:#0f172a">ĐẠI DIỆN NHÀ CUNG CẤP</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">(Ký xác nhận)</div>
        <div style="height:52px"></div>
        <div style="border-top:1px dashed #94a3b8;padding-top:8px;font-weight:600">
          ${escapeHtml(detail.supplierName || '................................')}
        </div>
      </div>
    </div>

    <div style="margin-top:18px;font-size:11px;color:#94a3b8;text-align:right">
      In lúc ${fmtDateTime(new Date().toISOString())} · HSD lô tham chiếu: ${fmtDate(lines[0]?.expiryDate)}
    </div>
  `;
  return wrap;
}

/**
 * Tải PDF biên bản trả hàng A4 về máy (không phụ thuộc window.print).
 */
export async function downloadSupplierReturnPdf(detail: SupplierReturnDetail): Promise<string> {
  const el = buildReturnReportElement(detail);
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

    const fileName = `BienBan_TraHang_${(detail.code || detail.id).replace(/[^\w\-]+/g, '_')}.pdf`;
    pdf.save(fileName);
    return fileName;
  } finally {
    el.remove();
  }
}
