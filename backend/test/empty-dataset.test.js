import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/server.js';

describe('Empty Dataset Handling (POST /api/1688/product)', () => {
  let app;

  afterEach(async () => {
    if (app) await app.close();
  });

  test('returns 404 PRODUCT_NOT_FOUND when Apify returns an empty dataset array', async () => {
    const mockApifyClient = {
      actor: () => ({
        call: async () => ({ id: 'run_empty_123', defaultDatasetId: 'ds_empty_123' })
      }),
      dataset: () => ({
        listItems: async () => ({ items: [] })
      })
    };

    app = await buildApp({ apifyClient: mockApifyClient, logger: false });

    const res = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: {
        url: 'https://detail.1688.com/offer/948602330043.html'
      }
    });

    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'PRODUCT_NOT_FOUND');
    assert.strictEqual(body.message, 'El producto no se encontró en 1688 o ya no está disponible.');
  });

  test('returns 404 PRODUCT_NOT_FOUND when Apify returns an item missing critical fields (no offerId, title, or images)', async () => {
    const mockApifyClient = {
      actor: () => ({
        call: async () => ({ id: 'run_invalid_item_123', defaultDatasetId: 'ds_invalid_item_123' })
      }),
      dataset: () => ({
        listItems: async () => ({
          items: [
            {
              // Empty/incomplete item
              someRandomField: 'foo'
            }
          ]
        })
      })
    };

    app = await buildApp({ apifyClient: mockApifyClient, logger: false });

    const res = await app.inject({
      method: 'POST',
      url: '/api/1688/product',
      payload: {
        url: 'https://detail.1688.com/offer/948602330043.html'
      }
    });

    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'PRODUCT_NOT_FOUND');
    assert.strictEqual(body.message, 'El producto no se encontró en 1688 o ya no está disponible.');
  });
});
