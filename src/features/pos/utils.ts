import { formatRupiah, formatDateTime } from "@/lib/format";
import type { CreateSaleInput } from "./schemas";

/**
 * Generate a unique invoice number safe for offline device generation
 * Pattern: INV/YYMMDD/XXXX (e.g. INV/261107/A3F9)
 */
export function generateInvoiceNo(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV/${yy}${mm}${dd}/${randomChars}`;
}

/**
 * Format receipt message as text for sharing via WhatsApp
 */
export function formatReceiptWhatsAppText(sale: CreateSaleInput, businessName: string): string {
  const lines: string[] = [
    `*STRUK PENJUALAN ${businessName.toUpperCase()}*`,
    `No. Invoice: ${sale.invoice_no}`,
    `Waktu: ${formatDateTime(sale.sold_at || new Date().toISOString())}`,
    `--------------------------------`,
  ];

  sale.items.forEach((item) => {
    lines.push(
      `${item.product_name}\n  ${item.qty} x ${formatRupiah(item.sell_price)} = ${formatRupiah(item.subtotal)}`
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`*Total: ${formatRupiah(sale.total)}*`);
  lines.push(`Metode: ${sale.payment_method.toUpperCase()}`);

  if (sale.payment_method === "cash") {
    lines.push(`Tunai Diterima: ${formatRupiah(sale.paid_amount)}`);
    const change = Math.max(0, sale.paid_amount - sale.total);
    lines.push(`Kembalian: ${formatRupiah(change)}`);
  }

  lines.push(`--------------------------------`);
  lines.push(`Terima kasih telah berbelanja!`);

  return lines.join("\n");
}

export interface ReceiptData {
  storeName: string;
  invoiceNo: string;
  date: string;
  cashierName: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
  paidAmount: number;
  change: number;
  paymentMethod: string;
}

/**
 * Trigger print dialog with formatted thermal receipt layout
 */
export function printReceipt(data: ReceiptData) {
  const receiptWindow = window.open("", "_blank", "width=380,height=600");
  if (!receiptWindow) {
    window.print();
    return;
  }

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk - ${data.invoiceNo}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 10px;
            color: #000;
            width: 58mm;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .item-name { max-width: 60%; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold" style="font-size: 13px;">${data.storeName}</div>
        <div class="text-center">${data.invoiceNo}</div>
        <div class="text-center">${formatDateTime(data.date)}</div>
        <div class="text-center">Kasir: ${data.cashierName}</div>
        <div class="divider"></div>
        ${data.items
          .map(
            (it) => `
          <div class="item-row">
            <div class="item-name">${it.name}</div>
            <div>${it.qty} x ${formatRupiah(it.price)}</div>
          </div>
          <div class="text-right font-bold">${formatRupiah(it.subtotal)}</div>
        `
          )
          .join("")}
        <div class="divider"></div>
        <div class="item-row font-bold" style="font-size: 12px;">
          <div>TOTAL</div>
          <div>${formatRupiah(data.total)}</div>
        </div>
        <div class="item-row">
          <div>BAYAR (${data.paymentMethod.toUpperCase()})</div>
          <div>${formatRupiah(data.paidAmount)}</div>
        </div>
        <div class="item-row">
          <div>KEMBALI</div>
          <div>${formatRupiah(data.change)}</div>
        </div>
        <div class="divider"></div>
        <div class="text-center" style="margin-top: 8px;">Terima kasih atas kunjungan Anda!</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

/**
 * Open WhatsApp share dialog with pre-filled receipt text
 */
export function shareReceiptWhatsApp(data: ReceiptData) {
  const lines: string[] = [
    `*STRUK PEMBELIAN ${data.storeName.toUpperCase()}*`,
    `Invoice: ${data.invoiceNo}`,
    `Waktu: ${formatDateTime(data.date)}`,
    `Kasir: ${data.cashierName}`,
    `--------------------------------`,
  ];

  data.items.forEach((it) => {
    lines.push(`${it.name}\n  ${it.qty}x @${formatRupiah(it.price)} = ${formatRupiah(it.subtotal)}`);
  });

  lines.push(`--------------------------------`);
  lines.push(`*TOTAL: ${formatRupiah(data.total)}*`);
  lines.push(`Metode: ${data.paymentMethod.toUpperCase()}`);
  if (data.paymentMethod === "cash") {
    lines.push(`Uang Diterima: ${formatRupiah(data.paidAmount)}`);
    lines.push(`Kembalian: ${formatRupiah(data.change)}`);
  }
  lines.push(`--------------------------------`);
  lines.push(`Terima kasih telah berbelanja di ${data.storeName}!`);

  const message = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/?text=${message}`, "_blank");
}
