import { extractOfferId } from '../utils/extractOfferId.js';
import { fetchAndNormalize1688Product } from '../services/apify1688.js';
import { ProductRequestSchema } from '@cf-engine/shared';

export async function productRoutes(fastify, options) {
  fastify.post('/api/1688/product', async (request, reply) => {
    // 1. Request validation
    if (!request.body || typeof request.body !== 'object') {
      return reply.code(400).send({ error: 'MISSING_URL' });
    }

    const parseResult = ProductRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const errorMessage = issue?.message || 'MISSING_URL';
      return reply.code(400).send({ error: errorMessage });
    }

    const { url } = parseResult.data;

    // 2. Extract offer ID and validate 1688 URL
    let offerId;
    try {
      const extracted = extractOfferId(url);
      offerId = extracted.offerId;
    } catch (err) {
      if (['MISSING_URL', 'INVALID_1688_URL', 'OFFER_ID_NOT_FOUND'].includes(err.message)) {
        return reply.code(400).send({ error: err.message });
      }
      return reply.code(400).send({ error: 'INVALID_1688_URL' });
    }

    // 3. Call Apify & normalize product
    try {
      const product = await fetchAndNormalize1688Product(url, offerId, {
        apifyClient: options.apifyClient
      });

      return reply.code(200).send({
        success: true,
        product,
        meta: {
          fetched_at: new Date().toISOString(),
          provider: 'apify:zen-studio',
          version: '1.0'
        }
      });
    } catch (err) {
      if (err.message === 'APIFY_ERROR') {
        return reply.code(502).send({
          error: 'APIFY_ERROR',
          details: err.details || 'Failed to fetch data from Apify scraper'
        });
      }

      if (err.message === 'NORMALIZATION_ERROR') {
        return reply.code(500).send({ error: 'NORMALIZATION_ERROR' });
      }

      return reply.code(500).send({ error: 'NORMALIZATION_ERROR' });
    }
  });
}
