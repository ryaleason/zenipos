"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { productSchema, categorySchema, type ProductInput, type CategoryInput } from "./schemas";

export interface ProductWithStock {
  id: string;
  umkm_id: string;
  name: string;
  sell_price: number;
  cost_price: number;
  photo_url?: string | null;
  track_stock: boolean;
  min_stock: number;
  is_active: boolean;
  category_id?: string | null;
  category_name?: string | null;
  stock: number;
  created_at: string;
}

export interface CategoryItem {
  id: string;
  umkm_id: string;
  name: string;
  created_at: string;
}

interface RawCashierProduct {
  id: string;
  umkm_id: string;
  name: string;
  sell_price: number;
  photo_url: string | null;
  track_stock: boolean;
  min_stock: number;
  is_active: boolean;
  category_id: string | null;
  category_name: string | null;
  current_stock: number;
  created_at: string;
}

interface RawOwnerProduct {
  id: string;
  umkm_id: string;
  name: string;
  sell_price: number;
  cost_price: number;
  photo_url: string | null;
  track_stock: boolean;
  min_stock: number;
  is_active: boolean;
  category_id: string | null;
  created_at: string;
  categories?: { name: string | null } | null;
}

interface RawStockMovement {
  product_id: string;
  qty: number;
}

/**
 * Get all products for the current user's UMKM with live computed stock
 */
export async function getProductsAction(): Promise<{
  success: boolean;
  products: ProductWithStock[];
  error?: string;
}> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.umkmId) {
      return { success: false, products: [], error: "Sesi tidak valid. Silakan login." };
    }

    const supabase = await createServerClient();
    const isCashier = profile.role === "cashier";

    // If cashier, query cashier_products_view (which already excludes cost_price and calculates stock)
    if (isCashier) {
      const { data, error } = await supabase
        .from("cashier_products_view")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      const products: ProductWithStock[] = ((data as unknown as RawCashierProduct[]) || []).map((p) => ({
        id: p.id,
        umkm_id: p.umkm_id,
        name: p.name,
        sell_price: p.sell_price,
        cost_price: 0, // Hidden for cashier
        photo_url: p.photo_url,
        track_stock: p.track_stock,
        min_stock: p.min_stock,
        is_active: p.is_active,
        category_id: p.category_id,
        category_name: p.category_name,
        stock: Number(p.current_stock ?? 0),
        created_at: p.created_at,
      }));

      return { success: true, products };
    }

    // If owner, query products and categories, then aggregate stock from stock_movements
    const { data: productsData, error: prodError } = await supabase
      .from("products")
      .select(`
        *,
        categories(name)
      `)
      .order("created_at", { ascending: false });

    if (prodError) throw prodError;

    // Get stock movements aggregated per product
    const { data: movements, error: moveError } = await supabase
      .from("stock_movements")
      .select("product_id, qty");

    if (moveError) throw moveError;

    const stockMap: Record<string, number> = {};
    ((movements as unknown as RawStockMovement[]) || []).forEach((m) => {
      stockMap[m.product_id] = (stockMap[m.product_id] || 0) + Number(m.qty);
    });

    const products: ProductWithStock[] = ((productsData as unknown as RawOwnerProduct[]) || []).map((p) => ({
      id: p.id,
      umkm_id: p.umkm_id,
      name: p.name,
      sell_price: p.sell_price,
      cost_price: p.cost_price,
      photo_url: p.photo_url,
      track_stock: p.track_stock,
      min_stock: p.min_stock,
      is_active: p.is_active,
      category_id: p.category_id,
      category_name: p.categories?.name || null,
      stock: p.track_stock ? (stockMap[p.id] ?? 0) : 0,
      created_at: p.created_at,
    }));

    return { success: true, products };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("getProductsAction error:", err);
    return { success: false, products: [], error: err instanceof Error ? err.message : "Gagal memuat produk" };
  }
}

/**
 * Create a new product with optional initial stock ledger entry
 */
