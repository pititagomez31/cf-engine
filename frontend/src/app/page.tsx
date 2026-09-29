'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertCircle, Loader2, Package, Building2, MapPin, Truck, DollarSign, Layers } from 'lucide-react';

interface Supplier {
  id: string | null;
  name: string | null;
  location: string | null;
  province: string | null;
}

interface Variant {
  sku: string;
  price: number;
  stock: number;
}

interface Pricing {
  min: number;
  max: number;
  currency: string;
  tiers: any[];
}

interface Inventory {
  total: number;
  available: boolean;
}

interface Logistics {
  weight_kg: number | null;
  origin: string;
}

interface Product {
  id: string;
  title: string;
  images: string[];
  supplier: Supplier;
  variants: Variant[];
  pricing: Pricing;
  inventory: Inventory;
  logistics: Logistics;
}

interface Meta {
  fetched_at: string;
  provider: string;
  version: string;
}

interface ScrapeSuccessResponse {
  success: true;
  product: Product;
  meta: Meta;
}

interface ScrapeErrorResponse {
  error: string;
  details?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ScrapeSuccessResponse | null>(null);
  const [backendHealth, setBackendHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') {
            setBackendHealth('ok');
            return;
          }
        }
        setBackendHealth('error');
      } catch {
        setBackendHealth('error');
      }
    }
    checkHealth();
  }, []);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setProductData(null);
    setActiveImage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/1688/product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: ScrapeSuccessResponse | ScrapeErrorResponse = await res.json();

      if (!res.ok || 'error' in data) {
        const errData = data as ScrapeErrorResponse;
        setError(errData.error || 'Failed to fetch product data');
      } else {
        const successData = data as ScrapeSuccessResponse;
        setProductData(successData);
        if (successData.product.images.length > 0) {
          setActiveImage(successData.product.images[0]);
        }
      }
    } catch (err: any) {
      setError('NETWORK_ERROR: Unable to connect to backend server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            1688 Product Scraper
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            cf-engine backend integration interface
          </p>
        </div>

        {/* Backend Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm w-fit">
          <span className="text-slate-500">Backend Status:</span>
          {backendHealth === 'checking' && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking...
            </span>
          )}
          {backendHealth === 'ok' && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Operational ({API_BASE_URL})
            </span>
          )}
          {backendHealth === 'error' && (
            <span className="inline-flex items-center gap-1 text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" /> Disconnected ({API_BASE_URL})
            </span>
          )}
        </div>
      </header>

      {/* Input Form */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleScrape} className="space-y-4">
          <label htmlFor="url-input" className="block text-sm font-semibold text-slate-700">
            1688 Product URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="url-input"
              type="url"
              required
              placeholder="https://detail.1688.com/offer/123456789.html"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:bg-slate-100"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Fetch Product
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-rose-900">Scrape Error</h3>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Scraped Product Result */}
      {productData && (
        <main className="space-y-6">
          {/* Main Product Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Gallery Section */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-square rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={productData.product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Package className="w-12 h-12" />
                  </div>
                )}
              </div>
              {productData.product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productData.product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 rounded-md border shrink-0 overflow-hidden ${
                        activeImage === img ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Overview */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Offer ID: {productData.product.id}
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {productData.product.title || 'Untitled Product'}
                </h2>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium block">Price Range</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {productData.product.pricing.currency} {productData.product.pricing.min}
                    {productData.product.pricing.max > productData.product.pricing.min &&
                      ` - ${productData.product.pricing.max}`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium block">Total Inventory</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {productData.product.inventory.total.toLocaleString()} units
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-500 font-medium block">Availability</span>
                  <span
                    className={`text-sm font-bold mt-1 inline-block px-2 py-0.5 rounded ${
                      productData.product.inventory.available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {productData.product.inventory.available ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" /> Supplier Details
                </h3>
                <div className="text-sm space-y-1 text-slate-600 pl-5">
                  <p className="font-medium text-slate-900">
                    {productData.product.supplier.name || 'Unknown Supplier'}
                  </p>
                  {productData.product.supplier.location && (
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {productData.product.supplier.location}
                      {productData.product.supplier.province && `, ${productData.product.supplier.province}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Logistics */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" /> Logistics Info
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pl-5">
                  <div>
                    <span className="text-slate-400">Origin:</span> {productData.product.logistics.origin}
                  </div>
                  <div>
                    <span className="text-slate-400">Weight:</span>{' '}
                    {productData.product.logistics.weight_kg !== null
                      ? `${productData.product.logistics.weight_kg} kg`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variants Table */}
          {productData.product.variants.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" /> Variants ({productData.product.variants.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">SKU / ID</th>
                      <th className="py-3 px-4">Price ({productData.product.pricing.currency})</th>
                      <th className="py-3 px-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productData.product.variants.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{v.sku || `Variant ${i + 1}`}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {productData.product.pricing.currency} {v.price}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{v.stock.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="text-xs text-slate-400 text-right">
            Fetched at: {new Date(productData.meta.fetched_at).toLocaleString()} | Provider: {productData.meta.provider} v{productData.meta.version}
          </div>
        </main>
      )}
    </div>
  );
}
