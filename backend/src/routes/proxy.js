import { Readable } from 'node:stream';

const ALLOWED_SUFFIXES = ['.alicdn.com', '.1688.com', '.taobao.com'];
const ALLOWED_EXACT = ['alicdn.com', '1688.com', 'taobao.com'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function isAllowedHost(hostname) {
  const lowerHost = hostname.toLowerCase();
  if (ALLOWED_EXACT.includes(lowerHost)) return true;
  return ALLOWED_SUFFIXES.some(suffix => lowerHost.endsWith(suffix));
}

export default async function proxyRoutes(fastify, options) {
  fastify.get('/proxy/image', async (request, reply) => {
    const rawUrl = request.query?.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return reply.status(400).send({
        error: 'MISSING_URL',
        message: 'Query parameter "url" is required and must be a non-empty string.',
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return reply.status(400).send({
        error: 'INVALID_URL',
        message: 'Query parameter "url" must be a valid absolute URL.',
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return reply.status(400).send({
        error: 'INVALID_PROTOCOL',
        message: 'Only http and https protocols are supported.',
      });
    }

    if (!isAllowedHost(parsedUrl.hostname)) {
      return reply.status(403).send({
        error: 'DOMAIN_NOT_ALLOWED',
        message: 'Image domain is not in the allowlist.',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; cf-engine-image-proxy/1.0)',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      return reply.status(502).send({
        error: 'UPSTREAM_FETCH_FAILED',
        message: 'Failed to fetch image from upstream server.',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstreamResponse.ok) {
      return reply.status(502).send({
        error: 'UPSTREAM_ERROR',
        message: `Upstream CDN returned status ${upstreamResponse.status}.`,
      });
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return reply.status(415).send({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        message: `Expected an image Content-Type, got "${contentType}".`,
      });
    }

    const contentLengthHeader = upstreamResponse.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_SIZE_BYTES) {
        return reply.status(413).send({
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Image size exceeds maximum allowed size of 10 MB.',
        });
      }
    }

    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400, immutable');
    reply.header('Access-Control-Allow-Origin', '*');

    // Stream the body if possible or send arrayBuffer
    if (upstreamResponse.body) {
      // Convert web ReadableStream or Buffer stream to Node Readable if needed
      if (typeof Readable.fromWeb === 'function' && upstreamResponse.body[Symbol.asyncIterator]) {
        let totalBytes = 0;
        async function* limitStream() {
          for await (const chunk of upstreamResponse.body) {
            totalBytes += chunk.length;
            if (totalBytes > MAX_SIZE_BYTES) {
              throw new Error('PAYLOAD_TOO_LARGE');
            }
            yield chunk;
          }
        }
        try {
          const stream = Readable.from(limitStream());
          return reply.send(stream);
        } catch (err) {
          return reply.status(413).send({
            error: 'PAYLOAD_TOO_LARGE',
            message: 'Image size exceeds maximum allowed size of 10 MB.',
          });
        }
      }
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    if (buffer.length > MAX_SIZE_BYTES) {
      return reply.status(413).send({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Image size exceeds maximum allowed size of 10 MB.',
      });
    }

    return reply.send(buffer);
  });
}