export async function createProductAction(input: ProductInput): Promise<{
  success: boolean;
  product?: ProductWithStock;
  error?: string;
}> {
  try {
    const validated = productSchema.parse(input);
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("umkm_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Hanya pemilik UMKM yang dapat menambah produk." };
    }

    // Insert product
    const { data: newProduct, error: prodError } = await supabase
      .from("products")
      .insert({
        umkm_id: profile.umkm_id,
        name: validated.name,
        category_id: validated.category_id || null,
        sell_price: validated.sell_price,
        cost_price: validated.cost_price,
        photo_url: validated.photo_url || null,
        track_stock: validated.track_stock,
        min_stock: validated.min_stock,
        is_active: validated.is_active,
      })
      .select()
      .single();

    if (prodError) throw prodError;

    // If initial stock is provided and track_stock is enabled, record initial stock movement
    if (validated.track_stock && validated.initial_stock && validated.initial_stock > 0) {
      const { error: stockError } = await supabase.from("stock_movements").insert({
        umkm_id: profile.umkm_id,
        product_id: newProduct.id,
        type: "initial",
        qty: validated.initial_stock,
        note: "Stok awal saat produk dibuat",
        created_by: user.id,
      });

      if (stockError) throw stockError;
    }

    revalidatePath("/produk");
    revalidatePath("/stok");
    revalidatePath("/kasir");
    return {
      success: true,
      product: {
        id: newProduct.id,
        umkm_id: newProduct.umkm_id,
        name: newProduct.name,
        sell_price: newProduct.sell_price,
        cost_price: newProduct.cost_price,
        photo_url: newProduct.photo_url,
        track_stock: newProduct.track_stock,
        min_stock: newProduct.min_stock,
        is_active: newProduct.is_active,
        category_id: newProduct.category_id,
        stock: validated.initial_stock || 0,
        created_at: newProduct.created_at,
      },
    };
  } catch (err: unknown) {
    console.error("createProductAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal menyimpan produk" };
  }
}

/**
 * Update an existing product
 */
export async function updateProductAction(input: ProductInput): Promise<{
  success: boolean;
  product?: ProductWithStock;
  error?: string;
}> {
  try {
    if (!input.id) return { success: false, error: "ID produk tidak valid." };
    const validated = productSchema.parse(input);

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update({
        name: validated.name,
        category_id: validated.category_id || null,
        sell_price: validated.sell_price,
        cost_price: validated.cost_price,
        photo_url: validated.photo_url || null,
        track_stock: validated.track_stock,
        min_stock: validated.min_stock,
        is_active: validated.is_active,
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/produk");
    revalidatePath("/stok");
    revalidatePath("/kasir");
    return {
      success: true,
      product: {
        id: updatedProduct.id,
        umkm_id: updatedProduct.umkm_id,
        name: updatedProduct.name,
        sell_price: updatedProduct.sell_price,
        cost_price: updatedProduct.cost_price,
        photo_url: updatedProduct.photo_url,
        track_stock: updatedProduct.track_stock,
        min_stock: updatedProduct.min_stock,
        is_active: updatedProduct.is_active,
        category_id: updatedProduct.category_id,
        stock: 0,
        created_at: updatedProduct.created_at,
      },
    };
  } catch (err: unknown) {
    console.error("updateProductAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui produk" };
  }
}

/**
 * Toggle active status of a product
 */
export async function toggleProductActiveAction(id: string, is_active: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/produk");
    revalidatePath("/kasir");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal mengubah status produk" };
  }
}

/**
 * Get categories list
 */
export async function getCategoriesAction(): Promise<{
  success: boolean;
  categories: CategoryItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return { success: true, categories: data || [] };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    return { success: false, categories: [], error: err instanceof Error ? err.message : "Gagal memuat kategori" };
  }
}

/**
 * Create a new category
 */
export async function createCategoryAction(input: CategoryInput): Promise<{
  success: boolean;
  category?: CategoryItem;
  error?: string;
}> {
  try {
    const validated = categorySchema.parse(input);
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("umkm_id")
      .eq("id", user.id)
      .single();

    if (!profile?.umkm_id) return { success: false, error: "Profil tidak ditemukan." };

    const { data, error } = await supabase
      .from("categories")
      .insert({
        umkm_id: profile.umkm_id,
        name: validated.name,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/produk");
    revalidatePath("/kasir");
    return { success: true, category: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal membuat kategori" };
  }
}
