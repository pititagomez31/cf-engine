import { ApifyClient } from 'apify-client';
import { ProductSchema } from '@cf-engine/shared';

export function normalizeApifyData(rawData, offerId) {
  try {
    const item = Array.isArray(rawData) ? rawData[0] || {} : rawData;

    // Standardize fields
    const id = String(item.offerId || item.id || offerId);
    const title = item.title || item.subject || item.name || '';

    // Images
    let images = [];
    if (Array.isArray(item.mainImages) && item.mainImages.length > 0) {
      images = item.mainImages;
    } else if (Array.isArray(item.images) && item.images.length > 0) {
      images = item.images;
    } else if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      images = item.imageUrls;
    } else if (item.mainImage || item.image) {
      images = [item.mainImage || item.image];
    }

    // Supplier (4 fields)
    const supplierId = item.sellerUserId ? String(item.sellerUserId) : (item.sellerMemberId ? String(item.sellerMemberId) : null);
    const supplierName = item.sellerCompanyName || item.supplier?.name || item.companyName || item.sellerName || item.seller?.name || null;
    const supplierLocation = item.sellerProvince || item.supplier?.location || item.location || item.city || item.province || item.seller?.location || null;
    const supplierProvince = item.sellerProvince || item.supplier?.province || item.province || null;

    const supplier = {
      id: supplierId,
      name: supplierName,
      location: supplierLocation,
      province: supplierProvince
    };

    // Variants
    let variants = [];
    const rawVariants = item.skus || item.variants || item.skuList || [];
    if (Array.isArray(rawVariants) && rawVariants.length > 0) {
      variants = rawVariants.map(v => ({
        sku: String(v.skuId || v.sku || v.id || v.name || ''),
        price: Number(v.price || v.consignPrice || v.salePrice || item.priceMin || item.price || 0),
        stock: Number(v.stock || v.canBookCount || v.amount || 0)
      }));
    }

    // Pricing & Tiers
    const variantPrices = variants.map(v => v.price).filter(p => !isNaN(p));
    const rawMin = item.priceMin ?? item.pricing?.min ?? item.minPrice ?? item.price;
    const rawMax = item.priceMax ?? item.pricing?.max ?? item.maxPrice;

    const minPrice = rawMin !== undefined ? Number(rawMin) : (variantPrices.length ? Math.min(...variantPrices) : 0);
    const maxPrice = rawMax !== undefined ? Number(rawMax) : (variantPrices.length ? Math.max(...variantPrices) : minPrice);
    const currency = item.pricing?.currency || item.currency || 'CNY';
    const tiers = Array.isArray(item.pricing?.tiers || item.priceTiers || item.priceRange)
      ? (item.pricing?.tiers || item.priceTiers || item.priceRange)
      : [];

    const pricing = {
      min: isNaN(minPrice) ? 0 : minPrice,
      max: isNaN(maxPrice) ? 0 : maxPrice,
      currency,
      tiers
    };

    // Inventory
    const totalStock = Number(
      item.inventory?.total ?? item.totalStock ?? item.canBookCount ??
      (variants.length ? variants.reduce((sum, v) => sum + (v.stock || 0), 0) : 0)
    );
    const inventory = {
      total: isNaN(totalStock) ? 0 : totalStock,
      available: item.inventory?.available ?? (totalStock > 0)
    };

    // Logistics
    const weight_kg = item.logistics?.weight_kg ?? item.weight ?? null;
    const logistics = {
      weight_kg: weight_kg !== null && !isNaN(Number(weight_kg)) ? Number(weight_kg) : null,
      origin: item.logistics?.origin || item.origin || 'CN'
    };

    const normalized = ProductSchema.parse({
      id,
      title,
      images,
      supplier,
      variants,
      pricing,
      inventory,
      logistics
    });

    return normalized;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[NORMALIZATION_ERROR] Zod validation or processing failed:');
      if (err.errors || err.issues) {
        console.error('Zod errors:', JSON.stringify(err.errors || err.issues, null, 2));
      } else if (err.cause?.errors || err.cause?.issues) {
        console.error('Zod cause errors:', JSON.stringify(err.cause.errors || err.cause.issues, null, 2));
      } else {
        console.error('Error details:', err.message || err);
      }
      try {
        const rawString = JSON.stringify(rawData);
        console.error('Raw item (truncated):', rawString.slice(0, 2000));
      } catch (e) {
        console.error('Raw item (non-serializable):', String(rawData).slice(0, 2000));
      }
    }

    const normErr = new Error('NORMALIZATION_ERROR');
    normErr.cause = err;
    throw normErr;
  }
}

export async function fetchAndNormalize1688Product(url, offerId, options = {}) {
  const token = options.token || process.env.APIFY_API_TOKEN || (options.apifyClient ? 'dummy-token' : null);
  const actorId = options.actorId || process.env.APIFY_1688_ACTOR_ID || 'zen-studio~1688-wholesale-scraper';

  if (!token) {
    const error = new Error('APIFY_ERROR');
    error.details = 'APIFY_API_TOKEN is not configured';
    throw error;
  }

  const client = options.apifyClient || new ApifyClient({ token });

  let run;
  try {
    const input = {
      offerIds: [offerId]
    };

    run = await client.actor(actorId).call(input);
  } catch (err) {
    const apifyErr = new Error('APIFY_ERROR');
    apifyErr.details = err.message;
    throw apifyErr;
  }

  let items = [];
  try {
    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    items = dataset.items || [];
  } catch (err) {
    const apifyErr = new Error('APIFY_ERROR');
    apifyErr.details = err.message;
    throw apifyErr;
  }

  if (!items.length) {
    const apifyErr = new Error('APIFY_ERROR');
    apifyErr.details = 'No items returned from scraper';
    throw apifyErr;
  }

  return normalizeApifyData(items[0], offerId);
}
