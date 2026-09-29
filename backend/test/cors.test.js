import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/server.js';

describe('CORS Headers & Preflight', () => {
  test('OPTIONS preflight request returns 204 with Access-Control-Allow-Origin header', async () => {
    const origin = 'https://frontend-production-c451.up.railway.app';
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET'
      }
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers['access-control-allow-origin'],
      origin
    );
  });

  test('GET /api/health includes Access-Control-Allow-Origin header when Origin header is present', async () => {
    const origin = 'https://frontend-production-c451.up.railway.app';
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: {
        Origin: origin
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers['access-control-allow-origin'],
      origin
    );
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  test('CORS strictly restricts origins when process.env.CORS_ORIGINS is configured', async () => {
    const allowedOrigin = 'https://frontend-production-c451.up.railway.app';
    const disallowedOrigin = 'https://malicious-site.com';

    process.env.CORS_ORIGINS = allowedOrigin;

    try {
      const app = await buildApp({ logger: false });

      // Allowed origin request
      const allowedRes = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { Origin: allowedOrigin }
      });
      assert.equal(allowedRes.statusCode, 200);
      assert.equal(allowedRes.headers['access-control-allow-origin'], allowedOrigin);

      // Disallowed origin request
      const disallowedRes = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { Origin: disallowedOrigin }
      });
      assert.notEqual(disallowedRes.headers['access-control-allow-origin'], disallowedOrigin);
    } finally {
      delete process.env.CORS_ORIGINS;
    }
  });
});
