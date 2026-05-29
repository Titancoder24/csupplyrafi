import { supabase } from '@/services/supabase';
import type { Product, ProductStatus, ProductAction } from './types';

export interface CreateProductInput {
  name:           string;
  categoryId?:    string;
  description?:   string;
  brand?:         string;
  sku?:           string;
  unit:           string;
  pricePerUnit:   number;
  minOrderQty?:   number;
  maxOrderQty?:   number;
  stockQty:       number;
  hsnCode?:       string;
  gstRate?:       number;
  specs?:         Record<string, unknown>;
  tags?:          string[];
  imageUrls?:     string[];
}

export interface ProductApprovalInput {
  productId: string;
  action:    ProductAction;
  remarks?:  string;
}

// ── Vendor: create product (lands in DRAFT) ───────────────────────

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch vendor profile to get warehouse location
  const { data: vp } = await supabase
    .from('vendor_profiles')
    .select('warehouse_lat, warehouse_lng, warehouse_address, warehouse_city, warehouse_state, warehouse_pincode, id')
    .eq('user_id', user.id)
    .single();

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      vendor_id:        user.id,
      vendor_profile_id: vp?.id ?? null,
      category_id:      input.categoryId ?? null,
      name:             input.name,
      description:      input.description ?? null,
      brand:            input.brand ?? null,
      sku:              input.sku ?? null,
      unit:             input.unit,
      price_per_unit:   input.pricePerUnit,
      min_order_qty:    input.minOrderQty ?? 1,
      max_order_qty:    input.maxOrderQty ?? null,
      stock_qty:        input.stockQty,
      source_lat:       vp?.warehouse_lat ?? null,
      source_lng:       vp?.warehouse_lng ?? null,
      source_address:   vp?.warehouse_address ?? null,
      source_city:      vp?.warehouse_city ?? null,
      source_state:     vp?.warehouse_state ?? null,
      source_pincode:   vp?.warehouse_pincode ?? null,
      hsn_code:         input.hsnCode ?? null,
      gst_rate:         input.gstRate ?? 18,
      status:           'draft' as ProductStatus,
      specs:            input.specs ?? {},
      tags:             input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Attach images
  if (input.imageUrls?.length) {
    const images = input.imageUrls.map((url, i) => ({
      product_id: product.id,
      url,
      is_primary: i === 0,
      sort_order: i,
    }));
    await supabase.from('product_images').insert(images);
  }

  return product as Product;
}

// ── Vendor: submit draft for admin review ─────────────────────────

export async function submitProductForApproval(productId: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'submit_for_approval' });
}

// ── Vendor: resubmit after changes requested ──────────────────────

export async function resubmitProduct(productId: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'resubmit' });
}

// ── Admin: approve / reject / request changes ─────────────────────

export async function approveProduct(productId: string, remarks?: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'approve', remarks });
}

export async function rejectProduct(productId: string, remarks: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'reject', remarks });
}

export async function requestProductChanges(productId: string, remarks: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'request_changes', remarks });
}

export async function suspendProduct(productId: string, remarks?: string): Promise<Product> {
  return callWorkflowEngine({ entity: 'product', entityId: productId, action: 'suspend', remarks });
}

// ── Queries ───────────────────────────────────────────────────────

export async function getVendorProducts(status?: ProductStatus) {
  let query = supabase
    .from('products')
    .select('*, product_images(*)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as (Product & { product_images: { url: string; is_primary: boolean }[] })[];
}

export async function getMarketplaceProducts(filters?: {
  categoryId?: string;
  search?:     string;
  minPrice?:   number;
  maxPrice?:   number;
  page?:       number;
  pageSize?:   number;
}) {
  const page     = filters?.page     ?? 0;
  const pageSize = filters?.pageSize ?? 20;

  let query = supabase
    .from('products')
    .select('*, product_images(*), vendor_profiles(business_name)')
    .eq('status', 'approved')
    .range(page * pageSize, (page + 1) * pageSize - 1)
    .order('is_featured', { ascending: false })
    .order('approved_at',  { ascending: false });

  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.search)     query = query.ilike('name', `%${filters.search}%`);
  if (filters?.minPrice)   query = query.gte('price_per_unit', filters.minPrice);
  if (filters?.maxPrice)   query = query.lte('price_per_unit', filters.maxPrice);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getProductApprovalHistory(productId: string) {
  const { data, error } = await supabase
    .from('product_approval_history')
    .select('*, profiles(full_name, role)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ── Admin queue ───────────────────────────────────────────────────

export async function getAdminProductQueue() {
  const { data, error } = await supabase
    .from('admin_product_queue')
    .select('*');
  if (error) throw new Error(error.message);
  return data;
}

// ── Internal: call workflow-engine Edge Function ──────────────────

async function callWorkflowEngine(params: {
  entity:    'product' | 'order' | 'transport';
  entityId:  string;
  action:    string;
  remarks?:  string;
  metadata?: Record<string, unknown>;
}): Promise<Product> {
  const { data, error } = await supabase.functions.invoke('workflow-engine', { body: params });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Workflow engine error');
  return data.data as Product;
}
