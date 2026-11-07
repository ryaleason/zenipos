import test from "node:test";
import assert from "node:assert/strict";
import { formatRupiah, formatDate, formatDateTime } from "./format";

test("formatRupiah formats positive integers properly", () => {
  assert.strictEqual(formatRupiah(50000), "Rp 50.000");
  assert.strictEqual(formatRupiah(1250000), "Rp 1.250.000");
  assert.strictEqual(formatRupiah(0), "Rp 0");
});

test("formatRupiah formats negative integers properly", () => {
  assert.strictEqual(formatRupiah(-50000), "-Rp 50.000");
});

test("formatDate formats dates with Asia/Jakarta timezone", () => {
  // 2026-11-07T08:00:00Z is 2026-11-07 15:00:00 in UTC+7
  const result = formatDate("2026-11-07T08:00:00Z");
  assert.strictEqual(result, "7 November 2026");

  // 2026-11-07T18:00:00Z is 2026-11-08 01:00:00 in UTC+7 (next day in Jakarta)
  const nextDay = formatDate("2026-11-07T18:00:00Z");
  assert.strictEqual(nextDay, "8 November 2026");
});

test("formatDateTime formats date and time with Asia/Jakarta timezone", () => {
  const result = formatDateTime("2026-11-07T08:00:00Z");
  // In id-ID locale Asia/Jakarta, 08:00 UTC is 15:00 WIB
  assert.ok(result.includes("7 Nov 2026"));
  assert.ok(result.includes("15"));
});
