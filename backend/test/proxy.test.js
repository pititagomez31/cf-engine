import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/server.js';

describe('Image Proxy Route (GET /api/proxy/image)', () => {
  let app;
  let originalFetch;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    if (app) await app.close();
  });

  test('returns 400 MISSING_URL when url parameter is missing or empty', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/proxy/image',
    });
    assert.strictEqual(res1.statusCode, 400);
    assert.strictEqual(res1.json().error, 'MISSING_URL');

    const res2 = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=',
    });
    assert.strictEqual(res2.statusCode, 400);
    assert.strictEqual(res2.json().error, 'MISSING_URL');
  });

  test('returns 400 INVALID_URL when url parameter is malformed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=not-a-valid-url',
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json().error, 'INVALID_URL');
  });

  test('returns 403 DOMAIN_NOT_ALLOWED for unallowed hostnames', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=https://evil.com/fake-image.jpg',
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json().error, 'DOMAIN_NOT_ALLOWED');
  });

  test('returns 200 with image binary and headers for allowed hostnames', async () => {
    const fakeImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic header

    global.fetch = async (url, options) => {
      // Assert no Referer header sent
      assert.strictEqual(options.headers?.Referer, undefined);
      assert.ok(options.headers?.['User-Agent']);

      return new Response(fakeImageBuffer, {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': String(fakeImageBuffer.length),
        },
      });
    };

    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=' + encodeURIComponent('https://cbu01.alicdn.com/img/ibank/sample.jpg'),
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/jpeg');
    assert.strictEqual(res.headers['cache-control'], 'public, max-age=86400, immutable');
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
    assert.deepStrictEqual(res.rawPayload, fakeImageBuffer);
  });

  test('returns 415 UNSUPPORTED_MEDIA_TYPE when upstream Content-Type is non-image', async () => {
    global.fetch = async () => {
      return new Response('<html>Error</html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      });
    };

    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=' + encodeURIComponent('https://detail.1688.com/page.html'),
    });

    assert.strictEqual(res.statusCode, 415);
    assert.strictEqual(res.json().error, 'UNSUPPORTED_MEDIA_TYPE');
  });

  test('returns 413 PAYLOAD_TOO_LARGE when Content-Length exceeds 10 MB', async () => {
    global.fetch = async () => {
      return new Response(Buffer.alloc(100), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': String(15 * 1024 * 1024), // 15 MB header
        },
      });
    };

    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=' + encodeURIComponent('https://cbu01.alicdn.com/huge.png'),
    });

    assert.strictEqual(res.statusCode, 413);
    assert.strictEqual(res.json().error, 'PAYLOAD_TOO_LARGE');
  });

  test('returns 502 UPSTREAM_ERROR when upstream returns non-200 status', async () => {
    global.fetch = async () => {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'content-type': 'image/jpeg',
        },
      });
    };

    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=' + encodeURIComponent('https://cbu01.alicdn.com/missing.jpg'),
    });

    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.json().error, 'UPSTREAM_ERROR');
  });

  test('returns 502 UPSTREAM_FETCH_FAILED when fetch throws a network error', async () => {
    global.fetch = async () => {
      throw new Error('Connection reset');
    };

    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/image?url=' + encodeURIComponent('https://cbu01.alicdn.com/timeout.jpg'),
    });

    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.json().error, 'UPSTREAM_FETCH_FAILED');
  });
});
