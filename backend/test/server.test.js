import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractOfferId } from '../src/utils/extractOfferId.js';
import { buildApp } from '../src/server.js';
import { normalizeApifyData } from '../src/services/apify1688.js';

describe('extractOfferId utility', () => {
  test('extracts numeric offerId from valid 1688 URLs', () => {
    const url1 = 'https://detail.1688.com/offer/123456789.html';
    const res1 = extractOfferId(url1);
    assert.equal(res1.offerId, '123456789');

    const url2 = 'https://m.1688.com/offer/9876543210.html?spm=a261y.123';
    const res2 = extractOfferId(url2);
    assert.equal(res2.offerId, '9876543210');
  });

  test('throws MISSING_URL when URL is empty or not string', () => {
    assert.throws(() => extractOfferId(''), { message: 'MISSING_URL' });
    assert.throws(() => extractOfferId(null), { message: 'MISSING_URL' });
  });

  test('throws INVALID_1688_URL for non-1688 domain or invalid URL format', () => {
    assert.throws(() => extractOfferId('https://amazon.com/offer/123456789.html'), { message: 'INVALID_1688_URL' });
    assert.throws(() => extractOfferId('not a url'), { message: 'INVALID_1688_URL' });
  });

  test('throws OFFER_ID_NOT_FOUND when offer id pattern is missing', () => {
    assert.throws(() => extractOfferId('https://detail.1688.com/product/123'), { message: 'OFFER_ID_NOT_FOUND' });
    assert.throws(() => extractOfferId('https://detail.1688.com/offer/123.html'), { message: 'OFFER_ID_NOT_FOUND' }); // less than 8 digits
  });
});

describe('normalizeApifyData', () => {
  test('normalizes raw scraper data correctly', () => {
    const raw = {
      id: '123456789',
      title: 'Test Wholesale Product',
      images: ['https://img.1688.com/pic1.jpg'],
      companyName: 'Factory Co Ltd',
      location: 'Yiwu, Zhejiang',
      variants: [
        { skuId: 'sku1', price: 10.5, stock: 50 },
        { skuId: 'sku2', price: 12.0, stock: 50 }
      ],
      price: 10.5
    };

    const result = normalizeApifyData(raw, '123456789');
    assert.equal(result.id, '123456789');
    assert.equal(result.title, 'Test Wholesale Product');
    assert.deepEqual(result.images, ['https://img.1688.com/pic1.jpg']);
    assert.equal(result.supplier.name, 'Factory Co Ltd');
    assert.equal(result.supplier.location, 'Yiwu, Zhejiang');
    assert.equal(result.variants.length, 2);
    assert.equal(result.inventory.total, 100);
    assert.equal(result.inventory.available, true);
    assert.equal(result.pricing.min, 10.5);
    assert.equal(result.pricing.max, 12.0);
    assert.equal(result.logistics.origin, 'CN');
  });
});

describe('Fastify Server Routes', () => {
  test('GET /api/health returns status ok', async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({
      method: 'GET',
      url: '/api/health'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  test('POST /api/1688/product without URL returns 400 MISSING_URL', async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: {}
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'MISSING_URL' });
  });

  test('POST /api/1688/product with non-1688 URL returns 400 INVALID_1688_URL', async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: { url: 'https://taobao.com/offer/123456789.html' }
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'INVALID_1688_URL' });
  });

  test('POST /api/1688/product with missing offer ID returns 400 OFFER_ID_NOT_FOUND', async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: { url: 'https://detail.1688.com/page/index.html' }
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'OFFER_ID_NOT_FOUND' });
  });

  test('POST /api/1688/product succeeds with mocked Apify client', async () => {
    const mockApifyClient = {
      actor: () => ({
        call: async () => ({
          defaultDatasetId: 'dataset-123'
        })
      }),
      dataset: () => ({
        listItems: async () => ({
          items: [
            {
              id: '123456789',
              title: 'Sample Product',
              images: ['http://example.com/image.jpg'],
              companyName: 'Sample Supplier',
              location: 'Guangzhou',
              variants: [{ skuId: 'sku-1', price: 15.0, stock: 10 }],
              inventory: { total: 10, available: true },
              logistics: { weight_kg: 0.5, origin: 'CN' }
            }
          ]
        })
      })
    };

    const app = await buildApp({ logger: false, apifyClient: mockApifyClient });
    const response = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: { url: 'https://detail.1688.com/offer/123456789.html' }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.product.id, '123456789');
    assert.equal(body.product.title, 'Sample Product');
    assert.equal(body.meta.provider, 'apify:zen-studio');
  });

  test('POST /api/1688/product handles Apify scraper errors (502 APIFY_ERROR)', async () => {
    const mockApifyClient = {
      actor: () => ({
        call: async () => {
          throw new Error('Actor execution timed out');
        }
      })
    };

    const app = await buildApp({ logger: false, apifyClient: mockApifyClient });
    const response = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: { url: 'https://detail.1688.com/offer/123456789.html' }
    });

    assert.equal(response.statusCode, 502);
    const body = response.json();
    assert.equal(body.error, 'APIFY_ERROR');
    assert.equal(body.details, 'Actor execution timed out');
  });
});
