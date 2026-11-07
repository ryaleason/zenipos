import Dexie, { type Table } from "dexie";

export interface OfflineProduct {
  id: string;
  umkm_id: string;
  name: string;
  sell_price: number;
  category_id?: string | null;
  category_name?: string | null;
  track_stock: boolean;
  stock: number;
  min_stock: number;
  is_active: boolean;
}

export interface OfflineSaleItem {
  product_id: string;
  product_name: string;
  qty: number;
  sell_price: number;
  cost_price: number;
  subtotal: number;
}

export interface OfflineSale {
  id: string; // Device-generated UUID for idempotency
  umkm_id: string;
  invoice_no: string;
  total: number;
  payment_method: "cash" | "transfer" | "qris";
  paid_amount: number;
  note?: string;
  sold_at: string; // Device timestamp
  items: OfflineSaleItem[];
  status: "pending" | "synced" | "failed";
  retry_count: number;
  error_message?: string;
}

export class ZeniPosOfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  outbox!: Table<OfflineSale, string>;

  constructor() {
    super("zenipos_offline_db");
    this.version(1).stores({
      products: "id, umkm_id, name, category_id, is_active",
      outbox: "id, umkm_id, invoice_no, status, sold_at",
    });
  }
}

export const offlineDb = new ZeniPosOfflineDatabase();
