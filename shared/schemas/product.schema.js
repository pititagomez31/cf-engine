import { z } from 'zod';

export const SupplierSchema = z.object({
  id: z.string().nullable().default(null),
  name: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  province: z.string().nullable().default(null)
});

export const VariantSchema = z.object({
  sku: z.string().default(''),
  price: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0)
});

export const PricingTierSchema = z.object({
  minQuantity: z.number().optional(),
  price: z.number().optional()
}).passthrough();

export const PricingSchema = z.object({
  min: z.number().nonnegative().default(0),
  max: z.number().nonnegative().default(0),
  currency: z.string().default('CNY'),
  tiers: z.array(z.any()).default([])
});

export const InventorySchema = z.object({
  total: z.number().int().nonnegative().default(0),
  available: z.boolean().default(true)
});

export const LogisticsSchema = z.object({
  weight_kg: z.number().nullable().default(null),
  origin: z.string().default('CN')
});

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  images: z.array(z.string()).default([]),
  supplier: SupplierSchema,
  variants: z.array(VariantSchema).default([]),
  pricing: PricingSchema,
  inventory: InventorySchema,
  logistics: LogisticsSchema
});

export const ProductMetaSchema = z.object({
  fetched_at: z.string(),
  provider: z.string().default('apify:zen-studio'),
  version: z.string().default('1.0')
});

export const ProductResponseSchema = z.object({
  success: z.boolean(),
  product: ProductSchema,
  meta: ProductMetaSchema
});

export const ProductRequestSchema = z.object({
  url: z.string({ required_error: 'MISSING_URL' }).min(1, 'MISSING_URL')
});
