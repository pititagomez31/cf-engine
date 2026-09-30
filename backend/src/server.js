import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { productRoutes } from './routes/products.js';
import proxyRoutes from './routes/proxy.js';

dotenv.config();

export async function buildApp(options = {}) {
  const fastify = Fastify({
    logger: options.logger ?? true
  });

  // Register CORS before registering routes
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
      : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false
  });

  // Health check route
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok' };
  });

  // Product routes
  await fastify.register(productRoutes, options);

  // Image proxy routes under /api
  await fastify.register(proxyRoutes, { prefix: '/api' });

  return fastify;
}

async function start() {
  const app = await buildApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// If executed directly (e.g., node src/server.js)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  start();
}
