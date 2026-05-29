import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  grade: string | null;
  description: string | null;
  images: string[] | null;
  unit: string;
  base_price: number;
  mrp: number | null;
  status: string;
  stock_qty: number;
  free_delivery: boolean;
  rating: number | null;
  review_count: number | null;
  category_id: string | null;
  brand_id: string | null;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  priority: number;
  icon_url: string | null;
};

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, priority, icon_url')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .eq('is_featured', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BrandRow[];
    },
  });
}

export function useFeaturedProducts(limit = 10) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, brand, images, unit, base_price, mrp, status, stock_qty, category_id, categories(slug, name)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Array<ProductRow & { categories?: { slug: string; name: string } | null }>;
    },
  });
}

export function useProductsByCategory(slug: string) {
  return useQuery({
    queryKey: ['products', 'category', slug],
    queryFn: async () => {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!cat) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, brand, grade, description, images, unit, base_price, mrp, status, stock_qty, free_delivery, rating, review_count, category_id, brand_id')
        .eq('category_id', cat.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    enabled: Boolean(slug),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, brand, grade, description, images, unit, base_price, mrp, status, stock_qty, free_delivery, rating, review_count, category_id, brand_id')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as ProductRow | null;
    },
    enabled: Boolean(slug),
  });
}

export function useProductVariants(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['variants', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, tier_name, moq, size_label, weight_per_unit_kg, price_per_unit, sort_order')
        .eq('product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(productId),
  });
}
