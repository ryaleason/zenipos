import { offlineDb, type OfflineProduct, type OfflineSale } from "./db";

/**
 * Cache products list from server into IndexedDB for offline cashier usage
 */
export async function cacheProductsToOffline(products: OfflineProduct[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await offlineDb.transaction("rw", offlineDb.products, async () => {
      await offlineDb.products.clear();
      await offlineDb.products.bulkPut(products);
    });
  } catch (err) {
    console.error("Gagal menyimpan cache produk offline:", err);
  }
}

/**
 * Get cached products from IndexedDB
 */
export async function getCachedProducts(search = "", categoryId = ""): Promise<OfflineProduct[]> {
  if (typeof window === "undefined") return [];
  try {
    let collection = offlineDb.products.filter((p) => p.is_active);

    if (categoryId) {
      collection = collection.filter((p) => p.category_id === categoryId);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      collection = collection.filter((p) => p.name.toLowerCase().includes(q));
    }

    return await collection.toArray();
  } catch (err) {
    console.error("Gagal mengambil produk dari IndexedDB:", err);
    return [];
  }
}

/**
 * Queue a sale transaction locally into the outbox
 */
export async function queueSaleToOutbox(sale: OfflineSale): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await offlineDb.outbox.put({
      ...sale,
      status: "pending",
      retry_count: 0,
    });

    // Also deduct stock locally in the offline product cache
    for (const item of sale.items) {
      const prod = await offlineDb.products.get(item.product_id);
      if (prod && prod.track_stock) {
        await offlineDb.products.update(item.product_id, {
          stock: prod.stock - item.qty,
        });
      }
    }
  } catch (err) {
    console.error("Gagal menyimpan transaksi ke antrean outbox:", err);
    throw err;
  }
}

/**
 * Get all outbox items that are pending or failed
 */
export async function getPendingOutboxCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    return await offlineDb.outbox.where("status").equals("pending").count();
  } catch {
    return 0;
  }
}

/**
 * Sync all pending outbox sales with server action
 */
export async function syncOutboxWithServer(
  syncFunction: (sale: OfflineSale) => Promise<{ success: boolean; error?: string }>
): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pendingSales = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  let synced = 0;
  let failed = 0;

  for (const sale of pendingSales) {
    try {
      const result = await syncFunction(sale);
      if (result.success) {
        await offlineDb.outbox.update(sale.id, {
          status: "synced",
          error_message: undefined,
        });
        synced++;
      } else {
        await offlineDb.outbox.update(sale.id, {
          status: "failed",
          retry_count: sale.retry_count + 1,
          error_message: result.error || "Gagal sinkronisasi",
        });
        failed++;
      }
    } catch (err: unknown) {
      await offlineDb.outbox.update(sale.id, {
        status: "failed",
        retry_count: sale.retry_count + 1,
        error_message: err instanceof Error ? err.message : "Koneksi terputus saat sinkronisasi",
      });
      failed++;
    }
  }

  return { synced, failed };
}
