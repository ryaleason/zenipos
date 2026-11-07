/**
 * Helper format mata uang dan tanggal sesuai aturan ZeniPOS (AGENTS.md).
 * - Uang disimpan sebagai integer Rupiah (tanpa float/desimal).
 * - Waktu disimpan sebagai timestamptz dan ditampilkan dalam zona Asia/Jakarta (WIB).
 */

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return "Rp 0";
  }
  const integerAmount = Math.round(amount);
  const formatted = new Intl.NumberFormat("id-ID").format(Math.abs(integerAmount));

  if (integerAmount < 0) {
    return `-Rp ${formatted}`;
  }
  return `Rp ${formatted}`;
}

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

export function formatDateTime(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(d);
}
